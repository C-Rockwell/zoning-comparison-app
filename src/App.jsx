import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import ParameterPanel from './components/ParameterPanel'
import Viewer3D from './components/Viewer3D'
import ProjectManager from './components/ProjectManager'
import StartScreen from './components/StartScreen'
import DistrictViewer from './components/DistrictViewer'
import DistrictParameterPanel from './components/DistrictParameterPanel'
import { useStore } from './store/useStore'
import { useAutoSave } from './hooks/useAutoSave'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// Toast notification component
const Toast = () => {
  const toast = useStore(state => state.toast)
  const hideToast = useStore(state => state.hideToast)

  if (!toast) return null

  // Use CSS variables for toast colors based on type
  const getToastStyle = () => {
    if (toast.type === 'error') return { backgroundColor: 'var(--ui-error)' }
    if (toast.type === 'info') return { backgroundColor: 'var(--ui-accent)' }
    return { backgroundColor: 'var(--ui-success)' }
  }

  return (
    <div
      className="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-md animate-slide-in"
      style={{ ...getToastStyle(), color: 'var(--ui-text-primary)' }}
    >
      <span className="text-sm">{toast.message}</span>
      <button
        onClick={hideToast}
        className="opacity-80 hover:opacity-100 text-lg leading-none"
        style={{ color: 'var(--ui-text-primary)' }}
      >
        ×
      </button>
    </div>
  )
}

// Main workspace layout (shown at /app)
const MainLayout = () => {
  const activeModule = useStore(state => state.activeModule)

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
    >
      <ProjectManager />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {activeModule === 'district' ? (
          <>
            <DistrictViewer />
            <DistrictParameterPanel />
          </>
        ) : (
          <>
            <Viewer3D />
            <ParameterPanel />
          </>
        )}
      </div>
    </div>
  )
}

function App() {
  const uiTheme = useStore(state => state.uiTheme)

  useAutoSave()
  useKeyboardShortcuts()

  // Apply theme data attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme)
  }, [uiTheme])

  return (
    <>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/app" element={<MainLayout />} />
      </Routes>
      <Toast />
    </>
  )
}

export default App
