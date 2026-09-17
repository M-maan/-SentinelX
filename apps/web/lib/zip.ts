type ZipFile = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(view: DataView, offset: number, value: number) { view.setUint16(offset, value, true); }
function u32(view: DataView, offset: number, value: number) { view.setUint32(offset, value, true); }

// Store-only ZIP: Windows Explorer can extract it without another application.
export function createZip(files: ZipFile[]): Blob {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const localHeader = new Uint8Array(30 + name.length);
    const l = new DataView(localHeader.buffer);
    u32(l, 0, 0x04034b50); u16(l, 4, 20); u16(l, 6, 0x0800);
    u32(l, 14, checksum); u32(l, 18, file.data.length); u32(l, 22, file.data.length);
    u16(l, 26, name.length); localHeader.set(name, 30);
    local.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + name.length);
    const c = new DataView(centralHeader.buffer);
    u32(c, 0, 0x02014b50); u16(c, 4, 20); u16(c, 6, 20); u16(c, 8, 0x0800);
    u32(c, 16, checksum); u32(c, 20, file.data.length); u32(c, 24, file.data.length);
    u16(c, 28, name.length); u32(c, 42, offset); centralHeader.set(name, 46);
    central.push(centralHeader);
    offset += localHeader.length + file.data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50); u16(e, 8, files.length); u16(e, 10, files.length);
  u32(e, 12, centralSize); u32(e, 16, offset);
  const parts = [...local, ...central, end].map(part => {
    const buffer = new ArrayBuffer(part.byteLength);
    new Uint8Array(buffer).set(part);
    return buffer;
  });
  return new Blob(parts, { type: 'application/zip' });
}
