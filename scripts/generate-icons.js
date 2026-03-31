const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Valid 16x16 red square PNG (base64)
const icon16Base64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkYGD4z0ABYBw1gGE0DBhGwwAEGEYNAAANGAAG/0S1hgAAAABJRU5ErkJggg==';

const icon16 = Buffer.from(icon16Base64, 'base64');

[16, 48, 128].forEach((size) => {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), icon16);
});

console.log('Placeholder icons created. Run with canvas package for proper icons.');
