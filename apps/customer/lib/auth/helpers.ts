'use client'

import { createClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function requireAuth(redirectTo = '/login') {
  const user = await getCurrentUser()
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo
    }
    return null
  }
  return user
}
