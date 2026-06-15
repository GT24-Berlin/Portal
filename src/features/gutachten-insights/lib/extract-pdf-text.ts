import 'server-only';

function sanitizeExtractedText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfTextFromBuffer(
  buffer: Buffer
): Promise<string> {
  // Propagate errors so process-case-file.ts can surface the real message
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = String(result?.text ?? '');
  return sanitizeExtractedText(text);
}
