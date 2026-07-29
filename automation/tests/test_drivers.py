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
