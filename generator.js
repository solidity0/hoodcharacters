// ============================================================
// Chibi Character — Generative Trait Engine v2
// Smooth flat-vector chibi guys (SVG paths/shapes, no pixel grid).
// Background color is a weighted trait; 1/1s draw from a curated palette.
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: inlined into index.html by build.js -> window.ChibiGen
// ============================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(rng, pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[pool.length - 1];
}

// ---------- fixed background ----------
const BG_COLOR = '#c5e506';

// ---------- 1/1-exclusive background color ----------
// Regular pieces are always BG_COLOR (not a trait). 1/1s draw from this
// curated palette instead, same pattern as the other ONE_OF_ONE_* pickers.
// Add more entries here as more hex codes come in.
const ONE_OF_ONE_BG_WEIGHTS = [
  { id: 'eth_blue',    hex: '#627EEA', weight: 25 },
  { id: 'red',         hex: '#FF0000', weight: 25 },
  { id: 'punchy_blue', hex: '#3A2BE8', weight: 25 },
  { id: 'rich_lime',   hex: '#B8EB00', weight: 25 }
];
function pickOneOfOneBgColor(rng) {
  const total = ONE_OF_ONE_BG_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_BG_WEIGHTS) {
    if (r < w.weight) return { id: w.id, hex: w.hex, rarity: 'oneOfOne' };
    r -= w.weight;
  }
  const w0 = ONE_OF_ONE_BG_WEIGHTS[0];
  return { id: w0.id, hex: w0.hex, rarity: 'oneOfOne' };
}

// ---------- trait pools ----------
const TRAITS = {
  skinTone: [
    { id: 'tan',      weight: 30, hex: '#c89468', rarity: 'common' },
    { id: 'brown',    weight: 26, hex: '#8a5a3a', rarity: 'common' },
    { id: 'pale',     weight: 22, hex: '#f5e8dc', rarity: 'uncommon' },
    { id: 'light',    weight: 16, hex: '#e8c8a0', rarity: 'uncommon' },
    { id: 'onyx',     weight: 6,  hex: '#1a1a1a', rarity: 'rare' },
    { id: 'red',      weight: 11, hex: '#cc3f3f', rarity: 'rare' }, // weight 11 of total 122 ≈ 9% at tier 'any'
    { id: 'blue',     weight: 11, hex: '#3f6fcc', rarity: 'rare' }  // same treatment as red, ≈ 9% at tier 'any'
  ],
  hairColor: [
    { id: 'black',    weight: 20, hex: '#1a1a1a', rarity: 'common' },
    { id: 'brown',    weight: 18, hex: '#6a4020', rarity: 'common' },
    { id: 'red',      weight: 12, hex: '#e83c3c', rarity: 'uncommon' },
    { id: 'pink',     weight: 12, hex: '#ff5ac8', rarity: 'uncommon' },
    { id: 'blue',     weight: 10, hex: '#5a8af5', rarity: 'uncommon' },
    { id: 'teal',     weight: 10, hex: '#3ce8c8', rarity: 'uncommon' },
    { id: 'orange',   weight: 8,  hex: '#ff8a3c', rarity: 'rare' },
    { id: 'green',    weight: 6,  hex: '#3ce85a', rarity: 'rare' },
    { id: 'yellow',   weight: 6,  hex: '#f5d020', rarity: 'rare' },
    { id: 'white',    weight: 5,  hex: '#f5f5f5', rarity: 'rare' }
  ],
  hairStyle: [
    { id: 'buzz',      weight: 24, rarity: 'common' },
    { id: 'crew',      weight: 20, rarity: 'common' },
    { id: 'fade',      weight: 16, rarity: 'uncommon' },
    { id: 'afro',      weight: 14, rarity: 'uncommon' },
    { id: 'spiky',     weight: 12, rarity: 'uncommon' },
    { id: 'durag',     weight: 8,  rarity: 'rare' },
    { id: 'mohawk',    weight: 6,  rarity: 'rare' }
  ],
  outfitType: [
    { id: 'tank',     weight: 22, rarity: 'common' },
    { id: 'stripes',  weight: 20, rarity: 'common' },
    { id: 'hoodie',   weight: 16, rarity: 'uncommon' },
    { id: 'overalls', weight: 14, rarity: 'uncommon' },
    { id: 'sweater',  weight: 12, rarity: 'uncommon' },
    { id: 'suit',     weight: 6,  rarity: 'rare' }
  ],
  outfitColor: [
    { id: 'blue',     weight: 22, hex: '#3c5ae8', rarity: 'common' },
    { id: 'red',      weight: 18, hex: '#e83c5a', rarity: 'common' },
    { id: 'green',    weight: 16, hex: '#3ce85a', rarity: 'uncommon' },
    { id: 'purple',   weight: 14, hex: '#8a3ce8', rarity: 'uncommon' },
    { id: 'amber',    weight: 12, hex: '#e8a01a', rarity: 'uncommon' },
    { id: 'white',    weight: 10, hex: '#e8e8e8', rarity: 'rare' },
    { id: 'black',    weight: 8,  hex: '#1a1a1a', rarity: 'rare' }
  ],
  eyeStyle: [
    { id: 'dot',      weight: 46, rarity: 'common' },
    { id: 'wide',     weight: 22, rarity: 'common' },
    { id: 'sleepy',   weight: 16, rarity: 'uncommon' },
    { id: 'wink',     weight: 10, rarity: 'uncommon' },
    { id: 'sparkle',  weight: 6,  rarity: 'rare' }
  ],
  accessory: [
    { id: 'none',      weight: 46, rarity: 'common' },
    { id: 'cap',       weight: 20, rarity: 'uncommon' },
    { id: 'glasses',   weight: 16, rarity: 'uncommon' },
    { id: 'earring',   weight: 10, rarity: 'rare' },
    { id: 'chain',     weight: 8,  rarity: 'rare' }
  ],
  facialHair: [
    { id: 'none',      weight: 50, rarity: 'common' },
    { id: 'stubble',   weight: 20, rarity: 'common' },
    { id: 'mustache',  weight: 12, rarity: 'uncommon' },
    { id: 'goatee',    weight: 12, rarity: 'uncommon' },
    { id: 'beard',     weight: 6,  rarity: 'rare' }
  ],
  // Background scenery — flanking silhouettes in the side-padding columns
  // (buildings) or small marks in the top headroom (birds). 'none' dominates
  // the general pool; the four scene variants sum to 90/1000 = 9%.
  backdrop: [
    { id: 'none',             weight: 910, rarity: 'common' },
    { id: 'buildingsSmall',   weight: 25,  rarity: 'rare' },
    { id: 'buildingsTall',    weight: 25,  rarity: 'rare' },
    { id: 'buildingsSkyline', weight: 20,  rarity: 'rare' },
    { id: 'birds',            weight: 20,  rarity: 'rare' }
  ],
  background: [
    { id: 'warm_sand', hex: '#F4A259', weight: 25, rarity: 'common' },
    { id: 'seafoam',   hex: '#4ECDC4', weight: 22, rarity: 'common' },
    { id: 'cream',     hex: '#F5F0E8', weight: 20, rarity: 'common' },
    { id: 'lime',      hex: '#c5e506', weight: 18, rarity: 'common' },
    { id: 'lavender',  hex: '#A78BFA', weight: 10, rarity: 'uncommon' },
    { id: 'sunflower', hex: '#FFD23F', weight: 5,  rarity: 'rare' }
  ]
};

