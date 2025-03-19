from __future__ import annotations

import os
import shutil
from collections.abc import Iterator
from pathlib import Path
from typing import TYPE_CHECKING, Optional

import pytest
from cleo.io.null_io import NullIO
from cleo.testers.command_tester import CommandTester
from poetry.factory import Factory
from poetry.packages.direct_origin import _get_package_from_git
from poetry.repositories import RepositoryPool
from poetry.repositories.installed_repository import InstalledRepository
from poetry.utils.env import MockEnv
from pytest import FixtureRequest
from pytest_mock import MockerFixture

from tests.helpers import (
    MOCK_DEFAULT_GIT_REVISION,
    CommandTesterFactory,
    PoetryTestApplication,
    ProjectFactory,
    TestLocker,
    TestRepository,
    mock_clone,
)

if TYPE_CHECKING:
    from poetry.poetry import Poetry
    from poetry.repositories import Repository
    from poetry.utils.env import Env


@pytest.fixture(autouse=True)
def setup(
    mocker: MockerFixture,
    installed: Repository,
    env: MockEnv,
) -> Iterator[None]:
    # Do not run pip commands of the executor
    mocker.patch("poetry.installation.executor.Executor.run_pip")

    p = mocker.patch("poetry.installation.installer.Installer._get_installed")
    p.return_value = installed

    p = mocker.patch(
        "poetry.repositories.installed_repository.InstalledRepository.load"
    )
    p.return_value = installed

    # Patch git module to not actually clone projects
    mocker.patch("poetry.vcs.git.Git.clone", new=mock_clone)
    p = mocker.patch("poetry.vcs.git.Git.get_revision")
    p.return_value = MOCK_DEFAULT_GIT_REVISION

    # Patch the virtual environment creation do actually do nothing
    mocker.patch("poetry.utils.env.EnvManager.create_venv", return_value=env)

    # Patch the virtual environment creation do actually do nothing
    mocker.patch("poetry.utils.env.EnvManager.create_venv", return_value=env)

    # Setting terminal width
    environ = dict(os.environ)
    os.environ["COLUMNS"] = "80"

    yield

    os.environ.clear()
    os.environ.update(environ)


@pytest.fixture(autouse=True)
def git_mock(mocker: MockerFixture, request: FixtureRequest) -> None:
    if request.node.get_closest_marker("skip_git_mock"):
        return

    # Patch git module to not actually clone projects
    mocker.patch("poetry.vcs.git.Git.clone", new=mock_clone)
    p = mocker.patch("poetry.vcs.git.Git.get_revision")
    p.return_value = MOCK_DEFAULT_GIT_REVISION

    _get_package_from_git.cache_clear()


@pytest.fixture
def repo() -> TestRepository:
    return TestRepository(name="foo")


@pytest.fixture
def installed() -> InstalledRepository:
    return InstalledRepository()


@pytest.fixture
def project_factory(tmp_path: Path, repo: TestRepository) -> ProjectFactory:
    workspace = tmp_path

    def _factory(
        name: Optional[str] = None,
        pyproject_content: Optional[str] = None,
        source: Optional[Path] = None,
    ) -> Poetry:
        project_dir = workspace / f"poetry-fixture-{name}"

        if pyproject_content or source:
            if source:
                project_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(source, project_dir)
            else:
                project_dir.mkdir(parents=True, exist_ok=True)

            if pyproject_content:
                with (project_dir / "pyproject.toml").open("w", encoding="utf-8") as f:
                    f.write(pyproject_content)

        poetry = Factory().create_poetry(project_dir)

        locker = TestLocker(poetry.locker.lock, poetry.locker._pyproject_data)
        locker.write()

        poetry.set_locker(locker)

        pool = RepositoryPool()
        pool.add_repository(repo)

        poetry.set_pool(pool)

        return poetry

    return _factory


@pytest.fixture(scope="session")
def fixture_base() -> Path:
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def project_directory() -> str:
    return "simple_project"


@pytest.fixture
def poetry(
    project_directory: str,
    project_factory: ProjectFactory,
    fixture_base: Path,
) -> Poetry:
    return project_factory(name="simple", source=fixture_base / project_directory)


@pytest.fixture
def app(poetry: Poetry) -> PoetryTestApplication:
    app_ = PoetryTestApplication(poetry)
    io = NullIO()
    app_._load_plugins(io)
    return app_


@pytest.fixture
def env(tmp_path: Path) -> MockEnv:
    path = tmp_path / ".venv"
    path.mkdir(parents=True)
    return MockEnv(path=path, is_venv=True)


@pytest.fixture
def command_tester_factory(
    app: PoetryTestApplication, env: MockEnv
) -> CommandTesterFactory:
    def _tester(
        command: str,
        poetry: Optional[Poetry] = None,
        environment: Optional[Env] = None,
    ) -> CommandTester:
        command_obj = app.find(command)
        tester = CommandTester(command_obj)

        if poetry:
            app._poetry = poetry

        poetry = app.poetry

        if hasattr(command_obj, "set_env"):
            command_obj.set_env(environment or env)

        return tester

    return _tester
