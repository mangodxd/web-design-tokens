() => {
    const inputs = Array.from(document.querySelectorAll(`input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], input[type="number"], input[type="checkbox"], input[type="radio"], textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"], [contenteditable="true"]`));
    const inputGroups = { text: [], checkbox: [], radio: [], select: [] };

    inputs.forEach((input) => {
        const computed = getComputedStyle(input);
        const rect = input.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || computed.display === 'none' || computed.visibility === 'hidden') return;

        let inputType = 'text';
        if (input.tagName === 'TEXTAREA') inputType = 'text';
        else if (input.tagName === 'SELECT') inputType = 'select';
        else if (input.type === 'checkbox') inputType = 'checkbox';
        else if (input.type === 'radio') inputType = 'radio';
        else if (['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(input.type)) inputType = 'text';

        const specificType = input.type || input.tagName.toLowerCase();
        const defaultState = { backgroundColor: computed.backgroundColor, color: computed.color, border: computed.border || `${computed.borderWidth} ${computed.borderStyle} ${computed.borderColor}`, borderRadius: computed.borderRadius, padding: computed.padding, boxShadow: computed.boxShadow, outline: computed.outline };
        let focusState = null;

        try {
            const sheets = Array.from(document.styleSheets);
            const className = typeof input.className === 'string' ? input.className : input.className.baseVal || '';
            const classes = className.split(' ').filter(c => c);
            for (const sheet of sheets) {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    for (const rule of rules) {
                        if (rule.selectorText) {
                            const matchesInput = classes.some(cls => rule.selectorText.includes(`.${cls}`)) || rule.selectorText.includes(input.tagName.toLowerCase()) || (input.type && rule.selectorText.includes(`[type="${input.type}"]`));
                            if (matchesInput && rule.selectorText.includes(':focus')) {
                                if (!focusState) focusState = {};
                                if (rule.style.backgroundColor) focusState.backgroundColor = rule.style.backgroundColor;
                                if (rule.style.color) focusState.color = rule.style.color;
                                if (rule.style.border) focusState.border = rule.style.border;
                                if (rule.style.borderColor) focusState.borderColor = rule.style.borderColor;
                                if (rule.style.boxShadow) focusState.boxShadow = rule.style.boxShadow;
                                if (rule.style.outline) focusState.outline = rule.style.outline;
                            }
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}

        inputGroups[inputType].push({ specificType, states: { default: defaultState, focus: focusState } });
    });

    const deduplicateGroup = (group) => {
        const seen = new Map();
        for (const item of group) {
            const key = `${item.states.default.border}|${item.states.default.borderRadius}|${item.states.default.backgroundColor}`;
            if (!seen.has(key)) seen.set(key, item);
        }
        return Array.from(seen.values());
    };

    return { text: deduplicateGroup(inputGroups.text).slice(0, 5), checkbox: deduplicateGroup(inputGroups.checkbox).slice(0, 3), radio: deduplicateGroup(inputGroups.radio).slice(0, 3), select: deduplicateGroup(inputGroups.select).slice(0, 3) };
}