// ---------- rarity tier fallback ----------
const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  const order = TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare'];
  for (const t of order) {
    const sub = pool.filter(p => p.rarity === t);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}

// ---------- 1/1-exclusive hair color ----------
// 'rainbow' never appears in the base TRAITS.hairColor pool at all — it's
// only reachable through the dedicated 1/1 picker below, same pattern as
// the ink generator's white-eye exclusivity.
const RAINBOW_HAIR = { id: 'rainbow', hex: '#ff5ac8', rarity: 'rare', isRainbow: true };
const ONE_OF_ONE_HAIR_COLOR_WEIGHTS = [
  { ref: null,          weight: 55 }, // null = fall through to normal curated pick below
  { ref: RAINBOW_HAIR,  weight: 12 }
];
// Curated 1/1 weighting for the non-rainbow slice — favors the rarer colors
// more than plain rarity-tier forcing alone would.
const ONE_OF_ONE_HAIR_WEIGHTS = [
  { id: 'white',  weight: 22 },
  { id: 'green',  weight: 20 },
  { id: 'yellow', weight: 20 },
  { id: 'orange', weight: 18 },
  { id: 'teal',   weight: 12 },
  { id: 'blue',   weight: 8  }
];
function pickOneOfOneHairColor(rng) {
  const rainbowRoll = rng();
  if (rainbowRoll < 0.12) return RAINBOW_HAIR;
  const total = ONE_OF_ONE_HAIR_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_HAIR_WEIGHTS) {
    if (r < w.weight) return TRAITS.hairColor.find(h=>h.id===w.id);
    r -= w.weight;
  }
  return TRAITS.hairColor.find(h=>h.id===ONE_OF_ONE_HAIR_WEIGHTS[0].id);
}

// ---------- 1/1-exclusive skin tone ----------
// TRAITS.skinTone has exactly one entry tagged rarity:'rare' (onyx), so the
// old tierOverride:'rare' path collapsed every 1/1 into the same skin tone.
// Same fix as hair color: a dedicated curated picker that draws across the
// whole pool (favoring the visually rarer tones a bit) instead of filtering
// down to whichever single entry happens to carry the 'rare' tag.
const ONE_OF_ONE_SKIN_TONE_WEIGHTS = [
  { id: 'onyx',  weight: 20 },
  { id: 'red',   weight: 20 },
  { id: 'blue',  weight: 20 },
  { id: 'pale',  weight: 16 },
  { id: 'light', weight: 16 },
  { id: 'brown', weight: 16 },
  { id: 'tan',   weight: 14 }
];
function pickOneOfOneSkinTone(rng) {
  const total = ONE_OF_ONE_SKIN_TONE_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_SKIN_TONE_WEIGHTS) {
    if (r < w.weight) return TRAITS.skinTone.find(s=>s.id===w.id);
    r -= w.weight;
  }
  return TRAITS.skinTone.find(s=>s.id===ONE_OF_ONE_SKIN_TONE_WEIGHTS[0].id);
}

// ---------- 1/1-exclusive outfit type ----------
// Same problem, same fix: outfitType only has one 'rare' entry (suit), so
// every 1/1 wore the same outfit. Curated spread across the whole pool.
const ONE_OF_ONE_OUTFIT_WEIGHTS = [
  { id: 'suit',     weight: 22 },
  { id: 'sweater',  weight: 20 },
  { id: 'overalls', weight: 20 },
  { id: 'hoodie',   weight: 20 },
  { id: 'stripes',  weight: 10 },
  { id: 'tank',     weight: 8  }
];
function pickOneOfOneOutfitType(rng) {
  const total = ONE_OF_ONE_OUTFIT_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_OUTFIT_WEIGHTS) {
    if (r < w.weight) return TRAITS.outfitType.find(o=>o.id===w.id);
    r -= w.weight;
  }
  return TRAITS.outfitType.find(o=>o.id===ONE_OF_ONE_OUTFIT_WEIGHTS[0].id);
}

