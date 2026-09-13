// fetch côté client avec le jeton de session Supabase (Authorization: Bearer …)
import { supabase } from './supabase'

export async function authFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(input, { ...init, headers })
}

export function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
