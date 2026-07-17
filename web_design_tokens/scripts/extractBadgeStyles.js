() => {
    const badges = Array.from(document.querySelectorAll(`[class*="badge"], [class*="tag"], [class*="pill"], [class*="chip"], [class*="label"]:not(label), [role="status"], .badge, .tag, .pill, .chip, .label:not(label)`));
    const badgeStyles = [];
    const seenStyles = new Map();

    badges.forEach((badge) => {
        const computed = getComputedStyle(badge);
        const rect = badge.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || computed.display === 'none' || computed.visibility === 'hidden') return;
        const width = rect.width;
        const height = rect.height;
        const fontSize = parseFloat(computed.fontSize);
        if (width > 200 || height > 60 || fontSize > 16) return;

        const bg = computed.backgroundColor;
        const border = computed.border;
        const borderWidth = computed.borderWidth;
        const hasBorder = borderWidth && parseFloat(borderWidth) > 0 && border !== 'none';
        const hasBackground = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        if (!hasBackground && !hasBorder) return;

        const avgPaddingVertical = (parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom)) / 2;
        const avgPaddingHorizontal = (parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight)) / 2;
        if (avgPaddingVertical > 16 || avgPaddingHorizontal > 24) return;

        const className = typeof badge.className === 'string' ? badge.className : badge.className.baseVal || '';
        const hasSemanticClass = /badge|tag|pill|chip|label|status/i.test(className);
        const hasSemanticRole = badge.getAttribute('role') === 'status';
        const borderRadius = parseFloat(computed.borderRadius);
        const isRounded = borderRadius > height / 3;

        const bgColor = computed.backgroundColor;
        let variant = 'neutral';
        if (bgColor.includes('255, 0, 0') || bgColor.includes('220, 53, 69') || bgColor.includes('239, 68, 68')) variant = 'error';
        else if (bgColor.includes('255, 193, 7') || bgColor.includes('251, 191, 36') || bgColor.includes('245, 158, 11')) variant = 'warning';
        else if (bgColor.includes('40, 167, 69') || bgColor.includes('34, 197, 94') || bgColor.includes('16, 185, 129')) variant = 'success';
        else if (bgColor.includes('0, 123, 255') || bgColor.includes('59, 130, 246') || bgColor.includes('37, 99, 235')) variant = 'info';

        let styleType = 'filled';
        if (!hasBackground && hasBorder) styleType = 'outline';
        else if (hasBackground) {
            const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                const [, r, g, b] = rgbMatch.map(Number);
                if (r > 240 && g > 240 && b > 240) styleType = 'subtle';
            }
        }

        const confidence = (hasSemanticClass || hasSemanticRole) ? 'high' : 'medium';
        const styleKey = `${bgColor}-${computed.color}-${borderRadius}-${styleType}`;
        if (!seenStyles.has(styleKey)) {
            badgeStyles.push({ backgroundColor: bgColor, color: computed.color, padding: computed.padding, borderRadius: computed.borderRadius, border: computed.border, fontSize: computed.fontSize, fontWeight: computed.fontWeight, lineHeight: computed.lineHeight, textTransform: computed.textTransform, letterSpacing: computed.letterSpacing, variant, styleType, isRounded, classes: className.substring(0, 50), confidence });
            seenStyles.set(styleKey, true);
        }
    });

    return { all: badgeStyles.slice(0, 20), byVariant: { error: badgeStyles.filter(b => b.variant === 'error'), warning: badgeStyles.filter(b => b.variant === 'warning'), success: badgeStyles.filter(b => b.variant === 'success'), info: badgeStyles.filter(b => b.variant === 'info'), neutral: badgeStyles.filter(b => b.variant === 'neutral') } };
}
