import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../services/api'
import { Camera, Layers, Save, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react'

const StateManager = () => {
  const currentProject = useStore((state) => state.currentProject)
  const snapshots = useStore((state) => state.snapshots)
  const layerStates = useStore((state) => state.layerStates)
  const setSnapshots = useStore((state) => state.setSnapshots)
  const setLayerStates = useStore((state) => state.setLayerStates)
  const getSnapshotData = useStore((state) => state.getSnapshotData)
  const getLayerStateData = useStore((state) => state.getLayerStateData)
  const applySnapshot = useStore((state) => state.applySnapshot)
  const applyLayerState = useStore((state) => state.applyLayerState)

  const [activeTab, setActiveTab] = useState('snapshots')
  const [isExpanded, setIsExpanded] = useState(true)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveType, setSaveType] = useState('snapshot') // 'snapshot' or 'layer-state'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load snapshots and layer states when project changes
  useEffect(() => {
    const loadStates = async () => {
      if (!currentProject) {
        setSnapshots([])
        setLayerStates([])
        return
      }

      try {
        const [snapshotsList, layerStatesList] = await Promise.all([
          api.listSnapshots(currentProject.id),
          api.listLayerStates(currentProject.id)
        ])
        setSnapshots(snapshotsList)
        setLayerStates(layerStatesList)
      } catch (err) {
        console.error('Failed to load states:', err)
      }
    }

    loadStates()
  }, [currentProject, setSnapshots, setLayerStates])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!currentProject || !saveName.trim()) return

    setError('')
    setLoading(true)

    try {
      if (saveType === 'snapshot') {
        const data = getSnapshotData()
        await api.saveSnapshot(currentProject.id, saveName, data)
        // Refresh list
        const list = await api.listSnapshots(currentProject.id)
        setSnapshots(list)
      } else {
        const data = getLayerStateData()
        await api.saveLayerState(currentProject.id, saveName, data)
        // Refresh list
        const list = await api.listLayerStates(currentProject.id)
        setLayerStates(list)
      }
      setShowSaveModal(false)
      setSaveName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSnapshot = async (snapshot) => {
    if (!currentProject) return
    setLoading(true)

    try {
      const data = await api.loadSnapshot(currentProject.id, snapshot.filename)
      applySnapshot(data)
    } catch (err) {
      console.error('Failed to load snapshot:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadLayerState = async (layerState) => {
    if (!currentProject) return
    setLoading(true)

    try {
      const data = await api.loadLayerState(currentProject.id, layerState.filename)
      applyLayerState(data)
    } catch (err) {
      console.error('Failed to load layer state:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSnapshot = async (snapshot) => {
    if (!currentProject || !confirm(`Delete "${snapshot.name}"?`)) return

    try {
      await api.deleteSnapshot(currentProject.id, snapshot.filename)
      const list = await api.listSnapshots(currentProject.id)
      setSnapshots(list)
    } catch (err) {
      console.error('Failed to delete snapshot:', err)
    }
  }

  const handleDeleteLayerState = async (layerState) => {
    if (!currentProject || !confirm(`Delete "${layerState.name}"?`)) return

    try {
      await api.deleteLayerState(currentProject.id, layerState.filename)
      const list = await api.listLayerStates(currentProject.id)
      setLayerStates(list)
    } catch (err) {
      console.error('Failed to delete layer state:', err)
    }
  }

  const openSaveModal = (type) => {
    setSaveType(type)
    setSaveName('')
    setError('')
    setShowSaveModal(true)
  }

  if (!currentProject) return null

  return (
    <>
      <div className="rounded mb-4" style={{ backgroundColor: 'var(--ui-bg-secondary-50)' }}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3"
        >
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ui-text-secondary)' }}>
            Views
          </h3>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3">
            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setActiveTab('snapshots')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === 'snapshots' ? 'var(--ui-accent)' : 'var(--ui-border)',
                  color: activeTab === 'snapshots' ? '#fff' : 'var(--ui-text-secondary)',
                }}
              >
                <Camera size={14} />
                Views
              </button>
              <button
                onClick={() => setActiveTab('layer-states')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === 'layer-states' ? 'var(--ui-accent)' : 'var(--ui-border)',
                  color: activeTab === 'layer-states' ? '#fff' : 'var(--ui-text-secondary)',
                }}
              >
                <Layers size={14} />
                Layer States
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'snapshots' ? (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
                  Full state including camera position
                </p>
                <button
                  onClick={() => openSaveModal('snapshot')}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded text-sm mb-2 transition-colors hover-bg-secondary"
                  style={{ backgroundColor: 'var(--ui-border)', color: 'var(--ui-text-primary)' }}
                >
                  <Save size={14} />
                  Save View
                </button>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {snapshots.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--ui-text-muted)' }}>No views</p>
                  ) : (
                    snapshots.map((snapshot) => (
                      <div
                        key={snapshot.filename}
                        className="flex items-center gap-1 rounded px-2 py-1.5 group"
                        style={{ backgroundColor: 'var(--ui-bg-secondary-50)' }}
                      >
                        <button
                          onClick={() => handleLoadSnapshot(snapshot)}
                          disabled={loading}
                          className="flex-1 text-left text-sm truncate hover-text-accent transition-colors disabled:opacity-50"
                          style={{ color: 'var(--ui-text-primary)' }}
                        >
                          {snapshot.name}
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot)}
                          className="p-1 hover-text-error opacity-0 group-hover:opacity-100 transition-all"
                          style={{ color: 'var(--ui-text-secondary)' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
                  Styles and visibility only (no camera)
                </p>
                <button
                  onClick={() => openSaveModal('layer-state')}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded text-sm mb-2 transition-colors hover-bg-secondary"
                  style={{ backgroundColor: 'var(--ui-border)', color: 'var(--ui-text-primary)' }}
                >
                  <Save size={14} />
                  Save Layer State
                </button>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {layerStates.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--ui-text-muted)' }}>No layer states</p>
                  ) : (
                    layerStates.map((layerState) => (
                      <div
                        key={layerState.filename}
                        className="flex items-center gap-1 rounded px-2 py-1.5 group"
                        style={{ backgroundColor: 'var(--ui-bg-secondary-50)' }}
                      >
                        <button
                          onClick={() => handleLoadLayerState(layerState)}
                          disabled={loading}
                          className="flex-1 text-left text-sm truncate hover-text-accent transition-colors disabled:opacity-50"
                          style={{ color: 'var(--ui-text-primary)' }}
                        >
                          {layerState.name}
                        </button>
                        <button
                          onClick={() => handleDeleteLayerState(layerState)}
                          className="p-1 hover-text-error opacity-0 group-hover:opacity-100 transition-all"
                          style={{ color: 'var(--ui-text-secondary)' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>
              Save {saveType === 'snapshot' ? 'View' : 'Layer State'}
            </h2>
            <form onSubmit={handleSave}>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 rounded mb-4 placeholder-theme"
                style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }}
                autoFocus
              />
              {error && <p className="text-sm mb-4" style={{ color: 'var(--ui-error)' }}>{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 hover-text-primary transition-colors"
                  style={{ color: 'var(--ui-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !saveName.trim()}
                  className="px-4 py-2 rounded disabled:opacity-50 transition-colors hover-bg-accent-hover"
                  style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default StateManager
