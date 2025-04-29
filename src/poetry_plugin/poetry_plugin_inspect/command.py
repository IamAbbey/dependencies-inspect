from contextlib import contextmanager
import fileinput
from pathlib import Path
import sys
from typing import Any, ClassVar, Iterator, Literal, Optional, TypedDict
import os
from cleo.helpers import option
from cleo.io.inputs.argument import Argument
from packaging.version import InvalidVersion
from poetry.console.commands.show import ShowCommand, reverse_deps
from pydantic import (
    BaseModel,
    ConfigDict,
    TypeAdapter,
    computed_field,
    JsonValue,
    HttpUrl,
)
from poetry.console.commands.group_command import GroupCommand
from poetry.core.packages.dependency import Dependency
from poetry_plugin_inspect.utils import UPDATE_TYPE, compare_versions, stdout_link
import requests  # type: ignore
from poetry.puzzle.provider import Indicator

BASE_DIR = Path(__file__).parent
WEB_UI_BUILD_DIR = os.getenv("WEB_UI_BUILD_DIR", BASE_DIR / "webui" / "dist")
DEFAULT_OUTPUT_DIR_NAME = "poetry_inspect_report"
PACKAGE_MANAGER = "poetry"


class PypiVulnerabilitiesData(BaseModel):
    aliases: Optional[list[str]] = []
    details: str
    summary: Optional[str] = None
    fixed_in: Optional[list[str]] = []
    id: str
    link: HttpUrl
    withdrawn: Optional[JsonValue] = None


class PackageInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    current_version: str
    latest_version: Optional[str] = None
    # semver-safe-update -> It needs an immediate semver-compliant upgrade
    # update-possible -> It needs an upgrade but has potential BC breaks so is not urgent
    update_status: Optional[
        Literal["up-to-date", "semver-safe-update", "update-possible"]
    ] = None
    installed_status: Literal["installed", "not-installed"]
    compatible: bool = True
    group: str
    description: str
    # a mapping of direct dependencies and their pretty constraints
    dependencies: Optional[dict[str, str]] = {}
    required_by: Optional[list[str]] = []
    vulnerabilities: Optional[list[PypiVulnerabilitiesData]] = []

    @computed_field  # type: ignore
    @property
    def update_type(self) -> UPDATE_TYPE:
        try:
            return compare_versions(self.current_version, self.latest_version)
        except (ValueError, InvalidVersion):
            return "Up-to-date" if self.update_status == "up-to-date" else "Unknown"


class WebUIConfig(BaseModel):
    show_latest: bool
    show_all: bool
    package_manager: str


class WebUIData(BaseModel):
    groups: list[str]
    top_level_packages: list[str]
    packages: list[PackageInfo]
    config: WebUIConfig


