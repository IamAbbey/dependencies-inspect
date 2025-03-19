from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import TYPE_CHECKING, Protocol

from poetry.config.config import Config
from poetry.console.application import Application
from poetry.core.packages.package import Package
from poetry.core.packages.utils.link import Link
from poetry.core.vcs.git import ParsedUrl
from poetry.factory import Factory
from poetry.packages import Locker
from poetry.repositories import Repository
from poetry.repositories.exceptions import PackageNotFoundError

if TYPE_CHECKING:
    from typing import Any, Self

    from cleo.testers.command_tester import CommandTester
    from poetry.core.constraints.version import Version
    from poetry.core.packages.dependency import Dependency
    from poetry.poetry import Poetry
    from poetry.utils.env import Env
    from tomlkit.toml_document import TOMLDocument


# Used as a mock for latest git revision.
MOCK_DEFAULT_GIT_REVISION = "9cf87a285a2d3fbb0b9fa621997b3acc3631ed24"
FIXTURE_PATH = Path(__file__).parent / "fixtures"


class PoetryTestApplication(Application):
    def __init__(self, poetry: Poetry) -> None:
        super().__init__()
        self._poetry = poetry

    def reset_poetry(self) -> None:
        assert self._poetry is not None
        poetry = self._poetry
        self._poetry = Factory().create_poetry(self._poetry.file.path.parent)
        self._poetry.set_pool(poetry.pool)
        self._poetry.set_config(poetry.config)
        self._poetry.set_locker(
            TestLocker(poetry.locker.lock, self._poetry.pyproject.data)
        )


class TestLocker(Locker):
    # class name begins 'Test': tell pytest that it does not contain testcases.
    __test__ = False

    def __init__(self, lock: Path, pyproject_data: dict[str, Any]) -> None:
        super().__init__(lock, pyproject_data)
        self._locked = False
        self._write = False

    def write(self, write: bool = True) -> None:
        self._write = write

    def is_locked(self) -> bool:
        return self._locked

    def locked(self, is_locked: bool = True) -> Self:
        self._locked = is_locked

        return self

    def mock_lock_data(self, data: dict[str, Any]) -> None:
        self.locked()

        self._lock_data = data

    def is_fresh(self) -> bool:
        return True

    def _write_lock_data(self, data: TOMLDocument) -> None:
        if self._write:
            super()._write_lock_data(data)
            self._locked = True
            return

        self._lock_data = data


def get_package(
    name: str, version: str | Version, yanked: str | bool = False
) -> Package:
    return Package(name, version, yanked=yanked)


class TestRepository(Repository):
    def find_packages(self, dependency: Dependency) -> list[Package]:
        packages = super().find_packages(dependency)
        if len(packages) == 0:
            raise PackageNotFoundError(f"Package [{dependency.name}] not found.")

        return packages

    def find_links_for_package(self, package: Package) -> list[Link]:
        return [
            Link(
                f"https://foo.bar/files/{package.name.replace('-', '_')}"
                f"-{package.version.to_string()}-py2.py3-none-any.whl"
            )
        ]


class CommandTesterFactory(Protocol):
    def __call__(
        self,
        command: str,
        poetry: Poetry | None = None,
        environment: Env | None = None,
    ) -> CommandTester: ...


class ProjectFactory(Protocol):
    def __call__(
        self,
        name: str,
        pyproject_content: str | None = None,
        source: Path | None = None,
    ) -> Poetry: ...


def copy_path(source: Path, dest: Path) -> None:
    if dest.is_dir():
        shutil.rmtree(dest)
    else:
        dest.unlink(missing_ok=True)

    if source.is_dir():
        shutil.copytree(source, dest)
    else:
        shutil.copyfile(source, dest)


class MockDulwichRepo:
    def __init__(self, root: Path | str, **__: Any) -> None:
        self.path = str(root)

    def head(self) -> bytes:
        return MOCK_DEFAULT_GIT_REVISION.encode()


def mock_clone(
    url: str,
    *_: Any,
    source_root: Path | None = None,
    **__: Any,
) -> MockDulwichRepo:
    # Checking source to determine which folder we need to copy
    parsed = ParsedUrl.parse(url)
    assert parsed.pathname is not None
    path = re.sub(r"(.git)?$", "", parsed.pathname.lstrip("/"))

    assert parsed.resource is not None
    folder = FIXTURE_PATH / "git" / parsed.resource / path
    assert folder.is_dir()

    if not source_root:
        source_root = Path(Config.create().get("cache-dir")) / "src"

    assert parsed.name is not None
    dest = source_root / parsed.name
    dest.mkdir(parents=True, exist_ok=True)

    copy_path(folder, dest)
    return MockDulwichRepo(dest)
