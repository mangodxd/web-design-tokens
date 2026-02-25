() => {
    const links = Array.from(document.querySelectorAll(`a, [role="link"], [aria-current]`));
    const uniqueStyles = new Map();

    links.forEach((link) => {
        const computed = getComputedStyle(link);
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || computed.display === 'none' || computed.visibility === 'hidden') return;
        const normalizeColor = (color) => {
            try {
                const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (rgbaMatch) return `#${parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')}${parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')}${parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')}`;
                return color.toLowerCase();
            } catch { return color; }
        };
        const key = normalizeColor(computed.color);

        if (!uniqueStyles.has(key)) {
            let hoverState = null;
            try {
                const sheets = Array.from(document.styleSheets);
                const className = typeof link.className === 'string' ? link.className : link.className.baseVal || '';
                const classes = className.split(' ').filter(c => c);
                for (const sheet of sheets) {
                    try {
                        const rules = Array.from(sheet.cssRules || []);
                        for (const rule of rules) {
                            if (rule.selectorText) {
                                const matchesLink = classes.some(cls => rule.selectorText.includes(`.${cls}`)) || rule.selectorText.includes('a:hover');
                                if (matchesLink && rule.selectorText.includes(':hover')) {
                                    if (!hoverState) hoverState = {};
                                    if (rule.style.color) hoverState.color = rule.style.color;
                                    if (rule.style.textDecoration) hoverState.textDecoration = rule.style.textDecoration;
                                }
                            }
                        }
                    } catch (e) {}
                }
            } catch (e) {}

            uniqueStyles.set(key, { color: computed.color, textDecoration: computed.textDecoration, fontWeight: computed.fontWeight, states: { default: { color: computed.color, textDecoration: computed.textDecoration }, hover: hoverState } });
        } else {
            const existing = uniqueStyles.get(key);
            if (!existing.states.default.textDecoration || existing.states.default.textDecoration === 'none') {
                if (computed.textDecoration && computed.textDecoration !== 'none') existing.states.default.textDecoration = computed.textDecoration;
            }
        }
    });
    return Array.from(uniqueStyles.values()).slice(0, 8);
}
