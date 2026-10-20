import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

// SecureStore is designed for small secrets. Chunk the serialized Supabase session
// so larger user/session payloads remain within conservative per-item limits.
const SECURE_CHUNK_SIZE = 800;
const chunkCountKey = (key: string) => `${key}.chunk-count`;
const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

const secureStorage = {
  async getItem(key: string) {
    const countValue = await SecureStore.getItemAsync(chunkCountKey(key));
    if (countValue) {
      const count = Number.parseInt(countValue, 10);
      if (!Number.isFinite(count) || count < 1 || count > 100) return null;
      const chunks = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))));
      if (chunks.some(chunk => chunk === null)) return null;
      return (chunks as string[]).join('');
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (value.length <= SECURE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      const oldCount = Number.parseInt((await SecureStore.getItemAsync(chunkCountKey(key))) || '0', 10);
      await SecureStore.deleteItemAsync(chunkCountKey(key)).catch(() => undefined);
      if (Number.isFinite(oldCount)) {
        for (let i = 0; i < Math.min(oldCount, 100); i++) await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => undefined);
      }
      return;
    }
    const chunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += SECURE_CHUNK_SIZE) chunks.push(value.slice(offset, offset + SECURE_CHUNK_SIZE));
    const oldCount = Number.parseInt((await SecureStore.getItemAsync(chunkCountKey(key))) || '0', 10);
    for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
    if (Number.isFinite(oldCount)) {
      for (let i = chunks.length; i < Math.min(oldCount, 100); i++) await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => undefined);
    }
  },
  async removeItem(key: string) {
    const count = Number.parseInt((await SecureStore.getItemAsync(chunkCountKey(key))) || '0', 10);
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
    await SecureStore.deleteItemAsync(chunkCountKey(key)).catch(() => undefined);
    if (Number.isFinite(count)) {
      for (let i = 0; i < Math.min(count, 100); i++) await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => undefined);
    }
  },
};

/**
 * Supabase is deliberately optional during local UI development.
 * Only the public/publishable client key belongs in this app; never use a service-role key.
 */
export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, publishableKey as string, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function getSupabaseSetupMessage() {
  return 'WAVES is running in local demo mode. Add your Supabase URL and publishable key to the app .env file after the database schema and Row Level Security policies are ready.';
}
