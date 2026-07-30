# automation/tests/test_reporter.py
import sqlite3
from pathlib import Path

import pytest
from reporter import report_scenario


def _create_schema(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS Platform (
            id TEXT PRIMARY KEY,
            vendor TEXT NOT NULL,
            modelName TEXT NOT NULL,
            osVersion TEXT NOT NULL,
            createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS TestCase (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            rfcReference TEXT,
            severity TEXT NOT NULL DEFAULT 'MANDATORY',
            tags TEXT NOT NULL DEFAULT '[]',
            UNIQUE(category, name)
        );
        CREATE TABLE IF NOT EXISTS TestResult (
            id TEXT PRIMARY KEY,
            platformId TEXT NOT NULL,
            testCaseId TEXT NOT NULL,
            status TEXT NOT NULL,
            detail TEXT,
            testedAt TEXT,
            testedBy TEXT,
            firmwareBuild TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            UNIQUE(platformId, testCaseId),
            FOREIGN KEY (platformId) REFERENCES Platform(id),
            FOREIGN KEY (testCaseId) REFERENCES TestCase(id)
        );
    """)
    conn.commit()


def _seed_test_cases(conn):
    conn.execute("""
        INSERT INTO TestCase (id, category, name, description, severity, tags)
        VALUES ('tc-001', 'Network Management & Telemetry', 'NTP',
                'Verify NTP over IPv6', 'MANDATORY', '[]')
    """)
    conn.commit()


@pytest.fixture
def db_path(tmp_path):
    db = tmp_path / "test.db"
    conn = sqlite3.connect(str(db))
    _create_schema(conn)
    _seed_test_cases(conn)
    conn.close()
    return str(db)


@pytest.fixture
def run_dir(tmp_path):
    # Simulate a verify output directory with one command output
    d = tmp_path / "scenario-01-20260729T120000"
    (d / "ocnos-dut").mkdir(parents=True)
    (d / "ocnos-dut" / "show_ntp_status.txt").write_text("stratum 2, synced")
    (d / "ocnos-dut" / "show_ntp_associations.txt").write_text("192.0.2.1 refid .GPS.")
    return d


class TestReportScenario:
    def test_creates_test_result_row(self, db_path, run_dir):
        created, updated = report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)
        assert created >= 1

        conn = sqlite3.connect(db_path)
        rows = conn.execute("SELECT status, detail FROM TestResult").fetchall()
        conn.close()
        assert len(rows) >= 1
        assert rows[0][0] == "N/A"

    def test_detail_contains_command_output(self, db_path, run_dir):
        report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)

        conn = sqlite3.connect(db_path)
        detail = conn.execute("SELECT detail FROM TestResult LIMIT 1").fetchone()[0]
        conn.close()
        assert "stratum 2" in detail

    def test_detail_contains_hostname_separator(self, db_path, run_dir):
        report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)

        conn = sqlite3.connect(db_path)
        detail = conn.execute("SELECT detail FROM TestResult LIMIT 1").fetchone()[0]
        conn.close()
        assert "=== ocnos-dut" in detail

    def test_upsert_updates_existing_row(self, db_path, run_dir):
        report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)
        created1, updated1 = report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)
        assert updated1 >= 1

    def test_missing_test_case_skips_and_continues(self, db_path, run_dir, capsys):
        # scenario-01.yaml has entries not seeded in the test DB — should skip loudly
        report_scenario(scenario=1, run_dir=run_dir, db_path=db_path)
        out = capsys.readouterr().out
        assert "SKIP" in out or "not found" in out.lower()
