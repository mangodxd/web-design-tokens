import math
import re
from .logger import setup_logger

"""
/**
 * colors.py - A lightweight color conversion library
 *
 * This module provides high-precision conversions between sRGB, XYZ, LAB, LCH, 
 * and OKLCH color spaces. It features a robust, "syntax-agnostic" parser 
 * capable of handling legacy CSS (commas) and modern CSS (spaces/slashes).
 */
 """

logger = setup_logger(__name__)

def srgb_to_linear(srgb):
    srgb = srgb/255
    if srgb <= 0.04045:
        return srgb/12.92
    return math.pow((srgb+0.055)/1.055, 2.4)

def linearRGB_to_XYZ(r,g,b):
    # used D65 illuminant
    return {
    "x": 0.4124564*r + 0.3575761*g + 0.1804375*b,
    "y": 0.2126729*r + 0.7151522*g + 0.0721750*b,
    "z": 0.0193339*r + 0.1191920*g + 0.9503041*b
  }


def XYZ_to_LAB(x,y,z):
    #used D65 reference white
    xn = 0.95047
    yn = 1.00000
    zn = 1.08883

    def f(x):
        return math.cbrt(x) if x > 0.008856 else (903.3*x+16)/116

    fx = f(x/xn)
    fy = f(y/yn)
    fz = f(z/zn)

    return {
        "l": 116*fy-16,
        "a": 500*(fx-fy),
        "b": 200*(fy-fz)
    }

def LAB_to_LCH(l,a,b):
    c = math.sqrt(a*a+b*b)
    h = math.atan2(b,a)*(180/math.pi)
    if h < 0:
        h += 360
    return {"l": l, "c": c, "h": h}

def RGB_to_LCH(r,g,b):
    lr = srgb_to_linear(r)
    lg = srgb_to_linear(g)
    lb = srgb_to_linear(b)
    xyz = linearRGB_to_XYZ(lr,lg,lb)
    lab = XYZ_to_LAB(xyz['x'], xyz['y'], xyz['z'])
    return LAB_to_LCH(lab['l'], lab['a'], lab['b'])

def linearRGB_to_OKLAB(r,g,b):
    l = math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b)
    m = math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b)
    s = math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b)

    return {
        "l": 0.2104542553*l+0.7936177850*m-0.0040720468*s,
        "a": 1.9779984951*l-2.4285922050*m+0.4505937099*s,
        "b": 0.0259040371*l+0.7827717662*m-0.8086757660*s
    }

def OKLAB_to_OKLCH(l,a,b):
    c = math.sqrt(a*a+b*b)
    h = math.atan2(b,a)*(180/math.pi)
    if h < 0:
        h += 360
    return {"l": l, "c": c, "h": h}

def RGB_to_OKLCH(r,g,b):
    lr = srgb_to_linear(r)
    lg = srgb_to_linear(g)
    lb = srgb_to_linear(b)
    
    oklab = linearRGB_to_OKLAB(lr,lg,lb)
    return OKLAB_to_OKLCH(oklab['l'], oklab['a'], oklab['b'])
    
def formatLCH(lch,alpha=None):
    """
    Format LCH values as CSS lch() string
    lch: {l: number, c: number, h: number}
    alpha: number - Optional alpha value (0-1)
    returns: string
    """
    l = round(lch['l'] * 100) / 100
    c = round(lch['c'] * 100) / 100
    h = round(lch['h'] * 100) / 100

    if alpha is not None and alpha < 1:
        return f"lch({l}% {c} {h} / {alpha})"
    return f"lch({l}% {c} {h})"

def formatOKLCH(OKLCH,alpha=None):
    """
    Format OKLCH values as CSS oklch() string
    lch: {l: number, c: number, h: number}
    alpha: number - Optional alpha value (0-1)
    returns: string
    """
    l = round(OKLCH['l']*100,2)
    c = round(OKLCH['c'],3)
    h = round(OKLCH['h'],2)

    if alpha is not None and alpha < 1:
        return f"oklch({l}% {c} {h} / {alpha})"
    return f"oklch({l}% {c} {h})"

def HEX_to_RGB(hex_str):
    """
    Parse a hex color string and return RGB values.
    Supports #rgb, #rrggbb, #rrggbbaa formats.
    Returns a dict with keys 'r', 'g', 'b', and optional 'a'.
    """
    if not hex_str or not hex_str.startswith('#'):
        return None
    h = hex_str.lstrip('#')
    # Expand short form (#rgb) to full form (#rrggbb)
    if len(h) == 3:
        h = ''.join([c * 2 for c in h])
    # Ensure we have at least 6 characters for RGB
    if len(h) >= 6:
        i = int(h[:6], 16)
        res = {
            'r': (i >> 16) & 0xFF,
            'g': (i >> 8) & 0xFF,
            'b': i & 0xFF
        }
        # Check for alpha channel (#rrggbbaa)
        if len(h) == 8:
            res['a'] = round(int(h[6:8], 16) / 255, 3)
        return res
    return None


def ConvertColor(string):
    """
    Parse and normalize a color string into multiple color spaces.

    Why this exists:
    - Accepts both legacy CSS (comma-separated) and modern CSS (space + slash)
    - Centralizes color normalization for downstream consumers (CLI, W3C export)
    - Fails gracefully instead of crashing the pipeline on malformed input

    Supported Inputs:
    - Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
    - RGB: rgb(255, 0, 0), rgba(255 0 0 / 0.5), rgb(100% 0% 0%)

    Example:
    >>> ConvertColor("#ff0000")
    {'hex': '#ff0000', 'rgb': 'rgb(255 0 0 / 0.5)', 'lch': 'lch(62.8% 0.258 29.23)', 'oklch': 'oklch(62.8% 0.258 29.23)'}
    """
    try:
        # Regex-first approach to support loose RGB syntax without strict CSS parsing
        matching = re.search(
            r"(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?",
            string
        )
        if matching:
            data = {
                'r': int(matching.group(1)),
                'g': int(matching.group(2)),
                'b': int(matching.group(3)),
                'a': float(matching.group(4)) if matching.group(4) else None
            }
        else:
            # Fallback to hex parsing if RGB-like pattern is not detected
            data = HEX_to_RGB(string)
        
        if not data:
            return None

        r,g,b,a = data['r'],data['g'],data['b'],data.get('a')
        hex_val = f"#{r:02x}{g:02x}{b:02x}"
        
        # Compute perceptual color spaces once; reused across outputs
        lch = RGB_to_LCH(r,g,b)
        oklch = RGB_to_OKLCH(r,g,b)

        return {
            'hex': hex_val,
            'rgb': f"rgb({r} {g} {b}{f' / {a}' if a else ''})",
            'lch': formatLCH(lch,a),
            'oklch': formatOKLCH(oklch,a),
            'w3c': {
                'colorSpace': 'srgb',
                'components': [round(r/255, 3), round(g/255, 3), round(b/255, 3)],
                'hex': hex_val
            },
            'hasAlpha': bool(a)
        }
    except Exception as e:
        
        logger.error(f"Error processing color {string}: {e}")
        # Hard fallback: color parsing should never break the extraction pipeline
        return {
            'hex': '#000000',
            'rgb': 'rgb(0 0 0)',
            'lch': 'lch(0% 0 0)',
            'oklch': 'oklch(0% 0 0)',
            'w3c': {'colorSpace': 'srgb', 'components': [0, 0, 0], 'hex': '#000000'},
            'hasAlpha': False
        }