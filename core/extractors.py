import re
import os
import random
import asyncio
from urllib.parse import urlparse
from datetime import datetime, timezone
from .colors import ConvertColor
from .logger import setup_logger

"""
/**
 * extractors.py - Brand Extraction Engine
 *
 * Core extraction logic with stealth mode, retry mechanisms, and parallel processing.
 * Handles bot detection, SPA hydration, and comprehensive design token extraction.
 */
"""

logger = setup_logger(__name__)
baseDIR = os.path.dirname(os.path.abspath(__file__))
INTERACTIVE_SELECTORS = """
a, button, input, textarea, select,
[role="button"], [role="link"], [role="tab"], [role="menuitem"],
[role="switch"], [role="checkbox"], [role="radio"], [role="textbox"],
[role="searchbox"], [role="combobox"],
[aria-pressed], [aria-expanded], [aria-current],
[tabindex]:not([tabindex="-1"])
"""

RUNME_JS = """() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 0 });
    Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
    delete navigator.__proto__.webdriver;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
}"""

class Browser:
    @staticmethod
    async def create_context(browser, is_chronium: bool):
        options = {
            'viewport': {'width': 1920, 'height': 1080},
            'user_agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            'locale': "en-US",
        }

        if is_chronium:
            options['permissions'] = ['clipboard-read', 'clipboard-write']
        
        context = await browser.new_context(**options)
        await context.add_init_script(RUNME_JS)
        return context

class PageNavigator:
    def __init__(self, page, timeout_multiplier=1, status=None, console=None):
        self.page = page
        self.tm = timeout_multiplier
        self.status = status
        self.console = console
        self.timeouts = []

    async def _log_redirect(self, init, final):
        if not self.console or init == final: return
        is_diff = urlparse(init).hostname != urlparse(final).hostname
        msg = "[bold yellow] ⚠︎ Redirected to different domain:" if is_diff else "[bold cyan] 🛈 Redirected within same domain:"
        self.console.print(f"{msg}\n    From: [dim]{init}[/dim]\n    To:   [cyan]{final}[/cyan]")
    
    async def navigate(self, url: str, attempts: int = 3):
        """
        WHAT: 
        HOW: Navigate with retries and heuristics for SPA-heavy or bot-protected sites

        Strategy:
         - Do not rely on a single 'load' signal
         - Validate content length instead of network idleness
         - Allow partial success (timeouts are tracked, not fatal)
        """
        for attempt in range(1,attempts+1):
            try:
                if self.status:
                    self.status.update(f"[cyan]Navigating to {url} (Attempt {attempt}/{attempts})...[/cyan]")
                init_url = url
                await self.page.goto(url, wait_until="domcontentloaded", timeout=20000 * self.tm)
                
                final_url = self.page.url
                await self._log_redirect(init_url, final_url)

                if self.console:
                    self.console.print("[bold green]  ✓ Page loaded[/bold green]")
                
                if self.status:
                    self.status.update("[cyan]Waiting for body content to render...[/cyan]")
                
                try:
                    # DOM exists does not guarantee content is rendered (common in SPAs)
                    await self.page.wait_for_function(
                        "() => document.body && document.body.children.length > 0",
                        timeout=20000 * self.tm
                    )
                    if self.console:
                        self.console.print("[bold green]  ✓ Body content rendered[/bold green]")
                except Exception:
                    if self.console:
                        self.console.print("[bold yellow] ⚠ Body content timeout (continuing)[/bold yellow]")
                    self.timeouts.append('Body content rendering')

                if self.status:
                    self.status.update("[cyan]Waiting for SPA hydration...[/cyan]")
                
                # fixed hydration delay is intentional:
                # frameworks often attach listeners after DOM is ready
                htime = 8000 * self.tm
                await self.page.wait_for_timeout(htime)
                self.console.print(f"[bold cyan]  ✓ SPA hydration completed ({htime/1000}s)[/bold cyan]")
                
                try:
                    await self.page.wait_for_selector("main, header, [data-hero], section", timeout=10000 * self.tm)
                    if self.console:
                        self.console.print("[bold green]  ✓ Main content detected[/bold green]")
                except Exception:
                    if self.console:
                        self.console.print("[bold yellow] ⚠ Main content selector timeout (continuing)[/bold yellow]")
                    self.timeouts.append('Main content selector')

                # mouse movement + scroll to trigger lazy-loading and interaction-bound styles
                mx = 300 + random.random() * 400
                my = 200 + random.random() * 300
                await self.page.mouse.move(mx, my)
                await self.page.evaluate("() => window.scrollTo(0, 400)")

                content_len = await self.page.evaluate("() => document.body.textContent.length")
                if content_len > 500:
                    if self.console:
                        self.console.print(f"[bold green]  ✓ Content validated: {content_len} chars[/bold green]")
                    return True
                
                if self.console:
                    self.console.print(f"[bold yellow] ⚠ Low content length: {content_len} chars[/bold yellow]")
                
                await self.page.wait_for_timeout(3000 * self.tm)
                
            except Exception as err:
                if attempt >= attempts:
                    raise err
                await self.page.wait_for_timeout(3000 * self.tm)
        return False

