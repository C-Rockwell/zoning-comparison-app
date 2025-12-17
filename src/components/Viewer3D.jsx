import { useRef, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, CameraControls, Grid, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import SceneContent from './SceneContent'
import { useStore } from '../store/useStore'
import CameraHandler from './CameraHandler'
import Exporter from './Exporter'
import StyleEditor from './StyleEditor'

const Viewer3D = () => {
    const cameraControlsRef = useRef()
    const contentRef = useRef()
    const [isSaving, setIsSaving] = useState(false)
    const savedViews = useStore(state => state.viewSettings.savedViews)
    const setSavedView = useStore(state => state.setSavedView)
    const showAxes = useStore(state => state.viewSettings.layers.axes)
    const projection = useStore(state => state.viewSettings.projection)
    const setCameraView = useStore(state => state.setCameraView)
    const currentView = useStore(state => state.viewSettings.cameraView)
    const setExportFormat = useStore(state => state.setExportFormat)
    const setExportView = useStore(state => state.setExportView)
    const triggerExport = useStore(state => state.triggerExport)
    const exportFormat = useStore(state => state.viewSettings.exportFormat)
    const exportView = useStore(state => state.viewSettings.exportView)
    const exportLabel = useStore(state => state.viewSettings.exportSettings.label)
    const toggleProjection = useStore(state => state.toggleProjection)
    const setExportSettings = useStore(state => state.setExportSettings)
    const gimbalLayer = useStore(state => state.viewSettings.layers.gimbal)
    const gridLayer = useStore(state => state.viewSettings.layers.grid)


    const handlePresetClick = (index) => {
        if (isSaving) {
            // SAVE VIEW
            if (cameraControlsRef.current) {
                const controls = cameraControlsRef.current
                // Capture current state
                const position = new THREE.Vector3()
                const target = new THREE.Vector3()
                controls.getPosition(position)
                controls.getTarget(target)
                const zoom = cameraControlsRef.current.camera.zoom

                setSavedView(index, { position, target, zoom })
                setIsSaving(false) // Toggle off after save
            }
        } else {
            // LOAD VIEW
            if (savedViews[index]) {
                setCameraView(`custom-${index}`)
            }
        }
    }

    // Ensure we trigger a control reset or update when projection changes
    useEffect(() => {
        if (cameraControlsRef.current) {
            // Optional logic depending on drei version
        }
    }, [projection])

    const views = ['iso', 'top', 'front', 'left', 'right']

    return (
        <div className="flex-1 bg-gray-950 relative overflow-hidden">
            {/* View Controls Overlay (Left) */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 max-w-md">
                {/* Standard Views */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => {
                            useStore.getState().setProjection('orthographic')
                            setCameraView('top')
                        }}
                        className="px-3 py-1 rounded text-sm font-bold bg-red-800 text-white hover:bg-red-700 transition-colors"
                        title="Reset to Top 2D View"
                    >
                        RESET
                    </button>
                    <div className="w-[1px] h-6 bg-gray-600 mx-1"></div>
                    {views.map(view => (
                        <button
                            key={view}
                            onClick={() => setCameraView(view)}
                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${currentView === view ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {view.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Custom Views Row */}
                <div className="flex gap-2 items-center bg-gray-900/50 p-1 rounded backdrop-blur-sm shadow-lg border border-gray-800">
                    {/* REC Toggle */}
                    <button
                        onClick={() => setIsSaving(!isSaving)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-all ${isSaving
                            ? 'bg-red-600 border-red-500 text-white animate-pulse'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                            }`}
                        title="Toggle Record Mode"
                    >
                        <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-white' : 'bg-red-500'}`}></div>
                        {isSaving ? 'SAVING...' : 'REC'}
                    </button>

                    <div className="w-[1px] h-6 bg-gray-600 mx-1 opacity-50"></div>

                    {/* Presets 1-5 */}
                    {[1, 2, 3, 4, 5].map(index => {
                        const hasView = !!savedViews[index]
                        return (
                            <button
                                key={index}
                                onClick={() => handlePresetClick(index)}
                                disabled={!isSaving && !hasView}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all border ${currentView === `custom-${index}`
                                        ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-500/50'
                                        : hasView
                                            ? 'bg-gray-700 border-gray-500 text-white hover:bg-gray-600 hover:border-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-600' // Empty
                                    } ${isSaving ? 'ring-2 ring-red-500 cursor-copy hover:bg-red-900/50 hover:border-red-400' : ''}`}
                                title={hasView ? `Load View ${index}` : 'Empty Slot'}
                            >
                                {index}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Main Control Bar (Right) */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                <div className="flex gap-2 bg-gray-900/80 p-2 rounded backdrop-blur items-center flex-wrap justify-end">
                    {/* Projection Toggle */}
                    <button
                        className={`px-3 py-1 rounded text-sm font-semibold ${projection === 'orthographic' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        onClick={() => toggleProjection()}
                        title="Toggle 2D (Parallel) / 3D (Perspective)"
                    >
                        {projection === 'orthographic' ? '2D (Para)' : '3D (Persp)'}
                    </button>

                    <div className="w-[1px] h-6 bg-gray-600 mx-1"></div>

                    {/* Export Controls */}
                    <select
                        className="bg-gray-800 text-white rounded p-1 border border-gray-600 text-sm"
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                    >
                        <option value="obj">OBJ</option>
                        <option value="glb">GLB (Modern)</option>
                        <option value="dae">DAE (SketchUp)</option>
                        <option value="dxf">DXF (AutoCAD)</option>
                        <option disabled>──────────</option>
                        <option value="png">PNG (Image)</option>
                        <option value="jpg">JPG (Image)</option>
                        <option value="svg">SVG (Vector)</option>
                    </select>

                    <select
                        value={`${useStore.getState().viewSettings.exportSettings.width}x${useStore.getState().viewSettings.exportSettings.height}`} // Access directly to avoid crash if state mismatch? No, hook is fine.
                        onChange={(e) => {
                            const [width, height] = e.target.value.split('x').map(Number)
                            const label = e.target.options[e.target.selectedIndex].text
                            useStore.getState().setExportSettings({ width, height, label })
                        }}
                        className="bg-gray-800 text-white rounded p-1 border border-gray-600 text-sm"
                    >
                        <option value="1280x720">720p (1280x720)</option>
                        <option value="1920x1080">1080p (1920x1080)</option>
                        <option value="3840x2160">4K (3840x2160)</option>
                        <option value="7680x4320">8K (7680x4320)</option>
                        <option value="15360x8640">Max (16K)</option>
                        <option value="1080x1080">Square (1080x1080)</option>
                        <option value="3508x2480">A4 (Landscape)</option>
                    </select>

                    <select
                        className="bg-gray-800 text-white rounded p-1 border border-gray-600 text-sm"
                        value={exportView}
                        onChange={(e) => setExportView(e.target.value)}
                    >
                        <option value="current">Current View</option>
                        <option value="iso">Standard ISO</option>
                        <option value="front">Standard Front</option>
                        <option value="top">Standard Top</option>
                        <option value="side">Right (East)</option>
                        <option value="left">Left (West)</option>
                    </select>

                    <button
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-semibold"
                        onClick={() => triggerExport()}
                    >
                        Export
                    </button>
                </div>
            </div>

            <StyleEditor />

            {/* Z-UP COORDINATE SYSTEM */}
            <Canvas
                shadows
                gl={{ preserveDrawingBuffer: true }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 30]} intensity={1} castShadow />

                {/* Cameras */}
                <PerspectiveCamera
                    makeDefault={projection === 'perspective'}
                    up={[0, 0, 1]}
                    fov={50}
                    near={0.1}
                    far={2000}
                />

                <OrthographicCamera
                    makeDefault={projection === 'orthographic'}
                    up={[0, 0, 1]}
                    near={-2000}
                    far={2000}
                />

                <CameraControls ref={cameraControlsRef} makeDefault />
                <CameraHandler controlsRef={cameraControlsRef} />
                <Exporter target={contentRef} />


                {showAxes && (
                    <primitive object={new THREE.AxesHelper(100)} />
                )}

                <group ref={contentRef}>
                    <SceneContent />
                </group>

                {
                    gridLayer && (
                        <Grid
                            position={[0, 0, -0.1]}
                            rotation={[Math.PI / 2, 0, 0]}
                            args={[200, 200]}
                            cellSize={10}
                            sectionSize={50}
                            fadeDistance={200}
                            sectionColor="#4a5568"
                            cellColor="#2d3748"
                        />
                    )
                }

                {
                    gimbalLayer && (
                        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                            <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
                        </GizmoHelper>
                    )
                }

            </Canvas>
        </div>
    )
}

export default Viewer3D
