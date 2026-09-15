"""Build a deterministic compact ECDICT subset. Python standard library only."""
import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/raw/ecdict.csv"
PIN = json.loads((ROOT / "data/source.json").read_text(encoding="utf-8"))
COMMIT = PIN["commit"]
REQUIRED = set("ownership downstream bottleneck marginal depreciation throughput company work run shift margin revenue inventory".split())
LEXICAL = re.compile(r"[a-z]+(?:['-][a-z]+)*\Z")


def rank(row):
    ranks = [int(row[k]) for k in ("bnc", "frq") if row[k].isdigit() and int(row[k]) > 0]
    return min(ranks, default=10**9)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Retrieve pinned CSV if missing (SHA-256 verified).")
    parser.add_argument("--check", action="store_true", help="Compare regeneration with committed data without overwriting it.")
    args = parser.parse_args()
    if not SOURCE.exists() and args.download:
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        temporary = SOURCE.with_suffix(".partial")
        digest = hashlib.sha256()
        with urlopen(PIN["dataUrl"], timeout=60) as response, temporary.open("wb") as target:
            while chunk := response.read(1024 * 1024):
                digest.update(chunk)
                target.write(chunk)
        if digest.hexdigest() != PIN["dataSha256"]:
            raise ValueError("Downloaded CSV failed pinned SHA-256 verification; partial file not used.")
        temporary.replace(SOURCE)
    if not SOURCE.exists():
        raise FileNotFoundError("Missing raw CSV. Run with --download, or supply the exact pinned file in data/raw/.")
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != PIN["dataSha256"]:
        raise ValueError("Raw CSV is not the pinned source; refusing to generate mislabeled data.")
    if hashlib.sha256((ROOT / "data/ECDICT-LICENSE.txt").read_bytes()).hexdigest() != PIN["licenseSha256"]:
        raise ValueError("Bundled upstream license differs from the pinned notice.")
    rows = {}
    total = 0
    with SOURCE.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            total += 1
            word = row["word"].lower()
            if not LEXICAL.fullmatch(word) or not re.search(r"[\u3400-\u9fff]", row["translation"]):
                continue
            if word not in rows or row["word"] == word:
                rows[word] = row
    selected = set(sorted(rows, key=lambda w: (rank(rows[w]), w))[:18000]) | REQUIRED
    entries = {}
    for word in sorted(selected):
        row = rows[word]
        entries[word] = [row["phonetic"], row["translation"].replace("\\n", "\n").strip()]
    aliases = {}
    for word, row in sorted(rows.items()):
        for field in row["exchange"].split("/"):
            kind, sep, base = field.partition(":")
            if sep and kind == "0" and base in entries and word not in entries:
                aliases[word] = base
    payload = {"entries": entries, "aliases": aliases}
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    metadata = {
        "source": f"https://github.com/skywind3000/ECDICT/tree/{COMMIT}",
        "sourceFile": "ecdict.csv", "license": "MIT; verbatim notice in ECDICT-LICENSE.txt",
        "sourceBytes": SOURCE.stat().st_size, "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "sourceRows": total, "eligibleLexicalEntries": len(rows),
        "selection": "18,000 entries ranked by min(positive bnc, positive frq), plus acceptance vocabulary; exact entry before lemma",
        "entries": len(entries), "aliases": len(aliases),
        "entriesWithPhonetic": sum(bool(v[0].strip()) for v in entries.values()),
        "outputBytes": len(encoded), "outputSha256": hashlib.sha256(encoded).hexdigest(),
        "fields": "word -> [phonetic, full Chinese translation]; aliases from exchange:0",
        "notes": "No invented phonetics or contextual senses. Original phonetic notation retained; not standardized to a single accent."
    }
    metadata_bytes = (json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    artifacts = {"dictionary.json": encoded, "metadata.json": metadata_bytes}
    for filename, content in artifacts.items():
        target = ROOT / "data" / filename
        if args.check:
            # Metadata comparisons tolerate legacy CRLF checkouts; new output always uses LF.
            existing = target.read_bytes()
            if filename.endswith("metadata.json"):
                existing = existing.replace(b"\r\n", b"\n")
            if existing != content:
                raise ValueError(f"Regeneration does not match data/{filename}.")
        else:
            target.write_bytes(content)
    if args.check:
        print("Pinned dictionary regeneration matches committed data.")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
