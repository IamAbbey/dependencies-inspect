import os
from pathlib import Path
import subprocess
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

WEB_UI_DIR = Path(__file__).parent.parent / "webui"


class BuildFrontend(BuildHookInterface):  # type: ignore
    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        # Only build the front end once, in the source dist, the wheel build just copies it from there
        if self.target_name == "sdist":
            if not os.environ.get("SKIP_PRE_BUILD"):
                print("Building front end...")
                try:
                    subprocess.check_output(
                        "npm install",
                        cwd=WEB_UI_DIR,
                        shell=True,
                        stderr=subprocess.STDOUT,
                    )
                    subprocess.check_output(
                        "npm run build",
                        cwd=WEB_UI_DIR,
                        shell=True,
                        stderr=subprocess.STDOUT,
                    )
                except subprocess.CalledProcessError as e:
                    raise RuntimeError(
                        f"'{e.cmd}' got exit code {e.returncode}: {e.output}"
                    )

                return super().initialize(version, build_data)
