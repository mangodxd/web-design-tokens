() => {
    const breakpoints = new Set();
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules || []) {
                if (rule.media) {
                    const match = rule.media.mediaText.match(/(\d+)px/g);
                    if (match) match.forEach((m) => breakpoints.add(parseInt(m)));
                }
            }
        } catch (e) {}
    }
    return Array.from(breakpoints).sort((a, b) => a - b).map((px) => ({ px: px + "px" }));
}
