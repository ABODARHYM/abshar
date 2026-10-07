'use client'

import { createClient } from '../supabase/client'

export async function getCurrentDriver() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: driver } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return driver
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
