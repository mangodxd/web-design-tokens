import logging
import re
from urllib.parse import urlparse

from .colors import ConvertColor

"""
/**
 * Convert color value to W3C DTCG color format
 * Spec1: https://www.designtokens.org/TR/2025.10/format/
 * Spec2: https://www.designtokens.org/TR/2025.10/format/#color
 *
 * Based on spec examples (Example 7, 45, 54), color format includes:
 * - colorSpace: "srgb"
 * - components: [r, g, b] (normalized 0-1)
 * - hex: "#rrggbb"
 * - alpha: 0-1 (optional, for transparency)
 */
"""

logger = logging.getLogger(__name__)

def get_w3c_color(color_str):
    res = ConvertColor(color_str)
    return res.get('w3c') if res else None

def to_w3c_dimension(value):
    """
    Normalize heterogeneous dimension inputs into W3C DTCG format.

    Accepts:
    - raw numbers
    - CSS strings (px, rem, %, mixed annotations)
    - extractor-produced dicts

    Always returns a safe fallback instead of raising.
    """
    try:
        if isinstance(value, str):
            clean = value.split('(')[0].strip()
            # handling string values like "16px", "1rem", "50%", "16px (1.00rem)"
            match = re.match(r"^([-\d.]+)\s*([a-z%]*)$", clean, re.I)
            if match: return {'value': float(match.group(1)), 'unit': match.group(2) or 'px'}

        if isinstance(value, (int, float)): return {'value': float(value), 'unit': 'px'}
        if isinstance(value, dict) and 'px' in value: return {'value': float(value['px']), 'unit': 'px'}
        return {'value': float(value), 'unit': 'px'}
    except Exception: return {'value': 0, 'unit': 'px'}

def sanitize(name):
    """
    Sanitize token names to be W3C-compliant.

    Constraints enforced:
    - no leading '$'
    - no '.', '{', '}'
    - lowercase, kebab-case
    """
    return re.sub(r"\s+", "-", re.sub(r"[{}.]", "-", str(name).lstrip('$'))).lower()

def export_colors(colors):
    if not colors or not colors.get('palette'): return None
    tokens = {}

    # semantic
    if colors.get('semantic'):
        sem = {sanitize(k): {'$type': 'color', '$value': get_w3c_color(v if isinstance(v, str) else v.get('color'))}
               for k, v in colors['semantic'].items() if v}
        if sem: tokens['semantic'] = sem

    # palette
    valid_p = [c for c in colors['palette'] if c.get('confidence') != 'low'][:30]
    tokens['palette'] = {f"palette-{i+1}": {
        '$type': 'color', '$value': get_w3c_color(c['color']),
        '$description': f"Count: {c.get('count', 0)}, Confidence: {c.get('confidence')}"
    } for i, c in enumerate(valid_p)}

    return tokens

def export_typography(typo):
    if not typo or not typo.get('styles'): return None
    tokens = {}
    styles = typo['styles']

    # families
    fams = {s['family'] for s in styles if s.get('family')}
    tokens['font-family'] = {sanitize(f): {'$type': 'fontFamily', '$value': f} for f in fams}

    # styles
    text_styles = {}
    for i, s in enumerate(styles[:10]):
        name = f"text-{sanitize(s['context'])}" if s.get('context') else f"text-{i+1}"
        val = {}
        if s.get('family'): val['fontFamily'] = f"{{typography.font-family.{sanitize(s['family'])}}}"
        if s.get('size'): val['fontSize'] = {'$type': 'dimension', '$value': to_w3c_dimension(s['size'])}
        if s.get('weight'): val['fontWeight'] = {'$type': 'fontWeight', '$value': int(s['weight']) if str(s['weight']).isdigit() else 400}
        if s.get('lineHeight'): val['lineHeight'] = {'$type': 'number', '$value': float(s['lineHeight'])}
        text_styles[name] = {'$type': 'typography', '$value': val}

    tokens['style'] = text_styles
    return tokens

def export_spacing(spacing):
    vals = spacing.get('commonValues') if spacing else None
    if not vals: return None
    return {f"spacing-{i+1}": {'$type': 'dimension', '$value': to_w3c_dimension(v.get('px', v))} for i, v in enumerate(vals[:12])}

def export_radius(br):
    vals = br.get('values') if br else None
    if not vals: return None
    return {f"radius-{i+1}": {'$type': 'dimension', '$value': to_w3c_dimension(e['value'])}
            for i, e in enumerate([x for x in vals if x.get('confidence') != 'low'][:6])}

def export_borders(b):
    if not b or not b.get('combinations'): return None
    widths, colors, seen_w, seen_c = {}, {}, set(), set()
    for combo in [c for c in b['combinations'] if c.get('confidence') != 'low'][:10]:
        w, c = combo.get('width'), combo.get('color')
        if w and w not in seen_w:
            widths[f"border-width-{len(seen_w)+1}"] = {'$type': 'dimension', '$value': to_w3c_dimension(w)}
            seen_w.add(w)
        if c and c not in seen_c:
            colors[f"border-color-{len(seen_c)+1}"] = {'$type': 'color', '$value': get_w3c_color(c)}
            seen_c.add(c)
    return {'width': widths, 'color': colors} if (widths or colors) else None

def export_shadows(sh):
    if not sh: return None
    tokens = {}
    for i, s in enumerate([x for x in sh if x.get('confidence') != 'low'][:6]):
        p = s['shadow'].strip().split()
        raw_c = p[4] if len(p) > 4 and p[4].startswith('#') else '#000000'
        tokens[f"shadow-{i+1}"] = {'$type': 'shadow', '$value': {
            'offsetX': to_w3c_dimension(p[0] if len(p) > 0 else '0px'),
            'offsetY': to_w3c_dimension(p[1] if len(p) > 1 else '0px'),
            'blur': to_w3c_dimension(p[2] if len(p) > 2 else '0px'),
            'spread': to_w3c_dimension(p[3] if len(p) > 3 else '0px'),
            'color': get_w3c_color(raw_c)
        }}
    return tokens

def toW3CFormat(res):
    url = res.get('url', '')
    tokens = {
        '$extensions': {
            'com.nguyencongthuanhuy': {
                'url': url, 'domain': urlparse(url).hostname.replace('www.', '') if url else 'unknown',
                'extractedAt': res.get('extractedAt')
            }
        }
    }
    mapping = [('color', export_colors, 'colors'), ('typography', export_typography, 'typography'),
               ('spacing', export_spacing, 'spacing'), ('radius', export_radius, 'borderRadius'),
               ('border', export_borders, 'borders'), ('shadow', export_shadows, 'shadows')]
    for key, func, d_key in mapping:
        out = func(res.get(d_key))
        if out: tokens[key] = out
    return tokens
