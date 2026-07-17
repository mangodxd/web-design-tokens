#!/usr/bin/env python3
import argparse
import asyncio
import sys
import json
import os
from datetime import datetime
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from rich.console import Console

from iris.core.extractors import extractBranding
from iris.core.display import display
from iris.core.w3c_exporter import toW3CFormat

async def main():
    parser = argparse.ArgumentParser(prog="iris", description="Extract design tokens from any website")
    parser.add_argument("url")
    parser.add_argument("--browser", choices=["chromium", "firefox"], default="chromium")
    parser.add_argument("--json-only", action="store_true")
    parser.add_argument("--save-output", action="store_true")
    parser.add_argument("--dtcg", action="store_true")
    parser.add_argument("--dark-mode", action="store_true")
    parser.add_argument("--mobile", action="store_true")
    parser.add_argument("--slow", action="store_true")
    parser.add_argument("--no-sandbox", action="store_true")
    
    opts = parser.parse_args()
    url = opts.url if opts.url.startswith("http") else "https://" + opts.url

    console = Console()
    
    async with async_playwright() as p:
        browser_type = p.firefox if opts.browser == 'firefox' else p.chromium
        launchArgs = [] if opts.browser == 'firefox' else ["--disable-blink-features=AutomationControlled"]
        if opts.no_sandbox and opts.browser == 'chromium':
            launchArgs.extend(["--no-sandbox", "--disable-setuid-sandbox"])
            
        browser = await browser_type.launch(headless=True, args=launchArgs)
        
        try:
            with console.status("[bold green]Starting extraction...") as status:
                result = await extractBranding(url, status, browser, console, {
                    'navigationTimeout': 90000, 'darkMode': opts.dark_mode, 
                    'mobile': opts.mobile, 'slow': opts.slow
                })
            
            outputData = toW3CFormat(result) if opts.dtcg else result

            if opts.save_output or opts.dtcg:
                try:
                    domain = urlparse(url).hostname.replace("www.", "")
                    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                    outputDir = os.path.join(os.getcwd(), "output", domain)
                    os.makedirs(outputDir, exist_ok=True)
                    
                    filename = f"{timestamp}{'.tokens' if opts.dtcg else ''}.json"
                    filepath = os.path.join(outputDir, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(outputData, f, indent=2)
                    console.print(f"[dim]💾 JSON saved to: [cyan]output/{domain}/{filename}[/cyan][/dim]")
                except OSError as err:
                    console.print(f"[bold red]⚠ Could not save JSON file:[/bold red] {err}")

            if opts.json_only: print(json.dumps(outputData, indent=2))
            else: display(result)

        except Exception as err:
            console.print("\n[bold red]✗ Extraction failed[/bold red]")
            console.print(f"  [red]Error: {err}[/red]")
            sys.exit(1)
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())