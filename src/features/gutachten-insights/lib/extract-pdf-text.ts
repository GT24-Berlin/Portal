import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

type PdfJsWorkerModule =
  typeof import('pdfjs-dist/legacy/build/pdf.worker.mjs');
type PdfJsGlobal = typeof globalThis & {
  pdfjsWorker?: {
    WorkerMessageHandler?: PdfJsWorkerModule['WorkerMessageHandler'];
  };
};

let pdfWorkerSetupPromise: Promise<void> | null = null;

function sanitizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function ensurePdfWorkerMessageHandler() {
  const pdfGlobal = globalThis as PdfJsGlobal;

  if (pdfGlobal.pdfjsWorker?.WorkerMessageHandler) {
    return;
  }

  if (!pdfWorkerSetupPromise) {
    pdfWorkerSetupPromise = import(
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
    ).then((module: PdfJsWorkerModule) => {
      (globalThis as PdfJsGlobal).pdfjsWorker = {
        WorkerMessageHandler: module.WorkerMessageHandler
      };
    });
  }

  await pdfWorkerSetupPromise;
}

export async function extractPdfTextFromBuffer(
  buffer: Buffer
): Promise<string> {
  try {
    await ensurePdfWorkerMessageHandler();

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: pdfjs.VerbosityLevel.ERRORS
    });

    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => {
            if (typeof item === 'object' && item !== null && 'str' in item) {
              return String((item as { str?: string }).str ?? '');
            }

            return '';
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText) {
          pageTexts.push(pageText);
        }

        page.cleanup?.();
      }
    } finally {
      await doc.destroy?.();
    }

    return sanitizeExtractedText(pageTexts.join('\n\n'));
  } catch (error) {
    console.warn('[gutachten] pdf text extraction degraded', {
      message: error instanceof Error ? error.message : String(error)
    });
    return '';
  }
}
