// ============================================================
// Chibi Pixel Character — Generative Trait Engine v1
// Blocky pixel-art chibi characters. Fixed background color (#cbe94a) for
// every piece — not a trait, a constant. Locked in from reference art.
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
const BG_COLOR = '#cbe94a';

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

// ---------- pixel grid helpers ----------
// The character itself is still designed on a 20x20 grid (all the drawXxx
// functions below use those same 0-19 coordinates, unchanged). The actual
// canvas is padded around it — headroom above, side margin, and a reserved
// ground band below the feet — so the character doesn't fill the whole
// frame edge-to-edge. px()/rect() apply the offset automatically so none
// of the per-part drawing code needs to know about the padding.
const CHAR = 20;
const PAD_TOP = 3, PAD_SIDE = 3, GROUND_ROWS = 3;
const OFFSET_X = PAD_SIDE, OFFSET_Y = PAD_TOP;
const GRID_W = PAD_SIDE*2 + CHAR;      // 26
const GRID_H = PAD_TOP + CHAR + GROUND_ROWS; // 26 — kept square with GRID_W
const PX = 22, SIZE = GRID_W * PX;
function newGrid() { return Array.from({length:GRID_H}, () => Array(GRID_W).fill(null)); }
function px(grid,x,y,color){
  const gx=x+OFFSET_X, gy=y+OFFSET_Y;
  if (gx<0||gx>=GRID_W||gy<0||gy>=GRID_H) return;
  grid[gy][gx]=color;
}
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

// A single blended shadow tone reads as smooth/vector — real limited-palette
// pixel art fakes gradient/shadow with DITHERING: alternating two flat colors
// in a checker pattern instead of a third blended color. Used for torso,
// jaw, and leg shadow rows in place of the old flat shadePixel() fill.
function ditherRow(grid, x0, y0, w, colorA, colorB) {
  for (let x = x0; x < x0 + w; x++) px(grid, x, y0, ((x - x0) % 2 === 0) ? colorA : colorB);
}

// Flat single-tone shapes with no border read as a generic/AI-blob look.
// Real pixel-art sprites almost always carry a dark silhouette outline —
// this is the single highest-impact fix: after every layer (body, head,
// hair, accessory) is composited, any empty cell touching a filled one gets
// an outline pixel, giving the whole sprite a designed edge.
//
// Selective outlining: instead of one flat black everywhere (a "coloring
// book" tell), the outline color is a darkened shade of whichever filled
// neighbor caused it — so a red shirt gets a dark-red edge, skin gets a
// dark-skin edge, and only edges with no filled neighbor at all (the true
// outer silhouette against the background) fall back to near-black.
function addOutline(grid) {
  const additions = [];
  for (let y=0;y<GRID_H;y++) for (let x=0;x<GRID_W;x++) {
    if (!grid[y][x]) continue;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if (nx<0||nx>=GRID_W||ny<0||ny>=GRID_H) {
        return;
      }
      if (!grid[ny][nx]) additions.push([nx, ny, grid[y][x]]);
    });
  }
  const seen = new Set();
  additions.forEach(([x,y,neighborColor])=>{
    const key = x+','+y;
    if (grid[y][x] || seen.has(key)) return;
    seen.add(key);
    grid[y][x] = shadePixel(neighborColor, -55);
  });
}

// ---------- render body + outfit ----------
// Silhouette now varies by outfit instead of every trait sharing one
// identical rectangle — hoodie/overalls read broader at the shoulders,
// suit reads slimmer. This is what stops every piece
// looking like the same doll with a palette swap.
const OUTFIT_WIDTH = { hoodie: 1, overalls: 1, suit: -1, sweater: 0, tank: 0, stripes: 0 };
function drawBodyAndOutfit(grid, skinHex, outfitId, outfitHex, rng) {
  const wPad = OUTFIT_WIDTH[outfitId] || 0;
  const x0 = 6 - wPad, w = 8 + wPad*2;
  rect(grid,x0,12,w,6,outfitHex);
  px(grid,x0,12,null); px(grid,x0+w-1,12,null);
  rect(grid,x0+1,11,w-2,1,outfitHex);
  ditherRow(grid, x0, 17, w, outfitHex, shadePixel(outfitHex,-30)); // dithered shadow row along torso base
  rect(grid,x0-2,13,2,3,skinHex);
  rect(grid,x0+w,13,2,3,skinHex);
  rect(grid,7,18,2,2,skinHex);
  rect(grid,11,18,2,2,skinHex);
  ditherRow(grid, 7, 19, 2, skinHex, shadePixel(skinHex,-26)); // leg shadow
  ditherRow(grid, 11, 19, 2, skinHex, shadePixel(skinHex,-26));

  if (outfitId==='stripes') {
    rect(grid,x0+1,13,w-2,1,'#f5f5f5');
    rect(grid,x0+1,15,w-2,1,'#f5f5f5');
  } else if (outfitId==='overalls') {
    rect(grid,x0+1,12,2,3,'#3c5ae8');
    rect(grid,x0+w-3,12,2,3,'#3c5ae8');
  } else if (outfitId==='suit') {
    rect(grid,9,12,2,4,'#e8e8e8');
    px(grid,9,13,'#e83c3c'); px(grid,10,14,'#e83c3c');
  } else if (outfitId==='sweater') {
    rect(grid,x0+1,17,w-2,1,'#f5f5f5');
  } else if (outfitId==='hoodie') {
    rect(grid,x0,11,w,2,outfitHex);
    rect(grid,9,12,2,1,shadePixel(outfitHex,-30));
  }
}

