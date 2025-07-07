import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "X-Client-Info": "vristo-dashboard",
    },
  },
})

// Helper functions for common operations
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: {
    cacheControl?: string
    upsert?: boolean
  },
) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options?.cacheControl || "3600",
    upsert: options?.upsert || false,
  })

  if (error) throw error
  return data
}

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

// Real-time subscriptions helper
export const subscribeToTable = (table: string, callback: (payload: any) => void, filter?: string) => {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: table,
        filter: filter,
      },
      callback,
    )
    .subscribe()

  return channel
}

export default supabase
