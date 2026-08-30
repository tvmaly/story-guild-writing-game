import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const width = 48;
const height = 64;
const pixels = Buffer.alloc(width * height * 4, 0);

function rect(x, y, w, h, [red, green, blue, alpha]) {
  for (let row = y; row < y + h; row += 1) {
    for (let column = x; column < x + w; column += 1) {
      const offset = (row * width + column) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = alpha;
    }
  }
}

function pose(originX, originY, step) {
  rect(originX + 5, originY + 2, 6, 5, [255, 255, 255, 255]);
  rect(originX + 4, originY + 7, 8, 6, [208, 208, 208, 255]);
  rect(originX + 6, originY + 4, 1, 1, [16, 24, 44, 255]);
  rect(originX + 9, originY + 4, 1, 1, [16, 24, 44, 255]);
  if (step === 0) {
    rect(originX + 5, originY + 13, 2, 2, [255, 255, 255, 255]);
    rect(originX + 9, originY + 13, 2, 2, [255, 255, 255, 255]);
  } else if (step === 1) {
    rect(originX + 4, originY + 13, 2, 2, [255, 255, 255, 255]);
    rect(originX + 10, originY + 12, 2, 2, [255, 255, 255, 255]);
  } else {
    rect(originX + 4, originY + 12, 2, 2, [255, 255, 255, 255]);
    rect(originX + 10, originY + 13, 2, 2, [255, 255, 255, 255]);
  }
}

for (let direction = 0; direction < 4; direction += 1) {
  for (let frame = 0; frame < 3; frame += 1) pose(frame * 16, direction * 16, frame);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const scanlines = Buffer.alloc((width * 4 + 1) * height);
for (let row = 0; row < height; row += 1) {
  const destination = row * (width * 4 + 1);
  scanlines[destination] = 0;
  pixels.copy(scanlines, destination + 1, row * width * 4, (row + 1) * width * 4);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(scanlines)),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(new URL('../public/assets/sprites/adventurer.png', import.meta.url), png);
