// ============================================================
// Chibi Character — Generative Trait Engine v2
// Smooth flat-vector chibi characters (SVG paths/shapes, no pixel grid).
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
    { id: 'bob',       weight: 24, rarity: 'common' },
    { id: 'buzz',      weight: 20, rarity: 'common' },
    { id: 'pigtails',  weight: 16, rarity: 'uncommon' },
    { id: 'ponytail',  weight: 14, rarity: 'uncommon' },
    { id: 'long',      weight: 12, rarity: 'uncommon' },
    { id: 'headscarf', weight: 8,  rarity: 'rare' },
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
    { id: 'bow',       weight: 20, rarity: 'uncommon' },
    { id: 'glasses',   weight: 16, rarity: 'uncommon' },
    { id: 'earring',   weight: 10, rarity: 'rare' },
    { id: 'headband',  weight: 8,  rarity: 'rare' }
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
// Silhouette varies by outfit — hoodie/overalls read broader at the
// shoulders, suit reads slimmer — so pieces aren't the same doll with a
// palette swap.
const OUTFIT_WIDTH = { hoodie: 1, overalls: 1, suit: -1, sweater: 0, tank: 0, stripes: 0 };
function torsoPath(x0, x1, top) {
  return `M${x0} 300 L${x0} ${top+28} Q${x0} ${top} ${x0+28} ${top} L${x1-28} ${top} Q${x1} ${top} ${x1} ${top+28} L${x1} 300 Q${x1} 306 ${x1-6} 306 L${x0+6} 306 Q${x0} 306 ${x0} 300 Z`;
}
function drawBodyAndOutfit(skinHex, outfitId, outfitHex) {
  const wPad = (OUTFIT_WIDTH[outfitId] || 0) * 12;
  const x0 = 150 - wPad, x1 = 250 + wPad;
  const shoe = luma(skinHex) < 60 ? '#4a4a5a' : '#2a2a2a';
  const sleeve = outfitId === 'tank' ? skinHex : outfitHex;
  let s = '';

  // legs + shoes
  s += rrect(173, 290, 22, 44, 8, skinHex);
  s += rrect(205, 290, 22, 44, 8, skinHex);
  s += ellipse(182, 336, 17, 9, shoe);
  s += ellipse(218, 336, 17, 9, shoe);

  // arms (sleeve + hand)
  s += circle(x0 - 10, 292, 12, skinHex);
  s += circle(x1 + 10, 292, 12, skinHex);
  s += rrect(x0 - 23, 234, 26, 56, 13, sleeve);
  s += rrect(x1 - 3, 234, 26, 56, 13, sleeve);
  if (outfitId === 'sweater') {
    s += rrect(x0 - 23, 276, 26, 12, 5, '#f5f5f5');
    s += rrect(x1 - 3, 276, 26, 12, 5, '#f5f5f5');
  }

  // torso
  const top = outfitId === 'tank' ? 232 : 222;
  if (outfitId === 'tank') {
    s += path(`M${x0+14} 216 L${x1-14} 216 L${x1-14} 240 L${x0+14} 240 Z`, skinHex); // bare shoulders/chest
  }
  s += path(torsoPath(x0, x1, top), outfitHex);
  s += rrect(x0 + 3, 288, x1 - x0 - 6, 14, 5, shadePixel(outfitHex, -18), { stroke: false }); // soft base shadow

  if (outfitId === 'tank') {
    s += rrect(x0 + 16, 214, 12, 22, 5, outfitHex);
    s += rrect(x1 - 28, 214, 12, 22, 5, outfitHex);
  } else if (outfitId === 'stripes') {
    s += rrect(x0 + 3, 244, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
    s += rrect(x0 + 3, 266, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
  } else if (outfitId === 'overalls') {
    const bib = '#3c5ae8';
    s += line(`M178 250 L${x0+18} 226`, outlineOf(bib), 10);
    s += line(`M222 250 L${x1-18} 226`, outlineOf(bib), 10);
    s += line(`M178 250 L${x0+18} 226`, bib, 6);
    s += line(`M222 250 L${x1-18} 226`, bib, 6);
    s += path(`M172 246 L228 246 L228 304 L172 304 Z`, bib);
    s += circle(180, 256, 4, '#f5d020');
    s += circle(220, 256, 4, '#f5d020');
    s += rrect(186, 266, 28, 18, 4, shadePixel(bib, -15)); // front pocket
  } else if (outfitId === 'suit') {
    s += path(`M178 ${top} L200 266 L222 ${top} Z`, '#e8e8e8');
    s += path(`M195 ${top+8} L205 ${top+8} L209 258 L200 270 L191 258 Z`, '#e83c3c');
    s += line(`M178 ${top} L192 262`, outlineOf(outfitHex), 4);
    s += line(`M222 ${top} L208 262`, outlineOf(outfitHex), 4);
  } else if (outfitId === 'sweater') {
    s += rrect(x0 + 2, 288, x1 - x0 - 4, 16, 5, '#f5f5f5');
    s += path(`M180 ${top} Q200 ${top+14} 220 ${top}`, 'none', { stroke: '#f5f5f5', sw: 6 });
  } else if (outfitId === 'hoodie') {
    s += path(`M156 232 Q200 262 244 232 Q240 212 200 212 Q160 212 156 232 Z`, shadePixel(outfitHex, -22));
    s += line(`M188 240 L186 266`, '#f5f5f5', 4);
    s += line(`M212 240 L214 266`, '#f5f5f5', 4);
    s += path(`M172 272 L228 272 L236 298 L164 298 Z`, shadePixel(outfitHex, -12)); // kangaroo pocket
  }
  return s;
}

// ---------- render head + face ----------
function drawHead(skinHex) {
  let s = '';
  s += circle(HEAD.cx - HEAD.rx + 2, 162, 15, skinHex); // ears
  s += circle(HEAD.cx + HEAD.rx - 2, 162, 15, skinHex);
  s += ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, skinHex);
  // soft cheek/jaw shading
  s += path(`M${HEAD.cx-62} 196 Q${HEAD.cx} 238 ${HEAD.cx+62} 196 Q${HEAD.cx} 222 ${HEAD.cx-62} 196 Z`, shadePixel(skinHex, -14), { stroke: false });
  return s;
}

// Mouth width/offset jitter (seeded per piece) keeps faces from being
// identical; blush is an occasional personality touch.
function drawMouth(skinHex, rng) {
  const wide = rng() < 0.3;
  const ox = wide ? 0 : (rng() < 0.5 ? -4 : 4);
  const half = wide ? 16 : 10;
  const mouthColor = luma(skinHex) < 60 ? shadePixel(skinHex, 40) : shadePixel(skinHex, -45);
  let s = line(`M${CX+ox-half} 198 Q${CX+ox} ${wide ? 212 : 206} ${CX+ox+half} 198`, mouthColor, 4);
  if (rng() < 0.25) {
    s += ellipse(150, 190, 13, 7, '#ff9a9a', { stroke: false, opacity: 0.7 });
    s += ellipse(250, 190, 13, 7, '#ff9a9a', { stroke: false, opacity: 0.7 });
  }
  return s;
}

function sparkleStar(x, y, r, color) {
  const i = r * 0.3;
  return path(`M${x} ${y-r} Q${x+i} ${y-i} ${x+r} ${y} Q${x+i} ${y+i} ${x} ${y+r} Q${x-i} ${y+i} ${x-r} ${y} Q${x-i} ${y-i} ${x} ${y-r} Z`, color, { stroke: false });
}

function drawEyes(style, jx, skinHex) {
  const { ink, hl } = faceInk(skinHex);
  const xs = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER], y = EYE_Y;
  const openEye = (x) => ellipse(x, y, 9, 12, ink, { stroke: false }) + circle(x + 3, y - 4, 3.5, hl, { stroke: false });
  const closedEye = (x) => line(`M${x-11} ${y+2} Q${x} ${y-8} ${x+11} ${y+2}`, ink, 4);
  let s = '';
  if (style === 'dot') {
    xs.forEach(x => { s += openEye(x); });
  } else if (style === 'wide') {
    xs.forEach(x => {
      s += ellipse(x, y, 14, 16, '#ffffff', { stroke: ink, sw: 3 });
      s += ellipse(x, y + 2, 8, 10, luma(skinHex) < 60 ? '#1a1a1a' : ink, { stroke: false });
      s += circle(x + 3, y - 2, 3, '#ffffff', { stroke: false });
    });
  } else if (style === 'sleepy') {
    xs.forEach(x => {
      s += path(`M${x-11} ${y} L${x+11} ${y} Q${x+11} ${y+11} ${x} ${y+11} Q${x-11} ${y+11} ${x-11} ${y} Z`, ink, { stroke: false });
      s += line(`M${x-13} ${y} L${x+13} ${y}`, ink, 4);
    });
  } else if (style === 'wink') {
    s += openEye(xs[0]);
    s += closedEye(xs[1]);
  } else if (style === 'sparkle') {
    xs.forEach(x => {
      s += ellipse(x, y, 11, 14, ink, { stroke: false });
      s += sparkleStar(x + 3, y - 4, 6, hl);
      s += circle(x - 4, y + 6, 2, hl, { stroke: false });
    });
  }
  return s;
}

