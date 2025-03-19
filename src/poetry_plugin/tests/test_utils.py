import unittest

from packaging.version import InvalidVersion

from poetry_plugin_inspect.command import PackageInfo
from poetry_plugin_inspect.utils import compare_versions


class TestCompareVersions(unittest.TestCase):
    def test_compare_versions_major_update(self) -> None:
        self.assertEqual(compare_versions("1.0.0", "2.0.0"), "Major Update")

    def test_compare_versions_minor_update(self) -> None:
        self.assertEqual(compare_versions("1.0.0", "1.1.0"), "Minor Update")

    def test_compare_versions_patch_update(self) -> None:
        self.assertEqual(compare_versions("1.0.0", "1.0.1"), "Patch Update")

    def test_compare_versions_up_to_date(self) -> None:
        self.assertEqual(compare_versions("1.0.0", "1.0.0"), "Up-to-date")

    def test_compare_versions_invalid_input(self) -> None:
        with self.assertRaises(ValueError):
            compare_versions(None, "1.0.0")

    def test_compare_versions_invalid_git_git(self) -> None:
        with self.assertRaises(InvalidVersion):
            compare_versions("0.1.1 9cf87a2", "0.1.2 9cf87a2")


class TestPackageInfo(unittest.TestCase):
    def test_update_type(self) -> None:
        package_info = PackageInfo(
            name="test_package",
            current_version="1.0.0",
            latest_version="2.0.0",
            update_status="update-possible",
            installed_status="installed",
            group="test_group",
            description="test_description",
        )
        self.assertEqual(package_info.update_type, "Major Update")

    def test_git_update_type(self) -> None:
        package_info = PackageInfo(
            name="test_package",
            current_version="0.1.1 9cf87a2",
            latest_version="0.1.2 9cf87a2",
            update_status="semver-safe-update",
            installed_status="installed",
            group="test_group",
            description="test_description",
        )
        self.assertEqual(package_info.update_type, "Unknown")


if __name__ == "__main__":
    unittest.main()
