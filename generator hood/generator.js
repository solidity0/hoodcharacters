// ============================================================
// Chibi Pixel Character — Generative Trait Engine v1
// Blocky pixel-art chibi characters. Fixed lemon-green background
// (#daf007) for every piece — not a trait, a constant.
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
const BG_COLOR = '#daf007';

// ---------- trait pools ----------
const TRAITS = {
  skinTone: [
    { id: 'tan',      weight: 30, hex: '#c89468', rarity: 'common' },
    { id: 'brown',    weight: 26, hex: '#8a5a3a', rarity: 'common' },
    { id: 'pale',     weight: 22, hex: '#f5e8dc', rarity: 'uncommon' },
    { id: 'light',    weight: 16, hex: '#e8c8a0', rarity: 'uncommon' },
    { id: 'onyx',     weight: 6,  hex: '#1a1a1a', rarity: 'rare' }
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
    { id: 'dress',    weight: 10, rarity: 'rare' },
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

// ---------- pixel grid helpers ----------
const GRID = 20, PX = 22, SIZE = GRID * PX;
function newGrid() { return Array.from({length:GRID}, () => Array(GRID).fill(null)); }
function px(grid,x,y,color){ if(x<0||x>=GRID||y<0||y>=GRID) return; grid[y][x]=color; }
function rect(grid,x0,y0,w,h,color){ for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) px(grid,x,y,color); }

// Darkens/lightens a hex color by percent — used for a simple 2-tone shading
// pass on major shapes, and for the auto-outline (a shape-specific dark tone
// reads better than one flat black outline everywhere).
function shadePixel(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

// Flat single-tone shapes with no border read as a generic/AI-blob look.
// Real pixel-art sprites almost always carry a dark silhouette outline —
// this is the single highest-impact fix: after every layer (body, head,
// hair, accessory) is composited, any empty cell touching a filled one gets
// a near-black outline pixel, giving the whole sprite a designed edge.
function addOutline(grid) {
  const additions = [];
  for (let y=0;y<GRID;y++) for (let x=0;x<GRID;x++) {
    if (!grid[y][x]) continue;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if (nx<0||nx>=GRID||ny<0||ny>=GRID) return;
      if (!grid[ny][nx]) additions.push([nx,ny]);
    });
  }
  additions.forEach(([x,y])=>{ if(!grid[y][x]) grid[y][x]='#12100e'; });
}

// ---------- render body + outfit ----------
function drawBodyAndOutfit(grid, skinHex, outfitId, outfitHex) {
  // torso: slight taper at the waist instead of a plain rectangle, plus a
  // one-row shadow along the bottom edge for depth
  rect(grid,6,12,8,6,outfitHex);
  px(grid,6,12,null); px(grid,13,12,null);
  rect(grid,7,11,6,1,outfitHex);
  rect(grid,6,17,8,1,shadePixel(outfitHex,-22)); // shadow row along torso base
  rect(grid,4,13,2,3,skinHex);
  rect(grid,14,13,2,3,skinHex);
  rect(grid,7,18,2,2,skinHex);
  rect(grid,11,18,2,2,skinHex);
  rect(grid,7,19,2,1,shadePixel(skinHex,-18)); // leg shadow
  rect(grid,11,19,2,1,shadePixel(skinHex,-18));

  if (outfitId==='stripes') {
    rect(grid,7,13,6,1,'#f5f5f5');
    rect(grid,7,15,6,1,'#f5f5f5');
  } else if (outfitId==='overalls') {
    rect(grid,7,12,2,3,'#3c5ae8');
    rect(grid,11,12,2,3,'#3c5ae8');
  } else if (outfitId==='suit') {
    rect(grid,9,12,2,4,'#e8e8e8');
    px(grid,9,13,'#e83c3c'); px(grid,10,14,'#e83c3c');
  } else if (outfitId==='sweater') {
    rect(grid,7,17,6,1,'#f5f5f5');
  } else if (outfitId==='hoodie') {
    rect(grid,6,11,8,2,outfitHex);
    rect(grid,9,12,2,1,shadePixel(outfitHex,-30));
  } else if (outfitId==='dress') {
    rect(grid,6,15,8,4,outfitHex);
    rect(grid,5,18,10,2,outfitHex);
  }
}

