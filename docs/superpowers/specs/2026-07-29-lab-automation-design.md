# Lab Automation Design — IPv6 Compliance Test Automation

**Date:** 2026-07-29
**Scope:** Automate config push, verification capture, and compliance tracker population for the 9 OCNOS lab scenarios against Juniper MX204 peers.

---

## 1. Goals

1. **Render** Jinja2 templates into per-device config files (no device connection required).
2. **Push** rendered configs to devices over SSH.
3. **Verify** by running scenario-defined show commands and saving raw output to disk.
4. **Report** by writing pre-populated `TestResult` rows (status `N/A`, raw output in `detail`) into the existing SQLite compliance tracker database for human review.

All four phases run independently or as a full pipeline via a single CLI invocation.

---

## 2. Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| SSH orchestration | Nornir 3.x + Netmiko | Pure Python, parallel by default, easy platform extensibility |
| Inventory format | Nornir `hosts.yaml` / `groups.yaml` (Ansible-compatible layout) | Teams can also read inventory with Ansible; credentials in `group_vars/` |
| Templating | Jinja2 | Standard, well-understood, already used in network automation tooling |
| CLI | Click | Clean subcommand structure; composable with `uv run` |
| Python tooling | `uv` (no venv, `pyproject.toml`) | Fast, self-contained, no manual activation |
| Database writes | `sqlite3` stdlib | Keeps automation stack independent of Node.js/Prisma |

---

## 3. Repository Layout

```
automation/
├── inventory/
│   ├── hosts.yaml              # Device inventory (Ansible-compatible)
│   ├── groups.yaml             # Platform groups: ocnos, junos
│   └── group_vars/
│       ├── ocnos.yaml          # OCNOS connection defaults (port, timeout, prompt)
│       ├── junos.yaml          # Junos connection defaults
│       └── all.yaml            # Credentials — GITIGNORED
│
├── templates/
│   ├── vars/
│   │   └── global.yaml         # Shared address plan, ASNs, VNIs, locator blocks
│   ├── scenario-01/
│   │   ├── ocnos.j2
│   │   ├── mx204-1.j2
│   │   ├── mx204-2.j2
│   │   └── mx204-3.j2
│   └── scenario-02/ … scenario-09/
│
├── verify/
│   ├── scenario-01.yaml        # Commands + test case labels per scenario
│   └── scenario-02.yaml … scenario-09.yaml
│
├── drivers/
│   ├── base.py                 # Abstract BaseDriver
│   ├── ocnos.py                # OcnosDriver (Netmiko linux/ocnos platform)
│   └── junos.py                # JunosDriver (Netmiko juniper_junos)
│
├── rendered/                   # GITIGNORED — output of `render` subcommand
├── output/                     # GITIGNORED — raw show command output
│
├── run.py                      # Click CLI entrypoint
├── pipeline.py                 # Nornir-based phase orchestration
├── reporter.py                 # SQLite TestResult writer
└── pyproject.toml              # uv-managed dependencies + script entry point
```

---

## 4. Inventory Format

**`inventory/hosts.yaml`:**
```yaml
ocnos-dut:
  hostname: 2001:db8:mgmt::10
  platform: ocnos
  groups: [ocnos, lab]
  data:
    scenarios: [1,2,3,4,5,6,7,8,9]

mx204-1:
  hostname: 2001:db8:12::1
  platform: junos
  groups: [junos, lab]
  data:
    scenarios: [1,2,3,4,5,6,7,8,9]

mx204-2:
  hostname: 2001:db8:13::1
  platform: junos
  groups: [junos, lab]

mx204-3:
  hostname: 2001:db8:14::1
  platform: junos
  groups: [junos, lab]
```

**`inventory/group_vars/all.yaml`** (gitignored):
```yaml
username: admin
password: CHANGEME
```

Credentials are never hardcoded in committed files. `group_vars/all.yaml` is gitignored. `pipeline.py` overrides username/password from `LAB_USERNAME` / `LAB_PASSWORD` environment variables at runtime if set, taking precedence over the file.

---

## 5. Platform Driver Interface

**`drivers/base.py`:**
```python
from abc import ABC, abstractmethod

class BaseDriver(ABC):
    @abstractmethod
    def push_config(self, host, config_text: str) -> None:
        """Send config_text to device and commit/save."""

    @abstractmethod
    def run_commands(self, host, commands: list[str]) -> dict[str, str]:
        """Run each command; return {command: raw_output}."""

    @abstractmethod
    def reset_config(self, host) -> None:
        """Load a known-clean baseline before a scenario run."""
```

**Driver registry in `pipeline.py`:**
```python
from drivers.ocnos import OcnosDriver
from drivers.junos import JunosDriver

DRIVERS: dict[str, type[BaseDriver]] = {
    "ocnos": OcnosDriver,
    "junos": JunosDriver,
}
```

Adding a new platform (e.g. Arista EOS): create `drivers/eos.py`, subclass `BaseDriver`, add `"eos": EosDriver` to `DRIVERS`, set `platform: eos` on the relevant hosts in `hosts.yaml`. No other files change.

**`OcnosDriver`** uses Netmiko `linux` (or `ocnos` if IP Infusion ships a Netmiko platform definition). Config push sends lines one at a time via CLI; no config replace mode assumed.

**`JunosDriver`** uses Netmiko `juniper_junos`. Config push enters `configure`, issues `load set terminal`, pastes the `set` lines, then runs `commit and-quit`.

