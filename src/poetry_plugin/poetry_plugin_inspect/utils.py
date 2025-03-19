import sys
from packaging.version import parse
from typing import Optional


def compare_versions(
    current_version: Optional[str] = None, latest_version: Optional[str] = None
) -> str:
    """Compare versions and determine update type: major, minor, or patch."""

    if current_version is None or latest_version is None:
        raise ValueError

    curr_ver = parse(current_version)
    latest_ver = parse(latest_version)

    if curr_ver < latest_ver:
        if curr_ver.major < latest_ver.major:
            return "Major Update"
        elif curr_ver.minor < latest_ver.minor:
            return "Minor Update"
        else:
            return "Patch Update"
    return "Up-to-date"


def stdout_link(text: str, url: str) -> str:
    """Format text+url as a clickable link for stdout.

    If attached to a terminal, use escape sequences. Otherwise, just return
    the text.
    """
    if hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
        return f"\033]8;;{url}\a{text}\033]8;;\a"
    else:
        return text
