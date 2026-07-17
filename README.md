<div align="center">
  <img src="https://raw.githubusercontent.com/mangodxd/web-design-tokens/main/showcase.png" alt="IRIS Demo" width="700">
  <br>
  <h1>IRIS</h1>
  <p><strong>One command to extract any website's design system</strong></p>
  <p>
    <a href="https://pypi.org/project/web-design-tokens/">
      <img src="https://img.shields.io/pypi/v/web-design-tokens" alt="PyPI">
    </a>
    <a href="https://github.com/mangodxd/web-design-tokens/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/mangodxd/web-design-tokens/ci.yml?branch=main" alt="CI">
    </a>
    <a href="https://pypi.org/project/web-design-tokens/">
      <img src="https://img.shields.io/pypi/pyversions/web-design-tokens" alt="Python versions">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/mangodxd/web-design-tokens" alt="License">
    </a>
  </p>
  <p>
    <code>pip install web-design-tokens</code> •
    <code>iris stripe.com</code>
  </p>
</div>

---

```bash
# Install
pip install web-design-tokens
playwright install chromium

# Run — extracts colors, fonts, spacing, logos, components in seconds
iris stripe.com --save-output

# Export as W3C Design Tokens
iris stripe.com --dtcg
```

## What you get

| Category | Extracted |
|----------|-----------|
| **Logo** | URL, dimensions, favicons |
| **Colors** | Semantic, CSS variables, palette — with LCH/OKLCH conversion |
| **Typography** | Font families, sizes, weights, line heights, Google Fonts detection |
| **Spacing** | Common gap, margin, padding values |
| **Border radius** | Rounded corners by element |
| **Borders** | Width + color combinations |
| **Shadows** | Box-shadow values with confidence scoring |
| **Components** | Button, input, link, badge styles (default + hover + focus states) |
| **Breakpoints** | Responsive media query values |
| **Frameworks** | Detected UI libraries and icon systems |

## Usage

| Flag | Effect |
|------|--------|
| `--save-output` | Save JSON to `output/{domain}/` |
| `--dtcg` | Export in [W3C DTCG](https://www.designtokens.org/) format (auto-saves `.tokens.json`) |
| `--dark-mode` | Force dark mode extraction |
| `--mobile` | Mobile viewport (390×844) |
| `--browser=firefox` | Use Firefox (better Cloudflare bypass) |
| `--json-only` | Raw JSON to stdout |
| `--slow` | 3× timeouts for heavy SPAs |

```bash
# Firefox for Cloudflare-heavy sites
iris viettel.vn --browser=firefox --save-output

# Dark mode on mobile
iris airbnb.com --dark-mode --mobile --dtcg
```

## Output example

```
Brand Extraction
└── stripe.com
    ├── Logo
    │   ├── https://stripe.com/img/logo.svg
    │   └── 200×60px
    ├── Colors
    │   ├── ● ■ #635bff (primary)
    │   │   ├── rgb: rgb(99 91 255)
    │   │   └── oklch: oklch(58.3% 0.178 261.25)
    │   ├── ● ■ #32325d (text-primary)
    │   │   ├── rgb: rgb(50 50 93)
    │   │   └── oklch: oklch(32.5% 0.032 271.63)
    │   └── ...
    ├── Typography
    │   ├── Inter
    │   │   ├── Body → 16px, line-height: 1.5
    │   │   └── Heading → 32px, weight: 700
    │   └── ...
    ├── Spacing → 16px (1rem)  24px (1.5rem)  32px (2rem)
    ├── Border Radius → 4px  8px  12px
    ├── Shadows → 8 values
    ├── Buttons → 3 variants (primary, secondary, outline)
    ├── Breakpoints → 768px → 1024px → 1280px
    └── Frameworks → React, Tailwind CSS
```

## How it works

IRIS uses **Playwright** to render pages in a real browser, then runs 14 parallel extractors against the computed DOM:

1. **Stealth navigation** — anti-detection scripts, retry logic, SPA hydration waits
2. **Parallel extraction** — all 14 extractors run concurrently via `asyncio.gather`
3. **State simulation** — hovers elements to capture hover/focus colors
4. **Color science** — converts every color to sRGB, LCH, and OKLCH
5. **Confidence scoring** — high (brand elements) / medium (interactive) / low (generic)

Extractors cover: logo, colors, typography, spacing, border-radius, borders, shadows, buttons, inputs, links, badges, breakpoints, icon systems, and frameworks.

## Dark mode & mobile

```bash
# Extract both light and dark mode colors
iris stripe.com --dark-mode

# Mobile-first responsive extraction
iris stripe.com --mobile --save-output
```

Dark mode colors are deduplicated against light mode. Mobile viewport (390×844 iPhone) captures responsive breakpoints and mobile-specific styles.

## W3C DTCG export

The `--dtcg` flag produces tokens conforming to the [W3C Design Tokens Community Group](https://www.designtokens.org/) format — compatible with [Style Dictionary](https://styledictionary.com) and design tool plugins.

```bash
iris stripe.com --dtcg
# → output/stripe.com/2026-07-17T05-00-00.tokens.json
```

## Limitations

- Canvas / WebGL–rendered sites (Tesla, Apple Vision Pro) can't be analyzed
- Dark mode must be forced with `--dark-mode` (not auto-detected)
- Heavy SPAs may need `--slow` for full hydration
- Hover/focus states are simulated, not read from CSS (some may be missed)

## Ethics

Analyzing public CSS is legal under US DMCA § 1201 and EU Software Directive. Use for audits and inspiration — don't clone competitors. Respect `robots.txt`.

---

<div align="center">
  <a href="https://github.com/mangodxd/web-design-tokens/issues">Report a bug</a> •
  <a href="https://github.com/mangodxd/web-design-tokens/discussions">Discussion</a> •
  <a href="LICENSE">MIT License</a>
</div>
