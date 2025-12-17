import ParameterPanel from './components/ParameterPanel'
import Viewer3D from './components/Viewer3D'

function App() {
  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-900 text-white overflow-hidden">
      <Viewer3D />
      <ParameterPanel />
    </div>
  )
}

export default App
