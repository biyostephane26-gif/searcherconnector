'use client'

import { useSyncExternalStore } from 'react'

// =================================================================
// Store minimal partagé entre Navbar (bouton hamburger) et Sidebar
// (le tiroir mobile) — ces deux composants sont rendus comme frères
// séparés sur ~20 pages, pas emboîtés dans un layout commun, donc un
// Context React demanderait de toucher chaque page. Un external store
// évite ce refactor.
// =================================================================

let open = false
const listeners = new Set<() => void>()

function emit() { listeners.forEach(l => l()) }
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function getSnapshot() { return open }
function getServerSnapshot() { return false }

export function toggleMobileSidebar() { open = !open; emit() }
export function closeMobileSidebar() { if (open) { open = false; emit() } }
export function openMobileSidebar() { if (!open) { open = true; emit() } }

export function useMobileSidebar() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
