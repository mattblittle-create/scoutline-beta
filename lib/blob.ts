// lib/blob.ts
import { put } from "@vercel/blob";

export async function uploadToBlob(opts: {
  file: File | Buffer;
  filename: string;
  contentType: string;
}) {
  // @vercel/blob uses a token from env automatically (BLOB_READ_WRITE_TOKEN)
  const res = await put(opts.filename, opts.file as any, {
    access: "public",
    contentType: opts.contentType,
  });
  return res.url; // public URL
}