---

## 6. CLI Subcommands

Entry point: `uv run lab-push` (or `uv run python run.py`).

```
lab-push render  --scenario <N|all>
lab-push push    --scenario <N|all> [--device <hostname>]
lab-push verify  --scenario <N|all> [--device <hostname>]
lab-push report  --scenario <N|all>
lab-push all     --scenario <N|all> [--device <hostname>]
```

- `--scenario all` iterates 1–9 in order.
- `--device` filters to a single host; omitting it targets all hosts for that scenario.
- `all` runs render → push → verify → report in sequence. If push fails for a host, verify and report are skipped for that host only; other hosts continue.

---

## 7. Phase Details

### 7.1 Render

1. Load `templates/vars/global.yaml`.
2. Load any per-scenario vars file if present (`templates/vars/scenario-NN.yaml`).
3. For each device in the scenario, render `templates/scenario-NN/<device>.j2` with the merged variable context.
4. Write output to `rendered/scenario-NN/<device>.cfg`.
5. No device connection. Safe to run as a dry-run/preview step.

### 7.2 Push

1. Nornir initialises from `inventory/` with a `SimpleInventory` plugin pointing at `hosts.yaml` / `groups.yaml`.
2. Filter hosts by scenario membership (`host.data["scenarios"]`) and optional `--device` flag.
3. Fan out in parallel (default 5 workers, configurable via `--workers`).
4. Each task: look up driver from `DRIVERS[host.platform]`, call `driver.push_config(host, rendered_config)`.
5. Collect results; print summary table (host / OK / error). Exit non-zero if any host failed.

### 7.3 Verify

1. Load `verify/scenario-NN.yaml`.
2. For each test case entry, determine target devices (from `devices:` field or default to all scenario hosts).
3. For each device, call `driver.run_commands(host, commands)`.
4. Write each command's output to:
   `output/scenario-NN-<ISO8601-timestamp>/<hostname>/<sanitised-command>.txt`
5. Write `output/scenario-NN-<timestamp>/errors.log` for any connection or command failures.
6. Print per-host per-command status to stdout.

### 7.4 Report

1. Locate the most recent timestamped output directory for the scenario (or accept `--run-dir` override).
2. Open the SQLite database at `DATABASE_URL` (env var, same as the Next.js app).
3. For each test case in `verify/scenario-NN.yaml`:
   a. Look up `testCaseId` by `(category, name)` — error loudly if not found.
   b. Look up or create `platformId` for `ocnos-dut` (vendor=`IP Infusion`, modelName=`OCNOS`).
   c. Upsert `TestResult`: `status="N/A"`, `detail=<concatenated output, each block prefixed with "=== <hostname> / <command> ===" separator>`, `testedAt=now()`, `testedBy=<local hostname>`.
4. Print count of rows created/updated.

---

## 8. Verify Spec Format

**`verify/scenario-01.yaml`:**
```yaml
- test_case:
    category: "Network Management & Telemetry"
    name: "SSH (SSHv2)"
  devices: [ocnos-dut]
  commands:
    - "show ssh session"
    - "show running-config | include ssh"

- test_case:
    category: "Network Management & Telemetry"
    name: "NTP"
  devices: [ocnos-dut, mx204-1, mx204-2, mx204-3]
  commands:
    - "show ntp status"
    - "show ntp associations"
```

One YAML file per scenario. Each entry maps exactly to one `TestCase` row in the database by `(category, name)`. The `devices` list controls which hosts run the commands; their combined output is concatenated into the single `detail` field.

---

## 9. Error Handling

| Failure type | Behaviour |
|---|---|
| SSH connection refused / timeout | Logged to `errors.log`; host marked failed; pipeline continues for other hosts |
| Authentication failure | Same as above; printed prominently to stdout |
| Command timeout | Partial output saved; error appended to that command's output file |
| `testCaseId` not found in DB | `report` phase errors loudly and skips that entry; all others continue |
| `DATABASE_URL` not set | `report` phase exits immediately with a clear message |
| Push fails on one host | `verify` and `report` skipped for that host only in `all` mode |

---

## 10. Extensibility Contract

To add a new platform:

1. Create `drivers/<platform>.py` implementing `BaseDriver`.
2. Add `"<platform>": <DriverClass>` to `DRIVERS` in `pipeline.py`.
3. Add hosts with `platform: <platform>` to `hosts.yaml`.
4. Add a group entry in `groups.yaml` with appropriate Netmiko connection defaults.
5. Write templates and verify specs as normal.

No changes to `run.py`, `pipeline.py` phases, or `reporter.py`.

---

## 11. Dependencies (`pyproject.toml`)

```toml
[project]
name = "lab-automation"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "nornir>=3.4",
  "nornir-netmiko>=1.0",
  "nornir-utils>=0.2",
  "netmiko>=4.3",
  "jinja2>=3.1",
  "click>=8.1",
  "pyyaml>=6.0",
]

[project.scripts]
lab-push = "run:cli"
```

---

## 12. What Is Out of Scope

- Output parsing and automatic PASS/FAIL determination (future phase B).
- gNMI / NETCONF / RESTCONF transport (future; driver interface is already transport-agnostic).
- CI/CD integration (future; the CLI exit codes make it pipeline-friendly when needed).
- Config rollback / reset automation beyond the `reset_config()` stub on `BaseDriver`.