// ---------- 1/1-exclusive backdrop ----------
// Same curated-picker pattern again: general pieces get backdrop scenery
// only 9% of the time (see TRAITS.backdrop weights above), but 1/1s should
// show it off far more often — 90% here, with a small 'none' slice so it's
// not literally forced on every single 1/1.
const ONE_OF_ONE_BACKDROP_WEIGHTS = [
  { id: 'buildingsSmall',   weight: 25 },
  { id: 'buildingsTall',    weight: 25 },
  { id: 'buildingsSkyline', weight: 20 },
  { id: 'birds',            weight: 20 },
  { id: 'none',             weight: 10 }
];
function pickOneOfOneBackdrop(rng) {
  const total = ONE_OF_ONE_BACKDROP_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_BACKDROP_WEIGHTS) {
    if (r < w.weight) return TRAITS.backdrop.find(b=>b.id===w.id);
    r -= w.weight;
  }
  return TRAITS.backdrop.find(b=>b.id===ONE_OF_ONE_BACKDROP_WEIGHTS[0].id);
}

// ---------- vector canvas ----------
// Characters are drawn as smooth flat-vector shapes (paths, ellipses, rounded
// rects) on a 400x400 viewBox, with a darkened stroke of each shape's own fill
// as its outline. Same composition as before: headroom above, side margins
// for backdrop scenery, and a ground band below the feet.
const VB = 400, SIZE = 600;
const CX = 200;                 // character center line
const HEAD = { cx: 200, cy: 150, rx: 85, ry: 78 };
const EYE_Y = 165, EYE_LX = 165, EYE_RX = 235, EYE_JITTER = 8;
const GROUND_Y = 332;
const STROKE_W = 4;

