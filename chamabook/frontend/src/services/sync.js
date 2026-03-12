import api from './api'
import { getUnsyncedItems, markAsSynced } from '../db/localDB'

// Called when app comes back online
export const syncOfflineData = async () => {
  const items = await getUnsyncedItems()
  if (items.length === 0) return { synced: 0 }

  console.log(`🔄 Syncing ${items.length} offline item(s)...`)
  let syncedCount = 0

  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload)

      // Route each queued item to the right API endpoint
      if (item.resource === 'contribution' && item.action === 'CREATE') {
        await api.post('/contributions', payload)
      } else if (item.resource === 'loan' && item.action === 'CREATE') {
        await api.post('/loans', payload)
      } else if (item.resource === 'repayment' && item.action === 'CREATE') {
        await api.post('/loans/repayment', payload)
      } else if (item.resource === 'minute' && item.action === 'CREATE') {
        await api.post('/minutes', payload)
      } else if (item.resource === 'minute' && item.action === 'UPDATE') {
        await api.put(`/minutes/${payload.id}`, payload)
      }

      await markAsSynced(item.id)
      syncedCount++
    } catch (err) {
      console.error(`Failed to sync item ${item.id}:`, err)
      // Don't mark as synced — will retry next time
    }
  }

  console.log(`✅ Synced ${syncedCount}/${items.length} items`)
  return { synced: syncedCount, total: items.length }
}

// Listen for browser coming back online and auto-sync
export const startSyncListener = () => {
  window.addEventListener('online', async () => {
    console.log('🌐 Back online! Starting sync...')
    try {
      const result = await syncOfflineData()
      if (result.synced > 0) {
        // You can dispatch a toast notification here
        window.dispatchEvent(new CustomEvent('syncComplete', { detail: result }))
      }
    } catch (err) {
      console.error('Sync failed:', err)
    }
  })
}

export const isOnline = () => navigator.onLine
