export type PutStoredFileInput = {
  file: File;
  folder?: string;
};

export type PutStoredFileResult = {
  storageKey: string;
  size: number;
  mimeType: string;
  originalFilename: string;
};

export type OpenStoredFileResult = {
  body: ReadableStream<Uint8Array>;
  size?: number;
};

export interface StorageProvider {
  put(input: PutStoredFileInput): Promise<PutStoredFileResult>;
  open(storageKey: string): Promise<OpenStoredFileResult>;
  readBuffer(storageKey: string): Promise<Buffer>;
}