// Darkens/lightens a hex color by percent — used for shading and for the
// per-shape outline (a shape-specific dark tone reads better than one flat
// black outline everywhere).
function shadePixel(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function outlineOf(hex) { return shadePixel(hex, -55); }

// Perceptual brightness of a hex color (0-255) — used to decide whether
// face-feature ink (eyes/mouth/glasses) needs to flip to a light tone, so
// the face doesn't vanish on near-black (onyx) skin.
function luma(hex) {
  const num = parseInt(hex.replace('#',''), 16);
  const r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  return 0.299*r + 0.587*g + 0.114*b;
}
function faceInk(skinHex) {
  return luma(skinHex) < 60
    ? { ink: '#e8e8e8', hl: '#2a2a2a' }  // light ink + dark highlight on dark skin
    : { ink: '#1a1a1a', hl: '#ffffff' }; // default: dark ink + white highlight
}

// ---------- tiny SVG element helpers ----------
function fmt(n) { return Math.round(n * 100) / 100; }
function attrs(o) {
  let s = '';
  for (const k in o) if (o[k] !== undefined && o[k] !== null) s += ` ${k}="${typeof o[k] === 'number' ? fmt(o[k]) : o[k]}"`;
  return s;
}
// Filled shape with its own darkened outline (pass stroke:false for none).
function styled(fill, extra) {
  const e = extra || {};
  const stroke = e.stroke === false ? undefined : (e.stroke || outlineOf(fill.startsWith('url(') ? (e.baseHex || '#888888') : fill));
  return {
    fill,
    stroke,
    'stroke-width': stroke ? (e.sw || STROKE_W) : undefined,
    'stroke-linejoin': stroke ? 'round' : undefined,
    'stroke-linecap': stroke ? 'round' : undefined,
    opacity: e.opacity,
    'fill-opacity': e.fillOpacity
  };
}
function path(d, fill, extra) { return `<path${attrs({ d, ...styled(fill, extra) })}/>`; }
function ellipse(cx, cy, rx, ry, fill, extra) { return `<ellipse${attrs({ cx, cy, rx, ry, ...styled(fill, extra) })}/>`; }
function circle(cx, cy, r, fill, extra) { return `<circle${attrs({ cx, cy, r, ...styled(fill, extra) })}/>`; }
function rrect(x, y, w, h, r, fill, extra) { return `<rect${attrs({ x, y, width: w, height: h, rx: r, ...styled(fill, extra) })}/>`; }
function line(d, color, w, opacity) {
  return `<path${attrs({ d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity })}/>`;
}

// ---------- render body + outfit ----------
// Broad, square-shouldered build with a visible neck. Silhouette still
// varies by outfit — hoodie/overalls read bulkier, suit reads slimmer — so
// pieces aren't the same body with a palette swap.
const OUTFIT_WIDTH = { hoodie: 1, overalls: 1, suit: -1, sweater: 0, tank: 0, stripes: 0 };
function torsoPath(x0, x1, top) {
  return `M${x0} 300 L${x0} ${top+16} Q${x0} ${top} ${x0+16} ${top} L${x1-16} ${top} Q${x1} ${top} ${x1} ${top+16} L${x1} 300 Q${x1} 306 ${x1-6} 306 L${x0+6} 306 Q${x0} 306 ${x0} 300 Z`;
}
function drawBodyAndOutfit(skinHex, outfitId, outfitHex) {
  const wPad = (OUTFIT_WIDTH[outfitId] || 0) * 10;
  const x0 = 142 - wPad, x1 = 258 + wPad;
  const shoe = luma(skinHex) < 60 ? '#4a4a5a' : '#2a2a2a';
  const sleeve = outfitId === 'tank' ? skinHex : outfitHex;
  let s = '';

  // legs + sneakers
  s += rrect(172, 290, 24, 44, 6, skinHex);
  s += rrect(204, 290, 24, 44, 6, skinHex);
  s += path('M160 340 Q160 326 176 326 L194 326 Q200 326 200 334 L200 342 L160 342 Z', shoe);
  s += path('M240 340 Q240 326 224 326 L206 326 Q200 326 200 334 L200 342 L240 342 Z', shoe);
  s += line('M163 339 L197 339', '#f5f5f5', 3);
  s += line('M203 339 L237 339', '#f5f5f5', 3);

  // neck
  s += rrect(184, 206, 32, 26, 6, skinHex);
  s += rrect(186, 222, 28, 8, 3, shadePixel(skinHex, -16), { stroke: false });

  // arms (sleeve + fist)
  s += circle(x0 - 11, 294, 13, skinHex);
  s += circle(x1 + 11, 294, 13, skinHex);
  s += rrect(x0 - 25, 230, 30, 60, 12, sleeve);
  s += rrect(x1 - 5, 230, 30, 60, 12, sleeve);
  if (outfitId === 'sweater') {
    s += rrect(x0 - 25, 276, 30, 12, 5, '#f5f5f5');
    s += rrect(x1 - 5, 276, 30, 12, 5, '#f5f5f5');
  }

  // torso
  const top = outfitId === 'tank' ? 232 : 222;
  if (outfitId === 'tank') {
    s += path(`M${x0+12} 218 L${x1-12} 218 L${x1-12} 240 L${x0+12} 240 Z`, skinHex); // bare shoulders/chest
  }
  s += path(torsoPath(x0, x1, top), outfitHex);
  s += rrect(x0 + 3, 288, x1 - x0 - 6, 14, 5, shadePixel(outfitHex, -18), { stroke: false }); // soft base shadow

  if (outfitId === 'tank') {
    s += rrect(x0 + 14, 216, 14, 22, 5, outfitHex);
    s += rrect(x1 - 28, 216, 14, 22, 5, outfitHex);
  } else if (outfitId === 'stripes') {
    s += rrect(x0 + 3, 244, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
    s += rrect(x0 + 3, 266, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
  } else if (outfitId === 'overalls') {
    const bib = '#3c5ae8';
    s += line(`M176 250 L${x0+18} 226`, outlineOf(bib), 10);
    s += line(`M224 250 L${x1-18} 226`, outlineOf(bib), 10);
    s += line(`M176 250 L${x0+18} 226`, bib, 6);
    s += line(`M224 250 L${x1-18} 226`, bib, 6);
    s += path(`M170 246 L230 246 L230 304 L170 304 Z`, bib);
    s += circle(178, 256, 4, '#f5d020');
    s += circle(222, 256, 4, '#f5d020');
    s += rrect(186, 266, 28, 18, 4, shadePixel(bib, -15)); // front pocket
  } else if (outfitId === 'suit') {
    s += path(`M180 ${top} L200 266 L220 ${top} Z`, '#e8e8e8');
    s += path(`M195 ${top+8} L205 ${top+8} L209 258 L200 270 L191 258 Z`, '#e83c3c');
    s += line(`M180 ${top} L192 262`, outlineOf(outfitHex), 4);
    s += line(`M220 ${top} L208 262`, outlineOf(outfitHex), 4);
  } else if (outfitId === 'sweater') {
    s += rrect(x0 + 2, 288, x1 - x0 - 4, 16, 5, '#f5f5f5');
    s += path(`M180 ${top} Q200 ${top+14} 220 ${top}`, 'none', { stroke: '#f5f5f5', sw: 6 });
  } else if (outfitId === 'hoodie') {
    s += path(`M154 232 Q200 262 246 232 Q242 212 200 212 Q158 212 154 232 Z`, shadePixel(outfitHex, -22));
    s += line(`M188 240 L186 266`, '#f5f5f5', 4);
    s += line(`M212 240 L214 266`, '#f5f5f5', 4);
    s += path(`M170 272 L230 272 L238 298 L162 298 Z`, shadePixel(outfitHex, -12)); // kangaroo pocket
  }
  return s;
}

// ---------- render head + face ----------
// Squarer jaw than a plain oval — the rounded-egg head was a big part of
// the soft/feminine read.
const HEAD_PATH = 'M200 72 C258 72 286 102 286 148 C286 180 280 204 262 218 C246 228 224 230 200 230 C176 230 154 228 138 218 C120 204 114 180 114 148 C114 102 142 72 200 72 Z';
function drawHead(skinHex) {
  let s = '';
  s += circle(HEAD.cx - HEAD.rx + 1, 160, 15, skinHex); // ears
  s += circle(HEAD.cx + HEAD.rx - 1, 160, 15, skinHex);
  s += path(HEAD_PATH, skinHex);
  // jaw shading
  s += path('M132 196 Q150 226 200 228 Q250 226 268 196 Q246 220 200 220 Q154 220 132 196 Z', shadePixel(skinHex, -14), { stroke: false });
  return s;
}

// Thick, straight brows — the single strongest masculine cue on a chibi face.
function drawBrows(eyeStyle, jx, skinHex) {
  const { ink } = faceInk(skinHex);
  const xs = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER];
  const tilt = eyeStyle === 'sleepy' ? 0 : 4; // inner ends lower = more determined look
  return line(`M${xs[0]-15} ${EYE_Y-22} L${xs[0]+12} ${EYE_Y-22+tilt}`, ink, 6) +
    line(`M${xs[1]-12} ${EYE_Y-22+tilt} L${xs[1]+15} ${EYE_Y-22}`, ink, 6);
}

// Mouth width/offset jitter (seeded per piece) keeps faces from being
// identical. Flatter lines and an occasional smirk rather than a round smile.
function drawMouth(skinHex, rng) {
  const wide = rng() < 0.3;
  const ox = wide ? 0 : (rng() < 0.5 ? -4 : 4);
  const half = wide ? 15 : 10;
  const smirk = rng() < 0.35;
  const mouthColor = luma(skinHex) < 60 ? shadePixel(skinHex, 40) : shadePixel(skinHex, -45);
  const d = smirk
    ? `M${CX+ox-half} 202 Q${CX+ox} 205 ${CX+ox+half} 196`
    : `M${CX+ox-half} 200 Q${CX+ox} ${wide ? 208 : 204} ${CX+ox+half} 200`;
  return line(d, mouthColor, 4);
}

function sparkleStar(x, y, r, color) {
  const i = r * 0.3;
  return path(`M${x} ${y-r} Q${x+i} ${y-i} ${x+r} ${y} Q${x+i} ${y+i} ${x} ${y+r} Q${x-i} ${y+i} ${x-r} ${y} Q${x-i} ${y-i} ${x} ${y-r} Z`, color, { stroke: false });
}

function drawEyes(style, jx, skinHex) {
  const { ink, hl } = faceInk(skinHex);
  const xs = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER], y = EYE_Y;
  const openEye = (x) => ellipse(x, y, 8, 10, ink, { stroke: false }) + circle(x + 3, y - 3, 2.5, hl, { stroke: false });
  const closedEye = (x) => line(`M${x-10} ${y+1} L${x+10} ${y+1}`, ink, 4);
  let s = '';
  if (style === 'dot') {
    xs.forEach(x => { s += openEye(x); });
  } else if (style === 'wide') {
    xs.forEach(x => {
      s += ellipse(x, y, 13, 12, '#ffffff', { stroke: ink, sw: 3 });
      s += circle(x, y + 1, 7, luma(skinHex) < 60 ? '#1a1a1a' : ink, { stroke: false });
      s += circle(x + 2, y - 1, 2.5, '#ffffff', { stroke: false });
    });
  } else if (style === 'sleepy') {
    xs.forEach(x => {
      s += path(`M${x-10} ${y} L${x+10} ${y} Q${x+10} ${y+9} ${x} ${y+9} Q${x-10} ${y+9} ${x-10} ${y} Z`, ink, { stroke: false });
      s += line(`M${x-12} ${y} L${x+12} ${y}`, ink, 4);
    });
  } else if (style === 'wink') {
    s += openEye(xs[0]);
    s += closedEye(xs[1]);
  } else if (style === 'sparkle') {
    xs.forEach(x => {
      s += ellipse(x, y, 10, 12, ink, { stroke: false });
      s += sparkleStar(x + 3, y - 3, 5, hl);
    });
  }
  return s;
}

// ---------- facial hair ----------
function drawFacialHair(style, hairColor, skinHex) {
  if (!style || style === 'none') return '';
  // Facial hair only follows natural hair colors — a pink or teal mustache
  // reads as lipstick — so dyed/rainbow hair gets a dark-brown beard.
  const NATURAL = ['black', 'brown', 'white'];
  let c = NATURAL.includes(hairColor.id) ? hairColor.hex : '#3a2a1a';
  // keep it visible when hair and skin are near-identical (e.g. black on onyx)
  if (Math.abs(luma(c) - luma(skinHex)) < 30) c = luma(skinHex) < 60 ? '#4a4a4a' : shadePixel(c, -40);
  const mustache = path('M182 194 Q191 186 200 191 Q209 186 218 194 Q210 199 200 196 Q190 199 182 194 Z', c, { stroke: false });
  if (style === 'stubble') {
    return path('M132 186 Q140 228 200 230 Q260 228 268 186 Q252 214 200 214 Q148 214 132 186 Z', c, { stroke: false, opacity: 0.3 }) +
      path('M180 192 Q200 184 220 192 L220 197 Q200 191 180 197 Z', c, { stroke: false, opacity: 0.3 });
  } else if (style === 'mustache') {
    return mustache;
  } else if (style === 'goatee') {
    return mustache + path('M186 210 Q200 206 214 210 L210 226 Q200 232 190 226 Z', c, { stroke: false });
  } else if (style === 'beard') {
    return path('M122 160 Q122 226 200 234 Q278 226 278 160 L266 164 Q262 212 222 214 Q210 206 200 206 Q190 206 178 214 Q138 212 134 164 Z', c) + mustache;
  }
  return '';
}

// ---------- render hair ----------
// Short masculine cuts. Each style has an optional back layer (drawn behind
// head/body) and a front layer (drawn over the forehead).
const HAIR_SHAPES = {
  buzz: {
    front: 'M118 140 Q116 70 200 68 Q284 70 282 140 Q270 104 200 100 Q130 104 118 140 Z'
  },
  crew: {
    front: 'M116 146 L114 118 Q112 62 196 58 Q292 58 288 118 L286 146 L276 146 Q276 118 262 104 Q226 110 192 98 Q156 110 132 112 Q124 124 126 146 Z'
  },
  fade: { // high-top fade: flat top over faded sides
    sides: 'M118 142 Q116 76 200 74 Q284 76 282 142 Q270 108 200 104 Q130 108 118 142 Z',
    front: 'M128 110 Q124 70 132 44 Q140 30 200 28 Q260 30 268 44 Q276 70 272 110 Q236 98 200 98 Q164 98 128 110 Z'
  },
  afro: {
    back: 'M200 22 C260 22 296 54 296 110 C296 146 286 170 276 180 L124 180 C114 170 104 146 104 110 C104 54 140 22 200 22 Z',
    front: 'M120 134 Q124 82 200 80 Q276 82 280 134 Q244 112 200 114 Q156 112 120 134 Z'
  },
  spiky: {
    front: 'M118 138 L110 94 L136 102 L132 60 L160 82 L168 40 L192 72 L206 32 L222 70 L242 42 L248 84 L272 64 L268 102 L292 96 L282 138 Q262 110 200 106 Q138 110 118 138 Z'
  },
  durag: {
    back: 'M268 108 Q322 146 316 232 L298 236 Q302 172 256 132 Z M258 118 Q300 160 290 236 L276 236 Q282 176 248 140 Z',
    front: 'M112 148 Q104 60 200 56 Q296 60 288 148 Q250 126 200 124 Q150 126 112 148 Z'
  },
  mohawk: {
    sides: 'M118 140 Q116 70 200 68 Q284 70 282 140 Q270 104 200 100 Q130 104 118 140 Z',
    front: 'M180 116 L170 62 L188 74 L190 30 L204 58 L216 26 L218 70 L232 58 L222 116 Q200 106 180 116 Z'
  }
};
function hairFill(hairColor, gradId) {
  return hairColor.isRainbow ? `url(#${gradId})` : hairColor.hex;
}
function drawHairBack(style, hairColor, gradId) {
  const shape = HAIR_SHAPES[style];
  if (!shape || !shape.back) return '';
  return path(shape.back, hairFill(hairColor, gradId), { baseHex: '#6a4a8a' });
}
// Sideburns stay visible under a cap, which hides the rest of the front hair.
function drawSideburns(hairColor, gradId) {
  const f = hairFill(hairColor, gradId);
  return rrect(116, 124, 12, 40, 4, f, { baseHex: '#6a4a8a' }) + rrect(272, 124, 12, 40, 4, f, { baseHex: '#6a4a8a' });
}
function drawHairFront(style, hairColor, gradId, capped) {
  const shape = HAIR_SHAPES[style];
  if (!shape) return '';
  if (capped) return style === 'durag' ? '' : drawSideburns(hairColor, gradId);
  const fill = hairFill(hairColor, gradId);
  let s = '';
  if (shape.sides) s += path(shape.sides, fill, { baseHex: '#6a4a8a', opacity: 0.55 });
  // the afro's hairline blends into its back layer, so it gets no outline
  s += path(shape.front, fill, style === 'afro' ? { stroke: false } : { baseHex: '#6a4a8a' });
  if (style === 'durag') {
    s += line('M200 58 L200 124', hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25), 4, hairColor.isRainbow ? 0.5 : undefined);
    s += line('M140 98 Q170 84 196 80', '#ffffff', 5, 0.3);
  } else if (style === 'fade') {
    const curl = hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25);
    [[156,50],[200,42],[244,50],[176,74],[224,74],[146,90],[254,90]].forEach(([x,y]) => { s += line(`M${x-7} ${y} Q${x} ${y-7} ${x+7} ${y}`, curl, 3, 0.6); });
  } else if (style === 'afro') {
    const curl = hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25);
    [[146,52],[200,36],[254,52],[118,100],[282,100],[172,66],[228,66]].forEach(([x,y]) => { s += line(`M${x-8} ${y} Q${x} ${y-8} ${x+8} ${y}`, curl, 3, 0.6); });
  } else if (style !== 'mohawk' && style !== 'spiky' && style !== 'fade') {
    s += line('M146 92 Q164 78 190 74', '#ffffff', 5, 0.3); // sheen
  }
  return s;
}

