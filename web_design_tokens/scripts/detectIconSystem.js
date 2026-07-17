() => {
    const systems = [];
    if (document.querySelector('[class*="fa-"]')) systems.push({ name: "Font Awesome", type: "icon-font" });
    if (document.querySelector('[class*="material-icons"]')) systems.push({ name: "Material Icons", type: "icon-font" });
    if (document.querySelector('svg[class*="heroicon"]') || document.querySelector('svg[data-slot="icon"]')) systems.push({ name: "Heroicons", type: "svg" });
    if (document.querySelector('svg[class*="hugeicons"]') || document.querySelector('[class*="hugeicons-"]')) systems.push({ name: "Hugeicons", type: "svg" });
    if (document.querySelector('ion-icon') || document.querySelector('[class*="ionicons"]')) systems.push({ name: "Ionicons", type: "svg" });
    if (document.querySelector('svg[data-feather]') || document.querySelector('i[data-feather]') || document.querySelector('[class*="feather-"]')) systems.push({ name: "Feather Icons", type: "svg" });
    if (document.querySelector('svg[class*="icon"]')) systems.push({ name: "SVG Icons", type: "svg" });
    return systems;
}
