import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a short-lived signed URL for a private storage object.
 * All CRM buckets are private — never use getPublicUrl for them.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error(`[storage] signed URL failed for ${bucket}/${path}:`, error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Extract the object path from a full Supabase storage URL.
 * Handles both public and signed URL shapes.
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const tail = url.slice(idx + marker.length);
  return tail.split("?")[0];
}

/**
 * Convenience: upload a file then return a signed URL good for the given window.
 */
export async function uploadAndSign(
  bucket: string,
  path: string,
  file: File,
  expiresInSeconds = 3600
): Promise<{ path: string; signedUrl: string | null } | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) {
    console.error(`[storage] upload failed for ${bucket}/${path}:`, error);
    return null;
  }
  const signedUrl = await getSignedUrl(bucket, path, expiresInSeconds);
  return { path, signedUrl };
}
