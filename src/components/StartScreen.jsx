import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import * as api from '../services/api'
import { Layers, FolderPlus, FolderOpen, Play, ArrowRight } from 'lucide-react'

const StartScreen = () => {
  const navigate = useNavigate()
  const setActiveModule = useStore(state => state.setActiveModule)
  const activeModule = useStore(state => state.activeModule)
  const setCurrentProject = useStore(state => state.setCurrentProject)
  const applyProjectState = useStore(state => state.applyProjectState)
  const setProjectConfig = useStore(state => state.setProjectConfig)
  const setProjects = useStore(state => state.setProjects)
  const projects = useStore(state => state.projects)

  const [selectedModule, setSelectedModule] = useState(activeModule || 'comparison')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showOpenProject, setShowOpenProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectLocation, setNewProjectLocation] = useState('')
  const [newProjectCreator, setNewProjectCreator] = useState('')
  const [newProjectDistricts, setNewProjectDistricts] = useState(1)
  const [newProjectModule, setNewProjectModule] = useState(selectedModule)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [serverAvailable, setServerAvailable] = useState(false)

  // Load config and projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const config = await api.getConfig()
        if (config.projectsDirectory) {
          setProjectConfig(config)
          const projectsList = await api.listProjects()
          setProjects(projectsList)
          setServerAvailable(true)
        }
      } catch {
        // Server not running - sandbox mode still works
        setServerAvailable(false)
      }
    }
    loadProjects()
  }, [setProjectConfig, setProjects])

  const handleSandbox = () => {
    setActiveModule(selectedModule)
    navigate('/app')
  }

  const handleNewProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setError('')
    setLoading(true)

    try {
      const project = await api.createProject(newProjectName.trim())
      setCurrentProject(project)
      setActiveModule(newProjectModule)
      setShowNewProject(false)
      setNewProjectName('')
      setNewProjectLocation('')
      setNewProjectCreator('')
      setNewProjectDistricts(1)
      setNewProjectModule(selectedModule)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProject = async (project) => {
    setError('')
    setLoading(true)

    try {
      const fullProject = await api.getProject(project.id)
      setCurrentProject(fullProject)
      if (fullProject.state) {
        applyProjectState(fullProject.state)
      }
      setActiveModule(selectedModule)
      setShowOpenProject(false)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
      <div className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Layers className="w-10 h-10" style={{ color: 'var(--ui-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ui-text-primary)' }}>
              Zoning Comparison Tool
            </h1>
          </div>
          <p className="text-base" style={{ color: 'var(--ui-text-secondary)' }}>
            3D zoning code visualization and analysis
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Sandbox Card */}
          <button
            onClick={handleSandbox}
            className="group p-6 rounded-lg border-2 transition-all text-left hover:shadow-lg"
            style={{
              backgroundColor: 'var(--ui-bg-primary)',
              borderColor: 'var(--ui-border)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ui-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ui-border)'}
          >
            <Play className="w-8 h-8 mb-3" style={{ color: 'var(--ui-accent)' }} />
            <h3 className="font-semibold mb-1 text-base" style={{ color: 'var(--ui-text-primary)' }}>
              Sandbox
            </h3>
            <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
              Start exploring immediately without saving
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--ui-accent)' }}>
              Launch <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* New Project Card */}
          <button
            onClick={() => {
              if (!serverAvailable) {
                setError('Server not available. Start the backend to create projects.')
                return
              }
              setShowNewProject(true)
              setNewProjectModule(selectedModule)
              setError('')
            }}
            className="group p-6 rounded-lg border-2 transition-all text-left hover:shadow-lg"
            style={{
              backgroundColor: 'var(--ui-bg-primary)',
              borderColor: 'var(--ui-border)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ui-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ui-border)'}
          >
            <FolderPlus className="w-8 h-8 mb-3" style={{ color: 'var(--ui-accent)' }} />
            <h3 className="font-semibold mb-1 text-base" style={{ color: 'var(--ui-text-primary)' }}>
              New Project
            </h3>
            <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
              Create a new project with save support
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--ui-accent)' }}>
              Create <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Open Project Card */}
          <button
            onClick={() => {
              if (!serverAvailable) {
                setError('Server not available. Start the backend to open projects.')
                return
              }
              setShowOpenProject(true)
              setError('')
            }}
            className="group p-6 rounded-lg border-2 transition-all text-left hover:shadow-lg"
            style={{
              backgroundColor: 'var(--ui-bg-primary)',
              borderColor: 'var(--ui-border)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ui-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ui-border)'}
          >
            <FolderOpen className="w-8 h-8 mb-3" style={{ color: 'var(--ui-accent)' }} />
            <h3 className="font-semibold mb-1 text-base" style={{ color: 'var(--ui-text-primary)' }}>
              Open Project
            </h3>
            <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
              Load an existing saved project
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--ui-accent)' }}>
              Browse <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Module Selector */}
        <div className="flex flex-col items-center">
          <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--ui-border)' }}>
            <button
              onClick={() => setSelectedModule('comparison')}
              className="px-5 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedModule === 'comparison' ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                color: selectedModule === 'comparison' ? '#ffffff' : 'var(--ui-text-secondary)',
              }}
            >
              Comparison Module
            </button>
            <button
              onClick={() => setSelectedModule('district')}
              className="px-5 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedModule === 'district' ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                color: selectedModule === 'district' ? '#ffffff' : 'var(--ui-text-secondary)',
              }}
            >
              District Module
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
            {selectedModule === 'comparison'
              ? 'Side-by-side existing vs. proposed zoning analysis'
              : 'Multi-lot composition with up to 5 lots'}
          </p>
        </div>

        {/* Error message */}
        {error && !showNewProject && !showOpenProject && (
          <p className="text-center mt-4 text-sm" style={{ color: 'var(--ui-error, #ef4444)' }}>{error}</p>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-md mx-4 border"
            style={{
              backgroundColor: 'var(--ui-bg-primary)',
              borderColor: 'var(--ui-border)',
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>
              New Project
            </h2>
            <form onSubmit={handleNewProject}>
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--ui-text-secondary)' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Downtown Rezoning Study"
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-text-primary)',
                  }}
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--ui-text-secondary)' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={newProjectLocation}
                  onChange={(e) => setNewProjectLocation(e.target.value)}
                  placeholder="e.g., 123 Main St, Springfield"
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-text-primary)',
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--ui-text-secondary)' }}>
                  Creator
                </label>
                <input
                  type="text"
                  value={newProjectCreator}
                  onChange={(e) => setNewProjectCreator(e.target.value)}
                  placeholder="e.g., Your Name"
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-text-primary)',
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--ui-text-secondary)' }}>
                  Number of Districts
                </label>
                <input
                  type="number"
                  value={newProjectDistricts}
                  onChange={(e) => setNewProjectDistricts(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-text-primary)',
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-1" style={{ color: 'var(--ui-text-secondary)' }}>
                  Module
                </label>
                <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--ui-border)' }}>
                  <button
                    type="button"
                    onClick={() => setNewProjectModule('comparison')}
                    className="px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: newProjectModule === 'comparison' ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                      color: newProjectModule === 'comparison' ? '#ffffff' : 'var(--ui-text-secondary)',
                    }}
                  >
                    Comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProjectModule('district')}
                    className="px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: newProjectModule === 'district' ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                      color: newProjectModule === 'district' ? '#ffffff' : 'var(--ui-text-secondary)',
                    }}
                  >
                    District
                  </button>
                </div>
              </div>
              {error && <p className="text-sm mb-3" style={{ color: 'var(--ui-error, #ef4444)' }}>{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setError('') }}
                  className="px-4 py-2 text-sm rounded transition-colors"
                  style={{ color: 'var(--ui-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 text-sm rounded font-medium disabled:opacity-50 transition-colors"
                  style={{
                    backgroundColor: 'var(--ui-accent)',
                    color: '#ffffff',
                  }}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Project Modal */}
      {showOpenProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-lg mx-4 border"
            style={{
              backgroundColor: 'var(--ui-bg-primary)',
              borderColor: 'var(--ui-border)',
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>
              Open Project
            </h2>
            {error && <p className="text-sm mb-3" style={{ color: 'var(--ui-error, #ef4444)' }}>{error}</p>}
            <div className="max-h-80 overflow-y-auto mb-4">
              {projects.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--ui-text-secondary)' }}>
                  No projects yet. Create one to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleOpenProject(project)}
                      disabled={loading}
                      className="w-full text-left px-4 py-3 rounded border transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--ui-bg-secondary)',
                        borderColor: 'var(--ui-border)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ui-accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ui-border)'}
                    >
                      <div className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                        {project.name}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--ui-text-secondary)' }}>
                        Modified: {new Date(project.modifiedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowOpenProject(false); setError('') }}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{ color: 'var(--ui-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StartScreen
