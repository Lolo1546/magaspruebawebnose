from __future__ import annotations

import csv
import hashlib
import re
import zipfile
from pathlib import Path

ORIGINAL = Path(r"C:\Users\ELIAS\Desktop\MangaZone")
TARGET = Path(r"C:\Users\ELIAS\Desktop\MangaZone-Sites-Transfer")
ARCHIVE = TARGET / "MangaZone-Sites-Transfer.zip"

def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()

def main() -> None:
    assert TARGET.resolve() != ORIGINAL.resolve()
    with (TARGET / "MANIFEST.csv").open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    expected = {r["transferencia"] for r in rows}
    actual = {p.relative_to(TARGET).as_posix() for p in TARGET.rglob("*") if p.is_file() and p != ARCHIVE}
    assert expected == actual, f"Manifest mismatch: {expected ^ actual}"
    copied = 0
    with zipfile.ZipFile(ARCHIVE, "r") as z:
        assert z.testzip() is None
        assert set(z.namelist()) == expected
        for row in rows:
            relative = row["transferencia"]
            disk = (TARGET / relative).read_bytes()
            packed = z.read(relative)
            assert disk == packed, relative
            if row["sha256"]:
                assert hash_bytes(disk) == row["sha256"].upper(), relative
            if row["origen"] != "generado:S0.5":
                assert Path(row["origen"]).read_bytes() == disk, relative
                copied += 1
            assert not Path(relative).name.startswith(".env")
            assert not re.search(r"/(?:node_modules|dist|\.next|\.git|test|tests)/", "/" + relative + "/")
            assert not re.search(rb"\bsk-[A-Za-z0-9_-]{20,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", disk)
    design_files = [r for r in rows if r["transferencia"].startswith("reference/designs/")]
    migrations = [r for r in rows if r["transferencia"].endswith("/migration.sql")]
    print(f"manifest_entries={len(rows)} source_files_byte_identical={copied} designs={len(design_files)} migrations={len(migrations)}")
    print(f"zip_bytes={ARCHIVE.stat().st_size} zip_sha256={hash_bytes(ARCHIVE.read_bytes())}")
    print("zip_open=ok contents_match_manifest=ok security_patterns=clear")

if __name__ == "__main__":
    main()
