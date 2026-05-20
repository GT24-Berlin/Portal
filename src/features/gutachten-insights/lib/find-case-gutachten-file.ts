type CaseFileLike = {
  id: string;
  title: string | null;
  filename: string;
  mimeType: string | null;
  category: string;
  visibility?: string | null;
  createdAt: Date;
  documentType?: string | null;
  classificationStatus?: string | null;
  classificationConfidence?: string | null;
};

function includesGutachten(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .includes('gutachten');
}

function isPdfMime(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .includes('pdf');
}

function isClassifiedMainGutachten(file: CaseFileLike) {
  return (
    file.documentType === 'GUTACHTEN_MAIN' &&
    file.classificationStatus === 'CLASSIFIED' &&
    file.classificationConfidence !== 'LOW'
  );
}

export function findCaseGutachtenFile(files: CaseFileLike[]) {
  const sorted = [...files].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    sorted.find((f) => isClassifiedMainGutachten(f)) ??
    sorted.find(
      (f) =>
        includesGutachten(f.title) &&
        (includesGutachten(f.filename) || isPdfMime(f.mimeType))
    ) ??
    sorted.find(
      (f) => includesGutachten(f.filename) && isPdfMime(f.mimeType)
    ) ??
    sorted.find(
      (f) =>
        String(f.category) === 'REPORT' &&
        (includesGutachten(f.title) || includesGutachten(f.filename))
    ) ??
    null
  );
}
