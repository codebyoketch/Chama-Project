import { useState, useEffect } from 'react'
import { getUnsyncedItems } from '../db/localDB'

// Hook to track online/offline status + pending sync count
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check pending sync count
  useEffect(() => {
    const check = async () => {
      const items = await getUnsyncedItems()
      setPendingSync(items.length)
    }
    check()
    const interval = setInterval(check, 10000) // check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  return { isOnline, pendingSync }
}
