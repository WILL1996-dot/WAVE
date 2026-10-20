import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from './supabase';

export const WAVES_MEDIA_BUCKET = 'waves-post-media';
export const MAX_WAVES_IMAGE_BYTES = 8 * 1024 * 1024;

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const extensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export type WavesImagePurpose = 'profiles' | 'posts' | 'stories' | 'messages' | 'creator';

/** Upload one picked image to the private WAVES Storage bucket. */
export async function uploadPrivateImage(
  asset: Pick<ImagePickerAsset, 'uri' | 'fileSize' | 'mimeType'>,
  userId: string,
  purpose: WavesImagePurpose,
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!userId) throw new Error('You must be signed in to upload an image.');

  const file = new File(asset.uri);
  const fileSize = asset.fileSize ?? file.size;
  if (!fileSize || fileSize > MAX_WAVES_IMAGE_BYTES) {
    throw new Error('Please choose an image smaller than 8 MB.');
  }

  const mimeType = (asset.mimeType || file.type || 'image/jpeg').toLowerCase();
  if (!allowedImageTypes.has(mimeType)) {
    throw new Error('Unsupported image format. Choose JPEG, PNG, WebP, HEIC or HEIF.');
  }

  const extension = extensionByType[mimeType];
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const path = `${userId}/${purpose}/${fileName}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(WAVES_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/** Get a time-limited URL for a private image after Storage policies authorize it. */
export async function getPrivateImageSource(
  path: string | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<{ uri: string } | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage
    .from(WAVES_MEDIA_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return { uri: data.signedUrl };
}

/** Delete a path only if its first folder belongs to the supplied user. */
export async function removeOwnPrivateImage(
  path: string | null | undefined,
  userId: string,
): Promise<void> {
  if (!supabase || !path || !userId || !path.startsWith(`${userId}/`)) return;
  const { error } = await supabase.storage.from(WAVES_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
