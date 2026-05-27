import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { collectSocialPreviewFailures, readPngDimensions } from './check-public-surface.mjs';

function createPng(path, { width, height }) {
  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32BE(13, 0);

  const chunkType = Buffer.from('IHDR');
  const chunkData = Buffer.alloc(13);
  chunkData.writeUInt32BE(width, 0);
  chunkData.writeUInt32BE(height, 4);
  chunkData.writeUInt8(8, 8);
  chunkData.writeUInt8(6, 9);
  chunkData.writeUInt8(0, 10);
  chunkData.writeUInt8(0, 11);
  chunkData.writeUInt8(0, 12);

  const fakeCrc = Buffer.alloc(4);
  const fakeIend = Buffer.from([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);

  const png = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunkLength,
    chunkType,
    chunkData,
    fakeCrc,
    fakeIend,
  ]);

  writeFileSync(path, png);
}

test('readPngDimensions reads width and height from the PNG header', () => {
  const dir = mkdtempSync(join(tmpdir(), 'campus-social-preview-'));
  const pngPath = join(dir, 'social-preview.png');

  try {
    createPng(pngPath, { width: 1280, height: 640 });
    assert.deepEqual(readPngDimensions(pngPath), { width: 1280, height: 640 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectSocialPreviewFailures flags wrong dimensions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'campus-social-preview-'));
  const pngPath = join(dir, 'social-preview.png');

  try {
    createPng(pngPath, { width: 1280, height: 1280 });
    assert.deepEqual(collectSocialPreviewFailures(pngPath), ['social_preview_wrong_dimensions:1280x1280']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectSocialPreviewFailures flags files that exceed the GitHub upload budget', () => {
  const dir = mkdtempSync(join(tmpdir(), 'campus-social-preview-'));
  const pngPath = join(dir, 'social-preview.png');

  try {
    createPng(pngPath, { width: 1280, height: 640 });
    const oversized = Buffer.concat([readFileSync(pngPath), Buffer.alloc(1048576)]);
    writeFileSync(pngPath, oversized);
    assert.deepEqual(collectSocialPreviewFailures(pngPath), [`social_preview_file_too_large:${oversized.length}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
