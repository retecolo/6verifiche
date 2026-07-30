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
        conn = self._connect(host)
        try:
            conn.send_command("configure", expect_string=r"#")
            conn.send_command("load set terminal", expect_string=r"\[Type/paste")
            for line in lines:
                conn.send_command(line, expect_string=r"[#\[]")
            conn.send_command("commit and-quit", expect_string=r">")
        finally:
            conn.disconnect()

    def run_commands(self, host, commands: list[str]) -> dict[str, str]:
        results = {}
        conn = self._connect(host)
        try:
            for cmd in commands:
                results[cmd] = conn.send_command(cmd, read_timeout=30)
        finally:
            conn.disconnect()
        return results