// ---------- render accessory ----------
const CAP_COLOR = '#e83c5a';
function drawAccessory(style, jx, skinHex) {
  if (style === 'cap') {
    return path('M112 136 Q106 54 200 50 Q294 54 288 136 Q200 118 112 136 Z', CAP_COLOR) +
      path('M200 124 Q262 116 318 132 Q322 144 306 146 Q256 136 200 138 Z', shadePixel(CAP_COLOR, -18)) +
      circle(200, 52, 5, shadePixel(CAP_COLOR, -18)) +
      line('M200 54 L200 122', shadePixel(CAP_COLOR, -30), 3);
  } else if (style === 'glasses') {
    // Square frames aligned to the same jx as drawEyes so the lenses sit on
    // the actual eyes; eyes stay visible through the translucent lens.
    const rim = faceInk(skinHex).ink;
    const lx = EYE_LX + jx*EYE_JITTER, rx = EYE_RX + jx*EYE_JITTER;
    const lens = { stroke: rim, sw: 5, fillOpacity: 0.18 };
    return rrect(lx - 22, EYE_Y - 17, 44, 34, 7, '#ffffff', lens) + rrect(rx - 22, EYE_Y - 17, 44, 34, 7, '#ffffff', lens) +
      line(`M${lx+22} ${EYE_Y-6} L${rx-22} ${EYE_Y-6}`, rim, 5);
  } else if (style === 'earring') {
    return circle(HEAD.cx - HEAD.rx + 1, 180, 5, '#f5d020') + circle(HEAD.cx + HEAD.rx - 1, 180, 5, '#f5d020');
  } else if (style === 'chain') {
    const gold = '#f5c518';
    return line('M168 224 Q200 272 232 224', outlineOf(gold), 9) + line('M168 224 Q200 272 232 224', gold, 5) +
      circle(200, 252, 10, gold) + circle(200, 252, 4, shadePixel(gold, -30), { stroke: false });
  }
  return '';
}

