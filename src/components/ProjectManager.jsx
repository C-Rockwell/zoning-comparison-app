import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import * as api from '../services/api'
import { FolderOpen, Plus, Save, FolderCog, ChevronDown, Home } from 'lucide-react'
import SunControls from './SunControls'

const ProjectManager = () => {
  const navigate = useNavigate()
  const projectConfig = useStore((state) => state.projectConfig)
  const currentProject = useStore((state) => state.currentProject)
  const projects = useStore((state) => state.projects)
  const setProjectConfig = useStore((state) => state.setProjectConfig)
  const setCurrentProject = useStore((state) => state.setCurrentProject)
  const setProjects = useStore((state) => state.setProjects)
  const getProjectState = useStore((state) => state.getProjectState)
  const applyProjectState = useStore((state) => state.applyProjectState)
  const clearCurrentProject = useStore((state) => state.clearCurrentProject)
  const activeModule = useStore((state) => state.activeModule)
  const setActiveModule = useStore((state) => state.setActiveModule)

  const [showSetup, setShowSetup] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showOpenProject, setShowOpenProject] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [directoryPath, setDirectoryPath] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Check server and load config on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await api.getConfig()
        if (config.projectsDirectory) {
          setProjectConfig(config)
          // Load projects list
          const projectsList = await api.listProjects()
          setProjects(projectsList)
        } else {
          // First run - show setup
          setShowSetup(true)
        }
      } catch (err) {
        console.error('Server not available:', err)
        // Server not running - we'll handle this gracefully
      }
    }
    checkConfig()
  }, [setProjectConfig, setProjects])

  // Track unsaved changes (simplified - just tracks if project was modified after load)
  useEffect(() => {
    if (currentProject) {
      setHasUnsavedChanges(true)
    }
  }, [currentProject])

  // Common path suggestions based on OS
  const pathSuggestions = [
    { label: 'Documents', path: '~/Documents/ZoningProjects' },
    { label: 'Desktop', path: '~/Desktop/ZoningProjects' },
    { label: 'Home', path: '~/ZoningProjects' },
  ]

  const handlePathSuggestion = (path) => {
    // Expand ~ to home directory (server will handle this, but we show it expanded for clarity)
    setDirectoryPath(path)
  }

  const handleSetupSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const config = await api.setConfig(directoryPath)
      setProjectConfig(config)
      setShowSetup(false)
      // Refresh projects list
      const projectsList = await api.listProjects()
      setProjects(projectsList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewProject = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const project = await api.createProject(newProjectName)
      setCurrentProject(project)
      setShowNewProject(false)
      setNewProjectName('')
      setHasUnsavedChanges(false)
      // Refresh projects list
      const projectsList = await api.listProjects()
      setProjects(projectsList)
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
      // If project has saved state, apply it
      if (fullProject.state) {
        applyProjectState(fullProject.state)
      }
      setShowOpenProject(false)
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProject = async () => {
    if (!currentProject) return
    setError('')
    setLoading(true)

    try {
      const state = getProjectState()
      await api.updateProject(currentProject.id, { state })
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseProject = () => {
    clearCurrentProject()
    setHasUnsavedChanges(false)
    setShowDropdown(false)
  }

  const handleChangeDirectory = () => {
    setDirectoryPath(projectConfig.projectsDirectory || '')
    setShowSetup(true)
    setShowDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest('.project-dropdown')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  return (
    <>
      {/* Header Bar */}
      <div className="h-10 flex items-center px-3 gap-2 flex-shrink-0" style={{ backgroundColor: 'var(--ui-bg-primary)', borderBottom: '1px solid var(--ui-border)' }}>
        {/* Project Dropdown */}
        <div className="relative project-dropdown">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors hover-bg-primary"
            style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
          >
            <FolderOpen size={16} />
            <span className="max-w-[200px] truncate">
              {currentProject ? currentProject.name : 'No Project'}
            </span>
            {hasUnsavedChanges && currentProject && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ui-warning)' }} title="Unsaved changes" />
            )}
            <ChevronDown size={14} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded shadow-lg z-50" style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border)' }}>
              <button
                onClick={() => { setShowNewProject(true); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-bg-primary transition-colors"
              >
                <Plus size={16} />
                New Project
              </button>
              <button
                onClick={() => { setShowOpenProject(true); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-bg-primary transition-colors"
              >
                <FolderOpen size={16} />
                Open Project
              </button>
              {currentProject && (
                <>
                  <div style={{ borderTop: '1px solid var(--ui-border)' }} />
                  <button
                    onClick={handleSaveProject}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-bg-primary transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save Project
                  </button>
                  <button
                    onClick={handleCloseProject}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-bg-primary transition-colors"
                    style={{ color: 'var(--ui-text-secondary)' }}
                  >
                    Close Project
                  </button>
                </>
              )}
              <div style={{ borderTop: '1px solid var(--ui-border)' }} />
              <button
                onClick={handleChangeDirectory}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover-bg-primary transition-colors"
                style={{ color: 'var(--ui-text-secondary)' }}
              >
                <FolderCog size={16} />
                Change Projects Folder
              </button>
            </div>
          )}
        </div>

        {/* Quick Save Button */}
        <button
          onClick={currentProject ? handleSaveProject : () => setShowNewProject(true)}
          disabled={currentProject ? (loading || !hasUnsavedChanges) : false}
          title={currentProject ? "Save Project" : "Save As New Project"}
          className="p-1.5 hover-bg-secondary rounded transition-colors disabled:opacity-50"
        >
          <Save size={16} />
        </button>

        {/* Module Switcher */}
        <div className="flex items-center gap-0.5 ml-4 rounded p-0.5" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
          <button
            onClick={() => setActiveModule('comparison')}
            className="px-3 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: activeModule === 'comparison' ? 'var(--ui-accent)' : 'transparent',
              color: activeModule === 'comparison' ? '#fff' : 'var(--ui-text-secondary)',
            }}
          >
            Comparison
          </button>
          <button
            onClick={() => setActiveModule('district')}
            className="px-3 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: activeModule === 'district' ? 'var(--ui-accent)' : 'transparent',
              color: activeModule === 'district' ? '#fff' : 'var(--ui-text-secondary)',
            }}
          >
            District
          </button>
        </div>

        {/* Sun Settings */}
        <SunControls />

        {/* Project path display */}
        {currentProject && (
          <span className="text-xs truncate ml-auto" style={{ color: 'var(--ui-text-muted)' }}>
            {currentProject.path}
          </span>
        )}

        {/* Home button */}
        <button
          onClick={() => navigate('/')}
          title="Back to Start Screen"
          className={`p-1.5 hover-bg-secondary rounded transition-colors ${!currentProject ? 'ml-auto' : 'ml-2'}`}
        >
          <Home size={16} style={{ color: 'var(--ui-text-secondary)' }} />
        </button>
      </div>

      {/* Setup Modal - First Run */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-md mx-4" style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>Choose Projects Folder</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ui-text-secondary)' }}>
              Select where your projects will be stored. Each project will be a subfolder.
            </p>

            {/* Quick path suggestions */}
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: 'var(--ui-text-muted)' }}>Quick select:</p>
              <div className="flex gap-2 flex-wrap">
                {pathSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.path}
                    type="button"
                    onClick={() => handlePathSuggestion(suggestion.path)}
                    className="px-3 py-1.5 text-sm rounded transition-colors"
                    style={{
                      backgroundColor: directoryPath === suggestion.path ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                      color: directoryPath === suggestion.path ? '#fff' : 'var(--ui-text-secondary)',
                    }}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSetupSubmit}>
              <div className="mb-4">
                <p className="text-xs mb-2" style={{ color: 'var(--ui-text-muted)' }}>Or enter a custom path:</p>
                <input
                  type="text"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  placeholder="e.g., ~/Documents/MyProjects"
                  className="w-full px-3 py-2 rounded placeholder-theme"
                  style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm mb-4" style={{ color: 'var(--ui-error)' }}>{error}</p>}
              <div className="flex justify-end gap-2">
                {projectConfig.isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowSetup(false)}
                    className="px-4 py-2 hover-text-primary transition-colors"
                    style={{ color: 'var(--ui-text-secondary)' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !directoryPath.trim()}
                  className="px-4 py-2 rounded disabled:opacity-50 transition-colors hover-bg-accent-hover"
                  style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}
                >
                  {loading ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-md mx-4" style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>New Project</h2>
            <form onSubmit={handleNewProject}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-3 py-2 rounded mb-4 placeholder-theme"
                style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }}
                autoFocus
              />
              {error && <p className="text-sm mb-4" style={{ color: 'var(--ui-error)' }}>{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setError(''); }}
                  className="px-4 py-2 hover-text-primary transition-colors"
                  style={{ color: 'var(--ui-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 rounded disabled:opacity-50 transition-colors hover-bg-accent-hover"
                  style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Project Modal */}
      {showOpenProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-lg mx-4" style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ui-text-primary)' }}>Open Project</h2>
            {error && <p className="text-sm mb-4" style={{ color: 'var(--ui-error)' }}>{error}</p>}
            <div className="max-h-80 overflow-y-auto mb-4">
              {projects.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--ui-text-secondary)' }}>No projects yet</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleOpenProject(project)}
                      disabled={loading}
                      className="w-full text-left px-4 py-3 rounded transition-colors disabled:opacity-50 hover-bg-primary"
                      style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                        Modified: {new Date(project.modifiedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowOpenProject(false); setError(''); }}
                className="px-4 py-2 hover-text-primary transition-colors"
                style={{ color: 'var(--ui-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProjectManager
