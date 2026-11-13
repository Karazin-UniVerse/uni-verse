import { describe, expect, it } from 'vitest';
import { readXlsxSheets } from './xlsx';

type ZipFile = { name: string; content: string; deflate?: boolean };

const deflateRaw = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([bytes.slice()])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** Builds a minimal ZIP archive; the reader does not check CRCs, so they stay zero. */
const buildZip = async (files: ZipFile[]): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const raw = encoder.encode(file.content);
    const data = file.deflate ? await deflateRaw(raw) : raw;
    const method = file.deflate ? 8 : 0;
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, method, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, raw.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, raw.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralSize = centrals.reduce((total, entry) => total + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...locals, ...centrals, end].map((part) => part.slice())).arrayBuffer();
};

const WORKBOOK = `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="1курс" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const RELATIONS = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

const SHARED_STRINGS = `<sst><si><t>Освітні компоненти</t></si><si><r><t>Бази </t></r><r><t>даних &amp; SQL</t></r></si></sst>`;

const SHEET = `<worksheet><sheetData>
  <row r="2"><c r="B2" t="s"><v>0</v></c><c r="AB2" t="inlineStr"><is><t>лекції</t></is></c></row>
  <row r="3"><c r="B3" t="s"><v>1</v></c><c r="AB3"><f>SUM(A1)</f><v>32</v></c><c r="C3"/></row>
</sheetData></worksheet>`;

describe('readXlsxSheets', () => {
  it('reads shared, inline and cached formula values at their cell positions', async () => {
    const buffer = await buildZip([
      { name: 'xl/workbook.xml', content: WORKBOOK },
      { name: 'xl/_rels/workbook.xml.rels', content: RELATIONS },
      { name: 'xl/sharedStrings.xml', content: SHARED_STRINGS, deflate: true },
      { name: 'xl/worksheets/sheet1.xml', content: SHEET, deflate: true },
    ]);

    const [sheet] = await readXlsxSheets(buffer);

    expect(sheet.name).toBe('1курс');
    expect(sheet.grid[0]).toEqual([]);
    expect(sheet.grid[1][1]).toBe('Освітні компоненти');
    expect(sheet.grid[1][27]).toBe('лекції');
    expect(sheet.grid[2][1]).toBe('Бази даних & SQL');
    expect(sheet.grid[2][27]).toBe('32');
    expect(sheet.grid[2][2]).toBe('');
  });

  it('rejects files that are not zip archives', async () => {
    await expect(readXlsxSheets(new TextEncoder().encode('plain text').buffer)).rejects.toThrow(
      'Not an .xlsx file',
    );
  });
});