// ---------- background scenery ----------
// Red-brick city blocks in the side margins: brownstones, walk-up tenements
// with fire escapes and rooftop water towers, and a corner store. Right-side
// buildings are mirror images of the left (x -> VB - x - w).
const BRICK = '#9c4a36', BRICK_DARK = '#7a3626', TRIM = '#e8d8c0', IRON = '#2a2a2a';
const WIN_LIT = '#f5e0a0', WIN_DARK = '#2d3748';

function mx(side, x, w) { return side === 'L' ? x : VB - x - w; }
function brickBody(side, x, top, w, color) {
  const X = mx(side, x, w);
  let s = rrect(X, top, w, GROUND_Y - top + 6, 2, color);
  // mortar courses — faint horizontal lines for brick texture
  for (let y = top + 10; y < GROUND_Y; y += 10) s += line(`M${X+3} ${y} L${X+w-3} ${y}`, shadePixel(color, -22), 1.5, 0.45);
  s += rrect(X - 3, top - 6, w + 6, 8, 1, TRIM); // cornice
  return s;
}
function windowAt(side, x, y, w, h, lit) {
  const X = mx(side, x, w);
  return rrect(X, y, w, h, 1.5, lit ? WIN_LIT : WIN_DARK, { stroke: TRIM, sw: 2.5 }) +
    rrect(X - 2, y + h, w + 4, 3, 1, TRIM, { stroke: false }); // sill
}
function windowGrid(side, x, top, w, bottom, key) {
  let s = '', row = 0;
  for (let y = top + 16; y + 18 < bottom; y += 30, row++) {
    let col = 0;
    for (let wx = x + 8; wx + 14 <= x + w - 6; wx += 22, col++) {
      s += windowAt(side, wx, y, 14, 18, (row * 3 + col * 5 + key) % 4 !== 0);
    }
  }
  return s;
}
function brownstone(side, x, top, w) {
  let s = brickBody(side, x, top, w, '#8a4a38');
  s += windowGrid(side, x, top, w, GROUND_Y - 44, 1);
  // stoop door + steps
  const dx = x + Math.round(w / 2) - 9;
  s += path(`M${mx(side, dx, 18)} ${GROUND_Y-8} L${mx(side, dx, 18)} ${GROUND_Y-34} Q${mx(side, dx, 18)+9} ${GROUND_Y-44} ${mx(side, dx, 18)+18} ${GROUND_Y-34} L${mx(side, dx, 18)+18} ${GROUND_Y-8} Z`, '#4a2a1a', { stroke: TRIM, sw: 2.5 });
  s += rrect(mx(side, dx - 5, 28), GROUND_Y - 8, 28, 5, 1, '#b8a890');
  s += rrect(mx(side, dx - 9, 36), GROUND_Y - 3, 36, 5, 1, '#b8a890');
  return s;
}
function fireEscape(side, x, top, w) {
  let s = '';
  const fx = x + 4, fw = w - 8;
  for (let y = top + 40; y < GROUND_Y - 30; y += 30) {
    const X = mx(side, fx, fw);
    s += line(`M${X} ${y} L${X+fw} ${y}`, IRON, 3);
    s += line(`M${X} ${y-10} L${X+fw} ${y-10}`, IRON, 1.5);
    for (let rx = X; rx <= X + fw; rx += 8) s += line(`M${rx} ${y} L${rx} ${y-10}`, IRON, 1.2);
    const a = mx(side, fx + 6, 0), b = mx(side, fx + fw - 6, 0);
    s += line(`M${a} ${y} L${b} ${y+30}`, IRON, 2); // ladder down to the next landing
  }
  return s;
}
function waterTower(side, x, top) {
  const X = mx(side, x, 26);
  return line(`M${X+4} ${top} L${X+6} ${top-14} M${X+22} ${top} L${X+20} ${top-14} M${X+4} ${top-6} L${X+22} ${top-6}`, IRON, 2) +
    rrect(X + 2, top - 36, 22, 24, 2, '#8a6a4a') +
    line(`M${X+2} ${top-28} L${X+24} ${top-28} M${X+2} ${top-20} L${X+24} ${top-20}`, '#5a4030', 1.5) +
    path(`M${X} ${top-36} L${X+13} ${top-48} L${X+26} ${top-36} Z`, '#5a4030');
}
function tenement(side, x, top, w) {
  let s = brickBody(side, x, top, w, BRICK);
  s += windowGrid(side, x, top, w, GROUND_Y - 8, 2);
  s += fireEscape(side, x, top, w);
  s += waterTower(side, x + Math.round(w / 2) - 13, top - 6);
  return s;
}
function cornerStore(side, x, top, w) {
  let s = brickBody(side, x, top, w, BRICK_DARK);
  const X = mx(side, x, w);
  // sign, awning, shop window
  s += rrect(X + 4, top + 8, w - 8, 14, 2, '#1a1a1a', { stroke: TRIM, sw: 2 });
  s += line(`M${X+10} ${top+15} L${X+w-10} ${top+15}`, '#3ce85a', 3, 0.9);
  const ay = top + 30, stripes = Math.max(2, Math.floor((w - 4) / 8));
  const sw = (w + 4) / stripes;
  for (let i = 0; i < stripes; i++) {
    s += path(`M${X-2+i*sw} ${ay} L${X-2+(i+1)*sw} ${ay} L${X-2+(i+1)*sw} ${ay+12} Q${X-2+(i+0.5)*sw} ${ay+17} ${X-2+i*sw} ${ay+12} Z`, i % 2 ? '#f5f5f5' : '#e83c3c', { stroke: false });
  }
  s += rrect(X + 6, ay + 20, w - 12, GROUND_Y - ay - 26, 2, WIN_LIT, { stroke: TRIM, sw: 2.5 });
  return s;
}
function drawBackdrop(backdropId) {
  if (backdropId === 'buildingsSmall') {
    return brownstone('L', 4, 232, 66) + brownstone('R', 4, 232, 66);
  } else if (backdropId === 'buildingsTall') {
    return tenement('L', 6, 118, 62) + tenement('R', 6, 118, 62);
  } else if (backdropId === 'buildingsSkyline') {
    return tenement('L', 0, 128, 40) + cornerStore('L', 38, 236, 40) +
      tenement('R', 0, 128, 40) + cornerStore('R', 38, 236, 40);
  } else if (backdropId === 'birds') {
    const bird = (x, y) => line(`M${x-12} ${y} Q${x-6} ${y-8} ${x} ${y} Q${x+6} ${y-8} ${x+12} ${y}`, '#2a2a2a', 3.5);
    return bird(45, 60) + bird(80, 30) + bird(322, 32) + bird(356, 64);
  }
  return '';
}

