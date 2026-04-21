#!/usr/bin/env python3
"""
Local integrity checker for the Manufactured Traction Research Vault.

Run from the vault root:
    python 14_QA_VALIDATION/run_local_integrity_check.py

The checksum manifest intentionally excludes self-referential QA files and MANIFEST.md.
"""
from pathlib import Path
import csv, hashlib, sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "14_QA_VALIDATION" / "file_manifest.csv"

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> int:
    if not MANIFEST.exists():
        print("Missing manifest:", MANIFEST)
        return 2
    failures = []
    checked = 0
    with MANIFEST.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            p = ROOT / row["path"]
            if not p.exists():
                failures.append((row["path"], "missing"))
                continue
            actual = sha256(p)
            if actual != row["sha256"]:
                failures.append((row["path"], "sha256 mismatch"))
            checked += 1
    if failures:
        print("Integrity check failed:")
        for path, reason in failures[:50]:
            print("-", path, reason)
        if len(failures) > 50:
            print(f"... and {len(failures)-50} more")
        return 1
    print(f"Integrity check passed: {checked} files verified.")
    print("Note: QA files and MANIFEST.md are intentionally excluded because they are self-referential.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
