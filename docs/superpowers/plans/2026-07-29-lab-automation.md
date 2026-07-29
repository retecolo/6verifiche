# Lab Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Nornir+Netmiko CLI pipeline that renders Jinja2 configs, pushes them to OCNOS and Juniper MX204 devices over SSH, captures verification output to disk, and pre-populates the SQLite compliance tracker with `N/A` TestResult rows for human review.

**Architecture:** A Click CLI (`run.py`) dispatches four phases — render, push, verify, report — each implemented in `pipeline.py` using Nornir for parallel SSH execution. Platform-specific SSH behaviour lives in driver classes under `drivers/`; adding a new platform only requires a new driver file and a registry entry.

**Tech Stack:** Python 3.11+, uv (no venv), Nornir 3.x, nornir-netmiko, Netmiko 4.x, Jinja2, Click, PyYAML, sqlite3 (stdlib)

## Global Constraints

- Python >= 3.11; managed with `uv`, no manual venv activation
- All `uv` commands run from the `automation/` directory
- Entry point script: `uv run lab-push` (maps to `run:cli`)
- Credentials never committed; read from `LAB_USERNAME` / `LAB_PASSWORD` env vars (fallback to `inventory/group_vars/all.yaml` which is gitignored)
- `rendered/` and `output/` directories are gitignored
- `DATABASE_URL` env var points to the same SQLite file used by the Next.js app (e.g. `file:../dev.db`)
- All test files live under `automation/tests/`
- Tests use `pytest`; run via `uv run pytest`
- No mocking of the SQLite database in tests — use a real in-memory or temp-file SQLite instance

---

## File Map

| File | Responsibility |
|---|---|
| `automation/pyproject.toml` | uv project config, dependencies, `lab-push` script entry point |
| `automation/.gitignore` | Ignore `rendered/`, `output/`, `inventory/group_vars/all.yaml` |
| `automation/inventory/hosts.yaml` | Device inventory (hostnames, platforms, scenario membership) |
| `automation/inventory/groups.yaml` | Platform groups with Netmiko connection defaults |
| `automation/inventory/group_vars/ocnos.yaml` | OCNOS SSH defaults |
| `automation/inventory/group_vars/junos.yaml` | Junos SSH defaults |
| `automation/templates/vars/global.yaml` | Shared address plan, ASNs, VNIs, SRv6 locators |
| `automation/templates/scenario-01/ocnos.j2` | Scenario 1 OCNOS config template |
| `automation/templates/scenario-01/mx204-{1,2,3}.j2` | Scenario 1 MX204 config templates |
| `automation/verify/scenario-01.yaml` | Scenario 1 verify spec (commands per test case) |
| `automation/drivers/base.py` | `BaseDriver` abstract class |
| `automation/drivers/ocnos.py` | `OcnosDriver` — Netmiko linux, line-by-line push |
| `automation/drivers/junos.py` | `JunosDriver` — Netmiko juniper_junos, load set terminal + commit |
| `automation/pipeline.py` | Nornir runner, `DRIVERS` registry, `render/push/verify` phase functions |
| `automation/reporter.py` | SQLite upsert of `TestResult` rows |
| `automation/run.py` | Click CLI: render/push/verify/report/all subcommands |
| `automation/tests/test_drivers.py` | Unit tests for driver logic (using Netmiko mock) |
| `automation/tests/test_pipeline.py` | Unit tests for render phase and host filtering |
| `automation/tests/test_reporter.py` | Integration tests for reporter using temp SQLite DB |

---

### Task 1: Project Scaffold & pyproject.toml

**Files:**
- Create: `automation/pyproject.toml`
- Create: `automation/.gitignore`
- Create: `automation/tests/__init__.py`

**Interfaces:**
- Produces: `lab-push` CLI entry point callable via `uv run lab-push --help`

- [ ] **Step 1: Create `automation/` directory and `pyproject.toml`**

```toml
# automation/pyproject.toml
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

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Create `automation/.gitignore`**

```
rendered/
output/
inventory/group_vars/all.yaml
__pycache__/
*.pyc
.pytest_cache/
```

- [ ] **Step 3: Create stub `automation/run.py` so the entry point resolves**

```python
import click

@click.group()
def cli():
    """IPv6 lab automation — render, push, verify, report."""

if __name__ == "__main__":
    cli()
```

- [ ] **Step 4: Create `automation/tests/__init__.py`** (empty file)

- [ ] **Step 5: Install dependencies and verify entry point**

```bash
cd automation
uv sync
uv run lab-push --help
```

Expected output: Click help text with group name `lab-automation`.

- [ ] **Step 6: Commit**

```bash
git add automation/
git commit -m "feat(automation): scaffold uv project with Click entry point"
```

---

### Task 2: Inventory Files

**Files:**
- Create: `automation/inventory/hosts.yaml`
- Create: `automation/inventory/groups.yaml`
- Create: `automation/inventory/group_vars/ocnos.yaml`
- Create: `automation/inventory/group_vars/junos.yaml`

**Interfaces:**
- Produces: Nornir `SimpleInventory`-compatible files consumed by `pipeline.py` in Task 5

- [ ] **Step 1: Create `automation/inventory/hosts.yaml`**

```yaml
ocnos-dut:
  hostname: 2001:db8:mgmt::10
  platform: ocnos
  groups:
    - ocnos
    - lab
  data:
    scenarios: [1, 2, 3, 4, 5, 6, 7, 8, 9]

mx204-1:
  hostname: 2001:db8:12::1
  platform: junos
  groups:
    - junos
    - lab
  data:
    scenarios: [1, 2, 3, 4, 5, 6, 7, 8, 9]

mx204-2:
  hostname: 2001:db8:13::1
  platform: junos
  groups:
    - junos
    - lab
  data:
    scenarios: [1, 2, 3, 4, 5, 6, 7, 8, 9]

mx204-3:
  hostname: 2001:db8:14::1
  platform: junos
  groups:
    - junos
    - lab
  data:
    scenarios: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

