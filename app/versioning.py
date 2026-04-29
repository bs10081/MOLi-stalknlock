from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path

SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$")
REPO_ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = REPO_ROOT / "VERSION"


def _read_version_file() -> str:
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not SEMVER_PATTERN.fullmatch(version):
        raise RuntimeError(f"Invalid VERSION format: {version}")
    return version


@lru_cache(maxsize=1)
def get_app_version() -> str:
    version = os.getenv("APP_VERSION", "").strip() or _read_version_file()
    if not SEMVER_PATTERN.fullmatch(version):
        raise RuntimeError(f"Invalid app version format: {version}")
    return version


def get_build_info() -> dict[str, str]:
    build_info = {"version": get_app_version()}

    git_sha = os.getenv("GIT_SHA", "").strip()
    if git_sha:
        build_info["git_sha"] = git_sha

    built_at = os.getenv("BUILD_TIME", "").strip()
    if built_at:
        build_info["built_at"] = built_at

    return build_info
