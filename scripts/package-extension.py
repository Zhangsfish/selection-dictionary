"""Package only known build artifacts; fixed ZIP metadata makes repeated packaging reproducible."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ["content.js", "content.js.map", "dictionary-metadata.json", "ECDICT-LICENSE.txt",
         "INSTALL.txt", "LICENSE", "manifest.json", "THIRD_PARTY_NOTICES.md"]


def main():
    manifest = json.loads((ROOT / "dist/manifest.json").read_text(encoding="utf-8"))
    source_manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest != source_manifest:
        raise ValueError("Stale dist manifest; run npm run build first.")
    version = manifest["version"]
    output = ROOT / "output"
    output.mkdir(exist_ok=True)
    archive_path = output / f"selection-dictionary-v{version}.zip"
    hashes = {}
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(FILES):
            content = (ROOT / "dist" / name).read_bytes()
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
            hashes[name] = hashlib.sha256(content).hexdigest()
    with zipfile.ZipFile(archive_path) as archive:
        if archive.testzip() is not None or sorted(archive.namelist()) != sorted(FILES):
            raise ValueError("ZIP verification failed")
    report = {"version": version, "files": hashes, "zipBytes": archive_path.stat().st_size,
              "zipSha256": hashlib.sha256(archive_path.read_bytes()).hexdigest()}
    (output / "release.json").write_bytes((json.dumps(report, indent=2) + "\n").encode("utf-8"))
    print(f"Packaged output/{archive_path.name}: {report['zipBytes']} bytes; manifest and ZIP CRC verified.")


if __name__ == "__main__":
    main()
