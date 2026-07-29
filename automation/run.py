import click

@click.group()
def cli():
    """IPv6 lab automation — render, push, verify, report."""

if __name__ == "__main__":
    cli()
