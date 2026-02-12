import { useEffect } from 'react'
import ParameterPanel from './components/ParameterPanel'
import Viewer3D from './components/Viewer3D'
import ProjectManager from './components/ProjectManager'
import { useStore } from './store/useStore'

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

function App() {
  const uiTheme = useStore(state => state.uiTheme)

  // Apply theme data attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme)
  }, [uiTheme])

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
    >
      <ProjectManager />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <Viewer3D />
        <ParameterPanel />
      </div>
      <Toast />
    </div>
  )
}

export default App
