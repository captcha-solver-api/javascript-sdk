"""Generate a Keep a Changelog section from Conventional Commit subjects."""
import argparse
import datetime as dt
import re
import subprocess
from pathlib import Path

GROUPS = {
    "feat": "Added", "fix": "Fixed", "perf": "Changed", "refactor": "Changed",
    "docs": "Documentation", "build": "Maintenance", "ci": "Maintenance",
    "chore": "Maintenance", "test": "Maintenance",
}

def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8").strip()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True)
    parser.add_argument("--repository", required=True)
    args = parser.parse_args()
    tags = git("tag", "--sort=-version:refname").splitlines()
    previous = next((tag for tag in tags if tag != args.tag), None)
    revision = f"{previous}..{args.tag}" if previous else args.tag
    subjects = git("log", revision, "--format=%s").splitlines()
    grouped: dict[str, list[str]] = {}
    for subject in subjects:
        match = re.match(r"([a-z]+)(?:\([^)]*\))?(!)?:\s*(.+)", subject)
        if not match:
            continue
        kind, breaking, text = match.groups()
        heading = "Breaking changes" if breaking else GROUPS.get(kind)
        if heading:
            grouped.setdefault(heading, []).append(text)
    version = args.tag.removeprefix("v")
    date = dt.date.today().isoformat()
    order = ["Breaking changes", "Added", "Fixed", "Changed", "Documentation", "Maintenance"]
    body = [f"## [{version}] - {date}", ""]
    for heading in order:
        if heading in grouped:
            body.extend([f"### {heading}", "", *[f"- {item}" for item in grouped[heading]], ""])
    compare = f"https://github.com/{args.repository}/compare/{previous}...{args.tag}" if previous else f"https://github.com/{args.repository}/releases/tag/{args.tag}"
    body.append(f"[Full diff]({compare})")
    section = "\n".join(body).rstrip() + "\n"
    changelog = Path("CHANGELOG.md")
    existing = changelog.read_text(encoding="utf-8") if changelog.exists() else "# Changelog\n\nAll notable changes are documented here.\n"
    if f"## [{version}]" not in existing:
        marker = "All notable changes are documented here.\n"
        existing = existing.replace(marker, marker + "\n" + section + "\n", 1)
        changelog.write_text(existing, encoding="utf-8")
    Path("release-notes.md").write_text(section, encoding="utf-8")

if __name__ == "__main__":
    main()
