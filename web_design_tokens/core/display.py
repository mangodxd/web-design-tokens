from datetime import datetime

from rich.console import Console
from rich.markup import escape
from rich.text import Text
from rich.tree import Tree

from .colors import ConvertColor

"""
/**
 * display.py -Terminal Display Formatter
 *
 * Formats extracted brand data into clean, readable terminal output
 * with color swatches and minimal design.
 */
 """

console = Console()

class BrandDisplay:
    def __init__(self, data: dict):
        self.data = data
        self.tree = Tree("[bold cyan]Brand Extraction[/bold cyan]")

    def _get_current_time(self):
        return datetime.now().strftime("%I:%M:%S %p")

    def render(self):
        data = self.data
        tree = self.tree

        # Header
        url = data.get('url', '')
        header = tree.add(f"[bold blue link={url}]{url}[/bold blue link]")
        header.add(f"[dim]{self._get_current_time()}[/dim]")

        # Logo
        logo = data.get('logo')
        if isinstance(logo, dict):
            l_node = tree.add("[bold]Logo[/bold]")
            l_url = logo.get('url')
            l_w = logo.get('width')
            l_h = logo.get('height')

            if l_url:
                l_node.add(f"[blue link={l_url}]{l_url}[/blue link]")
            if l_w and l_h:
                l_node.add(f"[dim]{l_w}×{l_h}px[/dim]")

        # Favicons
        favicons = data.get('favicons')
        if isinstance(favicons, list):
            f_node = tree.add("[bold]Favicons[/bold]")
            for f in favicons:
                f_url = f.get('url', '')
                f_type = f.get('type', '')
                f_size = f.get('sizes')

                sz = f"[dim] · {f_size}[/dim]" if f_size else ""
                t_pad = f_type.ljust(18)

                name = f"[#8BE9FD]{escape(t_pad)}[/#8BE9FD]"
                link = f"[blue link={f_url}]{f_url}[/blue link]"
                f_node.add(f"{name} {link}{sz}")

        # Colors
        colors = data.get('colors', {})
        if colors:
            c_node = tree.add("[bold]Colors[/bold]")
            all_c = []

            semantic = colors.get('semantic', {})
            for role, val in semantic.items():
                if val:
                    conv = ConvertColor(val)
                    if conv:
                        all_c.append({**conv, 'label': role, 'confidence': 'high'})

            css_vars = colors.get('cssVariables', {})
            for name, var in list(css_vars.items())[:15]:
                val = var if isinstance(var, str) else var.get('value')
                conv = ConvertColor(val)
                if conv:
                    all_c.append({**conv, 'label': name, 'confidence': 'high'})

            palette = colors.get('palette', [])
            valid_p = [x for x in palette if x.get('confidence') in ('high', 'medium')][:20]
            for p in valid_p:
                conv = ConvertColor(p.get('color'))
                if conv:
                    all_c.append({**conv, 'label': '', 'confidence': p.get('confidence')})

            # collect colors from multiple sources (semantic, CSS vars, palette)
            # then deduplicate by hex to avoid noisy terminal output
            unique = {}
            for c in all_c:
                key = c['hex'].lower()
                if key not in unique:
                    unique[key] = dict(c)
                elif c['label'] and c['label'] not in unique[key]['label']:
                    # merge labels if same color is reused in multiple roles
                    curr_lbl = unique[key]['label']
                    unique[key]['label'] = f"{curr_lbl}, {c['label']}" if curr_lbl else c['label']

            for c in unique.values():
                # UI/UX things
                is_high = c['confidence'] == 'high'
                conf_c = "#50FA7B" if is_high else "#FFB86C"
                c_hex = c['hex']
                c_lbl = c['label']

                swatch = f"[{c_hex}]■[/]" if c_hex.startswith("#") else ""
                lbl = f" [dim]{escape(c_lbl)}[/dim]" if c_lbl else ""

                sub = c_node.add(Text.from_markup(f"[{conf_c}]●[/{conf_c}] {swatch} {c_hex}{lbl}"))
                sub.add(f"[dim]rgb:   {c['rgb']}[/dim]")
                sub.add(f"[dim]lch:   {c['lch']}[/dim]")
                sub.add(f"[dim]oklch: {c['oklch']}[/dim]")

        # Typography
        typo = data.get('typography', {})
        if typo:
            t_node = tree.add("[bold]Typography[/bold]")
            sources = typo.get('sources', {})
            google = sources.get('googleFonts', []) if isinstance(sources, dict) else []

            if google:
                t_node.add(f"[dim]Fonts: {', '.join(google[:3])}[/dim]")

            fams = {}
            for s in typo.get('styles', []):
                fam = s.get('family')
                if fam:
                    ctx = s.get('context', 'unknown')
                    fams.setdefault(fam, {}).setdefault(ctx, []).append(s)

            for f_name, ctxs in fams.items():
                fn = t_node.add(f"[bold]{f_name}[/bold]")
                for ctx_name, styles in ctxs.items():
                    cn = fn.add(f"[#8BE9FD]{ctx_name}[/#8BE9FD]")
                    for s in styles:
                        size = s.get('size', '')
                        weight = s.get('weight')
                        lh = s.get('lineHeight')
                        vn = cn.add(str(size))
                        if weight and weight != 400:
                            vn.add(f"[dim]weight: {weight}[/dim]")
                        if lh:
                            vn.add(f"[dim]line-height: {lh}[/dim]")

        # Spacing
        spacing = data.get('spacing', {})
        common_spaces = spacing.get('commonValues', [])
        if common_spaces:
            s_node = tree.add("[bold]Spacing[/bold]")
            for v in common_spaces[:15]:
                px = v.get('px', '').ljust(8)
                rem = v.get('rem', '')
                s_node.add(f"{px} [dim]{rem}[/dim]")

        # Border Radius
        br = data.get('borderRadius', {})
        br_vals = br.get('values', [])
        if br_vals:
            br_node = tree.add("[bold]Border Radius[/bold]")
            valid_br = [x for x in br_vals if x.get('confidence') in ('high', 'medium')][:12]
            for r in valid_br:
                val = r.get('value', '')
                elements = r.get('elements', [])
                el_str = f" [dim]({', '.join(elements)})[/dim]" if elements else ""
                br_node.add(f"{val}{el_str}")

        # Shadows
        shadows = data.get('shadows', [])
        if shadows:
            sh_node = tree.add("[bold]Shadows[/bold]")
            valid_sh = [x for x in shadows if x.get('confidence') in ('high', 'medium')]
            sorted_sh = sorted(
                valid_sh,
                key=lambda x: (x.get('confidence') == 'high', x.get('count', 0)),
                reverse=True
            )[:8]
            for s in sorted_sh:
                is_high = s.get('confidence') == 'high'
                cf = "[#50FA7B]●[/#50FA7B]" if is_high else "[#FFB86C]●[/#FFB86C]"
                sh_text = escape(s.get('shadow', ''))
                sh_node.add(f"{cf} {sh_text}")

        # Components
        comps = data.get('components', {})
        buttons = comps.get('buttons', [])
        if buttons:
            btn_node = tree.add("[bold]Buttons[/bold]")
            high_conf_btns = [b for b in buttons if b.get('confidence') == 'high'][:6]
            for btn in high_conf_btns:
                states = btn.get('states', {})
                default_st = states.get('default', {})
                bg = default_st.get('backgroundColor', '')

                swatch = f"[{bg} on black]  [/] " if bg.startswith('#') else ""
                b_sub = btn_node.add(f"Variant: {swatch}[bold]{bg}[/bold]")

                for sk in ['default', 'hover', 'focus']:
                    st = states.get(sk)
                    if st:
                        sn = b_sub.add(f"[#8BE9FD]{sk.capitalize()}[/#8BE9FD]")
                        for k, v in st.items():
                            if v and v not in ('none', '0px', 'transparent'):
                                sn.add(f"[dim]{k}: {escape(str(v))}[/dim]")

        # Breakpoints
        bps = data.get('breakpoints', [])
        if bps:
            v_bps = [b for b in bps if b.get('px') and not str(b['px']).isalpha()]
            v_bps.sort(key=lambda x: float(str(x.get('px', 0)).replace('px', '')), reverse=True)
            if v_bps:
                bp_str = " → ".join([str(b.get('px', '')) for b in v_bps])
                tree.add("[bold]Breakpoints[/bold]").add(bp_str)

        # Frameworks
        fws = data.get('frameworks', [])
        if fws:
            fw_node = tree.add("[bold]Frameworks[/bold]")
            for f in fws:
                is_high = f.get('confidence') == 'high'
                cf = "[#50FA7B]●[/#50FA7B]" if is_high else "[#FFB86C]●[/#FFB86C]"
                name = f.get('name', '')
                evidence = f.get('evidence', '')
                fw_node.add(f"{cf} {name} [dim]{evidence}[/dim]")

        tree.add("\n[bold #50FA7B]✓ Complete[/bold #50FA7B]")
        console.print(tree)

def display(data: dict):
    BrandDisplay(data).render()
