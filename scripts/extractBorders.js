() => {
    const combinations = new Map();
    document.querySelectorAll("*").forEach((el) => {
        const computed = getComputedStyle(el);
        const borderWidth = computed.borderWidth;
        const borderStyle = computed.borderStyle;
        const borderColor = computed.borderColor;
        if (borderWidth && borderWidth !== "0px" && borderStyle && borderStyle !== "none" && borderColor && borderColor !== "rgba(0, 0, 0, 0)" && borderColor !== "transparent") {
            const colorRegex = /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;
            const individualColors = borderColor.match(colorRegex) || [borderColor];
            const normalizedColor = individualColors[0];
            if (normalizedColor && normalizedColor !== "rgba(0, 0, 0, 0)" && normalizedColor !== "rgba(0,0,0,0)" && normalizedColor !== "transparent") {
                const key = `${borderWidth}|${borderStyle}|${normalizedColor}`;
                if (!combinations.has(key)) combinations.set(key, { width: borderWidth, style: borderStyle, color: normalizedColor, count: 0, elements: new Set() });
                const combo = combinations.get(key);
                combo.count++;
                const tag = el.tagName.toLowerCase();
                const role = el.getAttribute('role');
                const classes = Array.from(el.classList);
                let context = tag;
                if (role) context = role;
                else if (classes.some(c => c.includes('button') || c.includes('btn'))) context = 'button';
                else if (classes.some(c => c.includes('card'))) context = 'card';
                else if (classes.some(c => c.includes('input') || c.includes('field'))) context = 'input';
                else if (classes.some(c => c.includes('modal') || c.includes('dialog'))) context = 'modal';
                combo.elements.add(context);
            }
        }
    });
    const processed = Array.from(combinations.values()).map(combo => ({ width: combo.width, style: combo.style, color: combo.color, count: combo.count, elements: Array.from(combo.elements).slice(0, 5), confidence: combo.count > 10 ? "high" : combo.count > 3 ? "medium" : "low" })).sort((a, b) => b.count - a.count);
    return { combinations: processed };
}