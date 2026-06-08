from __future__ import annotations

import shutil
import sys
from pathlib import Path


PRIVATE_OUTPUT_PATHS = ("private",)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: clean_public_site.py SITE_DIR", file=sys.stderr)
        return 2

    site_dir = Path(sys.argv[1]).resolve()
    if not site_dir.is_dir():
        print(f"site directory does not exist: {site_dir}", file=sys.stderr)
        return 1

    for relative_path in PRIVATE_OUTPUT_PATHS:
        target = site_dir / relative_path
        if target.is_dir():
            shutil.rmtree(target)
            print(f"removed {target}")
        elif target.exists():
            target.unlink()
            print(f"removed {target}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
