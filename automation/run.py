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
