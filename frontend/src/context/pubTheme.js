const hexColor = (value, fallback) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const mix = (first, second, weight) => {
  const parts = [1, 3, 5].map((offset) => Math.round(
    parseInt(first.slice(offset, offset + 2), 16) * (1 - weight) +
    parseInt(second.slice(offset, offset + 2), 16) * weight
  ).toString(16).padStart(2, "0"));
  return "#" + parts.join("");
};

const luminance = (hex) => [1, 3, 5].map((offset) => {
  const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((value, channel, index) => value + channel * [0.2126, 0.7152, 0.0722][index], 0);

export function createPubTheme(pub) {
  const accent = hexColor(pub.primaryColor, "#ef78b3");
  const theme = pub.theme ?? {};
  // Conserva exactamente los colores de la demo; otros acentos generan sus propios matices.
  const centralPalette = accent.toLowerCase() === "#ef78b3";
  const shade = (original, blackWeight) => centralPalette ? original : mix(accent, "#000000", blackWeight);
  const tint = (original, whiteWeight) => centralPalette ? original : mix(accent, "#ffffff", whiteWeight);
  const background = hexColor(theme.background, shade("#151218", .91));
  const surface = hexColor(theme.surface, shade("#211a26", .84));
  const text = hexColor(theme.text, luminance(background) > .179 ? "#181218" : "#ffffff");
  const buttonText = hexColor(theme.buttonText,
    luminance(accent) > .179 ? (centralPalette ? "#24121e" : "#111111") : "#ffffff");

  return {
    "--pub-accent": accent,
    "--pub-accent-border": accent + "50",
    "--pub-accent-border-soft": accent + "4d",
    "--pub-accent-glow": accent + "40",
    "--pub-accent-shadow": accent + "25",
    "--pub-bg": background,
    "--pub-surface": surface,
    "--pub-card": hexColor(theme.card, shade("#302634", .77)),
    "--pub-header": hexColor(theme.header, "#000000"),
    "--pub-header-text": hexColor(theme.headerText, centralPalette ? "#d5247d" : accent),
    "--pub-text": text,
    "--pub-button-text": buttonText,
    "--pub-muted": hexColor(theme.mutedText, tint("#cabccc", .65)),
    "--pub-subtle": tint("#baacbd", .55),
    "--pub-accent-text": tint("#ffc2e0", .6),
    "--pub-link": tint("#ff9bc9", .3),
    "--pub-soft-text": tint("#ffe5f2", .85),
    "--pub-soft-bg": shade("#392337", .77),
    "--pub-action-bg": shade("#302034", .8),
    "--pub-neutral-status": shade("#48334f", .7),
    "--pub-border": text + "18",
    "--pub-divider": text + "20",
    "--pub-divider-soft": text + "15",
    "--pub-control-border": text + "30",
    "--pub-input-border": text + "40",
    "--pub-focus": accent,
    "--pub-badge": "#ffffff",
    "--pub-badge-text": "#24121e",
    "--pub-color-scheme": luminance(background) > .179 ? "light" : "dark",
    "--pub-backdrop": "#09060cd9",
    "--pub-image-shade": "rgba(10, 5, 15, 0.85)",
    "--pub-shadow": "#00000025",
    "--pub-bubble-shadow": "#00000066",
    // Los colores semánticos mantienen significado entre bares.
    "--pub-success-bg": "#193b32",
    "--pub-success-text": "#b9f5df",
    "--pub-error-bg": "#501e36",
    "--pub-error-text": "#ffd7e9",
    "--pub-pending-bg": "#59421b",
    "--pub-pending-text": "#ffe2a1",
    "--pub-preparing-bg": "#213f60",
    "--pub-preparing-text": "#bbddff",
  };
}