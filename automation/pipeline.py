import os
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader
from nornir import InitNornir

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
    import pipeline as _self  # allows monkeypatching TEMPLATES_DIR in tests
    templates_dir = _self.TEMPLATES_DIR

    global_path = templates_dir / "vars" / "global.yaml"
    with open(global_path) as f:
        vars_ = yaml.safe_load(f)

    scenario_path = templates_dir / "vars" / f"scenario-{scenario:02d}.yaml"
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
    import pipeline as _self  # allows monkeypatching RENDERED_DIR in tests
    rendered_dir = _self.RENDERED_DIR

    vars_ = _load_vars(scenario)
    scenario_dir = TEMPLATES_DIR / f"scenario-{scenario:02d}"
    out_dir = rendered_dir / f"scenario-{scenario:02d}"
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