// A gentle hill in a darker shade of the background so the character
// stands somewhere rather than floating in a color swatch.
function drawGround(bgHex) {
  const base = shadePixel(bgHex, -30);
  return path(`M-10 ${GROUND_Y} Q200 ${GROUND_Y-16} 410 ${GROUND_Y} L410 410 L-10 410 Z`, base, { stroke: shadePixel(bgHex, -45) }) +
    ellipse(CX, GROUND_Y + 10, 66, 9, shadePixel(bgHex, -55), { stroke: false, opacity: 0.35 });
}

// ---------- shared renderer ----------
function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  const { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor, facialHair } = picks;
  const bgHex = (bgColor && bgColor.hex) || BG_COLOR;
  // separate, deterministic RNG stream for cosmetic jitter (eye offset, mouth
  // shape) so it stays stable per index/seed without being coupled to
  // however many trait rolls happen above
  const jitterRng = mulberry32((seed ?? 0) * 130003 + index * 17 + 11);
  const gradId = `rb-${seed ?? 0}-${index}`;
  const capped = accessory.id === 'cap';

  let defs = '';
  if (hairColor.isRainbow) {
    const RAINBOW = ['#ff5a5a','#ffa63c','#f5d020','#3ce85a','#3ca8f5','#8a5af5'];
    defs = `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">` +
      RAINBOW.map((c, i) => `<stop offset="${fmt(i / (RAINBOW.length - 1))}" stop-color="${c}"/>`).join('') +
      `</linearGradient></defs>`;
  }

  let body = '';
  if (backdrop) body += drawBackdrop(backdrop.id);
  body += drawGround(bgHex);
  // a cap sits over an afro's crown, so skip the big afro back layer then
  if (!(capped && hairStyle.id === 'afro')) body += drawHairBack(hairStyle.id, hairColor, gradId);
  body += drawBodyAndOutfit(skinTone.hex, outfitType.id, outfitColor.hex);
  body += drawHead(skinTone.hex);
  // small seeded jitter so eyes aren't pinned to the exact same spot on
  // every piece; shared with brows and glasses so they stay aligned.
  const jx = jitterRng() < 0.3 ? (jitterRng() < 0.5 ? -1 : 1) : 0;
  body += drawFacialHair(facialHair && facialHair.id, hairColor, skinTone.hex);
  body += drawEyes(eyeStyle.id, jx, skinTone.hex);
  body += drawMouth(skinTone.hex, jitterRng);
  body += drawHairFront(hairStyle.id, hairColor, gradId, capped);
  body += drawBrows(eyeStyle.id, jx, skinTone.hex);
  body += drawAccessory(accessory.id, jx, skinTone.hex);

  let blinkAnim = '';
  if (animate) {
    const animRng = mulberry32((seed ?? 0) * 70001 + index * 9973 + 3);
    const dur = (3.5 + animRng()*2.5).toFixed(2);
    const phase = (animRng()*3).toFixed(2);
    // Blink: skin-colored lids with a closed-eye line fade in over the eyes
    // briefly, then back out.
    const { ink } = faceInk(skinTone.hex);
    const lids = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER].map(x =>
      ellipse(x, EYE_Y, 15, 14, skinTone.hex, { stroke: false }) +
      line(`M${x-10} ${EYE_Y+2} L${x+10} ${EYE_Y+2}`, ink, 4)).join('');
    blinkAnim = `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.46;0.5;0.54;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>${lids}</g>`;
  }

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${VB} ${VB}" xmlns="http://www.w3.org/2000/svg">
${defs}<rect width="${VB}" height="${VB}" fill="${bgHex}"/>
${body}
${blinkAnim}
</svg>`;
}


// ---------- main composer ----------
function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);

  const skinTone   = isOneOfOne ? pickOneOfOneSkinTone(rng) : pickByRarity(rng, TRAITS.skinTone, t);
  const hairColor  = isOneOfOne ? pickOneOfOneHairColor(rng) : pickByRarity(rng, TRAITS.hairColor, t);
  const hairStyle  = pickByRarity(rng, TRAITS.hairStyle, t);
  const outfitType = isOneOfOne ? pickOneOfOneOutfitType(rng) : pickByRarity(rng, TRAITS.outfitType, t);
  const outfitColor= pickByRarity(rng, TRAITS.outfitColor, t);
  const eyeStyle   = pickByRarity(rng, TRAITS.eyeStyle, t);
  const accessory  = pickByRarity(rng, TRAITS.accessory, t);
  const backdrop   = isOneOfOne ? pickOneOfOneBackdrop(rng) : pickByRarity(rng, TRAITS.backdrop, t);
  const bgColor    = isOneOfOne ? pickOneOfOneBgColor(rng) : pickByRarity(rng, TRAITS.background, t);
  const facialHair = pickByRarity(rng, TRAITS.facialHair, t); // rolled last so earlier traits stay seed-stable

  const picks = { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor, facialHair };
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });

  return {
    index, svg, tier: t,
    traits: {
      skinTone: skinTone.id, hairColor: hairColor.id, hairStyle: hairStyle.id,
      outfitType: outfitType.id, outfitColor: outfitColor.id, eyeStyle: eyeStyle.id, accessory: accessory.id,
      backdrop: backdrop.id, background: bgColor.id, facialHair: facialHair.id
    },
    rarity: {
      skinTone: skinTone.rarity, hairColor: hairColor.rarity, hairStyle: hairStyle.rarity,
      outfitType: outfitType.rarity, outfitColor: outfitColor.rarity, eyeStyle: eyeStyle.rarity, accessory: accessory.rarity,
      backdrop: backdrop.rarity, background: bgColor.rarity, facialHair: facialHair.rarity
    }
  };
}

function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea', robinhood: '#ccff00' };

const api = {
  generatePiece, generateBatch, TRAITS, TIER_FALLBACK,
  mulberry32, weightedPick, pickByRarity, shadeColor,
  renderFromTraits, BG_COLOR, CHAIN_THEMES,
  RAINBOW_HAIR, ONE_OF_ONE_HAIR_WEIGHTS, pickOneOfOneHairColor,
  ONE_OF_ONE_SKIN_TONE_WEIGHTS, pickOneOfOneSkinTone,
  ONE_OF_ONE_OUTFIT_WEIGHTS, pickOneOfOneOutfitType,
  ONE_OF_ONE_BACKDROP_WEIGHTS, pickOneOfOneBackdrop,
  ONE_OF_ONE_BG_WEIGHTS, pickOneOfOneBgColor
};
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.ChibiGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
