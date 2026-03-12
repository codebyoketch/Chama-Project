import Dexie from 'dexie'

// This is your offline database — lives in the browser
// When internet is gone, all data saves here first
// When internet comes back, it syncs to Go backend

export const db = new Dexie('ChamaBookDB')

db.version(1).stores({
  // Local mirrors of backend data
  members:       '++id, groupId, email, name, role',
  contributions: '++id, userId, groupId, period, clientTempId, synced',
  loans:         '++id, userId, groupId, status, clientTempId, synced',
  repayments:    '++id, loanId, userId, clientTempId, synced',
  minutes:       '++id, groupId, meetingDate, clientTempId, synced',

  // Queue for operations done while offline
  // These get sent to Go backend when internet returns
  syncQueue:     '++id, resource, action, synced, createdAt',

  // Cache of last API responses (for reading while offline)
  cache:         'key',
})

// ── Helpers ─────────────────────────────────────────────────────────────────

// Save an API response to local cache
export const setCache = async (key, data) => {
  await db.cache.put({ key, data, cachedAt: new Date().toISOString() })
}

// Get cached data
export const getCache = async (key) => {
  const entry = await db.cache.get(key)
  return entry ? entry.data : null
}

// Add an operation to the sync queue (called when offline)
export const addToSyncQueue = async (resource, action, payload) => {
  await db.syncQueue.add({
    resource,              // 'contribution' | 'loan' | 'repayment' | 'minute'
    action,               // 'CREATE' | 'UPDATE' | 'DELETE'
    payload: JSON.stringify(payload),
    synced: false,
    createdAt: new Date().toISOString(),
  })
}

// Get all unsynced items
export const getUnsyncedItems = async () => {
  return db.syncQueue.where('synced').equals(0).toArray()
}

// Mark items as synced after successful upload
export const markAsSynced = async (id) => {
  await db.syncQueue.update(id, { synced: true, syncedAt: new Date().toISOString() })
}
