export type SignedUpload = {
  method: 'PUT';
  signedUploadUrl: string;
  headers: Record<string, string>;
};

export abstract class ObjectStorage {
  abstract readTemporary(
    key: string,
    maxBytes: number,
  ): Promise<{
    bytes: Buffer;
    contentType: string;
  }>;

  abstract putFinal(
    key: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<void>;

  abstract deleteObject(key: string): Promise<void>;

  abstract createPresignedUpload(input: {
    key: string;
    contentType: string;
    expectedBytes: number;
    expiresAt: Date;
    now: Date;
  }): Promise<SignedUpload>;

  abstract createPresignedDownload(key: string): Promise<string>;
}
