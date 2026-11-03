import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildExportZip } from '../../src/audio/zip-bundler.js';

const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsArrayBuffer(blob);
  });

describe('buildExportZip', () => {
  it('bundles files into a zip blob with given names and bytes', async () => {
    const a = new Uint8Array([1, 2, 3]).buffer;
    const b = new Uint8Array([4, 5]).buffer;
    const blob = await buildExportZip([
      { name: 'slice_01.wav', data: a },
      { name: 'slice_02.wav', data: b },
    ]);
    expect(blob).toBeInstanceOf(Blob);
    const zip = await JSZip.loadAsync(await readBlob(blob));
    expect(Object.keys(zip.files).sort()).toEqual(['slice_01.wav', 'slice_02.wav']);
    expect(Array.from(await zip.file('slice_01.wav').async('uint8array'))).toEqual([1, 2, 3]);
    expect(Array.from(await zip.file('slice_02.wav').async('uint8array'))).toEqual([4, 5]);
  });

  it('returns an empty zip for no files', async () => {
    const zip = await JSZip.loadAsync(await readBlob(await buildExportZip([])));
    expect(Object.keys(zip.files)).toEqual([]);
  });
});
