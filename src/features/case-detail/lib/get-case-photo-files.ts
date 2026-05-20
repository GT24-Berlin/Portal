type CaseFileLike = {
  id: string;
  title?: string | null;
  filename: string;
  mimeType?: string | null;
  size?: number | null;
  createdAt: Date | string;
};

function isImageMime(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .startsWith('image/');
}

export function getCasePhotoFiles<T extends CaseFileLike>(files: T[]) {
  return files.filter((file) => isImageMime(file.mimeType));
}
