import type { SpreadsheetSheet } from '@core/types/timetable';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

type ZipEntry = {
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodeXml = (value: string): string =>
  value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return XML_ENTITIES[entity] ?? match;
  });

const readAttributes = (source: string): Record<string, string> => {
  const attributes: Record<string, string> = {};

  for (const [, name, value] of source.matchAll(/([\w:]+)="([^"]*)"/g)) {
    attributes[name] = decodeXml(value);
  }

  return attributes;
};

const readTexts = (source: string): string =>
  [...source.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)]
    .map(([, text]) => decodeXml(text))
    .join('');

const columnIndex = (reference: string): number => {
  const letters = /^[A-Z]+/.exec(reference)?.[0] ?? 'A';

  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

const readZipEntries = (view: DataView): Map<string, ZipEntry> => {
  let end = -1;

  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      end = offset;
      break;
    }
  }

  if (end < 0) {
    throw new Error('Not an .xlsx file');
  }

  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new Error('Corrupted .xlsx file');
    }

    const nameLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(
      new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLength),
    );

    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset +=
      46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }

  return entries;
};

const readZipText = async (
  view: DataView,
  entries: Map<string, ZipEntry>,
  name: string,
): Promise<string | null> => {
  const entry = entries.get(name);

  if (!entry) {
    return null;
  }

  if (entry.uncompressedSize > MAX_UNCOMPRESSED_BYTES) {
    throw new Error('The .xlsx file is too large');
  }

  const { localOffset } = entry;

  if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER) {
    throw new Error('Corrupted .xlsx file');
  }

  const dataStart =
    localOffset +
    30 +
    view.getUint16(localOffset + 26, true) +
    view.getUint16(localOffset + 28, true);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + dataStart, entry.compressedSize);

  if (entry.method === METHOD_STORED) {
    return new TextDecoder().decode(bytes);
  }

  if (entry.method !== METHOD_DEFLATE) {
    throw new Error('Unsupported .xlsx compression');
  }

  const stream = new Blob([bytes.slice()])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));

  return new Response(stream).text();
};

const parseSheet = (xml: string, sharedStrings: string[]): string[][] => {
  const grid: string[][] = [];

  for (const [, rawAttributes, body = ''] of xml.matchAll(
    /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g,
  )) {
    const attributes = readAttributes(rawAttributes);
    const reference = attributes.r;

    if (!reference) {
      continue;
    }

    const rawValue = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
    let value = '';

    if (attributes.t === 's' && rawValue !== undefined) {
      value = sharedStrings[Number(rawValue)] ?? '';
    } else if (attributes.t === 'inlineStr') {
      value = readTexts(body);
    } else if (rawValue !== undefined) {
      value = decodeXml(rawValue);
    }

    if (!value.trim()) {
      continue;
    }

    const row = Number(/\d+$/.exec(reference)?.[0]) - 1;
    const col = columnIndex(reference);

    grid[row] ??= [];
    grid[row][col] = value;
  }

  return Array.from(grid, (cells) => Array.from(cells ?? [], (cell) => cell ?? ''));
};

/** Reads cell text of every worksheet; formulas give their cached values. */
export async function readXlsxSheets(buffer: ArrayBuffer): Promise<SpreadsheetSheet[]> {
  const view = new DataView(buffer);
  const entries = readZipEntries(view);
  const workbook = await readZipText(view, entries, 'xl/workbook.xml');
  const relations = await readZipText(view, entries, 'xl/_rels/workbook.xml.rels');

  if (!workbook || !relations) {
    throw new Error('Not an .xlsx file');
  }

  const sharedStringsXml = await readZipText(view, entries, 'xl/sharedStrings.xml');
  const sharedStrings = [
    ...(sharedStringsXml ?? '').matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g),
  ].map(([, item]) => readTexts(item));
  const targets = new Map(
    [...relations.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g)].map(([, raw]) => {
      const attributes = readAttributes(raw);

      return [attributes.Id, attributes.Target] as const;
    }),
  );
  const sheets: SpreadsheetSheet[] = [];

  for (const [, raw] of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/?>/g)) {
    const attributes = readAttributes(raw);
    const target = targets.get(attributes['r:id'] ?? '');

    if (!target) {
      continue;
    }

    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const xml = await readZipText(view, entries, path);

    if (xml) {
      sheets.push({ name: attributes.name ?? path, grid: parseSheet(xml, sharedStrings) });
    }
  }

  return sheets;
}