// ---------- render head + face ----------
function drawHead(grid, skinHex) {
  rect(grid,6,4,8,7,skinHex);
  px(grid,6,4,null); px(grid,13,4,null);
  rect(grid,7,3,6,1,skinHex);
  rect(grid,6,10,8,1,shadePixel(skinHex,-15)); // jaw shadow row
}

// A tiny mouth — most reference pixel-avatar collections give the face at
// least this much, and a completely blank lower face is a big part of why
// a flat blob reads as generic rather than designed.
function drawMouth(grid, skinHex) {
  rect(grid,9,9,2,1,shadePixel(skinHex,-35));
}

function drawEyes(grid, style, animate) {
  const ink = '#1a1a1a';
  const hl = '#ffffff'; // highlight — this single pixel per eye is what makes them read as alive rather than blank dots
  if (style==='dot') {
    px(grid,8,7,ink); px(grid,8,8,ink); px(grid,8,7,hl);
    px(grid,11,7,ink); px(grid,11,8,ink); px(grid,11,7,hl);
  } else if (style==='wide') {
    rect(grid,8,7,1,2,ink); px(grid,8,7,hl);
    rect(grid,11,7,1,2,ink); px(grid,11,7,hl);
  } else if (style==='sleepy') {
    rect(grid,8,8,1,1,ink); rect(grid,11,8,1,1,ink);
  } else if (style==='wink') {
    px(grid,8,7,ink); px(grid,8,8,ink); px(grid,8,7,hl);
    rect(grid,11,8,1,1,ink);
  } else if (style==='sparkle') {
    px(grid,8,7,ink); px(grid,8,8,ink); px(grid,8,7,hl);
    px(grid,11,7,ink); px(grid,11,8,ink); px(grid,11,7,hl);
  }
  return ink;
}

// ---------- render hair ----------
function drawHair(grid, style, hairHex) {
  if (style==='pigtails') {
    rect(grid,6,2,8,3,hairHex);
    rect(grid,3,5,2,4,hairHex);
    rect(grid,15,5,2,4,hairHex);
  } else if (style==='bob') {
    rect(grid,5,2,10,4,hairHex);
    rect(grid,5,6,2,3,hairHex);
    rect(grid,13,6,2,3,hairHex);
  } else if (style==='mohawk') {
    rect(grid,9,1,2,4,hairHex);
    rect(grid,7,3,6,1,hairHex);
  } else if (style==='long') {
    rect(grid,5,2,10,3,hairHex);
    rect(grid,5,5,2,8,hairHex);
    rect(grid,13,5,2,8,hairHex);
  } else if (style==='buzz') {
    rect(grid,7,3,6,2,hairHex);
  } else if (style==='headscarf') {
    rect(grid,5,2,10,3,hairHex);
    rect(grid,4,4,2,2,hairHex);
  } else if (style==='ponytail') {
    rect(grid,6,2,8,3,hairHex);
    rect(grid,14,3,3,2,hairHex);
    rect(grid,16,5,2,3,hairHex);
  }
}

// ---------- render accessory ----------
function drawAccessory(grid, style) {
  if (style==='bow') {
    rect(grid,13,3,2,2,'#ff5ac8');
    px(grid,15,3,'#ff5ac8'); px(grid,15,4,'#ff5ac8');
  } else if (style==='glasses') {
    rect(grid,7,7,3,2,'#1a1a1a');
    rect(grid,10,7,3,2,'#1a1a1a');
    px(grid,10,7,null); px(grid,10,8,null);
  } else if (style==='earring') {
    px(grid,5,9,'#f5d020');
  } else if (style==='headband') {
    rect(grid,6,4,8,1,'#e83c5a');
  }
}

