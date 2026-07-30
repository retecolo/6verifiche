import os
import textwrap
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
import yaml
from pipeline import render_scenario, _load_vars, _filter_hosts, verify_scenario


TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
INVENTORY_DIR = Path(__file__).parent.parent / "inventory"


class TestLoadVars:
    def test_loads_global_yaml(self):
        vars_ = _load_vars(scenario=1)
        assert "addresses" in vars_
        assert "lab" in vars_
        assert vars_["addresses"]["mgmt"]["ntp"] == "2001:db8:mgmt::123"

    def test_scenario_vars_merged_over_global(self):
        from pipeline import _deep_merge
        base = {"lab": {"domain": "base.example.com", "as_number": 65001}}
        override = {"lab": {"domain": "override.example.com"}}
        result = _deep_merge(base, override)
        assert result["lab"]["domain"] == "override.example.com"
        assert result["lab"]["as_number"] == 65001  # preserved from base


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