class BrandExtractor:
    def __init__(self, page, timeout_multiplier=1):
        self.page = page
        self.tm = timeout_multiplier
        self._script_cache = {}

    async def _run_script(self, filename: str, arg=None):
        try:
            if filename not in self._script_cache:
                with open(os.path.join(baseDIR, "..", "scripts", filename), "r") as f:
                    self._script_cache[filename] = f.read()
            
            script = self._script_cache[filename]
            return await self.page.evaluate(script, arg) if arg else await self.page.evaluate(script)
        except Exception as e:
            logger.error(f"Script error {filename}: {e}")
            return {}

    async def extract_all(self, url: str):
        scripts = [
            ("extractLogo.js", url), "extractColors.js", "extractTypography.js",
            "extractSpacing.js", "extractBorderRadius.js", "extractBorders.js",
            "extractShadows.js", "extractButtonStyles.js", "extractInputStyles.js",
            "extractLinkStyles.js", "extractBadgeStyles.js", "extractBreakpoints.js",
            "detectIconSystem.js", "detectFrameworks.js"
        ]
        
        tasks = []
        for s in scripts:
            if isinstance(s, tuple):
                tasks.append(self._run_script(s[0], s[1]))
            else:
                tasks.append(self._run_script(s))
                
        return await asyncio.gather(*tasks)

    def _split_multi_colors(self, val):
        if not val:
            return []
        pattern = r"(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)|oklab\([^)]+\)|color\([^)]+\))"
        matches = re.findall(pattern, val, re.IGNORECASE)
        matches = matches or [val]
        ignore = ('transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)')
        return [c for c in matches if c not in ignore and len(c) > 3]

    async def extract_interactive_states(self, colors_dict):
        """
        Infer hover/focus colors by simulating interaction.

        Why simulation instead of CSS parsing:
         - Many design systems compute styles dynamically
         - Pseudo-classes often resolved only at runtime
        """
        hf_colors = []
        elements = await self.page.query_selector_all(INTERACTIVE_SELECTORS)
        
        async def process(el):
            try:
                is_visible = await el.evaluate("el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && s.display!=='none'; }")
                if not is_visible: return
                
                get_styles_js = "el => { const s = getComputedStyle(el); return { color: s.color, bg: s.backgroundColor, border: s.borderColor, tag: el.tagName.toLowerCase() }; }"
                before = await el.evaluate(get_styles_js)
                
                try:
                    await el.hover(timeout=1000 * self.tm)
                    await self.page.wait_for_timeout(100 * self.tm)
                except:
                    pass
                
                after = await el.evaluate(get_styles_js)
                
                ignore_colors = ('rgba(0, 0, 0, 0)', 'transparent')
                if after['color'] != before['color'] and after['color'] not in ignore_colors:
                    hf_colors.append(after['color'])
                if after['bg'] != before['bg'] and after['bg'] not in ignore_colors:
                    hf_colors.append(after['bg'])
                
                b_after = self._split_multi_colors(after['border'])
                b_before = self._split_multi_colors(before['border'])
                hf_colors.extend([c for c in b_after if c not in b_before])
                
            except Exception as e:
                logger.debug(f"Error processing element: {e}")
                pass

        for i in range(0, len(elements[:20]), 4):
            batch = elements[i:i+4]
            tasks = [process(el) for el in batch]
            await asyncio.gather(*tasks)
        
        addedC = 0
        for color in hf_colors:
            # only add interaction-derived colors if they don't already exist
            # confidence is intentionally capped at 'medium'
            if not any(c.get('colors') == color for c in colors_dict['palette']):
                colors_dict['palette'].append({
                    'colors': color,
                    'normalized': color.lower(),
                    'count': 1,
                    'confidence': 'medium',
                    'sources': ['interaction']
                })
                addedC += 1
        try:
            await self.page.mouse.move(0, 0)
        except:
            pass

        return colors_dict, addedC

