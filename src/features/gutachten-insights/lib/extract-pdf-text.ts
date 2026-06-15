import 'server-only';

// pdf2json v4 bundles its own copy of pdf.js with NO separate worker file.
// It is a pure Node.js library — no DOMMatrix, no dynamic import of a
// companion worker, and nothing that Turbopack's file tracer can miss.
// This makes it the correct choice for Vercel Lambda where the previous
// pdfjs-dist v5 approach (pdf.mjs + dynamically-loaded pdf.worker.mjs)
// was fundamentally incompatible with Turbopack bundling.

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
  const { default: PDFParser } = await import('pdf2json');

  return new Promise<string>((resolve, reject) => {
    // Second argument `true` = suppress console output from pdf2json internals
    const parser = new PDFParser(null, true);

    parser.on('pdfParser_dataReady', (data: any) => {
      try {
        const text = (data?.Pages ?? [])
          .flatMap((page: any) => page?.Texts ?? [])
          .map((t: any) =>
            (t?.R ?? [])
              .map((r: any) => decodeURIComponent(r?.T ?? ''))
              .join('')
          )
          .join(' ');
        resolve(sanitizeExtractedText(text));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    parser.on('pdfParser_dataError', (errData: any) => {
      reject(
        new Error(
          String(errData?.parserError ?? errData ?? 'pdf2json parse error')
        )
      );
    });

    parser.parseBuffer(buffer);
  });
}