// ---------- pixel -> SVG (with optional blink animation) ----------
function gridToSVG(grid, index, animate, animRng) {
  let cells = '';
  for (let y=0;y<GRID;y++) for (let x=0;x<GRID;x++) if (grid[y][x]) {
    cells += `<rect x="${x*PX}" y="${y*PX}" width="${PX}" height="${PX}" fill="${grid[y][x]}"/>`;
  }
  let blinkAnim = '';
  if (animate) {
    const dur = (3.5 + animRng()*2.5).toFixed(2);
    const phase = (animRng()*3).toFixed(2);
    // Blink: eyelid-colored bars sweep down over the eye row then back —
    // simplest robust way to fake a blink on a static pixel grid without
    // needing separate open/closed sprite states.
    blinkAnim = `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.46;0.5;0.54;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>` +
      `<rect x="${8*PX}" y="${7*PX}" width="${PX}" height="${2*PX}" fill="var(--lidcolor,#f5e8dc)"/>` +
      `<rect x="${11*PX}" y="${7*PX}" width="${PX}" height="${2*PX}" fill="var(--lidcolor,#f5e8dc)"/></g>`;
  }
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect width="${SIZE}" height="${SIZE}" fill="${BG_COLOR}"/>
${cells}
${blinkAnim}
</svg>`;
}

// ---------- shared renderer ----------
function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  const { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory } = picks;
  const grid = newGrid();

  drawBodyAndOutfit(grid, skinTone.hex, outfitType.id, outfitColor.hex);
  drawHead(grid, skinTone.hex);
  drawEyes(grid, eyeStyle.id, animate);
  drawMouth(grid, skinTone.hex);
  drawHair(grid, hairStyle.id, hairColor.isRainbow ? hairColor.hex : hairColor.hex);
  drawAccessory(grid, accessory.id);

  // rainbow hair override: recolor the hair cells with a gradient sweep
  // (applied after drawHair so it overrides whatever flat color was used)
  if (hairColor.isRainbow) {
    const RAINBOW = ['#ff5a5a','#ffa63c','#f5d020','#3ce85a','#3ca8f5','#8a5af5'];
    let ri = 0;
    for (let y=0;y<GRID;y++) for (let x=0;x<GRID;x++) {
      if (grid[y][x] === hairColor.hex) { grid[y][x] = RAINBOW[ri % RAINBOW.length]; ri++; }
    }
  }

  // Final pass, after every layer is composited: outline the whole silhouette.
  addOutline(grid);

  let animRng = null;
  if (animate) animRng = mulberry32((seed ?? 0) * 70001 + index * 9973 + 3);
  const svg = gridToSVG(grid, index, animate, animRng);

  // set the lid color to match this piece's actual skin tone via a wrapper
  return svg.replaceAll('var(--lidcolor,#f5e8dc)', skinTone.hex);
}

// ---------- main composer ----------
function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);

  const skinTone   = pickByRarity(rng, TRAITS.skinTone, t);
  const hairColor  = isOneOfOne ? pickOneOfOneHairColor(rng) : pickByRarity(rng, TRAITS.hairColor, t);
  const hairStyle  = pickByRarity(rng, TRAITS.hairStyle, t);
  const outfitType = pickByRarity(rng, TRAITS.outfitType, t);
  const outfitColor= pickByRarity(rng, TRAITS.outfitColor, t);
  const eyeStyle   = pickByRarity(rng, TRAITS.eyeStyle, t);
  const accessory  = pickByRarity(rng, TRAITS.accessory, t);

  const picks = { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory };
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });

  return {
    index, svg, tier: t,
    traits: {
      skinTone: skinTone.id, hairColor: hairColor.id, hairStyle: hairStyle.id,
      outfitType: outfitType.id, outfitColor: outfitColor.id, eyeStyle: eyeStyle.id, accessory: accessory.id
    },
    rarity: {
      skinTone: skinTone.rarity, hairColor: hairColor.rarity, hairStyle: hairStyle.rarity,
      outfitType: outfitType.rarity, outfitColor: outfitColor.rarity, eyeStyle: eyeStyle.rarity, accessory: accessory.rarity
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

const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea' };

const api = {
  generatePiece, generateBatch, TRAITS, TIER_FALLBACK,
  mulberry32, weightedPick, pickByRarity, shadeColor,
  renderFromTraits, BG_COLOR, CHAIN_THEMES,
  RAINBOW_HAIR, ONE_OF_ONE_HAIR_WEIGHTS, pickOneOfOneHairColor
};
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.ChibiGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