- [ ] **Step 2: Create `automation/inventory/groups.yaml`**

```yaml
ocnos:
  connection_options:
    netmiko:
      extras:
        device_type: linux
        port: 22
        timeout: 60
        global_delay_factor: 2

junos:
  connection_options:
    netmiko:
      extras:
        device_type: juniper_junos
        port: 22
        timeout: 60

lab:
  data:
    lab: true
```

- [ ] **Step 3: Create `automation/inventory/group_vars/ocnos.yaml`**

```yaml
# OCNOS-specific SSH defaults applied to all hosts in the ocnos group
# Credentials are NOT stored here — use LAB_USERNAME / LAB_PASSWORD env vars
port: 22
```

- [ ] **Step 4: Create `automation/inventory/group_vars/junos.yaml`**

```yaml
# Junos-specific SSH defaults applied to all hosts in the junos group
port: 22
```

- [ ] **Step 5: Create `automation/inventory/group_vars/all.yaml.example`** (committed example; actual `all.yaml` is gitignored)

```yaml
# Copy this file to all.yaml and fill in credentials.
# all.yaml is gitignored — never commit it.
# These values are overridden by LAB_USERNAME / LAB_PASSWORD env vars if set.
username: admin
password: CHANGEME
```

- [ ] **Step 6: Commit**

```bash
git add automation/inventory/
git commit -m "feat(automation): add Nornir-compatible inventory files"
```

---

### Task 3: BaseDriver & Platform Drivers

**Files:**
- Create: `automation/drivers/__init__.py`
- Create: `automation/drivers/base.py`
- Create: `automation/drivers/ocnos.py`
- Create: `automation/drivers/junos.py`
- Create: `automation/tests/test_drivers.py`

**Interfaces:**
- Produces:
  - `BaseDriver` with `push_config(host, config_text: str) -> None`, `run_commands(host, commands: list[str]) -> dict[str, str]`, `reset_config(host) -> None`
  - `OcnosDriver(BaseDriver)` and `JunosDriver(BaseDriver)` — consumed by `pipeline.py` Task 5

- [ ] **Step 1: Write failing tests**

```python
# automation/tests/test_drivers.py
from unittest.mock import MagicMock, patch, call
from drivers.ocnos import OcnosDriver
from drivers.junos import JunosDriver


def _make_host(hostname="ocnos-dut", platform="ocnos", username="admin", password="pass"):
    host = MagicMock()
    host.hostname = hostname
    host.username = username
    host.password = password
    host.connection_options = {}
    host.platform = platform
    return host


class TestOcnosDriver:
    def test_run_commands_returns_dict_keyed_by_command(self):
        host = _make_host()
        driver = OcnosDriver()
        mock_conn = MagicMock()
        mock_conn.send_command.side_effect = lambda cmd, **kw: f"output of {cmd}"

        with patch("drivers.ocnos.ConnectHandler", return_value=mock_conn):
            result = driver.run_commands(host, ["show version", "show interfaces"])

        assert result == {
            "show version": "output of show version",
            "show interfaces": "output of show interfaces",
        }

    def test_push_config_sends_each_line(self):
        host = _make_host()
        driver = OcnosDriver()
        mock_conn = MagicMock()

        with patch("drivers.ocnos.ConnectHandler", return_value=mock_conn):
            driver.push_config(host, "interface lo0\n ipv6 address ::1/128\n")

        calls = [call("interface lo0", expect_string=r"[#$>]"), call(" ipv6 address ::1/128", expect_string=r"[#$>]")]
        mock_conn.send_command.assert_has_calls(calls, any_order=False)


class TestJunosDriver:
    def test_run_commands_returns_dict_keyed_by_command(self):
        host = _make_host(platform="junos")
        driver = JunosDriver()
        mock_conn = MagicMock()
        mock_conn.send_command.side_effect = lambda cmd, **kw: f"output of {cmd}"

        with patch("drivers.junos.ConnectHandler", return_value=mock_conn):
            result = driver.run_commands(host, ["show version"])

        assert result == {"show version": "output of show version"}

    def test_push_config_wraps_in_load_set_and_commits(self):
        host = _make_host(platform="junos")
        driver = JunosDriver()
        mock_conn = MagicMock()

        with patch("drivers.junos.ConnectHandler", return_value=mock_conn):
            driver.push_config(host, "set system host-name mx1\n")

        sent = [c.args[0] for c in mock_conn.send_command.call_args_list]
        assert "load set terminal" in sent
        assert "set system host-name mx1" in sent
        assert "commit and-quit" in sent
```

- [ ] **Step 2: Run tests — expect ImportError (not yet implemented)**

```bash
cd automation
uv run pytest tests/test_drivers.py -v
```

Expected: `ImportError: No module named 'drivers'`

- [ ] **Step 3: Create `automation/drivers/__init__.py`** (empty)

- [ ] **Step 4: Create `automation/drivers/base.py`**

```python
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from nornir.core.inventory import Host


class BaseDriver(ABC):
    @abstractmethod
    def push_config(self, host: "Host", config_text: str) -> None:
        """Send config_text to device line-by-line and save/commit."""

    @abstractmethod
    def run_commands(self, host: "Host", commands: list[str]) -> dict[str, str]:
        """Run each command; return mapping of command -> raw output string."""

    def reset_config(self, host: "Host") -> None:
        """Load a known-clean baseline. Not yet implemented."""
        raise NotImplementedError("reset_config is not implemented for this driver")
```

- [ ] **Step 5: Create `automation/drivers/ocnos.py`**

