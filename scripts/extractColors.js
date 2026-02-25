() => {
    function normalizeColor(color) {
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, "0");
            const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, "0");
            const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, "0");
            return `#${r}${g}${b}`;
        }
        return color.toLowerCase();
    }
    function isValidColorValue(value) {
        if (!value) return false;
        if (value.includes("calc(") || value.includes("clamp(") || value.includes("var(")) {
            return /#[0-9a-f]{3,6}|rgba?\(|hsla?\(/i.test(value);
        }
        return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[a-z]+)/i.test(value);
    }

    const colorMap = new Map();
    const semanticColors = {};
    const cssVariables = {};
    const styles = getComputedStyle(document.documentElement);
    const domain = window.location.hostname;

    for (let i = 0; i < styles.length; i++) {
        const prop = styles[i];
        if (prop.startsWith("--")) {
            if (prop.startsWith("--wp--preset")) continue;
            if (prop.includes("--system-") || prop.includes("--default-")) continue;
            if (prop.includes("--cc-") && !domain.includes("cookie") && !domain.includes("consent")) continue;
            const nonColorUtilities = ['--tw-ring-offset-width', '--tw-ring-offset', '--tw-shadow', '--tw-blur', '--tw-brightness', '--tw-contrast', '--tw-grayscale', '--tw-hue-rotate', '--tw-invert', '--tw-saturate', '--tw-sepia', '--tw-drop-shadow', '--tw-translate-x', '--tw-translate-y', '--tw-translate-z', '--tw-rotate', '--tw-skew-x', '--tw-skew-y', '--tw-scale-x', '--tw-scale-y', '--tw-scale-z', '--tw-gradient-from-position', '--tw-gradient-via-position', '--tw-gradient-to-position', '--tw-divide-', '--tw-space-', '--bs-gutter', '--bs-border-spacing'];
            if (nonColorUtilities.some(pattern => prop.includes(pattern))) continue;
            const value = styles.getPropertyValue(prop).trim();
            if (!value.match(/^(#|rgb|hsl|var\(--.*color|color\()/i)) continue;
            if (value.includes("color.adjust(") || value.includes("rgba(0, 0, 0, 0)") || value.includes("rgba(0,0,0,0)") || value.includes("lighten(") || value.includes("darken(") || value.includes("saturate(")) continue;
            if (isValidColorValue(value) && (prop.includes("color") || prop.includes("bg") || prop.includes("text") || prop.includes("brand"))) {
                cssVariables[prop] = value;
            }
        }
    }

    const elements = document.querySelectorAll("*");
    const totalElements = elements.length;
    const contextScores = { logo: 5, brand: 5, primary: 4, cta: 4, hero: 3, button: 3, link: 2, header: 2, nav: 1 };

    elements.forEach((el) => {
        const computed = getComputedStyle(el);
        if (computed.display === "none" || computed.visibility === "hidden" || computed.opacity === "0") return;
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;
        const borderColor = computed.borderColor;
        const context = (el.className + " " + el.id + " " + (el.getAttribute('data-tracking-linkid') || '') + " " + (el.getAttribute('data-cta') || '') + " " + (el.getAttribute('data-component') || '') + " " + el.tagName).toLowerCase();

        let score = 1;
        for (const [keyword, weight] of Object.entries(contextScores)) {
            if (context.includes(keyword)) score = Math.max(score, weight);
        }
        if ((context.includes('button') || context.includes('btn') || context.includes('cta')) && bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'rgb(255, 255, 255)' && bgColor !== 'rgb(0, 0, 0)' && bgColor !== 'rgb(239, 239, 239)') {
            score = Math.max(score, 25);
        }

        function extractColorsFromValue(colorValue) {
            if (!colorValue) return [];
            const colorRegex = /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)/gi;
            const matches = colorValue.match(colorRegex) || [];
            return matches.filter(c => c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)' && c !== 'rgba(0,0,0,0)' && c.length > 2);
        }

        const allColors = [...extractColorsFromValue(bgColor), ...extractColorsFromValue(textColor), ...extractColorsFromValue(borderColor)];
        allColors.forEach((color) => {
            if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
                const normalized = normalizeColor(color);
                const existing = colorMap.get(normalized) || { original: color, count: 0, score: 0, sources: new Set() };
                existing.count++;
                existing.score += score;
                if (score > 1) {
                    const source = context.split(" ")[0].substring(0, 30);
                    if (source && !source.includes("__")) existing.sources.add(source);
                }
                colorMap.set(normalized, existing);
            }
        });

        if (context.includes("primary") || el.matches('[class*="primary"]')) semanticColors.primary = bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent" ? bgColor : textColor;
        if (context.includes("secondary")) semanticColors.secondary = bgColor;
    });

    const threshold = Math.max(3, Math.floor(totalElements * 0.01));
    function isStructuralColor(data, totalElements) {
        const usagePercent = (data.count / totalElements) * 100;
        if (data.original === "rgba(0, 0, 0, 0)" || data.original === "transparent") return true;
        if (usagePercent > 40 && data.score < data.count * 1.2) return true;
        return false;
    }

    function deltaE(rgb1, rgb2) {
        function hexToRgb(hex) {
            if (!hex.startsWith("#")) return null;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
        }
        function rgbToXyz(r, g, b) {
            r = r / 255; g = g / 255; b = b / 255;
            r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
            g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
            b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
            const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
            const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
            const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
            return { x: x * 100, y: y * 100, z: z * 100 };
        }
        function xyzToLab(x, y, z) {
            x = x / 95.047; y = y / 100.000; z = z / 108.883;
            const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x + 16 / 116);
            const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y + 16 / 116);
            const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z + 16 / 116);
            return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
        }
        const rgb1Obj = hexToRgb(rgb1);
        const rgb2Obj = hexToRgb(rgb2);
        if (!rgb1Obj || !rgb2Obj) return 999;
        const lab1 = xyzToLab(...Object.values(rgbToXyz(rgb1Obj.r, rgb1Obj.g, rgb1Obj.b)));
        const lab2 = xyzToLab(...Object.values(rgbToXyz(rgb2Obj.r, rgb2Obj.g, rgb2Obj.b)));
        return Math.sqrt(Math.pow(lab1.L - lab2.L, 2) + Math.pow(lab1.a - lab2.a, 2) + Math.pow(lab1.b - lab2.b, 2));
    }

    const palette = Array.from(colorMap.entries()).filter(([normalizedColor, data]) => {
        if (data.count < threshold) return false;
        if (isStructuralColor(data, totalElements)) return false;
        return true;
    }).map(([normalizedColor, data]) => ({
        color: data.original,
        normalized: normalizedColor,
        count: data.count,
        confidence: data.score > 20 ? "high" : data.score > 5 ? "medium" : "low",
        sources: Array.from(data.sources).slice(0, 3),
    })).sort((a, b) => b.count - a.count);

    const perceptuallyDeduped = [];
    const merged = new Set();
    palette.forEach((color, index) => {
        if (merged.has(index)) return;
        const similar = [color];
        for (let i = index + 1; i < palette.length; i++) {
            if (merged.has(i)) continue;
            if (deltaE(color.normalized, palette[i].normalized) < 15) {
                similar.push(palette[i]);
                merged.add(i);
            }
        }
        perceptuallyDeduped.push(similar.sort((a, b) => b.count - a.count)[0]);
    });

    const paletteNormalizedColors = new Set(perceptuallyDeduped.map((c) => c.normalized));
    const cssVarsByColor = new Map();
    Object.entries(cssVariables).forEach(([prop, value]) => {
        const normalized = normalizeColor(value);
        if (paletteNormalizedColors.has(normalized)) return;
        let isDuplicate = false;
        for (const paletteColor of perceptuallyDeduped) {
            if (deltaE(normalized, paletteColor.normalized) < 15) {
                isDuplicate = true; break;
            }
        }
        if (isDuplicate) return;
        if (!cssVarsByColor.has(normalized)) cssVarsByColor.set(normalized, { value, vars: [] });
        cssVarsByColor.get(normalized).vars.push(prop);
    });

    const filteredCssVariables = {};
    cssVarsByColor.forEach(({ value, vars }) => filteredCssVariables[vars[0]] = value);
    return { semantic: semanticColors, palette: perceptuallyDeduped, cssVariables: filteredCssVariables };
    }