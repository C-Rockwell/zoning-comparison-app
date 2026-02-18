import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../services/api'
import { isExperimentalMoveModeEnabled } from '../utils/featureFlags'

/**
 * Global keyboard shortcuts
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
 * - Ctrl/Cmd+S: Save project
 * - Delete/Backspace: Delete selected building
 * - M: Enter move mode (AutoCAD-style, district module only)
 * - Escape: Exit move mode / cancel move
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

      // Delete/Backspace: Delete selected building
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedBuildingType, activeEntityId, activeModule, deleteEntityBuilding } = useStore.getState()
        if (activeModule === 'district' && selectedBuildingType && activeEntityId) {
          e.preventDefault()
          deleteEntityBuilding(activeEntityId, selectedBuildingType)
          showToast?.(`${selectedBuildingType === 'principal' ? 'Principal' : 'Accessory'} building deleted`, 'info')
        }
        return
      }

      // M: Enter Move Mode (district module only)
      if ((e.key === 'm' || e.key === 'M') && !isMod) {
        const { activeModule, moveMode, enterMoveMode, setProjection, setCameraView } = useStore.getState()
        if (activeModule === 'district' && !moveMode?.active) {
          e.preventDefault()
          enterMoveMode()
          if (isExperimentalMoveModeEnabled()) {
            setProjection('orthographic')
            setCameraView('top')
          }
          showToast?.('Move mode: click an object to move', 'info')
        }
        return
      }

      // Escape: Exit Move Mode / cancel move
      if (e.key === 'Escape') {
        const { moveMode, exitMoveMode, setEntityBuildingPosition, setAnnotationPosition } = useStore.getState()
        if (moveMode?.active) {
          e.preventDefault()
          // Resume undo tracking before restoring so the restore is recorded cleanly
          useStore.temporal.getState().resume()
          // Restore original position if in 'moving' phase
          if (moveMode.phase === 'moving' && moveMode.originalPosition) {
            if (moveMode.targetType === 'building') {
              setEntityBuildingPosition(
                moveMode.targetLotId, moveMode.targetBuildingType,
                moveMode.originalPosition[0], moveMode.originalPosition[1]
              )
            } else if (moveMode.targetType === 'lotAccessArrow') {
              setAnnotationPosition(
                `lot-${moveMode.targetLotId}-access-${moveMode.targetDirection}`,
                moveMode.originalPosition
              )
            }
          }
          exitMoveMode()
          showToast?.('Move cancelled', 'info')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject, getProjectState, showToast])
}
