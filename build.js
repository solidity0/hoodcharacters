#!/usr/bin/env node
// ============================================================
// build.js  —  produces a self-contained index.html from the
// canonical engine (generator.js) plus the website shell (index.src.html).
//
// The engine is spliced into index.src.html between the markers:
//   <!-- ENGINE:START -->  ...generated, do not edit by hand...  <!-- ENGINE:END -->
//
// Why: the website must stay a single self-contained file (for Ordinals
// inscription + GitHub Pages), but we only want to edit the engine in ONE
// place. Edit generator.js, run `node build.js`, commit the rebuilt index.html.
//
// Usage:
//   node build.js            # build -> index.html
//   node build.js --check    # verify index.html is up to date (CI-friendly)
// ============================================================

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const ENGINE = path.join(DIR, 'generator.js');
const SRC = path.join(DIR, 'index.src.html');
const OUT = path.join(DIR, 'index.html');

const START = '<!-- ENGINE:START -->';
const END = '<!-- ENGINE:END -->';

function build() {
  const engineRaw = fs.readFileSync(ENGINE, 'utf8').trimEnd();
  // Any literal </script> inside the engine (even in a comment or string) would
  // prematurely close the inlined <script> tag at HTML-parse time. Escape it so
  // the browser keeps the whole engine inside one script. The `<\/script>`
  // sequence is identical to `</script>` once the JS string is parsed, so this
  // is purely an HTML-parser safety measure and does not change behavior.
  const engine = engineRaw.replace(/<\/script>/gi, '<\\/script>');
  const src = fs.readFileSync(SRC, 'utf8');

  // index.src.html must contain exactly one of each marker (the engine is NOT
  // yet inlined there, so no stray marker-like strings can appear).
  const startCount = src.split(START).length - 1;
  const endCount = src.split(END).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(`index.src.html must contain exactly one START and one END marker (found ${startCount}/${endCount})`);
  }
  const startIdx = src.indexOf(START);
  const endIdx = src.indexOf(END);
  if (endIdx < startIdx) {
    throw new Error('ENGINE:END appears before ENGINE:START in index.src.html');
  }

  // Wrap the engine in its own <script> so window.ArtGen is defined before the UI script runs.
  const banner = '// ==== AUTO-GENERATED FROM generator.js — DO NOT EDIT HERE. Edit generator.js then run `node build.js`. ====';
  const block =
    START + '\n' +
    '<script>\n' +
    banner + '\n' +
    engine + '\n' +
    '</script>\n' +
    END;

  const out = src.slice(0, startIdx) + block + src.slice(endIdx + END.length);
  return out;
}

const checkMode = process.argv.includes('--check');
const result = build();

if (checkMode) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (existing !== result) {
    console.error('✗ index.html is OUT OF DATE. Run `node build.js` and commit the result.');
    process.exit(1);
  }
  console.log('✓ index.html is up to date with generator.js');
} else {
  fs.writeFileSync(OUT, result);
  const kb = (Buffer.byteLength(result) / 1024).toFixed(1);
  console.log(`✓ Built index.html (${kb} KB) — engine inlined from generator.js`);
}
