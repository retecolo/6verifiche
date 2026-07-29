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
