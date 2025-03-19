from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from poetry.factory import Factory

from poetry_plugin_inspect.command import DEFAULT_OUTPUT_DIR_NAME, PackageInfo
from tests.helpers import (
    MOCK_DEFAULT_GIT_REVISION,
    CommandTesterFactory,
    TestLocker,
    TestRepository,
    get_package,
)

if TYPE_CHECKING:
    from cleo.testers.command_tester import CommandTester
    from poetry.poetry import Poetry
    from poetry.repositories import Repository
    from pytest_mock import MockerFixture


@pytest.fixture
def tester(command_tester_factory: CommandTesterFactory) -> CommandTester:
    return command_tester_factory("inspect")


@pytest.mark.parametrize("show_latest", [True, False])
def test_inspect_with_installed_packages(
    mocker: MockerFixture,
    tester: CommandTester,
    poetry: Poetry,
    installed: Repository,
    repo: TestRepository,
    show_latest: bool,
) -> None:
    poetry.package.add_dependency(Factory.create_dependency("cachy", "^0.1.0"))
    poetry.package.add_dependency(
        Factory.create_dependency("pendulum", "^2.0.0", groups=["time"])
    )
    poetry.package.add_dependency(
        Factory.create_dependency("pytest", "^3.7.3", groups=["dev"])
    )

    cachy_010 = get_package("cachy", "0.1.0")
    cachy_010.description = "Cachy package"
    cachy_020 = get_package("cachy", "0.2.0")
    cachy_020.description = "Cachy package"

    pendulum_200 = get_package("pendulum", "2.0.0")
    pendulum_200.description = "Pendulum package"

    pytest_373 = get_package("pytest", "3.7.3")
    pytest_373.description = "Pytest package"

    installed.add_package(cachy_010)
    installed.add_package(pendulum_200)
    installed.add_package(pytest_373)

    repo.add_package(cachy_010)
    repo.add_package(cachy_020)
    repo.add_package(pendulum_200)
    repo.add_package(pytest_373)

    assert isinstance(poetry.locker, TestLocker)
    poetry.locker.mock_lock_data(
        {
            "package": [
                {
                    "name": "cachy",
                    "version": "0.1.0",
                    "description": "Cachy package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
                {
                    "name": "pendulum",
                    "version": "2.0.0",
                    "description": "Pendulum package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
                {
                    "name": "pytest",
                    "version": "3.7.3",
                    "description": "Pytest package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
            ],
            "metadata": {
                "python-versions": "*",
                "platform": "*",
                "content-hash": "123456789",
                "files": {"cachy": [], "pendulum": [], "pytest": []},
            },
        }
    )

    export_mock = mocker.patch(
        "poetry_plugin_inspect.command.InspectPackageCommand.export"
    )
    tester.execute("--latest" if show_latest else "")

    expected = [
        PackageInfo(
            name="cachy",
            current_version="0.1.0",
            latest_version="0.2.0" if show_latest else None,
            update_status="update-possible" if show_latest else None,
            installed_status="installed",
            group="main",
            description="Cachy package",
        ),
        PackageInfo(
            name="pendulum",
            current_version="2.0.0",
            latest_version="2.0.0" if show_latest else None,
            update_status="up-to-date" if show_latest else None,
            installed_status="installed",
            group="time",
            description="Pendulum package",
        ),
        PackageInfo(
            name="pytest",
            current_version="3.7.3",
            latest_version="3.7.3" if show_latest else None,
            update_status="up-to-date" if show_latest else None,
            installed_status="installed",
            group="dev",
            description="Pytest package",
        ),
    ]
    export_mock.assert_called_once_with(expected, DEFAULT_OUTPUT_DIR_NAME)


@pytest.mark.parametrize("project_directory", ["project_with_git_dev_dependency"])
def test_show_outdated_git_dev_dependency(
    mocker: MockerFixture,
    tester: CommandTester,
    poetry: Poetry,
    installed: Repository,
    repo: TestRepository,
) -> None:
    cachy_010 = get_package("cachy", "0.1.0")
    cachy_010.description = "Cachy package"
    cachy_020 = get_package("cachy", "0.2.0")
    cachy_020.description = "Cachy package"

    pendulum_200 = get_package("pendulum", "2.0.0")
    pendulum_200.description = "Pendulum package"

    demo_011 = get_package("demo", "0.1.1")
    demo_011.description = "Demo package"

    pytest = get_package("pytest", "3.4.3")
    pytest.description = "Pytest package"

    installed.add_package(cachy_010)
    installed.add_package(pendulum_200)
    installed.add_package(demo_011)
    installed.add_package(pytest)

    repo.add_package(cachy_010)
    repo.add_package(cachy_020)
    repo.add_package(pendulum_200)
    repo.add_package(pytest)

    assert isinstance(poetry.locker, TestLocker)
    poetry.locker.mock_lock_data(
        {
            "package": [
                {
                    "name": "cachy",
                    "version": "0.1.0",
                    "description": "Cachy package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
                {
                    "name": "pendulum",
                    "version": "2.0.0",
                    "description": "Pendulum package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
                {
                    "name": "demo",
                    "version": "0.1.1",
                    "description": "Demo package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                    "source": {
                        "type": "git",
                        "reference": MOCK_DEFAULT_GIT_REVISION,
                        "resolved_reference": MOCK_DEFAULT_GIT_REVISION,
                        "url": "https://github.com/demo/demo.git",
                    },
                },
                {
                    "name": "pytest",
                    "version": "3.4.3",
                    "description": "Pytest package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
            ],
            "metadata": {
                "python-versions": "*",
                "platform": "*",
                "content-hash": "123456789",
                "files": {"cachy": [], "pendulum": [], "demo": [], "pytest": []},
            },
        }
    )
    export_mock = mocker.patch(
        "poetry_plugin_inspect.command.InspectPackageCommand.export"
    )
    tester.execute("--latest")

    expected = [
        PackageInfo(
            name="cachy",
            current_version="0.1.0",
            latest_version="0.2.0",
            update_status="update-possible",
            installed_status="installed",
            group="main",
            description="Cachy package",
        ),
        PackageInfo(
            name="pendulum",
            current_version="2.0.0",
            latest_version="2.0.0",
            update_status="up-to-date",
            installed_status="installed",
            group="main",
            description="Pendulum package",
        ),
        PackageInfo(
            name="demo",
            current_version="0.1.1 9cf87a2",
            latest_version="0.1.2 9cf87a2",
            update_status="semver-safe-update",
            installed_status="installed",
            group="dev",
            description="Demo package",
        ),
        PackageInfo(
            name="pytest",
            current_version="3.4.3",
            latest_version="3.4.3",
            update_status="up-to-date",
            installed_status="installed",
            group="dev",
            description="Pytest package",
        ),
    ]
    export_mock.assert_called_once_with(expected, DEFAULT_OUTPUT_DIR_NAME)


def test_show_required_by_deps(
    mocker: MockerFixture,
    tester: CommandTester,
    poetry: Poetry,
    installed: Repository,
    repo: TestRepository,
) -> None:
    poetry.package.add_dependency(Factory.create_dependency("cachy", "^0.2.0"))
    poetry.package.add_dependency(Factory.create_dependency("pendulum", "2.0.0"))

    cachy2 = get_package("cachy", "0.2.0")
    cachy2.add_dependency(Factory.create_dependency("pytest", "^3.7.3"))

    pendulum = get_package("pendulum", "2.0.0")
    pendulum.add_dependency(Factory.create_dependency("cachy", "^0.2.0"))

    pytest_373 = get_package("pytest", "3.7.3")

    installed.add_package(cachy2)
    installed.add_package(pendulum)
    installed.add_package(pytest_373)

    repo.add_package(cachy2)
    repo.add_package(pendulum)
    repo.add_package(pytest_373)

    assert isinstance(poetry.locker, TestLocker)
    poetry.locker.mock_lock_data(
        {
            "package": [
                {
                    "name": "cachy",
                    "version": "0.2.0",
                    "description": "",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                    "dependencies": {"pytest": "^3.7.3"},
                },
                {
                    "name": "pendulum",
                    "version": "2.0.0",
                    "description": "Pendulum package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                    "dependencies": {"cachy": ">=0.2.0 <0.3.0"},
                },
                {
                    "name": "pytest",
                    "version": "3.7.3",
                    "description": "Pytest package",
                    "optional": False,
                    "platform": "*",
                    "python-versions": "*",
                    "checksum": [],
                },
            ],
            "metadata": {
                "python-versions": "*",
                "platform": "*",
                "content-hash": "123456789",
                "files": {"cachy": [], "pendulum": [], "pytest": []},
            },
        }
    )

    export_mock = mocker.patch(
        "poetry_plugin_inspect.command.InspectPackageCommand.export"
    )
    tester.execute("--latest")

    expected = [
        PackageInfo(
            name="cachy",
            current_version="0.2.0",
            latest_version="0.2.0",
            update_status="up-to-date",
            installed_status="installed",
            compatible=True,
            group="main",
            description="",
            dependencies={"pytest": "^3.7.3"},
            required_by=["pendulum"],
        ),
        PackageInfo(
            name="pendulum",
            current_version="2.0.0",
            latest_version="2.0.0",
            update_status="up-to-date",
            installed_status="installed",
            compatible=True,
            group="main",
            description="Pendulum package",
            dependencies={"cachy": ">=0.2.0 <0.3.0"},
            required_by=[],
        ),
        PackageInfo(
            name="pytest",
            current_version="3.7.3",
            latest_version="3.7.3",
            update_status="up-to-date",
            installed_status="installed",
            compatible=True,
            group="dependencies",
            description="Pytest package",
            dependencies={},
            required_by=["cachy"],
        ),
    ]
    export_mock.assert_called_once_with(expected, DEFAULT_OUTPUT_DIR_NAME)
