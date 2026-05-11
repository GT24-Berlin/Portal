type CaseFileLike = {
  id: string;
  title: string | null;
  filename: string;
  mimeType: string | null;
  category: string;
  visibility?: string | null;
  createdAt: Date;
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

export function findCaseGutachtenFile(files: CaseFileLike[]) {
  const sorted = [...files].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
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
