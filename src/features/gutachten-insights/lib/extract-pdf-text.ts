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
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = String(result?.text ?? '');
    return sanitizeExtractedText(text);
  } catch (error) {
    console.warn('[gutachten] pdf text extraction degraded', {
      message: error instanceof Error ? error.message : String(error)
    });
    return '';
  }
}