class InspectPackageCommand(ShowCommand):
    name = "inspect"
    description = "Inspects and report detailed information about available packages."
    options = [
        *GroupCommand._group_dependency_options(),
        option(
            "output",
            "o",
            "The name of the output folder.",
            flag=False,
            default=DEFAULT_OUTPUT_DIR_NAME,
        ),
        option("latest", "l", "Show the latest version."),
        option("vulnerability", "x", "Audit packages and report any vulnerabilities."),
        option(
            "all",
            "a",
            "to apply the inspect options on all packages, including transitive dependencies.",
        ),
    ]
    # overrides what was defined in the show command
    arguments: ClassVar[list[Argument]] = []
    help = """The inspect command creates a detailed HTML report about available packages."""

    class GroupDependency(TypedDict, total=False):
        group_name: str
        dependency: Dependency

    @property
    def all_requires_with_group_mapping(self) -> dict[str, GroupDependency]:
        """
        Returns the main dependencies and group name mapping
        """
        return {
            dependency.name: {"group_name": group.name, "dependency": dependency}
            for group in self.poetry.package._dependency_groups.values()
            for dependency in group.dependencies_for_locking
        }

    @property
    def top_level_dependencies(self) -> list[str]:
        return sorted(list(self.all_requires_with_group_mapping.keys()))

    @contextmanager
    def _progress(self) -> Iterator[None]:
        if not self._io.output.is_decorated():
            self._io.write_line("Resolving dependencies...")
            yield
        else:
            indicator = Indicator(
                self._io, "{message}{context}<debug>({elapsed:2s})</debug>"
            )

            with indicator.auto(
                "<info>Inspecting dependencies from lock file...</info>",
                "<info>Complete...</info>",
            ):
                yield

    def handle(self) -> int:
        if not Path(WEB_UI_BUILD_DIR).exists():
            self.line_error("<error>Something went wrong!</error>")
            return 1

        output_dir_name = self.option("output")
        try:
            self.line("<info>Generating report</>")
            with self._progress():
                result = self._core_api_get_dependency()
                self.export(result, output_dir_name)
        except ValueError:
            self.line_error("<error>Something went wrong!</error>")
            return 1

        return 0

    def export(self, info: list[PackageInfo], output_dir_name: str) -> None:
        import shutil

        web_ui_data = WebUIData(
            groups=list(self.activated_groups),
            top_level_packages=self.top_level_dependencies,
            packages=info,
            config=WebUIConfig(
                show_latest=self.show_latest,
                show_all=self.show_all,
                package_manager=PACKAGE_MANAGER,
            ),
        )

        cwd_output_dir = Path.cwd() / output_dir_name
        index_file = cwd_output_dir / "index.html"

        try:
            shutil.rmtree(cwd_output_dir, ignore_errors=True)
            shutil.copytree(WEB_UI_BUILD_DIR, cwd_output_dir, dirs_exist_ok=True)
            with fileinput.input(files=(index_file,), inplace=True) as f:
                for line in f:
                    # Check if the line needs modification
                    if "window.webUIData = undefined" in line.strip():
                        sys.stdout.write(
                            f"window.webUIData = {web_ui_data.model_dump_json()};\n"
                        )
                    else:
                        # If no modification is needed, write the original line back
                        sys.stdout.write(line)
            print_href = stdout_link(
                f"{output_dir_name}/{os.path.basename(index_file)}",
                f"file://{os.path.abspath(index_file)}",
            )
            self.line(f"\n\nWrote HTML report to {print_href}")
        except FileNotFoundError as e:
            raise ValueError from e
        except Exception as e:
            raise ValueError from e
        finally:
            fileinput.close()

    def add_package_to_report(self, name: str) -> bool:
        return self.show_all or name in self.top_level_dependencies

    def _core_api_get_dependency(self) -> list[PackageInfo]:
        from cleo.io.null_io import NullIO
        from poetry.puzzle.solver import Solver
        from poetry.repositories.installed_repository import InstalledRepository
        from poetry.repositories.repository_pool import RepositoryPool
        from poetry.utils.helpers import get_package_version_display_string

        locked_repository = self.poetry.locker.locked_repository()

        root = self.project_with_activated_groups_only()

        locked_packages = locked_repository.packages
        pool = RepositoryPool.from_packages(locked_packages, self.poetry.config)
        solver = Solver(
            root,
            pool=pool,
            installed=[],
            locked=locked_packages,
            io=NullIO(),
        )
        solver.provider.load_deferred(False)
        with solver.use_environment(self.env):
            ops = solver.solve().calculate_operations()

        required_locked_packages = {op.package for op in ops if not op.skipped}

        latest_packages = {}
        latest_statuses = {}
        group_lookup = self.all_requires_with_group_mapping
        installed_repo = InstalledRepository.load(self.env)

        # Show all packages (even those not compatible with current system).
        show_incompatible = True

        self.show_latest = self.option("latest") or False
        self.show_all = self.option("all") or False

        response: dict[str, Any] = {}
        for locked in locked_packages:
            name = locked.pretty_name
            compatible = True
            installed_status = "installed"
            latest = None
            update_status = None
            latest_version = None
            vulnerabilities = []

            current_version = get_package_version_display_string(
                locked, root=self.poetry.file.path.parent
            )

            if locked not in required_locked_packages:
                if not show_incompatible:
                    continue
                compatible = False
            else:
                installed_status = self.get_installed_status(
                    locked, installed_repo.packages
                )

            if self.add_package_to_report(name):
                if self.show_latest:
                    latest = self.find_latest_package(locked, root)

                if self.option("vulnerability"):
                    pypi_response = requests.get(
                        f"https://pypi.org/pypi/{name}/{current_version}/json",
                        timeout=5,
                    )
                    if pypi_response.ok:
                        vulnerabilities = pypi_response.json().get(
                            "vulnerabilities", []
                        )

                if not latest:
                    latest = locked

                latest_packages[locked.pretty_name] = latest
                latest_statuses[locked.pretty_name] = self.get_update_status(
                    latest, locked
                )

                if self.show_latest:
                    update_status = latest_statuses[locked.pretty_name]

                    latest_version = get_package_version_display_string(
                        latest_packages[locked.pretty_name],
                        root=self.poetry.file.path.parent,
                    )

            required_by = reverse_deps(locked, locked_repository)
            required_by_packages = list(required_by.keys()) if required_by else []

            # if we have not process this current package ('locked'), add it to response
            if self.add_package_to_report(name) and name not in response:
                response[name] = {
                    "name": name,
                    "current_version": current_version,
                    "latest_version": latest_version,
                    "update_status": update_status,
                    "installed_status": installed_status,
                    "compatible": compatible,
                    "required_by": required_by_packages,
                    "description": locked.description,
                    "dependencies": {},
                    "vulnerabilities": vulnerabilities,
                    "group": group_lookup.get(name, {}).get(
                        "group_name", "dependencies"
                    ),
                }
            else:
                # if we have process this current package ('locked')
                # as a result of seeing it in a package's required_by (see below)
                # then it must be in response and not have 'current_version' set
                if (
                    self.add_package_to_report(name)
                    and "current_version" not in response[name]
                ):
                    response[name] = response[name] | {
                        "current_version": current_version,
                        "latest_version": latest_version,
                        "update_status": update_status,
                        "installed_status": installed_status,
                        "compatible": compatible,
                        "description": locked.description,
                        "required_by": required_by_packages,
                        "vulnerabilities": vulnerabilities,
                    }

            # if this package ('locked') is a transitive package that was
            # added cause it was needed by another package
            if required_by:
                # we go through the packages that requires our locked package
                for required_by_pkg in required_by_packages:
                    # if we have not processed this package
                    if (
                        self.add_package_to_report(required_by_pkg)
                        and required_by_pkg not in response
                    ):
                        # add it to response, but as a bare data,
                        # just the name, and add the current locked as its dependency
                        response[required_by_pkg] = {
                            "name": required_by_pkg,
                            "group": group_lookup.get(required_by_pkg, {}).get(
                                "group_name", "dependencies"
                            ),
                            "dependencies": {name: required_by[required_by_pkg]},
                            "required_by": [],
                        }
                    else:
                        if self.add_package_to_report(required_by_pkg):
                            # if we have processed this package, update the package dependency with lock
                            response[required_by_pkg]["dependencies"].update(
                                {name: required_by[required_by_pkg]}
                            )

        return TypeAdapter(list[PackageInfo]).validate_python(list(response.values()))