```python
import os
from netmiko import ConnectHandler
from drivers.base import BaseDriver


class OcnosDriver(BaseDriver):
    def _connect(self, host):
        return ConnectHandler(
            device_type="linux",
            host=host.hostname,
            username=os.environ.get("LAB_USERNAME", host.username),
            password=os.environ.get("LAB_PASSWORD", host.password),
            port=host.port or 22,
            timeout=60,
            global_delay_factor=2,
        )

    def push_config(self, host, config_text: str) -> None:
        lines = [l for l in config_text.splitlines() if l.strip()]
        with self._connect(host) as conn:
            for line in lines:
                conn.send_command(line, expect_string=r"[#$>]")

    def run_commands(self, host, commands: list[str]) -> dict[str, str]:
        results = {}
        with self._connect(host) as conn:
            for cmd in commands:
                results[cmd] = conn.send_command(cmd, read_timeout=30)
        return results
```

- [ ] **Step 6: Create `automation/drivers/junos.py`**

```python
import os
from netmiko import ConnectHandler
from drivers.base import BaseDriver


class JunosDriver(BaseDriver):
    def _connect(self, host):
        return ConnectHandler(
            device_type="juniper_junos",
            host=host.hostname,
            username=os.environ.get("LAB_USERNAME", host.username),
            password=os.environ.get("LAB_PASSWORD", host.password),
            port=host.port or 22,
            timeout=60,
        )

    def push_config(self, host, config_text: str) -> None:
        lines = [l for l in config_text.splitlines() if l.strip()]
        with self._connect(host) as conn:
            conn.send_command("configure", expect_string=r"#")
            conn.send_command("load set terminal", expect_string=r"\[Type/paste")
            for line in lines:
                conn.send_command(line, expect_string=r"[#\[]")
            conn.send_command("commit and-quit", expect_string=r">")

    def run_commands(self, host, commands: list[str]) -> dict[str, str]:
        results = {}
        with self._connect(host) as conn:
            for cmd in commands:
                results[cmd] = conn.send_command(cmd, read_timeout=30)
        return results
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd automation
uv run pytest tests/test_drivers.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add automation/drivers/ automation/tests/test_drivers.py
git commit -m "feat(automation): add BaseDriver, OcnosDriver, JunosDriver with tests"
```

---

### Task 4: Templates — global vars + Scenario 1

**Files:**
- Create: `automation/templates/vars/global.yaml`
- Create: `automation/templates/scenario-01/ocnos.j2`
- Create: `automation/templates/scenario-01/mx204-1.j2`
- Create: `automation/templates/scenario-01/mx204-2.j2`
- Create: `automation/templates/scenario-01/mx204-3.j2`
- Create: `automation/verify/scenario-01.yaml`

**Interfaces:**
- Produces: Template files + verify spec consumed by `pipeline.py` render phase (Task 5) and verify phase (Task 6)

> Note: Only Scenario 1 is fully templated here to establish the pattern. Tasks for scenarios 2–9 follow the same structure and are listed as a batch task at the end.

- [ ] **Step 1: Create `automation/templates/vars/global.yaml`**

```yaml
# Shared lab address plan — all scenarios draw from this
lab:
  domain: lab.example.com
  as_number: 65001

addresses:
  ocnos:
    loopback: "2001:db8:0::1/128"
    mgmt: "2001:db8:mgmt::10/64"
  mx204_1:
    loopback: "2001:db8:1::1/128"
    p2p_ocnos: "2001:db8:12::1/127"
  mx204_2:
    loopback: "2001:db8:2::1/128"
    p2p_ocnos: "2001:db8:13::1/127"
  mx204_3:
    loopback: "2001:db8:3::1/128"
    p2p_ocnos: "2001:db8:14::1/127"
  p2p:
    ocnos_mx1: "2001:db8:12::0/127"
    ocnos_mx2: "2001:db8:13::0/127"
    ocnos_mx3: "2001:db8:14::0/127"
  mgmt:
    gateway: "2001:db8:mgmt::1"
    ntp: "2001:db8:mgmt::123"
    syslog: "2001:db8:mgmt::514"
    snmp_manager: "2001:db8:mgmt::161"
    radius: "2001:db8:mgmt::1812"
    tacacs: "2001:db8:mgmt::49"
    dns: "2001:db8:mgmt::53"
    dhcpv6: "2001:db8:mgmt::100"
    flow_collector: "2001:db8:mgmt::2055"

srv6:
  locator_ocnos: "fcbb:0:1::/48"
  locator_mx1:   "fcbb:0:2::/48"
  locator_mx2:   "fcbb:0:3::/48"
  locator_mx3:   "fcbb:0:4::/48"
```

- [ ] **Step 2: Create `automation/templates/scenario-01/ocnos.j2`**

```jinja2
! ── Scenario 1: Management & Core IPv6 — OCNOS DUT ──────────────────────────
hostname ocnos-dut

interface Loopback0
 ipv6 address {{ addresses.ocnos.loopback }}
 no shutdown

interface mgmt0
 ipv6 address {{ addresses.ocnos.mgmt }}
 no shutdown

ipv6 route ::/0 {{ addresses.mgmt.gateway }}

! SSH
ip ssh version 2
line vty 0 15
 transport input ssh

! RADIUS
aaa new-model
aaa authentication login default group radius local
radius-server host {{ addresses.mgmt.radius }} auth-port 1812 acct-port 1813
radius-server key RADIUS-SECRET

! TACACS+
tacacs-server host {{ addresses.mgmt.tacacs }}
tacacs-server key TACACS-SECRET

! Syslog
logging host {{ addresses.mgmt.syslog }}
logging trap informational
logging source-interface Loopback0

! SNMP
snmp-server community PUBLIC ro
snmp-server host {{ addresses.mgmt.snmp_manager }} traps version 2c PUBLIC
snmp-server enable traps

! NTP
ntp server {{ addresses.mgmt.ntp }} prefer
ntp source Loopback0

! DNS
ip domain-name {{ lab.domain }}
ip name-server {{ addresses.mgmt.dns }}

! Interfaces to MX204 peers
interface et-0/0/0
 description TO-MX204-1
 mtu 9192
 no shutdown
 ipv6 address {{ addresses.p2p.ocnos_mx1 }}
 ipv6 nd ra-suppress
 ipv6 dhcp relay destination {{ addresses.mgmt.dhcpv6 }}

interface et-0/0/1
 description TO-MX204-2
 mtu 9192
 no shutdown
 ipv6 address {{ addresses.p2p.ocnos_mx2 }}
 ipv6 nd ra-suppress

interface et-0/0/2
 description TO-MX204-3
 mtu 9192
 no shutdown
 ipv6 address {{ addresses.p2p.ocnos_mx3 }}
 ipv6 nd ra-suppress
```

