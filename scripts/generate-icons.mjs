import sharp from "sharp";
import { createWriteStream, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");
const SPLASH_DIR = join(ROOT, "public", "splash");

mkdirSync(ICONS_DIR, { recursive: true });
mkdirSync(SPLASH_DIR, { recursive: true });

// ─── Icon SVG ────────────────────────────────────────────────────────────────
// Generates a square SVG at the given pixel size.
function iconSVG(px) {
  const S = px;
  const cx = S / 2;
  const sw = S * 0.115;       // arm stroke width
  const pad = S * 0.185;      // top/side padding for arms
  const midX = cx;
  const midY = S * 0.475;     // junction of Y arms and stem
  const botY = S * 0.83;      // stem bottom

  // Cap bar length at arm tips
  const capLen = S * 0.09;
  const capW   = S * 0.026;

  // Bloom radius
  const bloomR = S * 0.52;

  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${S}" y2="${S}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0e0e0e"/>
      <stop offset="100%" stop-color="#090909"/>
    </linearGradient>
    <radialGradient id="bloom" cx="50%" cy="44%" r="52%">
      <stop offset="0%"   stop-color="#f97316" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" x1="${cx}" y1="${pad * 0.8}" x2="${cx}" y2="${botY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#fcd34d"/>
      <stop offset="30%"  stop-color="#f97316"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${S * 0.028}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <rect width="${S}" height="${S}" fill="url(#bloom)"/>

  <!-- Y mark with glow -->
  <g filter="url(#glow)">
    <!-- Left arm -->
    <line x1="${pad}" y1="${pad}" x2="${midX}" y2="${midY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
    <!-- Right arm -->
    <line x1="${S - pad}" y1="${pad}" x2="${midX}" y2="${midY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
    <!-- Stem -->
    <line x1="${midX}" y1="${midY}" x2="${midX}" y2="${botY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
  </g>

  <!-- Amber cap lines at arm tips -->
  <line x1="${pad - capLen * 0.5}" y1="${pad}" x2="${pad + capLen * 0.5}" y2="${pad}"
    stroke="#fcd34d" stroke-width="${capW}" stroke-linecap="round" opacity="0.7"/>
  <line x1="${S - pad - capLen * 0.5}" y1="${pad}" x2="${S - pad + capLen * 0.5}" y2="${pad}"
    stroke="#fcd34d" stroke-width="${capW}" stroke-linecap="round" opacity="0.7"/>
</svg>`;
}

// ─── Splash SVG ──────────────────────────────────────────────────────────────
function splashSVG(w, h) {
  const iconSize = Math.min(w, h) * 0.28;
  const cx = w / 2, cy = h / 2;
  const S = iconSize;
  const pad = S * 0.185;
  const midX = cx, midY = cy + S * (-0.025);
  const botY = cy + S * 0.33;
  const sw = S * 0.115;
  const capLen = S * 0.09, capW = S * 0.026;
  const ix = cx - S / 2;   // icon x origin

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="${h}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0c0c0c"/>
      <stop offset="100%" stop-color="#080808"/>
    </linearGradient>
    <radialGradient id="bloom" cx="${cx}" cy="${cy - h*0.04}" r="${Math.max(w,h)*0.38}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#f97316" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" x1="${cx}" y1="${cy - S*0.5}" x2="${cx}" y2="${botY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#fcd34d"/>
      <stop offset="30%"  stop-color="#f97316"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${S*0.03}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#bloom)"/>

  <!-- Y mark -->
  <g filter="url(#glow)">
    <line x1="${cx - S*0.315}" y1="${cy - S*0.475}" x2="${midX}" y2="${midY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
    <line x1="${cx + S*0.315}" y1="${cy - S*0.475}" x2="${midX}" y2="${midY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
    <line x1="${midX}" y1="${midY}" x2="${midX}" y2="${botY}"
      stroke="url(#mark)" stroke-width="${sw}" stroke-linecap="round"/>
  </g>

  <!-- Cap lines -->
  <line x1="${cx - S*0.315 - capLen*0.5}" y1="${cy - S*0.475}" x2="${cx - S*0.315 + capLen*0.5}" y2="${cy - S*0.475}"
    stroke="#fcd34d" stroke-width="${capW}" stroke-linecap="round" opacity="0.7"/>
  <line x1="${cx + S*0.315 - capLen*0.5}" y1="${cy - S*0.475}" x2="${cx + S*0.315 + capLen*0.5}" y2="${cy - S*0.475}"
    stroke="#fcd34d" stroke-width="${capW}" stroke-linecap="round" opacity="0.7"/>

  <!-- Wordmark -->
  <text x="${cx}" y="${cy + S * 0.62}"
    font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
    font-size="${S * 0.19}" font-weight="700" letter-spacing="${S*0.025}"
    fill="rgba(255,255,255,0.22)" text-anchor="middle">YOS FITNESS</text>
</svg>`;
}

// ─── Icon sizes ───────────────────────────────────────────────────────────────
const ICON_SIZES = [72, 96, 120, 128, 144, 152, 167, 180, 192, 384, 512, 1024];

console.log("Generating icons...");
for (const size of ICON_SIZES) {
  const svg = Buffer.from(iconSVG(size));
  await sharp(svg)
    .png()
    .toFile(join(ICONS_DIR, `icon-${size}.png`));
  console.log(`  ✓ icon-${size}.png`);
}

// ─── iOS splash screens ───────────────────────────────────────────────────────
// (width x height at 1x — iOS scales by screen density internally)
const SPLASHES = [
  { w: 430,  h: 932,  name: "splash-430x932"  },  // iPhone 14 Pro Max / 15 Plus
  { w: 393,  h: 852,  name: "splash-393x852"  },  // iPhone 14 Pro / 15
  { w: 390,  h: 844,  name: "splash-390x844"  },  // iPhone 14 / 13 / 12
  { w: 375,  h: 812,  name: "splash-375x812"  },  // iPhone X / XS / 11 Pro
  { w: 414,  h: 896,  name: "splash-414x896"  },  // iPhone XR / 11
  { w: 375,  h: 667,  name: "splash-375x667"  },  // iPhone SE / 8
  { w: 768,  h: 1024, name: "splash-768x1024" },  // iPad
  { w: 834,  h: 1194, name: "splash-834x1194" },  // iPad Pro 11"
  { w: 1024, h: 1366, name: "splash-1024x1366"},  // iPad Pro 12.9"
];

// We generate at 3x (iOS uses 3x for modern iPhones)
console.log("\nGenerating splash screens...");
for (const { w, h, name } of SPLASHES) {
  const scale = 3;
  const svg = Buffer.from(splashSVG(w * scale, h * scale));
  await sharp(svg)
    .png({ compressionLevel: 8 })
    .toFile(join(SPLASH_DIR, `${name}.png`));
  console.log(`  ✓ ${name}.png  (${w*scale}×${h*scale})`);
}

console.log("\nDone.");