// ---------- render hair ----------
// Each style has an optional back layer (drawn behind head/body) and a
// front layer (fringe/crest drawn over the forehead).
const FRINGE_BLUNT = 'M116 140 Q112 62 200 58 Q288 62 284 140 Q270 118 244 112 Q222 128 200 118 Q176 130 156 112 Q130 118 116 140 Z';
const FRINGE_SIDE  = 'M116 140 Q110 60 200 58 Q290 62 284 140 Q262 104 214 104 Q170 106 116 140 Z';
const HAIR_SHAPES = {
  bob: {
    back: 'M104 218 Q92 120 120 88 Q152 48 200 48 Q248 48 280 88 Q308 120 296 218 Q276 226 262 214 L138 214 Q124 226 104 218 Z',
    front: FRINGE_BLUNT
  },
  long: {
    back: 'M108 292 Q84 150 120 90 Q152 46 200 46 Q248 46 280 90 Q316 150 292 292 Q246 304 200 292 Q154 304 108 292 Z',
    front: FRINGE_BLUNT
  },
  pigtails: {
    back: 'M104 150 Q70 160 72 200 Q76 236 108 232 Q126 206 118 160 Z M296 150 Q330 160 328 200 Q324 236 292 232 Q274 206 282 160 Z',
    front: FRINGE_SIDE
  },
  ponytail: {
    back: 'M258 80 Q334 70 334 150 Q338 214 306 244 Q316 180 276 128 Z',
    front: FRINGE_SIDE
  },
  buzz: {
    front: 'M120 138 Q118 68 200 66 Q282 68 280 138 Q262 108 200 106 Q138 108 120 138 Z'
  },
  mohawk: {
    front: 'M180 114 L170 62 L188 74 L190 30 L204 58 L216 26 L218 70 L232 58 L222 114 Q200 104 180 114 Z'
  },
  headscarf: {
    back: 'M114 142 L78 126 L86 164 Z M114 148 L84 180 L112 176 Z',
    front: 'M110 150 Q104 56 200 54 Q296 56 290 150 Q262 116 200 114 Q138 116 110 150 Z'
  }
};
function hairFill(hairColor, gradId) {
  return hairColor.isRainbow ? `url(#${gradId})` : hairColor.hex;
}
function drawHairBack(style, hairColor, gradId) {
  const shape = HAIR_SHAPES[style];
  if (!shape || !shape.back) return '';
  let s = path(shape.back, hairFill(hairColor, gradId), { baseHex: '#6a4a8a' });
  if (style === 'pigtails') { // hair ties
    s += circle(116, 160, 6, '#ff5ac8');
    s += circle(284, 160, 6, '#ff5ac8');
  }
  return s;
}
function drawHairFront(style, hairColor, gradId) {
  const shape = HAIR_SHAPES[style];
  if (!shape) return '';
  let s = path(shape.front, hairFill(hairColor, gradId), { baseHex: '#6a4a8a' });
  if (style === 'headscarf') {
    s += circle(160, 88, 5, '#ffffff', { stroke: false, opacity: 0.6 });
    s += circle(200, 72, 5, '#ffffff', { stroke: false, opacity: 0.6 });
    s += circle(240, 88, 5, '#ffffff', { stroke: false, opacity: 0.6 });
  } else if (style !== 'mohawk') {
    s += line('M142 96 Q160 76 188 70', '#ffffff', 6, 0.35); // sheen
  }
  return s;
}

