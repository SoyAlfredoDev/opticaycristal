export const COMMITMENT_UPLOAD_BYTES = 3 * 1024 * 1024;
export const COMMITMENT_UPLOAD_FILES = 4;
export type SaleCommitmentFile = {
  source: "upload" | "signed";
  uploadedBy: string;
  uploadedAt: string;
  pages?: number;
};
