(baseUrl) => {
    let logoData = null;
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
        try {
            const data = JSON.parse(script.textContent);
            const findLogo = (obj) => {
                if (!obj) return null;
                if (typeof obj === 'object') {
                    if (obj['@type'] === 'Organization' || obj['@type'] === 'Corporation' || obj['@type'] === 'Brand') {
                        if (obj.logo) {
                            if (typeof obj.logo === 'string') return obj.logo;
                            if (obj.logo.url) return obj.logo.url;
                        }
                    }
                    for (const key in obj) {
                        const res = findLogo(obj[key]);
                        if (res) return res;
                    }
                } else if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const res = findLogo(item);
                        if (res) return res;
                    }
                }
                return null;
            };
            const jsonLogo = findLogo(data);
            if (jsonLogo) {
                logoData = { source: "json-ld", url: new URL(jsonLogo, baseUrl).href, width: null, height: null, alt: "JSON-LD Logo", safeZone: null };
                break;
            }
        } catch (e) {}
    }

    if (!logoData) {
        const candidates = Array.from(document.querySelectorAll("img, svg")).filter((el) => {
            const className = typeof el.className === "string" ? el.className : el.className.baseVal || "";
            const attrs = (className + " " + (el.id || "") + " " + (el.getAttribute("alt") || "")).toLowerCase();
            if (attrs.includes("logo") || attrs.includes("brand")) return true;
            if (el.tagName === "svg" || el.tagName === "SVG") {
                const useElements = el.querySelectorAll("use");
                for (const use of useElements) {
                    const href = use.getAttribute("href") || use.getAttribute("xlink:href") || "";
                    if (href.toLowerCase().includes("logo") || href.toLowerCase().includes("brand")) return true;
                }
            }
            const inHeader = el.closest('header, nav, [role="banner"], [class*="header"], [class*="Header"], [id*="header"]');
            if (inHeader) {
                const parentLink = el.closest('a');
                if (parentLink) {
                    const href = parentLink.getAttribute('href') || '';
                    const ariaLabel = (parentLink.getAttribute('aria-label') || '').toLowerCase();
                    if (href === '/' || href === baseUrl || href === baseUrl + '/' ||
                        href.match(/^https?:\/\/[^\/]+\/?$/) || href.match(/^https?:\/\/[^\/]+\/[a-z]{2}(-[a-z]{2})?\/?$/) ||
                        ariaLabel.includes('homepage') || ariaLabel.includes('home page')) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (candidates.length > 0) {
            const siteDomain = new URL(baseUrl).hostname.replace('www.', '').split('.')[0].toLowerCase();
            const scored = candidates.map(el => {
                let score = 0;
                const rect = el.getBoundingClientRect();
                const parentLink = el.closest('a');
                const linkHref = parentLink?.getAttribute('href') || '';
                const imgSrc = el.tagName === 'IMG' ? (el.src || '') : '';
                const altText = (el.getAttribute('alt') || '').toLowerCase();
                const className = (typeof el.className === 'string' ? el.className : el.className.baseVal || '').toLowerCase();
                const inHeader = el.closest('header, nav, [role="banner"], [class*="header"], [class*="nav"], [id*="header"], [id*="nav"]');
                if (inHeader) score += 50;
                if (imgSrc.toLowerCase().includes(siteDomain) || altText.includes(siteDomain) || className.includes(siteDomain)) score += 40;
                if (parentLink) {
                    const href = linkHref.toLowerCase();
                    if (href === '/' || href === baseUrl || href === baseUrl + '/' || href.endsWith('://' + new URL(baseUrl).hostname + '/') || href.endsWith('://' + new URL(baseUrl).hostname)) score += 30;
                }
                if (rect.top < 200) score += 10;
                if (rect.left < 400) score += 10;
                if (rect.top > 600) score -= 20;
                const width = el.naturalWidth || el.width?.baseVal?.value || rect.width;
                const height = el.naturalHeight || el.height?.baseVal?.value || rect.height;
                if (width < 20 || height < 20) score -= 30;
                if (width > 500 || height > 300) score -= 40;
                if (altText.length > 50) score -= 30;
                if (altText.includes(' the ') || altText.includes(' a ') || altText.includes(' of ')) score -= 20;
                if (width > height && width < 300 && width > 40 && height > 15 && height < 100) score += 15;
                if (!inHeader && !imgSrc.toLowerCase().includes(siteDomain) && !altText.includes(siteDomain)) score -= 30;
                return { el, score };
            });
            scored.sort((a, b) => b.score - a.score);
            const logo = scored[0].el;
            const computed = window.getComputedStyle(logo);
            const parent = logo.parentElement;
            const parentComputed = parent ? window.getComputedStyle(parent) : null;
            const safeZone = {
                top: parseFloat(computed.marginTop) + (parentComputed ? parseFloat(parentComputed.paddingTop) : 0),
                right: parseFloat(computed.marginRight) + (parentComputed ? parseFloat(parentComputed.paddingRight) : 0),
                bottom: parseFloat(computed.marginBottom) + (parentComputed ? parseFloat(parentComputed.paddingBottom) : 0),
                left: parseFloat(computed.marginLeft) + (parentComputed ? parseFloat(parentComputed.paddingLeft) : 0),
            };
            if (logo.tagName === "IMG") {
                logoData = { source: "img", url: new URL(logo.src, baseUrl).href, width: logo.naturalWidth || logo.width, height: logo.naturalHeight || logo.height, alt: logo.alt, safeZone: safeZone };
            } else {
                const parentLink = logo.closest("a");
                logoData = { source: "svg", url: parentLink ? parentLink.href : window.location.href, width: logo.width?.baseVal?.value, height: logo.height?.baseVal?.value, safeZone: safeZone };
            }
        }
    }

    const favicons = [];
    document.querySelectorAll('link[rel*="icon"]').forEach((link) => {
        const href = link.getAttribute("href");
        if (href) favicons.push({ type: link.getAttribute("rel"), url: new URL(href, baseUrl).href, sizes: link.getAttribute("sizes") || null });
    });
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((link) => {
        const href = link.getAttribute("href");
        if (href) favicons.push({ type: "apple-touch-icon", url: new URL(href, baseUrl).href, sizes: link.getAttribute("sizes") || null });
    });
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
        const content = ogImage.getAttribute("content");
        if (content) favicons.push({ type: "og:image", url: new URL(content, baseUrl).href, sizes: null });
    }
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
        const content = twitterImage.getAttribute("content");
        if (content) favicons.push({ type: "twitter:image", url: new URL(content, baseUrl).href, sizes: null });
    }
    const hasFaviconIco = favicons.some((f) => f.url.endsWith("/favicon.ico"));
    if (!hasFaviconIco) favicons.push({ type: "favicon.ico", url: new URL("/favicon.ico", baseUrl).href, sizes: null });

    return { logo: logoData, favicons: favicons };
}