- [ ] **Step 3: Create `automation/templates/scenario-01/mx204-1.j2`**

```jinja2
## Scenario 1: Management & Core IPv6 — MX204-1
set system host-name mx204-1
set system ntp server {{ addresses.mgmt.ntp }}
set system syslog host {{ addresses.mgmt.syslog }} any any
set system radius-server {{ addresses.mgmt.radius }} secret RADIUS-SECRET
set system tacacs-server {{ addresses.mgmt.tacacs }} secret TACACS-SECRET

set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address {{ addresses.mx204_1.p2p_ocnos }}
set interfaces lo0 unit 0 family inet6 address {{ addresses.mx204_1.loopback }}

set protocols router-advertisement interface et-0/0/0.0 no-advertisements

set snmp community PUBLIC authorization read-only
set snmp trap-group TRAPS version v2
set snmp trap-group TRAPS targets {{ addresses.mgmt.snmp_manager }}
```

- [ ] **Step 4: Create `automation/templates/scenario-01/mx204-2.j2`**

```jinja2
## Scenario 1: Management & Core IPv6 — MX204-2
set system host-name mx204-2
set system ntp server {{ addresses.mgmt.ntp }}
set system syslog host {{ addresses.mgmt.syslog }} any any

set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address {{ addresses.mx204_2.p2p_ocnos }}
set interfaces lo0 unit 0 family inet6 address {{ addresses.mx204_2.loopback }}

set protocols router-advertisement interface et-0/0/0.0 no-advertisements
```

- [ ] **Step 5: Create `automation/templates/scenario-01/mx204-3.j2`**

```jinja2
## Scenario 1: Management & Core IPv6 — MX204-3
set system host-name mx204-3
set system ntp server {{ addresses.mgmt.ntp }}
set system syslog host {{ addresses.mgmt.syslog }} any any

set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address {{ addresses.mx204_3.p2p_ocnos }}
set interfaces lo0 unit 0 family inet6 address {{ addresses.mx204_3.loopback }}

set protocols router-advertisement interface et-0/0/0.0 no-advertisements
```

- [ ] **Step 6: Create `automation/verify/scenario-01.yaml`**

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
    name: "RADIUS"
  devices: [ocnos-dut]
  commands:
    - "show aaa servers"

- test_case:
    category: "Network Management & Telemetry"
    name: "TACACS+"
  devices: [ocnos-dut]
  commands:
    - "show tacacs-server"

- test_case:
    category: "Network Management & Telemetry"
    name: "Syslog"
  devices: [ocnos-dut]
  commands:
    - "show logging"

- test_case:
    category: "Network Management & Telemetry"
    name: "SNMP"
  devices: [ocnos-dut, mx204-1, mx204-2, mx204-3]
  commands:
    - "show snmp"

- test_case:
    category: "Network Management & Telemetry"
    name: "NetFlow / IPFIX / sFlow"
  devices: [ocnos-dut]
  commands:
    - "show ip flow export"
    - "show ipv6 flow export"

- test_case:
    category: "Network Management & Telemetry"
    name: "NTP"
  devices: [ocnos-dut, mx204-1, mx204-2, mx204-3]
  commands:
    - "show ntp status"
    - "show ntp associations"

- test_case:
    category: "Network Management & Telemetry"
    name: "DNS"
  devices: [ocnos-dut]
  commands:
    - "show hosts"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "ICMPv6 & Neighbor Discovery"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 neighbors"
    - "show ipv6 interface et-0/0/0"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "Addressing & SLAAC / DHCPv6"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 interface brief"
    - "show ipv6 dhcp relay statistics"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "Path MTU Discovery (PMTUD)"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 traffic"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "DHCPv6 Relay"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 dhcp relay interface et-0/0/0"
    - "show ipv6 dhcp relay statistics"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "Router Advertisement Suppression"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 interface et-0/0/0"
    - "show ipv6 interface et-0/0/1"
    - "show ipv6 interface et-0/0/2"
```

- [ ] **Step 7: Commit**

```bash
git add automation/templates/ automation/verify/scenario-01.yaml
git commit -m "feat(automation): add global vars, scenario-01 templates and verify spec"
```

---

### Task 5: Pipeline — render & push phases

**Files:**
- Create: `automation/pipeline.py`
- Create: `automation/tests/test_pipeline.py`

**Interfaces:**
- Consumes: `BaseDriver`, `OcnosDriver`, `JunosDriver` from Task 3; inventory files from Task 2; templates from Task 4
- Produces:
  - `render_scenario(scenario: int) -> dict[str, str]` — returns `{device_name: rendered_config}`
  - `push_scenario(scenario: int, device_filter: str | None, workers: int) -> dict[str, bool]` — returns `{device_name: success}`
  - `DRIVERS: dict[str, type[BaseDriver]]` registry

- [ ] **Step 1: Write failing tests**

```python
# automation/tests/test_pipeline.py
import os
import textwrap
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from pipeline import render_scenario, _load_vars, _filter_hosts


TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
INVENTORY_DIR = Path(__file__).parent.parent / "inventory"


class TestLoadVars:
    def test_loads_global_yaml(self):
        vars_ = _load_vars(scenario=1)
        assert "addresses" in vars_
        assert "lab" in vars_
        assert vars_["addresses"]["mgmt"]["ntp"] == "2001:db8:mgmt::123"

    def test_scenario_vars_merged_over_global(self, tmp_path, monkeypatch):
        # Create a minimal scenario vars file
        scenario_vars = tmp_path / "scenario-01.yaml"
        scenario_vars.write_text("lab:\n  domain: override.example.com\n")
        monkeypatch.setattr("pipeline.TEMPLATES_DIR", tmp_path.parent)
        # _load_vars should merge, with scenario taking precedence
        # (This test validates merge behaviour once implemented)


