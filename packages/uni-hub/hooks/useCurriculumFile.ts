import { useCallback, useState } from 'react';
import type { ParsedCurriculumSheet } from '@core/types/timetable';
import { parseCurriculumWorkbook } from '@core/utils/curriculum';
import { readXlsxSheets } from '@uni-hub/utils/xlsx';

export type CurriculumFileStatus = 'idle' | 'reading' | 'ready' | 'empty' | 'error';

export interface CurriculumFileState {
  sheets: ParsedCurriculumSheet[];
  status: CurriculumFileStatus;
  readFile: (file: File | undefined) => Promise<ParsedCurriculumSheet[]>;
}

/** Reads an .xlsx curriculum in the browser; the file itself never leaves the device. */
export function useCurriculumFile(): CurriculumFileState {
  const [sheets, setSheets] = useState<ParsedCurriculumSheet[]>([]);
  const [status, setStatus] = useState<CurriculumFileStatus>('idle');

  const readFile = useCallback(async (file: File | undefined) => {
    if (!file) {
      setSheets([]);
      setStatus('idle');

      return [];
    }

    setStatus('reading');

    try {
      const parsed = parseCurriculumWorkbook(await readXlsxSheets(await file.arrayBuffer()));

      setSheets(parsed);
      setStatus(parsed.length > 0 ? 'ready' : 'empty');

      return parsed;
    } catch {
      setSheets([]);
      setStatus('error');

      return [];
    }
  }, []);

  return { sheets, status, readFile };
}
