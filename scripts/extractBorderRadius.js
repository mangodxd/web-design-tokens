() => {
    const radii = new Map();
    document.querySelectorAll("*").forEach((el) => {
        const radius = getComputedStyle(el).borderRadius;
        if (radius && radius !== "0px") {
            if (!radii.has(radius)) radii.set(radius, { count: 0, elements: new Set() });
            const data = radii.get(radius);
            data.count++;
            const tag = el.tagName.toLowerCase();
            const role = el.getAttribute('role') || el.getAttribute('aria-label');
            const classes = Array.from(el.classList);
            let context = tag;
            if (role) context = role;
            else if (classes.some(c => c.includes('button') || c.includes('btn'))) context = 'button';
            else if (classes.some(c => c.includes('card'))) context = 'card';
            else if (classes.some(c => c.includes('input') || c.includes('field'))) context = 'input';
            else if (classes.some(c => c.includes('badge') || c.includes('tag') || c.includes('chip'))) context = 'badge';
            else if (classes.some(c => c.includes('modal') || c.includes('dialog'))) context = 'modal';
            else if (classes.some(c => c.includes('image') || c.includes('img') || c.includes('avatar'))) context = 'image';
            data.elements.add(context);
        }
    });
    const values = Array.from(radii.entries()).map(([value, data]) => ({ value, count: data.count, elements: Array.from(data.elements).slice(0, 5), confidence: data.count > 10 ? "high" : data.count > 3 ? "medium" : "low", numericValue: parseFloat(value) || 0 })).sort((a, b) => {
        if (a.value.includes("%") && !b.value.includes("%")) return 1;
        if (!a.value.includes("%") && b.value.includes("%")) return -1;
        return a.numericValue - b.numericValue;
    });
    return { values };
}