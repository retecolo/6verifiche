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
