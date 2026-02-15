import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../services/api'

/**
 * Global keyboard shortcuts
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
 * - Ctrl/Cmd+S: Save project
 * - Delete/Backspace: Delete selected entity (if applicable)
 */
export function useKeyboardShortcuts() {
  const currentProject = useStore(state => state.currentProject)
  const getProjectState = useStore(state => state.getProjectState)
  const showToast = useStore(state => state.showToast)

  useEffect(() => {
    const handleKeyDown = async (e) => {
      const isMod = e.metaKey || e.ctrlKey

      // Don't intercept if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return
      }

      // Ctrl/Cmd+Z: Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const { undo } = useStore.temporal.getState()
        undo?.()
        return
      }

      // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault()
        const { redo } = useStore.temporal.getState()
        redo?.()
        return
      }

      // Ctrl/Cmd+S: Save
      if (isMod && e.key === 's') {
        e.preventDefault()
        if (!currentProject) {
          showToast?.('No project open — use Sandbox or create a project to save', 'info')
          return
        }
        try {
          const state = getProjectState()
          await api.updateProject(currentProject.id, { state })
          showToast?.('Project saved', 'success')
        } catch (err) {
          showToast?.(`Save failed: ${err.message}`, 'error')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject, getProjectState, showToast])
}