async def extractBranding(url, status_updater, browser, console, options=None):
    opts = options or {}
    tm = 3 if opts.get('slow') else 1

    status_updater.update("[cyan]Creating browser context...[/cyan]")
    is_chrom = browser.browser_type.name == 'chromium'
    context = await Browser.create_context(browser, is_chrom)
    page = await context.new_page()

    try:
        navigator = PageNavigator(page, tm, status_updater, console)
        await navigator.navigate(url, attempts=2)

        status_updater.update("[cyan]Analyzing design system (14 parallel tasks)...[/cyan]")
        ext = BrandExtractor(page, tm)
        
        extracted_data = await ext.extract_all(url)
        (logo, colors, typography, spacing, borderRadius, borders, 
         shadows, buttons, inputs, links, badges, breakpoints, 
         iconSystem, frameworks) = extracted_data

        if console:
            c_found = len(colors.get('palette', []))
            t_found = len(typography.get('styles', []))
            console.print(f"[bold green]  ✓ Colors: {c_found} found[/bold green]" if c_found else "[bold yellow] ⚠ Colors: 0 found[/bold yellow]")
            console.print(f"[bold green]  ✓ Typography: {t_found} styles[/bold green]" if t_found else "[bold yellow] ⚠ Typography: 0 styles[/bold yellow]")
        
        status_updater.update("[cyan]Extracting hover/focus state colors...[/cyan]")
        colors, hf_count = await ext.extract_interactive_states(colors)
        if console:
            console.print(f"[bold green]  ✓ Hover/focus: {hf_count} state colors found[/bold green]" if hf_count else "[bold yellow] ⚠ Hover/focus: 0 state colors found[/bold yellow]")

        if opts.get('darkMode'):
            status_updater.update("[cyan]Extracting dark mode colors...[/cyan]")
            dm_script = "() => { document.documentElement.setAttribute('data-theme', 'dark'); document.documentElement.classList.add('dark', 'dark-mode'); }"
            await page.evaluate(dm_script)
            await page.emulate_media(color_scheme="dark")
            await page.wait_for_timeout(500 * tm)
            
            dm_colors = await ext._run_script("extractColors.js")
            dm_btns = await ext._run_script("extractButtonStyles.js")
            dm_links = await ext._run_script("extractLinkStyles.js")
            
            for dc in dm_colors.get('palette', []):
                if not any(ec.get('normalized') == dc.get('normalized') for ec in colors['palette']):
                    dc['source'] = 'dark-mode'
                    colors['palette'].append(dc)
            
            for b in dm_btns: b['source'] = 'dark-mode'; buttons.append(b)
            for l in dm_links: l['source'] = 'dark-mode'; links.append(l)
            if console:
                console.print(f"[bold green]  ✓ Dark mode: +{len(dm_colors.get('palette', []))} colors[/bold green]")

        if opts.get('mobile'):
            status_updater.update("[cyan]Extracting mobile viewport colors...[/cyan]")
            await page.set_viewport_size({'width': 390, 'height': 844})
            await page.wait_for_timeout(500 * tm)
            mb_colors = await ext._run_script("extractColors.js")
            for mc in mb_colors.get('palette', []):
                if not any(ec.get('normalized') == mc.get('normalized') for ec in colors['palette']):
                    mc['source'] = 'mobile'
                    colors['palette'].append(mc)
            if console:
                console.print(f"[bold green]  ✓ Mobile: +{len(mb_colors.get('palette', []))} colors[/bold green]")

        for c in colors.get('palette', []):
            target = c.get('normalized') or c.get('color')
            converted = ConvertColor(target)
            if converted:
                c['lch'], c['oklch'] = converted['lch'], converted['oklch']

        # heuristic to detect canvas/WebGL-only sites where DOM-based extraction fails
        canvas_js = """() => {
            const canvases = document.querySelectorAll("canvas");
            const has_webgl = Array.from(canvases).some(c => c.getContext("webgl"));
            return canvases.length > 3 && has_webgl && document.body.textContent.trim().length < 200;
        }"""

        is_canvas_only = await page.evaluate(canvas_js)

        if navigator.timeouts and not opts.get('slow') and console:
            console.print(f"\n[bold yellow]⚠ {len(navigator.timeouts)} timeout(s) occurred:[/bold yellow]")
            for t in navigator.timeouts: 
                console.print(f"[dim]  • {t}[/dim]")
            console.print("[cyan]💡 Tip: Try running with --slow flag[/cyan]\n")

        ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        result = {
            "url": page.url, 
            "extractedAt": ts,
            "logo": logo.get('logo', {}) if logo and isinstance(logo, dict) else {}, 
            "favicons": logo.get('favicons', []) if logo and isinstance(logo, dict) else [],
            "colors": colors if colors else {}, 
            "typography": typography if typography else {}, 
            "spacing": spacing if spacing else {}, 
            "borderRadius": borderRadius if borderRadius else {},
            "borders": borders if borders else {}, 
            "shadows": shadows if shadows else {},
            "components": {"buttons": buttons if buttons else [], "inputs": inputs if inputs else [], "links": links if links else [], "badges": badges if badges else []},
            "breakpoints": breakpoints if breakpoints else {}, 
            "iconSystem": iconSystem if iconSystem else {}, 
            "frameworks": frameworks if frameworks else {}
        }
        
        if is_canvas_only:
            result['note'] = "Website uses canvas/WebGL rendering. Design system cannot be extracted from DOM."
            result['isCanvasOnly'] = True

        return result
    finally:
        await context.close()


        
        
    