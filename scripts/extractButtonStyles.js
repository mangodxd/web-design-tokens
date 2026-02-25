() => {
    const buttons = Array.from(document.querySelectorAll(`button, a[type="button"], [role="button"], [role="tab"], [role="menuitem"], [role="switch"], [aria-pressed], [aria-expanded], .btn, [class*="btn"], [class*="button"], [class*="cta"], [data-cta]`));
    const extractState = (btn, stateName = 'default') => {
        const computed = getComputedStyle(btn);
        return { backgroundColor: computed.backgroundColor, color: computed.color, padding: computed.padding, borderRadius: computed.borderRadius, border: computed.border || `${computed.borderWidth} ${computed.borderStyle} ${computed.borderColor}`, boxShadow: computed.boxShadow, outline: computed.outline, transform: computed.transform, opacity: computed.opacity };
    };
    const buttonStyles = [];
    buttons.forEach((btn) => {
        const computed = getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || computed.display === 'none' || computed.visibility === 'hidden') return;
        const bg = computed.backgroundColor;
        const border = computed.border;
        const borderWidth = computed.borderWidth;
        const borderColor = computed.borderColor;
        const boxShadow = computed.boxShadow;
        const hasBorder = borderWidth && parseFloat(borderWidth) > 0 && border !== 'none' && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent';
        const hasBackground = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        const hasShadow = boxShadow && boxShadow !== 'none' && boxShadow !== 'rgba(0, 0, 0, 0)';
        if (!hasBackground && !hasBorder && !hasShadow) return;
        
        const role = btn.getAttribute('role');
        const isNativeButton = btn.tagName === "BUTTON";
        const isButtonRole = ['button', 'tab', 'menuitem', 'switch'].includes(role);
        const hasAriaPressed = btn.hasAttribute('aria-pressed');
        const hasAriaExpanded = btn.hasAttribute('aria-expanded');
        const isHighConfidence = isNativeButton || isButtonRole || hasAriaPressed || hasAriaExpanded;
        const className = typeof btn.className === 'string' ? btn.className : btn.className.baseVal || '';
        const defaultState = extractState(btn, 'default');
        const states = { default: defaultState, hover: null, active: null, focus: null };

        try {
            const sheets = Array.from(document.styleSheets);
            for (const sheet of sheets) {
                let rules = [];
                try {
                    if (sheet.href && new URL(sheet.href).origin !== window.location.origin) continue;
                    rules = Array.from(sheet.cssRules || []);
                } catch (e) {
                    continue;
                }
                for (const rule of rules) {
                    if (rule.selectorText) {
                        const btnClasses = className.split(' ').filter(c => c);
                        const matchesButton = btnClasses.some(cls => rule.selectorText.includes(`.${cls}`));
                        if (matchesButton || rule.selectorText.includes(btn.tagName.toLowerCase())) {
                            if (rule.selectorText.includes(':hover')) {
                                if (!states.hover) states.hover = {};
                                if (rule.style.backgroundColor) states.hover.backgroundColor = rule.style.backgroundColor;
                                if (rule.style.color) states.hover.color = rule.style.color;
                                if (rule.style.boxShadow) states.hover.boxShadow = rule.style.boxShadow;
                                if (rule.style.outline) states.hover.outline = rule.style.outline;
                                if (rule.style.border) states.hover.border = rule.style.border;
                                if (rule.style.transform) states.hover.transform = rule.style.transform;
                                if (rule.style.opacity) states.hover.opacity = rule.style.opacity;
                            }
                            if (rule.selectorText.includes(':active')) {
                                if (!states.active) states.active = {};
                                if (rule.style.backgroundColor) states.active.backgroundColor = rule.style.backgroundColor;
                                if (rule.style.color) states.active.color = rule.style.color;
                                if (rule.style.boxShadow) states.active.boxShadow = rule.style.boxShadow;
                                if (rule.style.outline) states.active.outline = rule.style.outline;
                                if (rule.style.border) states.active.border = rule.style.border;
                                if (rule.style.transform) states.active.transform = rule.style.transform;
                                if (rule.style.opacity) states.active.opacity = rule.style.opacity;
                            }
                            if (rule.selectorText.includes(':focus')) {
                                if (!states.focus) states.focus = {};
                                if (rule.style.backgroundColor) states.focus.backgroundColor = rule.style.backgroundColor;
                                if (rule.style.color) states.focus.color = rule.style.color;
                                if (rule.style.boxShadow) states.focus.boxShadow = rule.style.boxShadow;
                                if (rule.style.outline) states.focus.outline = rule.style.outline;
                                if (rule.style.border) states.focus.border = rule.style.border;
                                if (rule.style.transform) states.focus.transform = rule.style.transform;
                                if (rule.style.opacity) states.focus.opacity = rule.style.opacity;
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        buttonStyles.push({ states, fontWeight: computed.fontWeight, fontSize: computed.fontSize, classes: className.substring(0, 50), confidence: isHighConfidence ? "high" : "medium" });
    });

    const uniqueButtons = [];
    const seen = new Set();
    for (const btn of buttonStyles) {
        const s = btn.states.default;
        const key = `${s.backgroundColor}|${s.border}|${s.boxShadow}`;
        if (!seen.has(key)) { seen.add(key); uniqueButtons.push(btn); }
    }
    return uniqueButtons.slice(0, 15);
}