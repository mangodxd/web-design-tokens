() => {
    const frameworks = [];
    const html = document.documentElement.outerHTML;
    const body = document.body;
    function countMatches(selector) { try { return document.querySelectorAll(selector).length; } catch { return 0; } }
    function hasResource(pattern) { return Array.from(document.querySelectorAll('link[href], script[src]')).some(el => pattern.test(el.href || el.src)); }

    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) frameworks.push({ name: 'React', confidence: 'high', evidence: 'window.__REACT_DEVTOOLS_GLOBAL_HOOK__' });
    if (window.__VUE__ || window.__VUE_APP__) frameworks.push({ name: 'Vue', confidence: 'high', evidence: 'window.__VUE__' });
    if (window.__NUXT__) frameworks.push({ name: 'Nuxt.js', confidence: 'high', evidence: 'window.__NUXT__' });
    if (window.__NEXT_DATA__) frameworks.push({ name: 'Next.js', confidence: 'high', evidence: 'window.__NEXT_DATA__' });
    if (window.ng) frameworks.push({ name: 'Angular', confidence: 'high', evidence: 'window.ng' });
    if (window.Svelte || window.__svelte) frameworks.push({ name: 'Svelte', confidence: 'high', evidence: 'window.Svelte' });

    const tailwindEvidence = [];
    if (/\b\w+-\[[^\]]+\]/.test(html)) tailwindEvidence.push('arbitrary values');
    if (/(sm|md|lg|xl|2xl|dark|hover|focus|group-hover|peer-):[a-z]/.test(html)) tailwindEvidence.push('responsive/state modifiers');
    if (hasResource(/tailwindcss|tailwind\.css|cdn\.tailwindcss/)) tailwindEvidence.push('stylesheet');
    if (tailwindEvidence.length >= 2) frameworks.push({ name: 'Tailwind CSS', confidence: 'high', evidence: tailwindEvidence.join(', ') });

    const bootstrapEvidence = [];
    if (countMatches('.container, .container-fluid') > 0 && countMatches('.row') > 0 && countMatches('[class*="col-"]') > 0) bootstrapEvidence.push('grid system');
    if (/\bbtn-primary\b|\bbtn-secondary\b|\bbtn-success\b/.test(html)) bootstrapEvidence.push('button variants');
    if (hasResource(/bootstrap\.min\.css|bootstrap\.css|getbootstrap\.com/)) bootstrapEvidence.push('stylesheet');
    if (bootstrapEvidence.length >= 2) frameworks.push({ name: 'Bootstrap', confidence: 'high', evidence: bootstrapEvidence.join(', ') });

    const muiCount = countMatches('[class*="MuiBox-"], [class*="MuiButton-"], [class*="Mui"]');
    if (muiCount > 3) frameworks.push({ name: 'Material UI (MUI)', confidence: 'high', evidence: `${muiCount} MUI components` });

    const chakraCount = countMatches('[class*="chakra-"]');
    if (chakraCount > 3) frameworks.push({ name: 'Chakra UI', confidence: 'high', evidence: `${chakraCount} Chakra components` });

    const antCount = countMatches('[class^="ant-"], [class*=" ant-"]');
    if (antCount > 3) frameworks.push({ name: 'Ant Design', confidence: 'high', evidence: `${antCount} Ant components` });

    const vuetifySpecific = countMatches('[class*="v-btn"], [class*="v-card"], [class*="v-app"], [class*="v-toolbar"], [class*="v-navigation"], [class*="v-list"], [class*="v-sheet"]');
    if ((vuetifySpecific > 8 && countMatches('[class*="v-application"]') > 0) || ((body.classList.contains('theme--light') || body.classList.contains('theme--dark')) && vuetifySpecific > 5)) {
        frameworks.push({ name: 'Vuetify', confidence: 'high', evidence: `${vuetifySpecific} Vuetify components` });
    }

    const polarisCount = countMatches('[class*="Polaris-"]');
    if (polarisCount > 2) frameworks.push({ name: 'Shopify Polaris', confidence: 'high', evidence: `${polarisCount} Polaris components` });

    const radixCount = document.querySelectorAll('[data-radix-], [data-state]').length;
    if (radixCount > 5) frameworks.push({ name: 'Radix UI', confidence: 'high', evidence: `${radixCount} Radix primitives` });

    if (tailwindEvidence.length >= 2) {
        const daisySpecific = countMatches('.btn-primary.btn, .badge, .drawer, .swap, .mockup-code');
        if (daisySpecific > 3 || body.hasAttribute('data-theme')) frameworks.push({ name: 'DaisyUI', confidence: 'high', evidence: `Tailwind + ${daisySpecific} DaisyUI components` });
    }

    const foundationEvidence = [];
    if (countMatches('.grid-x, .grid-y, .cell') > 0 || countMatches('.button.primary, .button.secondary') > 0) foundationEvidence.push('grid/button system');
    if (hasResource(/foundation\.min\.css|foundation\.css|zurb\.com\/foundation/)) foundationEvidence.push('stylesheet');
    if (foundationEvidence.length >= 1 || countMatches('[data-foundation]') > 0) frameworks.push({ name: 'Foundation', confidence: 'high', evidence: foundationEvidence.join(', ') || 'data attributes' });

    const bulmaEvidence = [];
    if (countMatches('.columns, .column') > 0 && countMatches('.column') > 2) bulmaEvidence.push('columns system');
    if (/\bbutton is-primary\b|\bbutton is-link\b/.test(html)) bulmaEvidence.push('button modifiers');
    if (hasResource(/bulma\.min\.css|bulma\.css/)) bulmaEvidence.push('stylesheet');
    if (bulmaEvidence.length >= 2) frameworks.push({ name: 'Bulma', confidence: 'high', evidence: bulmaEvidence.join(', ') });

    const semanticCount = countMatches('.ui.button, .ui.menu, .ui.card, .ui.grid');
    if (semanticCount > 3 || hasResource(/semantic\.min\.css|semantic-ui/)) frameworks.push({ name: 'Semantic UI', confidence: 'high', evidence: `${semanticCount} .ui components` });

    const uikitCount = countMatches('[class*="uk-"], [uk-grid], [uk-navbar]');
    if (uikitCount > 3 || hasResource(/uikit\.min\.css|getuikit\.com/)) frameworks.push({ name: 'UIkit', confidence: 'high', evidence: `${uikitCount} uk- components` });

    const hasShadcnComponents = countMatches('[data-slot], [data-state]') > 5;
    if (tailwindEvidence.length >= 2 && radixCount > 3 && (/\bcn\(|\bslot-\w+|\bdata-\[state=/.test(html) || hasShadcnComponents)) frameworks.push({ name: 'shadcn/ui', confidence: 'medium', evidence: 'Tailwind + Radix patterns' });

    const headlessCount = document.querySelectorAll('[aria-controls][aria-expanded], [role="dialog"][data-headlessui]').length;
    if (tailwindEvidence.length >= 2 && headlessCount > 2) frameworks.push({ name: 'Headless UI', confidence: 'high', evidence: `${headlessCount} headless components` });

    const primeCount = countMatches('[class*="p-"], .p-component, .p-button, .p-datatable');
    if (primeCount > 5) frameworks.push({ name: 'PrimeReact/Vue/NG', confidence: 'high', evidence: `${primeCount} Prime components` });

    const mantineCount = countMatches('[class*="mantine-"], [data-mantine]');
    if (mantineCount > 3) frameworks.push({ name: 'Mantine', confidence: 'high', evidence: `${mantineCount} Mantine components` });

    const carbonCount = countMatches('[class*="cds--"], [class*="bx--"]');
    if (carbonCount > 3) frameworks.push({ name: 'Carbon Design System', confidence: 'high', evidence: `${carbonCount} Carbon components` });

    const fluentCount = countMatches('[class*="ms-"], .ms-Button, .ms-TextField');
    if (fluentCount > 5) frameworks.push({ name: 'Fluent UI', confidence: 'high', evidence: `${fluentCount} Fluent components` });

    const quasarCount = countMatches('[class*="q-"]');
    if (quasarCount > 5 || body.classList.contains('q-app')) frameworks.push({ name: 'Quasar', confidence: 'high', evidence: `${quasarCount} q- components` });

    const elementCount = countMatches('[class*="el-"]');
    if (elementCount > 5) frameworks.push({ name: 'Element Plus/UI', confidence: 'high', evidence: `${elementCount} el- components` });

    return frameworks;
}