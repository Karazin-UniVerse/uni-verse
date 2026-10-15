import type { SubmissionStatus, UploadedFile } from '@core/types/moodle';

export function extractUploadedItemId(uploaded: UploadedFile[] | undefined): number | undefined {
  return Array.isArray(uploaded) && uploaded.length > 0 ? uploaded[0].itemid : undefined;
}

export function canSubmitAssignment(status: Pick<SubmissionStatus, 'status'> | undefined): boolean {
  return !status || status.status === 'new' || status.status === 'draft';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file as data URL'));
  });
}
