"""IRIS — Extract design tokens from any website in seconds."""

__version__ = "0.1.0"
__author__ = "Nguyễn Công Thuận Huy"

from web_design_tokens.core.extractors import extractBranding
from web_design_tokens.core.display import display
from web_design_tokens.core.w3c_exporter import toW3CFormat
from web_design_tokens.core.colors import ConvertColor

__all__ = [
    "extractBranding",
    "display",
    "toW3CFormat",
    "ConvertColor",
]
