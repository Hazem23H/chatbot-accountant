'use client'

import { useState, useEffect, useCallback } from 'react'
import { listClients, type Client, type WorkspaceId } from '@/lib/clients'

/** Tracks the active workspace (General or a specific client), persisted in
 *  localStorage and shared across pages. `clientId === null` means General. */
export function useWorkspace() {
  const [clientId, setClientId] = useState<WorkspaceId>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [ready, setReady] = useState(false)

  const refreshClients = useCallback(async () => {
    const list = await listClients()
    setClients(list)
    return list
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('mahasib_client')
    const initial = stored && stored !== 'general' ? stored : null
    setClientId(initial)
    refreshClients().then((list) => {
      // Stored client was deleted elsewhere — fall back to General.
      if (initial && !list.some((c) => c.id === initial)) {
        setClientId(null)
        localStorage.setItem('mahasib_client', 'general')
      }
      setReady(true)
    })
  }, [refreshClients])

  const selectWorkspace = useCallback((id: WorkspaceId) => {
    setClientId(id)
    localStorage.setItem('mahasib_client', id ?? 'general')
  }, [])

  return { clientId, clients, ready, selectWorkspace, refreshClients }
}
