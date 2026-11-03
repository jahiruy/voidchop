import JSZip from 'jszip';

export async function buildExportZip(files) {
  const zip = new JSZip();
  for (const { name, data } of files) zip.file(name, data);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}
