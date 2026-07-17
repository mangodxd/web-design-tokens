"""IRIS command-line entry point for `iris <url>`."""

import asyncio

from web_design_tokens.__main__ import main as async_main


def entry_point():
    """Synchronous entry point for pip-installed console script."""
    asyncio.run(async_main())


if __name__ == "__main__":
    entry_point()
