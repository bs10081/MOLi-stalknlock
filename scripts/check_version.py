#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$")
REPO_ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = REPO_ROOT / "VERSION"
FRONTEND_PACKAGE = REPO_ROOT / "frontend" / "package.json"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_repo_version() -> str:
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not SEMVER_PATTERN.fullmatch(version):
        fail(f"VERSION must be valid semver, got: {version}")
    return version


def read_frontend_version() -> str:
    package_data = json.loads(FRONTEND_PACKAGE.read_text(encoding="utf-8"))
    version = str(package_data.get("version", "")).strip()
    if not version:
        fail("frontend/package.json is missing version")
    return version


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate repo version metadata.")
    parser.add_argument("--tag", help="Optional git tag to validate, e.g. v2.1.1")
    args = parser.parse_args()

    repo_version = read_repo_version()
    frontend_version = read_frontend_version()

    if repo_version != frontend_version:
        fail(
            "frontend/package.json version does not match VERSION "
            f"({frontend_version} != {repo_version})"
        )

    if args.tag and args.tag != f"v{repo_version}":
        fail(f"Git tag {args.tag} does not match VERSION v{repo_version}")

    print(f"Version metadata OK: {repo_version}")


if __name__ == "__main__":
    main()
