() => {
    const spacings = new Map();
    document.querySelectorAll("*").forEach((el) => {
        const computed = getComputedStyle(el);
        ["marginTop", "marginBottom", "paddingTop", "paddingBottom"].forEach((prop) => {
            const value = parseFloat(computed[prop]);
            if (value > 0) spacings.set(value, (spacings.get(value) || 0) + 1);
        });
    });
    const values = Array.from(spacings.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([px, count]) => ({ px: px + "px", rem: (px / 16).toFixed(2) + "rem", count, numericValue: px })).sort((a, b) => a.numericValue - b.numericValue);
    const is4px = values.some((v) => parseFloat(v.px) % 4 === 0);
    const is8px = values.some((v) => parseFloat(v.px) % 8 === 0);
    const scaleType = is8px ? "8px" : is4px ? "4px" : "custom";
    return { scaleType, commonValues: values };
}