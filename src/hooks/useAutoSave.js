import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../services/api'

/**
 * Hook that periodically saves the current project if auto-save is enabled
 * and there are unsaved changes.
 */
export function useAutoSave() {
  const autoSave = useStore(state => state.autoSave)
  const currentProject = useStore(state => state.currentProject)
  const getProjectState = useStore(state => state.getProjectState)
  const markSaved = useStore(state => state.markSaved)
  const showToast = useStore(state => state.showToast)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!autoSave.enabled || !currentProject) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(async () => {
      if (!autoSave.isDirty) return

      try {
        const state = getProjectState()
        await api.updateProject(currentProject.id, { state })
        markSaved()
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, autoSave.intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoSave.enabled, autoSave.intervalMs, autoSave.isDirty, currentProject, getProjectState, markSaved, showToast])
}