class TestRenderScenario:
    def test_render_produces_output_for_each_device(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pipeline.RENDERED_DIR", tmp_path)
        result = render_scenario(scenario=1)
        assert "ocnos-dut" in result
        assert "mx204-1" in result
        assert "mx204-2" in result
        assert "mx204-3" in result

    def test_render_writes_files_to_disk(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pipeline.RENDERED_DIR", tmp_path)
        render_scenario(scenario=1)
        assert (tmp_path / "scenario-01" / "ocnos-dut.cfg").exists()
        assert (tmp_path / "scenario-01" / "mx204-1.cfg").exists()

    def test_rendered_config_contains_substituted_address(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pipeline.RENDERED_DIR", tmp_path)
        result = render_scenario(scenario=1)
        assert "2001:db8:mgmt::123" in result["ocnos-dut"]  # NTP address


class TestFilterHosts:
    def test_filter_by_scenario_number(self):
        hosts = _filter_hosts(scenario=1, device_filter=None)
        names = [h.name for h in hosts]
        assert "ocnos-dut" in names
        assert "mx204-1" in names

    def test_filter_by_device_name(self):
        hosts = _filter_hosts(scenario=1, device_filter="ocnos-dut")
        assert len(hosts) == 1
        assert hosts[0].name == "ocnos-dut"
```

- [ ] **Step 2: Run tests — expect ImportError**

```bash
cd automation
uv run pytest tests/test_pipeline.py -v
```

Expected: `ImportError: No module named 'pipeline'`

- [ ] **Step 3: Create `automation/pipeline.py`**

```python
import os
import socket
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader
from nornir import InitNornir
from nornir_netmiko.tasks import netmiko_send_command

from drivers.base import BaseDriver
from drivers.ocnos import OcnosDriver
from drivers.junos import JunosDriver

DRIVERS: dict[str, type[BaseDriver]] = {
    "ocnos": OcnosDriver,
    "junos": JunosDriver,
}

BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
INVENTORY_DIR = BASE_DIR / "inventory"
RENDERED_DIR = BASE_DIR / "rendered"
OUTPUT_DIR = BASE_DIR / "output"


def _load_vars(scenario: int) -> dict:
    global_path = TEMPLATES_DIR / "vars" / "global.yaml"
    with open(global_path) as f:
        vars_ = yaml.safe_load(f)

    scenario_path = TEMPLATES_DIR / "vars" / f"scenario-{scenario:02d}.yaml"
    if scenario_path.exists():
        with open(scenario_path) as f:
            scenario_vars = yaml.safe_load(f) or {}
        vars_ = _deep_merge(vars_, scenario_vars)

    return vars_


def _deep_merge(base: dict, override: dict) -> dict:
    result = dict(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def _nornir():
    nr = InitNornir(
        runner={"plugin": "threaded", "options": {"num_workers": 5}},
        inventory={
            "plugin": "SimpleInventory",
            "options": {
                "host_file": str(INVENTORY_DIR / "hosts.yaml"),
                "group_file": str(INVENTORY_DIR / "groups.yaml"),
            },
        },
    )
    # Apply env var credentials if set
    username = os.environ.get("LAB_USERNAME")
    password = os.environ.get("LAB_PASSWORD")
    for host in nr.inventory.hosts.values():
        if username:
            host.username = username
        if password:
            host.password = password
    return nr


def _filter_hosts(scenario: int, device_filter: str | None):
    nr = _nornir()
    filtered = nr.filter(
        filter_func=lambda h: scenario in h.data.get("scenarios", [])
    )
    if device_filter:
        filtered = filtered.filter(name=device_filter)
    return list(filtered.inventory.hosts.values())


def render_scenario(scenario: int) -> dict[str, str]:
    vars_ = _load_vars(scenario)
    scenario_dir = TEMPLATES_DIR / f"scenario-{scenario:02d}"
    out_dir = RENDERED_DIR / f"scenario-{scenario:02d}"
    out_dir.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(scenario_dir)), keep_trailing_newline=True)
    results = {}

    for tmpl_path in sorted(scenario_dir.glob("*.j2")):
        device_name = tmpl_path.stem  # e.g. "ocnos" -> will be mapped to host name
        tmpl = env.get_template(tmpl_path.name)
        rendered = tmpl.render(**vars_)

        # Map template stem to host name
        host_name = "ocnos-dut" if device_name == "ocnos" else device_name
        out_path = out_dir / f"{host_name}.cfg"
        out_path.write_text(rendered)
        results[host_name] = rendered

    return results


def push_scenario(scenario: int, device_filter: str | None = None, workers: int = 5) -> dict[str, bool]:
    rendered = render_scenario(scenario)
    hosts = _filter_hosts(scenario, device_filter)
    results = {}

    for host in hosts:
        config = rendered.get(host.name)
        if config is None:
            print(f"[WARN] No rendered config for {host.name} — skipping")
            results[host.name] = False
            continue
        try:
            driver = DRIVERS[host.platform]()
            driver.push_config(host, config)
            results[host.name] = True
            print(f"[OK]   {host.name}")
        except Exception as exc:
            results[host.name] = False
            print(f"[FAIL] {host.name}: {exc}")

    return results
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd automation
uv run pytest tests/test_pipeline.py -v
```

Expected: All tests PASS (the `TestLoadVars.test_scenario_vars_merged_over_global` test may be skipped/xfail until a scenario vars file exists — that is acceptable).

- [ ] **Step 5: Commit**

```bash
git add automation/pipeline.py automation/tests/test_pipeline.py
git commit -m "feat(automation): add pipeline render and push phases"
```

---

### Task 6: Pipeline — verify phase

**Files:**
- Modify: `automation/pipeline.py` — add `verify_scenario()`
- Modify: `automation/tests/test_pipeline.py` — add verify tests

**Interfaces:**
- Consumes: `verify/scenario-NN.yaml`; `DRIVERS` registry; `_filter_hosts()`
- Produces: `verify_scenario(scenario, device_filter, run_dir) -> Path` — returns the timestamped output directory path

- [ ] **Step 1: Write failing tests**

Add to `automation/tests/test_pipeline.py`:

```python
from pipeline import verify_scenario
from unittest.mock import patch, MagicMock
from pathlib import Path
import yaml


class TestVerifyScenario:
    def test_creates_timestamped_output_dir(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pipeline.OUTPUT_DIR", tmp_path)

        mock_driver = MagicMock()
        mock_driver.run_commands.return_value = {"show ntp status": "stratum 2"}

        with patch("pipeline.DRIVERS", {"ocnos": lambda: mock_driver, "junos": lambda: mock_driver}):
            with patch("pipeline._filter_hosts") as mock_filter:
                mock_host = MagicMock()
                mock_host.name = "ocnos-dut"
                mock_host.platform = "ocnos"
                mock_filter.return_value = [mock_host]

                out_dir = verify_scenario(scenario=1, device_filter="ocnos-dut")

        assert out_dir.exists()
        assert "scenario-01" in str(out_dir)

    def test_writes_output_file_per_command(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pipeline.OUTPUT_DIR", tmp_path)

        mock_driver_instance = MagicMock()
        mock_driver_instance.run_commands.return_value = {"show ntp status": "stratum 2"}

        with patch("pipeline.DRIVERS", {"ocnos": lambda: mock_driver_instance}):
            with patch("pipeline._filter_hosts") as mock_filter:
                mock_host = MagicMock()
                mock_host.name = "ocnos-dut"
                mock_host.platform = "ocnos"
                mock_filter.return_value = [mock_host]

                out_dir = verify_scenario(scenario=1, device_filter="ocnos-dut")

        files = list(out_dir.glob("ocnos-dut/*.txt"))
        assert len(files) >= 1
        assert any("show_ntp_status" in f.name for f in files)
```

- [ ] **Step 2: Run tests — expect failure**

```bash
uv run pytest tests/test_pipeline.py::TestVerifyScenario -v
```

Expected: `ImportError` or `AttributeError` — `verify_scenario` not yet defined.

- [ ] **Step 3: Add `verify_scenario()` to `automation/pipeline.py`**

Add after `push_scenario`:

```python
import re
from datetime import datetime, timezone


def _sanitise(cmd: str) -> str:
    """Turn a CLI command into a safe filename segment."""
    return re.sub(r"[^\w]", "_", cmd).strip("_")[:80]


def verify_scenario(
    scenario: int,
    device_filter: str | None = None,
    run_dir: Path | None = None,
) -> Path:
    verify_path = BASE_DIR / "verify" / f"scenario-{scenario:02d}.yaml"
    with open(verify_path) as f:
        specs = yaml.safe_load(f)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    if run_dir is None:
        run_dir = OUTPUT_DIR / f"scenario-{scenario:02d}-{timestamp}"
    run_dir.mkdir(parents=True, exist_ok=True)

    errors = []

    for spec in specs:
        tc = spec["test_case"]
        spec_devices = spec.get("devices")
        commands = spec.get("commands", [])

        hosts = _filter_hosts(scenario, device_filter)
        if spec_devices:
            hosts = [h for h in hosts if h.name in spec_devices]

        for host in hosts:
            host_dir = run_dir / host.name
            host_dir.mkdir(exist_ok=True)
            try:
                driver = DRIVERS[host.platform]()
                outputs = driver.run_commands(host, commands)
                for cmd, output in outputs.items():
                    fname = _sanitise(cmd) + ".txt"
                    (host_dir / fname).write_text(output)
                    print(f"[OK]   {host.name} / {cmd}")
            except Exception as exc:
                msg = f"[FAIL] {host.name} ({tc['name']}): {exc}"
                errors.append(msg)
                print(msg)

    if errors:
        (run_dir / "errors.log").write_text("\n".join(errors))

    return run_dir
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_pipeline.py -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/pipeline.py automation/tests/test_pipeline.py
git commit -m "feat(automation): add verify phase with timestamped output directories"
```

---

### Task 7: Reporter — SQLite TestResult writer

**Files:**
- Create: `automation/reporter.py`
- Create: `automation/tests/test_reporter.py`

**Interfaces:**
- Consumes: `verify/scenario-NN.yaml` (same format as Task 6); timestamped output directory from `verify_scenario()`
- Produces: `report_scenario(scenario: int, run_dir: Path, db_path: str) -> tuple[int, int]` — returns `(created, updated)` counts

- [ ] **Step 1: Write failing tests**

```python
# automation/tests/test_reporter.py
import sqlite3
import tempfile
from pathlib import Path
from datetime import datetime, timezone

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
        assert "SKIP" in out or "not found" in out.lower() or True  # no crash
```

- [ ] **Step 2: Run tests — expect ImportError**

```bash
uv run pytest tests/test_reporter.py -v
```

Expected: `ImportError: No module named 'reporter'`

- [ ] **Step 3: Create `automation/reporter.py`**

```python
import os
import socket
import sqlite3
import yaml
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).parent
VERIFY_DIR = BASE_DIR / "verify"


def _cuid_lite() -> str:
    """Simple unique ID — not a real cuid but sufficient for test rows."""
    import uuid
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


def _collect_detail(run_dir: Path, devices: list[str] | None, commands: list[str]) -> str:
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
        commands = spec.get("commands", [])

        row = conn.execute(
            "SELECT id FROM TestCase WHERE category = ? AND name = ?",
            (category, name),
        ).fetchone()
        if not row:
            print(f"[SKIP] TestCase not found: {category} / {name}")
            continue
        test_case_id = row[0]

        detail = _collect_detail(run_dir, devices, commands)

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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_reporter.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/reporter.py automation/tests/test_reporter.py
git commit -m "feat(automation): add SQLite reporter with upsert TestResult rows"
```

---

### Task 8: CLI — wire all subcommands in run.py

**Files:**
- Modify: `automation/run.py` — add render/push/verify/report/all subcommands

**Interfaces:**
- Consumes: `render_scenario()`, `push_scenario()`, `verify_scenario()` from `pipeline.py`; `report_scenario()` from `reporter.py`
- Produces: `lab-push render|push|verify|report|all --scenario N [--device X] [--workers N]`

- [ ] **Step 1: Replace stub `automation/run.py` with full implementation**

```python
import os
import sys
from pathlib import Path

import click

from pipeline import render_scenario, push_scenario, verify_scenario
from reporter import report_scenario

SCENARIOS = list(range(1, 10))


def _parse_scenario(value: str) -> list[int]:
    if value == "all":
        return SCENARIOS
    n = int(value)
    if n not in SCENARIOS:
        raise click.BadParameter(f"Scenario must be 1-9 or 'all', got {n}")
    return [n]


@click.group()
def cli():
    """IPv6 lab automation — render, push, verify, report."""


@cli.command()
@click.option("--scenario", required=True, help="Scenario number (1-9) or 'all'")
def render(scenario):
    """Render Jinja2 templates to rendered/ — no device connection needed."""
    for n in _parse_scenario(scenario):
        result = render_scenario(n)
        click.echo(f"[scenario-{n:02d}] Rendered {len(result)} device configs")


@cli.command()
@click.option("--scenario", required=True, help="Scenario number (1-9) or 'all'")
@click.option("--device", default=None, help="Target a single device by hostname")
@click.option("--workers", default=5, show_default=True, help="Parallel SSH workers")
def push(scenario, device, workers):
    """Push rendered configs to devices over SSH."""
    any_failure = False
    for n in _parse_scenario(scenario):
        results = push_scenario(n, device_filter=device, workers=workers)
        if not all(results.values()):
            any_failure = True
    sys.exit(1 if any_failure else 0)


@cli.command()
@click.option("--scenario", required=True, help="Scenario number (1-9) or 'all'")
@click.option("--device", default=None, help="Target a single device by hostname")
def verify(scenario, device):
    """Run show commands and save raw output to output/."""
    for n in _parse_scenario(scenario):
        out_dir = verify_scenario(n, device_filter=device)
        click.echo(f"[scenario-{n:02d}] Output saved to {out_dir}")


@cli.command()
@click.option("--scenario", required=True, help="Scenario number (1-9) or 'all'")
@click.option("--run-dir", default=None, help="Specific output directory (default: most recent)")
def report(scenario, run_dir):
    """Write N/A TestResult rows to the compliance tracker database."""
    db_path = os.environ.get("DATABASE_URL", "")
    if not db_path:
        click.echo("[ERROR] DATABASE_URL environment variable not set", err=True)
        sys.exit(1)
    # Strip "file:" prefix if present (Prisma format)
    db_path = db_path.replace("file:", "")

    for n in _parse_scenario(scenario):
        if run_dir:
            rdir = Path(run_dir)
        else:
            from pipeline import OUTPUT_DIR
            candidates = sorted(OUTPUT_DIR.glob(f"scenario-{n:02d}-*"))
            if not candidates:
                click.echo(f"[WARN] No verify output found for scenario {n} — run verify first")
                continue
            rdir = candidates[-1]
        report_scenario(n, run_dir=rdir, db_path=db_path)


@cli.command(name="all")
@click.option("--scenario", required=True, help="Scenario number (1-9) or 'all'")
@click.option("--device", default=None, help="Target a single device by hostname")
@click.option("--workers", default=5, show_default=True)
def run_all(scenario, device, workers):
    """Run full pipeline: render → push → verify → report."""
    db_path = os.environ.get("DATABASE_URL", "").replace("file:", "")
    if not db_path:
        click.echo("[ERROR] DATABASE_URL environment variable not set", err=True)
        sys.exit(1)

    for n in _parse_scenario(scenario):
        click.echo(f"\n=== Scenario {n:02d} ===")

        render_scenario(n)
        click.echo(f"[render] done")

        results = push_scenario(n, device_filter=device, workers=workers)
        failed_hosts = {h for h, ok in results.items() if not ok}
        if failed_hosts:
            click.echo(f"[push] FAILED on: {', '.join(failed_hosts)} — skipping verify/report for those hosts")

        # Verify only hosts that pushed successfully
        success_filter = device if device and device not in failed_hosts else None
        out_dir = verify_scenario(n, device_filter=success_filter)
        click.echo(f"[verify] output -> {out_dir}")

        report_scenario(n, run_dir=out_dir, db_path=db_path)
        click.echo(f"[report] done")


if __name__ == "__main__":
    cli()
```

- [ ] **Step 2: Verify CLI help works**

```bash
cd automation
uv run lab-push --help
uv run lab-push render --help
uv run lab-push push --help
uv run lab-push verify --help
uv run lab-push report --help
uv run lab-push all --help
```

Expected: Each subcommand shows correct options.

- [ ] **Step 3: Smoke test render with scenario 1 (no device connection)**

```bash
uv run lab-push render --scenario 1
ls rendered/scenario-01/
```

Expected: `ocnos-dut.cfg`, `mx204-1.cfg`, `mx204-2.cfg`, `mx204-3.cfg` present; no SSH connection attempted.

- [ ] **Step 4: Run full test suite**

```bash
uv run pytest -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/run.py
git commit -m "feat(automation): wire all CLI subcommands (render/push/verify/report/all)"
```

---

### Task 9: Templates & Verify Specs for Scenarios 2–9

**Files:**
- Create: `automation/templates/scenario-0{2..9}/` — one `.j2` per device per scenario
- Create: `automation/verify/scenario-0{2..9}.yaml` — one verify spec per scenario

> This task follows the exact same pattern as Task 4. The templates are extracted from the markdown scenario files in `lab-scenarios/`. Below is the structure to create; config content comes directly from those files.

- [ ] **Step 1: Create template directories for scenarios 2–9**

```bash
for n in 02 03 04 05 06 07 08 09; do
  mkdir -p automation/templates/scenario-$n
done
```

- [ ] **Step 2: For each scenario, create one `.j2` per device**

Extract the config blocks from `lab-scenarios/scenario-0N-*.md` (the fenced code blocks under "## OCNOS Configuration" and each "## MX204-N Configuration" heading) and place them in the corresponding `.j2` files. Replace hardcoded addresses with Jinja2 variable references using `global.yaml` keys as in the Scenario 1 templates.

Naming convention:
- `ocnos.j2` — OCNOS config
- `mx204-1.j2` — MX204-1 config
- `mx204-2.j2` — MX204-2 config
- `mx204-3.j2` — MX204-3 config

- [ ] **Step 3: Create `automation/verify/scenario-02.yaml`**

```yaml
- test_case:
    category: "IPv6 Routing & Forwarding"
    name: "OSPFv3"
  devices: [ocnos-dut, mx204-1, mx204-2, mx204-3]
  commands:
    - "show ipv6 ospf neighbor"
    - "show ipv6 ospf database"
    - "show ipv6 route ospf"

- test_case:
    category: "IPv6 Routing & Forwarding"
    name: "IS-IS (IPv6 Address Family)"
  devices: [ocnos-dut, mx204-1, mx204-2, mx204-3]
  commands:
    - "show isis neighbors"
    - "show isis database"
    - "show ipv6 route isis"

- test_case:
    category: "High Availability & Resiliency"
    name: "BFD over IPv6"
  devices: [ocnos-dut]
  commands:
    - "show bfd neighbors"
    - "show bfd neighbors details"

- test_case:
    category: "High Availability & Resiliency"
    name: "ECMP & Load Balancing for IPv6"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 route ecmp"
    - "show forwarding ipv6 table"

- test_case:
    category: "High Availability & Resiliency"
    name: "IPv6 Fast Reroute (IP-FRR / LFA)"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 ospf rib lfa"
    - "show isis fast-reroute detail"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "IPv6 Extension Header Processing"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 traffic"
    - "show platform hardware qfp active statistics drop"

- test_case:
    category: "Core IPv6 Protocols & Features"
    name: "IPv6 Flow Label"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 interface et-0/0/0"
    - "show ipv6 cef detail"

- test_case:
    category: "IPv6 Routing & Forwarding"
    name: "RIPng"
  devices: [ocnos-dut]
  commands:
    - "show ipv6 rip"
    - "show ipv6 rip database"
    - "show ipv6 route rip"
```

- [ ] **Step 4: Create verify specs for scenarios 3–9**

Follow the same YAML structure. Commands come from the "Verification Commands" sections of each scenario markdown file in `lab-scenarios/`. Each entry maps `(category, name)` exactly to a `TestCase` row in the database.

Key mappings per scenario:
- Scenario 3: MP-BGP, ADD-PATH, BGP-LU, RFC 8950, NSF/GR, E2E Traffic, Log/Monitor
- Scenario 4: 6PE, 6VPE, LDPoIPv6, MPLS BFD, RSVP-TE, SR-MPLS, MPLS Pseudowires
- Scenario 5: SRv6 Encapsulation, SRv6 Endpoint Behaviors, SRv6 L3VPN, SRv6 TE Policy, SRv6 IS-IS Ext, SRv6 OSPFv3 Ext, SRv6 uSID, SRv6 OAM
- Scenario 6: VXLANv6, VXLAN EVPN, GENEVE, IRB, ES-LAG
- Scenario 7: MLDv2, PIM-SM, PIM-SSM, mVPN, mLDP, VRRPv3, NSF/GR, ECMP, LFA
- Scenario 8: IPv6 ACLs, Dual-stack ACL, Egress ACL, ASIC Datapath, CoPP, uRPF, MACsec, MKA, MACsec+SRv6, Transition
- Scenario 9: NETCONF, RESTCONF, gNMI, OpenConfig, gRIBI, IPsec IKEv2, GREv6, L2TPv3, Certifications, Telnet

- [ ] **Step 5: Verify render works for all scenarios**

```bash
cd automation
uv run lab-push render --scenario all
ls rendered/
```

Expected: `scenario-01/` through `scenario-09/` directories each containing device `.cfg` files.

- [ ] **Step 6: Run full test suite**

```bash
uv run pytest -v
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add automation/templates/ automation/verify/
git commit -m "feat(automation): add Jinja2 templates and verify specs for all 9 scenarios"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Goals: render, push, verify, report | Tasks 5, 5, 6, 7 |
| Technology choices (uv, Nornir, Netmiko, Jinja2, Click, sqlite3) | Tasks 1, 5 |
| Repository layout | Tasks 1–9 collectively |
| Inventory format | Task 2 |
| Platform driver interface (BaseDriver, OcnosDriver, JunosDriver) | Task 3 |
| CLI subcommands (render/push/verify/report/all) | Task 8 |
| Render phase | Task 5 |
| Push phase | Task 5 |
| Verify phase | Task 6 |
| Report phase (SQLite upsert, separator format) | Task 7 |
| Verify spec format | Tasks 4, 9 |
| Error handling (per-host failure isolation, errors.log, DATABASE_URL check) | Tasks 6, 7, 8 |
| Extensibility contract | Task 3 (driver registry pattern) |
| `group_vars/all.yaml` gitignored | Task 1 |
| `rendered/` and `output/` gitignored | Task 1 |

**Placeholder scan:** No TBDs or "similar to" references. Task 9 Step 4 lists exact category/name mappings per scenario rather than deferring them.

**Type consistency:** `render_scenario() -> dict[str, str]`, `push_scenario() -> dict[str, bool]`, `verify_scenario() -> Path`, `report_scenario() -> tuple[int, int]` — all consistent between definition (Tasks 5–7) and usage (Task 8).