// ---------- render head + face ----------
function drawHead(grid, skinHex) {
  rect(grid,6,4,8,7,skinHex);
  px(grid,6,4,null); px(grid,13,4,null);
  rect(grid,7,3,6,1,skinHex);
  ditherRow(grid, 6, 10, 8, skinHex, shadePixel(skinHex,-24)); // dithered jaw shadow
}

// A tiny mouth — most reference pixel-avatar collections give the face at
// least this much, and a completely blank lower face is a big part of why
// a flat blob reads as generic rather than designed. Width/offset jitter
// (±1px, seeded per piece) keeps faces from being pixel-identical.
function drawMouth(grid, skinHex, rng) {
  const w = rng() < 0.3 ? 3 : 2;
  const ox = w === 3 ? 8 : (rng() < 0.5 ? 8 : 9);
  rect(grid, ox, 9, w, 1, shadePixel(skinHex,-35));
  if (rng() < 0.25) { // blush — small personality touch, not present on every piece
    px(grid, 7, 8, '#ff9a9a'); px(grid, 12, 8, '#ff9a9a');
  }
}

function drawEyes(grid, style, animate, jx) {
  const ink = '#1a1a1a';
  const hl = '#ffffff'; // highlight — this single pixel per eye is what makes them read as alive rather than blank dots
  const lx = 8+jx, rx = 11+jx, ey = 7;
  if (style==='dot') {
    px(grid,lx,ey,ink); px(grid,lx,ey+1,ink); px(grid,lx,ey,hl);
    px(grid,rx,ey,ink); px(grid,rx,ey+1,ink); px(grid,rx,ey,hl);
  } else if (style==='wide') {
    rect(grid,lx,ey,1,2,ink); px(grid,lx,ey,hl);
    rect(grid,rx,ey,1,2,ink); px(grid,rx,ey,hl);
  } else if (style==='sleepy') {
    rect(grid,lx,ey+1,1,1,ink); rect(grid,rx,ey+1,1,1,ink);
  } else if (style==='wink') {
    px(grid,lx,ey,ink); px(grid,lx,ey+1,ink); px(grid,lx,ey,hl);
    rect(grid,rx,ey+1,1,1,ink);
  } else if (style==='sparkle') {
    px(grid,lx,ey,ink); px(grid,lx,ey+1,ink); px(grid,lx,ey,hl);
    px(grid,rx,ey,ink); px(grid,rx,ey+1,ink); px(grid,rx,ey,hl);
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
function drawAccessory(grid, style, jx) {
  if (style==='bow') {
    rect(grid,13,3,2,2,'#ff5ac8');
    px(grid,15,3,'#ff5ac8'); px(grid,15,4,'#ff5ac8');
  } else if (style==='glasses') {
    // Hollow frame, not a solid block — a filled rect here completely hides
    // whatever eye style was picked underneath. Only the rim around each eye
    // is painted (top row + left/right columns); the eye's own pixel column
    // is left untouched so it stays visible through the "lens". Aligned to
    // the same jx as drawEyes so the frame never drifts off the actual eyes.
    const lensColor = '#1a1a1a';
    const lx = 8+jx, rx = 11+jx, ey = 7;
    [lx, rx].forEach(cx => {
      rect(grid, cx-1, ey-1, 3, 1, lensColor); // top rim
      px(grid, cx-1, ey, lensColor); px(grid, cx-1, ey+1, lensColor); // left rim
      px(grid, cx+1, ey, lensColor); px(grid, cx+1, ey+1, lensColor); // right rim
    });
  } else if (style==='earring') {
    px(grid,5,9,'#f5d020');
  } else if (style==='headband') {
    rect(grid,6,4,8,1,'#e83c5a');
  }
}

// ---------- background scenery ----------
// Buildings live entirely in the side-padding columns (character-space
// x < 0 or x >= CHAR), which the character sprite never touches, so there's
// no risk of overlap regardless of outfit/hair — they just flank whatever's
// already there. Birds live in the top headroom rows (y < 0), which is
// always empty above the character for the same reason.
const BLDG_COLOR = '#4a5568', BLDG_WINDOW = '#f5e0a0';

// One building block per side, mirrored, ending flush with the ground line.
function drawBuildingPair(grid, yTop, w) {
  const leftX = -PAD_SIDE, rightX = CHAR + (PAD_SIDE - w);
  const h = CHAR - yTop;
  rect(grid, leftX,  yTop, w, h, BLDG_COLOR);
  rect(grid, rightX, yTop, w, h, BLDG_COLOR);
  for (let y = yTop+1; y < CHAR-1; y += 2) {
    px(grid, leftX, y, BLDG_WINDOW);
    px(grid, rightX, y, BLDG_WINDOW);
  }
}

// A taller single tower plus a shorter cluster per side — a different
// silhouette from the single-block variants above rather than just a
// height change, so the building types actually read as distinct.
function drawSkylinePair(grid) {
  const tallTop = 6, shortTop = 13;
  const tallH = CHAR - tallTop, shortH = CHAR - shortTop;
  rect(grid, -3, tallTop, 1, tallH, BLDG_COLOR);
  rect(grid, -2, shortTop, 2, shortH, BLDG_COLOR);
  px(grid, -3, 9, BLDG_WINDOW); px(grid, -3, 13, BLDG_WINDOW);
  px(grid, -2, 16, BLDG_WINDOW);
  rect(grid, 22, tallTop, 1, tallH, BLDG_COLOR);
  rect(grid, 20, shortTop, 2, shortH, BLDG_COLOR);
  px(grid, 22, 9, BLDG_WINDOW); px(grid, 22, 13, BLDG_WINDOW);
  px(grid, 20, 16, BLDG_WINDOW);
}

// Small 3-pixel chevron — the classic distant-bird glyph.
function drawBird(grid, x, y, color) {
  px(grid, x, y+1, color); px(grid, x+1, y, color); px(grid, x+2, y+1, color);
}

function drawBackdrop(grid, backdropId) {
  if (backdropId === 'buildingsSmall') {
    drawBuildingPair(grid, 12, 2);
  } else if (backdropId === 'buildingsTall') {
    drawBuildingPair(grid, 4, 2);
  } else if (backdropId === 'buildingsSkyline') {
    drawSkylinePair(grid);
  } else if (backdropId === 'birds') {
    const ink = '#2a2a2a';
    drawBird(grid, -2, -2, ink); drawBird(grid, 6, -3, ink);
    drawBird(grid, 14, -2, ink); drawBird(grid, 21, -3, ink);
  }
}

// ---------- pixel -> SVG (with optional blink animation) ----------
function gridToSVG(grid, index, animate, animRng) {
  let cells = '';
  for (let y=0;y<GRID_H;y++) for (let x=0;x<GRID_W;x++) if (grid[y][x]) {
    cells += `<rect x="${x*PX}" y="${y*PX}" width="${PX}" height="${PX}" fill="${grid[y][x]}"/>`;
  }
  let blinkAnim = '';
  if (animate) {
    const dur = (3.5 + animRng()*2.5).toFixed(2);
    const phase = (animRng()*3).toFixed(2);
    // Blink: eyelid-colored bars sweep down over the eye row then back —
    // simplest robust way to fake a blink on a static pixel grid without
    // needing separate open/closed sprite states. Eyes live at character-
    // space (8,7)/(11,7); add the same canvas offset used everywhere else.
    const ex1 = (8+OFFSET_X)*PX, ex2 = (11+OFFSET_X)*PX, ey = (7+OFFSET_Y)*PX;
    blinkAnim = `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.46;0.5;0.54;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>` +
      `<rect x="${ex1}" y="${ey}" width="${PX}" height="${2*PX}" fill="var(--lidcolor,#f5e8dc)"/>` +
      `<rect x="${ex2}" y="${ey}" width="${PX}" height="${2*PX}" fill="var(--lidcolor,#f5e8dc)"/></g>`;
  }
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect width="${SIZE}" height="${SIZE}" fill="${BG_COLOR}"/>
${cells}
${blinkAnim}
</svg>`;
}

// A flat lemon-green floor with no ground reads like a character floating in
// a color swatch rather than standing somewhere. Reserves the bottom
// GROUND_ROWS of the canvas as a simple grass/dirt stand: a darker shade of
// the background plus a lighter dithered "grass tip" line along the top
// edge of the band for texture. Filled directly into the grid before the
// final outline pass, so it naturally picks up a horizon-line edge anywhere
// it borders empty background (e.g. beside the character's legs).
function drawGround(grid) {
  const groundBase = shadePixel(BG_COLOR, -35);
  const groundEdge = shadePixel(BG_COLOR, -20);
  rect(grid, -PAD_SIDE, CHAR, GRID_W, GROUND_ROWS, groundBase);
  ditherRow(grid, -PAD_SIDE, CHAR, GRID_W, groundEdge, groundBase);
}

// ---------- shared renderer ----------
function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  const { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop } = picks;
  const grid = newGrid();
  // separate, deterministic RNG stream for cosmetic jitter (face offset, mouth
  // width, blush, dithering isn't randomized but this keeps jitter stable per
  // index/seed without being coupled to however many trait rolls happen above)
  const jitterRng = mulberry32((seed ?? 0) * 130003 + index * 17 + 11);

  if (backdrop) drawBackdrop(grid, backdrop.id);
  drawBodyAndOutfit(grid, skinTone.hex, outfitType.id, outfitColor.hex, jitterRng);
  drawHead(grid, skinTone.hex);
  // small seeded jitter so eyes aren't pinned to the exact same coordinate
  // on every single piece — the single biggest reason flat-doll faces read
  // as machine-generated rather than hand-placed. Computed once here (rather
  // than inside drawEyes) so drawAccessory's glasses can align to the same
  // shifted position instead of drifting off the actual eyes.
  const jx = jitterRng() < 0.3 ? (jitterRng() < 0.5 ? -1 : 1) : 0;
  drawEyes(grid, eyeStyle.id, animate, jx);
  drawMouth(grid, skinTone.hex, jitterRng);
  drawHair(grid, hairStyle.id, hairColor.isRainbow ? hairColor.hex : hairColor.hex);
  drawAccessory(grid, accessory.id, jx);

  // rainbow hair override: recolor the hair cells with a gradient sweep
  // (applied after drawHair so it overrides whatever flat color was used)
  if (hairColor.isRainbow) {
    const RAINBOW = ['#ff5a5a','#ffa63c','#f5d020','#3ce85a','#3ca8f5','#8a5af5'];
    let ri = 0;
    for (let y=0;y<GRID_H;y++) for (let x=0;x<GRID_W;x++) {
      if (grid[y][x] === hairColor.hex) { grid[y][x] = RAINBOW[ri % RAINBOW.length]; ri++; }
    }
  }

  drawGround(grid);

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

  const skinTone   = isOneOfOne ? pickOneOfOneSkinTone(rng) : pickByRarity(rng, TRAITS.skinTone, t);
  const hairColor  = isOneOfOne ? pickOneOfOneHairColor(rng) : pickByRarity(rng, TRAITS.hairColor, t);
  const hairStyle  = pickByRarity(rng, TRAITS.hairStyle, t);
  const outfitType = isOneOfOne ? pickOneOfOneOutfitType(rng) : pickByRarity(rng, TRAITS.outfitType, t);
  const outfitColor= pickByRarity(rng, TRAITS.outfitColor, t);
  const eyeStyle   = pickByRarity(rng, TRAITS.eyeStyle, t);
  const accessory  = pickByRarity(rng, TRAITS.accessory, t);
  const backdrop   = isOneOfOne ? pickOneOfOneBackdrop(rng) : pickByRarity(rng, TRAITS.backdrop, t);

  const picks = { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop };
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });

  return {
    index, svg, tier: t,
    traits: {
      skinTone: skinTone.id, hairColor: hairColor.id, hairStyle: hairStyle.id,
      outfitType: outfitType.id, outfitColor: outfitColor.id, eyeStyle: eyeStyle.id, accessory: accessory.id,
      backdrop: backdrop.id
    },
    rarity: {
      skinTone: skinTone.rarity, hairColor: hairColor.rarity, hairStyle: hairStyle.rarity,
      outfitType: outfitType.rarity, outfitColor: outfitColor.rarity, eyeStyle: eyeStyle.rarity, accessory: accessory.rarity,
      backdrop: backdrop.rarity
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
  RAINBOW_HAIR, ONE_OF_ONE_HAIR_WEIGHTS, pickOneOfOneHairColor,
  ONE_OF_ONE_SKIN_TONE_WEIGHTS, pickOneOfOneSkinTone,
  ONE_OF_ONE_OUTFIT_WEIGHTS, pickOneOfOneOutfitType,
  ONE_OF_ONE_BACKDROP_WEIGHTS, pickOneOfOneBackdrop
};
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.ChibiGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
