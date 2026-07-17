"""IRIS — Extract design tokens from any website in seconds."""

__version__ = "0.1.0"
__author__ = "Nguyen Cong Thuan Huy"

from iris.core.extractors import extractBranding
from iris.core.display import display
from iris.core.w3c_exporter import toW3CFormat
from iris.core.colors import ConvertColor

__all__ = [
    "extractBranding",
    "display",
    "toW3CFormat",
    "ConvertColor",
]
