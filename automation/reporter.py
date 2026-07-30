import socket
import sqlite3
import uuid
import yaml
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).parent
VERIFY_DIR = BASE_DIR / "verify"


def _cuid_lite() -> str:
    """Simple unique ID — not a real cuid but sufficient for test rows."""
    return "c" + uuid.uuid4().hex[:24]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_or_create_platform(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT id FROM Platform WHERE vendor = ? AND modelName = ?",
        ("IP Infusion", "OCNOS"),
    ).fetchone()
    if row:
        return row[0]
    platform_id = _cuid_lite()
    conn.execute(
        "INSERT INTO Platform (id, vendor, modelName, osVersion, createdAt) VALUES (?, ?, ?, ?, ?)",
        (platform_id, "IP Infusion", "OCNOS", "unknown", _now_iso()),
    )
    conn.commit()
    return platform_id


def _collect_detail(run_dir: Path, devices: list[str] | None) -> str:
    """Concatenate raw output files into a single detail string with separators."""
    blocks = []
    host_dirs = sorted(run_dir.iterdir()) if run_dir.exists() else []
    for host_dir in host_dirs:
        if not host_dir.is_dir():
            continue
        if devices and host_dir.name not in devices:
            continue
        for txt_file in sorted(host_dir.glob("*.txt")):
            header = f"=== {host_dir.name} / {txt_file.stem.replace('_', ' ')} ==="
            blocks.append(header)
            blocks.append(txt_file.read_text())
    return "\n".join(blocks)


def report_scenario(scenario: int, run_dir: Path, db_path: str) -> tuple[int, int]:
    verify_path = VERIFY_DIR / f"scenario-{scenario:02d}.yaml"
    with open(verify_path) as f:
        specs = yaml.safe_load(f)

    conn = sqlite3.connect(db_path)
    platform_id = _get_or_create_platform(conn)
    tester = socket.gethostname()
    now = _now_iso()
    created = updated = 0

    for spec in specs:
        tc = spec["test_case"]
        category, name = tc["category"], tc["name"]
        devices = spec.get("devices")

        row = conn.execute(
            "SELECT id FROM TestCase WHERE category = ? AND name = ?",
            (category, name),
        ).fetchone()
        if not row:
            print(f"[SKIP] TestCase not found: {category} / {name}")
            continue
        test_case_id = row[0]

        detail = _collect_detail(run_dir, devices)

        existing = conn.execute(
            "SELECT id FROM TestResult WHERE platformId = ? AND testCaseId = ?",
            (platform_id, test_case_id),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE TestResult SET status=?, detail=?, testedAt=?, testedBy=?, updatedAt=? "
                "WHERE platformId=? AND testCaseId=?",
                ("N/A", detail, now, tester, now, platform_id, test_case_id),
            )
            updated += 1
        else:
            conn.execute(
                "INSERT INTO TestResult (id, platformId, testCaseId, status, detail, testedAt, testedBy, createdAt, updatedAt) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (_cuid_lite(), platform_id, test_case_id, "N/A", detail, now, tester, now, now),
            )
            created += 1

    conn.commit()
    conn.close()
    print(f"[REPORT] scenario-{scenario:02d}: {created} created, {updated} updated")
    return created, updated
