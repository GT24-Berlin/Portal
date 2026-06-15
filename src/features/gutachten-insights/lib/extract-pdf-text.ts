import 'server-only';
import path from 'path';

// pdfjs-dist v5 requires DOMMatrix as a global.
// Vercel's Node.js runtime does not expose it, so we install a minimal
// 2-D affine-matrix polyfill that covers every method pdfjs uses during
// text-content extraction.
function ensureDOMMatrix() {
  if (typeof (globalThis as any).DOMMatrix !== 'undefined') return;

  class MinimalDOMMatrix {
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    is2D: boolean;
    isIdentity: boolean;

    constructor(init?: number[]) {
      this.m11 = 1;
      this.m12 = 0;
      this.m13 = 0;
      this.m14 = 0;
      this.m21 = 0;
      this.m22 = 1;
      this.m23 = 0;
      this.m24 = 0;
      this.m31 = 0;
      this.m32 = 0;
      this.m33 = 1;
      this.m34 = 0;
      this.m41 = 0;
      this.m42 = 0;
      this.m43 = 0;
      this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;

      if (Array.isArray(init) && init.length === 6) {
        this.m11 = init[0];
        this.m12 = init[1];
        this.m21 = init[2];
        this.m22 = init[3];
        this.m41 = init[4];
        this.m42 = init[5];
        this.isIdentity =
          init[0] === 1 &&
          init[1] === 0 &&
          init[2] === 0 &&
          init[3] === 1 &&
          init[4] === 0 &&
          init[5] === 0;
      } else if (Array.isArray(init) && init.length === 16) {
        [
          this.m11,
          this.m12,
          this.m13,
          this.m14,
          this.m21,
          this.m22,
          this.m23,
          this.m24,
          this.m31,
          this.m32,
          this.m33,
          this.m34,
          this.m41,
          this.m42,
          this.m43,
          this.m44
        ] = init;
        this.isIdentity = false;
      }

      this.a = this.m11;
      this.b = this.m12;
      this.c = this.m21;
      this.d = this.m22;
      this.e = this.m41;
      this.f = this.m42;
    }

    multiply(o: MinimalDOMMatrix): MinimalDOMMatrix {
      return new MinimalDOMMatrix([
        this.m11 * o.m11 + this.m12 * o.m21,
        this.m11 * o.m12 + this.m12 * o.m22,
        this.m21 * o.m11 + this.m22 * o.m21,
        this.m21 * o.m12 + this.m22 * o.m22,
        this.m41 * o.m11 + this.m42 * o.m21 + o.m41,
        this.m41 * o.m12 + this.m42 * o.m22 + o.m42
      ]);
    }

    inverse(): MinimalDOMMatrix {
      const det = this.m11 * this.m22 - this.m12 * this.m21;
      if (Math.abs(det) < 1e-10) return new MinimalDOMMatrix();
      return new MinimalDOMMatrix([
        this.m22 / det,
        -this.m12 / det,
        -this.m21 / det,
        this.m11 / det,
        (this.m21 * this.m42 - this.m22 * this.m41) / det,
        (this.m12 * this.m41 - this.m11 * this.m42) / det
      ]);
    }

    transformPoint(p: { x: number; y: number }): { x: number; y: number } {
      return {
        x: this.m11 * p.x + this.m21 * p.y + this.m41,
        y: this.m12 * p.x + this.m22 * p.y + this.m42
      };
    }

    scale(sx: number = 1, sy: number = sx): MinimalDOMMatrix {
      return new MinimalDOMMatrix([
        this.m11 * sx,
        this.m12 * sy,
        this.m21 * sx,
        this.m22 * sy,
        this.m41,
        this.m42
      ]);
    }

    translate(tx: number, ty: number): MinimalDOMMatrix {
      return new MinimalDOMMatrix([
        this.m11,
        this.m12,
        this.m21,
        this.m22,
        this.m41 + tx * this.m11 + ty * this.m21,
        this.m42 + tx * this.m12 + ty * this.m22
      ]);
    }

    static fromMatrix(o: Partial<MinimalDOMMatrix>): MinimalDOMMatrix {
      return new MinimalDOMMatrix([
        o.m11 ?? 1,
        o.m12 ?? 0,
        o.m21 ?? 0,
        o.m22 ?? 1,
        o.m41 ?? 0,
        o.m42 ?? 0
      ]);
    }

    static fromFloat32Array(a: Float32Array): MinimalDOMMatrix {
      return new MinimalDOMMatrix(Array.from(a));
    }

    static fromFloat64Array(a: Float64Array): MinimalDOMMatrix {
      return new MinimalDOMMatrix(Array.from(a));
    }
  }

  (globalThis as any).DOMMatrix = MinimalDOMMatrix;
}

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
  ensureDOMMatrix();

  // We import pdfjs-dist directly (not via pdf-parse) so that
  // serverExternalPackages can keep it out of the Next.js bundle.
  // When not bundled, pdfjs resolves pdf.worker.mjs relative to its own
  // location in node_modules — the path is always correct.
  // As a belt-and-suspenders fallback we also set an absolute workerSrc so
  // that even if Turbopack does bundle pdfjs the runtime import() targets
  // the real file in /var/task/node_modules on Vercel.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // The build script copies pdf.worker.mjs into .next/server/chunks/ so it
  // is always present inside /var/task on Vercel, regardless of whether
  // Turbopack externalises pdfjs-dist or not.
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(
    process.cwd(),
    '.next/server/chunks/pdf.worker.mjs'
  );

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0
  }).promise;

  const pageTexts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join(' ');
    pageTexts.push(pageText);
    page.cleanup();
  }
  await doc.destroy();

  return sanitizeExtractedText(pageTexts.join('\n'));
}
