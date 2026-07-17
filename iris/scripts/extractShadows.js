() => {
    const shadows = new Map();
    document.querySelectorAll("*").forEach((el) => {
        const shadow = getComputedStyle(el).boxShadow;
        if (shadow && shadow !== "none") shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
    });
    return Array.from(shadows.entries()).map(([shadow, count]) => ({ shadow, count, confidence: count > 5 ? "high" : count > 2 ? "medium" : "low" })).sort((a, b) => b.count - a.count);
}
