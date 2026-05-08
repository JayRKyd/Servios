import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import type { SupportedStorage } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase requires keys to be ≤ 2048 bytes for SecureStore.
 * Keys longer than that are base64-encoded and truncated to a safe identifier.
 */
function toSecureKey(key: string): string {
  // SecureStore keys must match /^[a-zA-Z0-9._-]+$/ and be ≤ 255 chars
  return key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
}

const ExpoSecureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(toSecureKey(key)),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(toSecureKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(toSecureKey(key)),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