// ---------- render accessory ----------
function drawAccessory(style, jx, skinHex) {
  if (style === 'bow') {
    const c = '#ff5ac8';
    return path('M262 92 L236 76 L238 110 Z', c) + path('M262 92 L288 76 L286 110 Z', c) + circle(262, 93, 7, c);
  } else if (style === 'glasses') {
    // Hollow frames aligned to the same jx as drawEyes so the lenses sit on
    // the actual eyes; eyes stay visible through the translucent lens.
    const rim = faceInk(skinHex).ink;
    const lx = EYE_LX + jx*EYE_JITTER, rx = EYE_RX + jx*EYE_JITTER;
    const lens = { stroke: rim, sw: 5, fillOpacity: 0.18 };
    return circle(lx, EYE_Y, 22, '#ffffff', lens) + circle(rx, EYE_Y, 22, '#ffffff', lens) +
      line(`M${lx+22} ${EYE_Y-2} Q${(lx+rx)/2} ${EYE_Y-10} ${rx-22} ${EYE_Y-2}`, rim, 5);
  } else if (style === 'earring') {
    return circle(HEAD.cx - HEAD.rx + 2, 184, 6, '#f5d020');
  } else if (style === 'headband') {
    return line('M122 116 Q200 64 278 116', outlineOf('#e83c5a'), 18) + line('M122 116 Q200 64 278 116', '#e83c5a', 12);
  }
  return '';
}

