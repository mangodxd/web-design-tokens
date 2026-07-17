"""Unit tests for color conversion (no browser needed)."""

from iris.core.colors import ConvertColor, HEX_to_RGB, RGB_to_LCH, RGB_to_OKLCH


class TestConvertColor:
    def test_hex_rrggbb(self):
        result = ConvertColor("#ff0000")
        assert result is not None
        assert result["hex"] == "#ff0000"
        assert result["rgb"] == "rgb(255 0 0)"

    def test_hex_rgb_short(self):
        result = ConvertColor("#f00")
        assert result is not None
        assert result["hex"] == "#ff0000"

    def test_hex_with_alpha(self):
        result = ConvertColor("#ff000080")
        assert result is not None
        assert result["hasAlpha"] is True
        assert result["hex"] == "#ff0000"

    def test_rgb_function(self):
        result = ConvertColor("rgb(255, 0, 0)")
        assert result is not None
        assert result["hex"] == "#ff0000"

    def test_rgba_function(self):
        result = ConvertColor("rgba(255, 0, 0, 0.5)")
        assert result is not None
        assert result["hex"] == "#ff0000"

    def test_rgb_modern_syntax(self):
        result = ConvertColor("rgb(255 0 0)")
        assert result is not None
        assert result["hex"] == "#ff0000"

    def test_green(self):
        result = ConvertColor("#00ff00")
        assert result is not None
        assert result["hex"] == "#00ff00"

    def test_blue(self):
        result = ConvertColor("#0000ff")
        assert result is not None
        assert result["hex"] == "#0000ff"

    def test_white(self):
        result = ConvertColor("#ffffff")
        assert result is not None
        assert result["hex"] == "#ffffff"
        assert result["lch"] is not None
        assert result["oklch"] is not None

    def test_black(self):
        result = ConvertColor("#000000")
        assert result is not None
        assert result["hex"] == "#000000"

    def test_w3c_format(self):
        result = ConvertColor("#ff0000")
        assert result is not None
        w3c = result["w3c"]
        assert w3c["colorSpace"] == "srgb"
        assert w3c["components"] == [1.0, 0.0, 0.0]
        assert w3c["hex"] == "#ff0000"

    def test_invalid_returns_none(self):
        result = ConvertColor("not-a-color")
        assert result is None  # invalid input returns None

    def test_different_colors_have_different_lch(self):
        red = ConvertColor("#ff0000")
        blue = ConvertColor("#0000ff")
        assert red["lch"] != blue["lch"]
        assert red["oklch"] != blue["oklch"]


class TestHexToRGB:
    def test_6_digit(self):
        result = HEX_to_RGB("#ff0000")
        assert result == {"r": 255, "g": 0, "b": 0}

    def test_3_digit(self):
        result = HEX_to_RGB("#f00")
        assert result == {"r": 255, "g": 0, "b": 0}

    def test_8_digit_with_alpha(self):
        result = HEX_to_RGB("#ff000080")
        assert result["r"] == 255
        assert result["g"] == 0
        assert result["b"] == 0
        assert abs(result["a"] - 0.502) < 0.01

    def test_invalid(self):
        assert HEX_to_RGB("") is None
        assert HEX_to_RGB("ff0000") is None  # missing #


class TestColorMath:
    def test_rgb_to_lch_red(self):
        result = RGB_to_LCH(255, 0, 0)
        assert abs(result["l"] - 53.24) < 0.5
        assert abs(result["c"] - 104.55) < 0.5
        assert abs(result["h"] - 40.0) < 0.5

    def test_rgb_to_oklch(self):
        result = RGB_to_OKLCH(255, 0, 0)
        assert abs(result["l"] - 0.628) < 0.01
        assert abs(result["c"] - 0.258) < 0.01
        assert abs(result["h"] - 29.23) < 0.5