// ---------- background scenery ----------
// Buildings sit in the side margins (x < 70 / x > 330), which the character
// never occupies; birds sit in the open sky above the head.
const BLDG_COLOR = '#4a5568', BLDG_WINDOW = '#f5e0a0';

function building(x, top, w) {
  let s = rrect(x, top, w, GROUND_Y - top + 6, 3, BLDG_COLOR);
  for (let y = top + 14; y < GROUND_Y - 14; y += 22) {
    for (let wx = x + 7; wx + 8 <= x + w - 6; wx += 16) s += rrect(wx, y, 8, 10, 1.5, BLDG_WINDOW, { stroke: false });
  }
  return s;
}
function drawBackdrop(backdropId) {
  if (backdropId === 'buildingsSmall') {
    return building(10, 246, 50) + building(340, 246, 50);
  } else if (backdropId === 'buildingsTall') {
    return building(10, 110, 50) + building(340, 110, 50);
  } else if (backdropId === 'buildingsSkyline') {
    return building(6, 90, 30) + building(36, 214, 34) + building(364, 90, 30) + building(330, 214, 34);
  } else if (backdropId === 'birds') {
    const bird = (x, y) => line(`M${x-12} ${y} Q${x-6} ${y-8} ${x} ${y} Q${x+6} ${y-8} ${x+12} ${y}`, '#2a2a2a', 3.5);
    return bird(45, 60) + bird(92, 32) + bird(312, 34) + bird(356, 64);
  }
  return '';
}

// A gentle hill in a darker shade of the background so the character
// stands somewhere rather than floating in a color swatch.
function drawGround(bgHex) {
  const base = shadePixel(bgHex, -30);
  return path(`M-10 ${GROUND_Y} Q200 ${GROUND_Y-16} 410 ${GROUND_Y} L410 410 L-10 410 Z`, base, { stroke: shadePixel(bgHex, -45) }) +
    ellipse(CX, GROUND_Y + 10, 62, 9, shadePixel(bgHex, -55), { stroke: false, opacity: 0.35 });
}

// ---------- shared renderer ----------
function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  const { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor } = picks;
  const bgHex = (bgColor && bgColor.hex) || BG_COLOR;
  // separate, deterministic RNG stream for cosmetic jitter (eye offset, mouth
  // width, blush) so it stays stable per index/seed without being coupled to
  // however many trait rolls happen above
  const jitterRng = mulberry32((seed ?? 0) * 130003 + index * 17 + 11);
  const gradId = `rb-${seed ?? 0}-${index}`;

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
  body += drawHairBack(hairStyle.id, hairColor, gradId);
  body += drawBodyAndOutfit(skinTone.hex, outfitType.id, outfitColor.hex);
  body += drawHead(skinTone.hex);
  // small seeded jitter so eyes aren't pinned to the exact same spot on
  // every piece; shared with glasses so the frames stay on the eyes.
  const jx = jitterRng() < 0.3 ? (jitterRng() < 0.5 ? -1 : 1) : 0;
  body += drawEyes(eyeStyle.id, jx, skinTone.hex);
  body += drawMouth(skinTone.hex, jitterRng);
  body += drawHairFront(hairStyle.id, hairColor, gradId);
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
      ellipse(x, EYE_Y, 16, 18, skinTone.hex, { stroke: false }) +
      line(`M${x-11} ${EYE_Y+2} Q${x} ${EYE_Y+9} ${x+11} ${EYE_Y+2}`, ink, 4)).join('');
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

  const picks = { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor };
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });

  return {
    index, svg, tier: t,
    traits: {
      skinTone: skinTone.id, hairColor: hairColor.id, hairStyle: hairStyle.id,
      outfitType: outfitType.id, outfitColor: outfitColor.id, eyeStyle: eyeStyle.id, accessory: accessory.id,
      backdrop: backdrop.id, background: bgColor.id
    },
    rarity: {
      skinTone: skinTone.rarity, hairColor: hairColor.rarity, hairStyle: hairStyle.rarity,
      outfitType: outfitType.rarity, outfitColor: outfitColor.rarity, eyeStyle: eyeStyle.rarity, accessory: accessory.rarity,
      backdrop: backdrop.rarity, background: bgColor.rarity
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
