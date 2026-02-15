import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, CameraControls, Grid, PerspectiveCamera, OrthographicCamera, SoftShadows, ContactShadows } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping, SMAA, Outline, Selection } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import SceneContent from './SceneContent'
import { useStore } from '../store/useStore'
import CameraHandler from './CameraHandler'
import Exporter from './Exporter'
// StyleEditor removed — all style controls are now integrated into ParameterPanel.jsx

// High-quality lighting setup (light mode only)
const StudioLighting = () => {
    const lighting = useStore(state => state.viewSettings.lighting)

    // Default values if store is not yet ready or missing
    const azimuth = lighting?.azimuth ?? 0.785
    const altitude = lighting?.altitude ?? 0.523
    const intensityRaw = lighting?.intensity ?? 1.5
    const shadowsEnabled = lighting?.shadows ?? true

    // Calculate light position from spherical coordinates
    const radius = 100
    const x = radius * Math.sin(azimuth) * Math.cos(altitude)
    const y = radius * Math.cos(azimuth) * Math.cos(altitude)
    const z = radius * Math.sin(altitude)

    // Fill light is opposite to main light
    const fillX = -x * 0.5
    const fillY = -y * 0.5
    const fillZ = z * 0.5

    return (
        <>
            {/* Main key light - soft directional */}
            <directionalLight
                position={[x, y, z]}
                intensity={intensityRaw}
                castShadow={shadowsEnabled}
                shadow-mapSize-width={4096}
                shadow-mapSize-height={4096}
                shadow-camera-far={500}
                shadow-camera-left={-150}
                shadow-camera-right={150}
                shadow-camera-top={150}
                shadow-camera-bottom={-150}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
            />

            {/* Fill light from opposite side */}
            <directionalLight
                position={[fillX, fillY, fillZ]}
                intensity={0.4}
                color="#b4d7ff"
            />

            {/* Rim/back light for depth */}
            <directionalLight
                position={[0, 80, -50]}
                intensity={0.3}
                color="#fff5e6"
            />

            {/* Ambient fill */}
            <ambientLight intensity={0.3} />

            {/* Hemisphere for natural sky/ground bounce */}
            <hemisphereLight
                skyColor="#ffffff"
                groundColor="#d4d4d4"
                intensity={0.5}
            />
        </>
    )
}

// Post-processing effects
const PostProcessing = ({ renderSettings }) => {
    const { ambientOcclusion, aoIntensity, aoRadius, toneMapping, antialiasing } = renderSettings

    return (
        <EffectComposer multisampling={0}>
            {ambientOcclusion && (
                <N8AO
                    aoRadius={aoRadius}
                    intensity={aoIntensity}
                    aoSamples={16}
                    denoiseSamples={8}
                    denoiseRadius={12}
                    distanceFalloff={1.0}
                    screenSpaceRadius
                    halfRes={false}
                    color="black"
                />
            )}
            {toneMapping && (
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            )}
            {antialiasing && <SMAA />}
            <Outline blur edgeStrength={100} width={1000} visibleEdgeColor="white" hiddenEdgeColor="white" />
        </EffectComposer>
    )
}

// Adaptive Grid that scales based on camera zoom
const AdaptiveGrid = ({ gridSettings }) => {
    const { camera } = useThree()
    const [gridScale, setGridScale] = useState({ cellSize: 10, sectionSize: 50 })
    const lastScaleRef = useRef({ cellSize: 10, sectionSize: 50 })

    useFrame(() => {
        // Get effective zoom level
        let effectiveZoom
        if (camera.isOrthographicCamera) {
            effectiveZoom = camera.zoom
        } else {
            // For perspective, use distance from target (approximate)
            effectiveZoom = 100 / camera.position.length()
        }

        // Calculate grid scale based on zoom
        // As zoom increases, we want smaller grid cells
        let cellSize, sectionSize

        if (effectiveZoom > 8) {
            // Very zoomed in - 1ft cells, 5ft sections
            cellSize = 1
            sectionSize = 5
        } else if (effectiveZoom > 4) {
            // Zoomed in - 2ft cells, 10ft sections
            cellSize = 2
            sectionSize = 10
        } else if (effectiveZoom > 2) {
            // Medium zoom - 5ft cells, 25ft sections
            cellSize = 5
            sectionSize = 25
        } else if (effectiveZoom > 1) {
            // Normal zoom - 10ft cells, 50ft sections
            cellSize = 10
            sectionSize = 50
        } else {
            // Zoomed out - 20ft cells, 100ft sections
            cellSize = 20
            sectionSize = 100
        }

        // Only update if changed (use ref to avoid stale closure issues)
        if (cellSize !== lastScaleRef.current.cellSize || sectionSize !== lastScaleRef.current.sectionSize) {
            lastScaleRef.current = { cellSize, sectionSize }
            setGridScale({ cellSize, sectionSize })
        }
    })

    // Get color values from settings
    const sectionColorHex = gridSettings?.sectionColor ?? '#9ca3af'
    const cellColorHex = gridSettings?.cellColor ?? '#d1d5db'

    return (
        <Grid
            position={[0, 0, 0.05]}
            rotation={[Math.PI / 2, 0, 0]}
            args={[500, 500]}
            cellSize={gridScale.cellSize}
            sectionSize={gridScale.sectionSize}
            fadeDistance={gridSettings?.fadeDistance ?? 400}
            fadeStrength={gridSettings?.fadeStrength ?? 1}
            sectionColor={sectionColorHex}
            cellColor={cellColorHex}
            sectionThickness={gridSettings?.sectionThickness ?? 1.5}
            cellThickness={gridSettings?.cellThickness ?? 1}
        />
    )
}

const Viewer3D = () => {
    const cameraControlsRef = useRef()
    const contentRef = useRef()
    const [isSaving, setIsSaving] = useState(false)
    const savedViews = useStore(state => state.savedViews)
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
    const toggleProjection = useStore(state => state.toggleProjection)
    const gimbalLayer = useStore(state => state.viewSettings.layers.gimbal)
    const gridLayer = useStore(state => state.viewSettings.layers.grid)
    const gridSettings = useStore(state => state.viewSettings.styleSettings?.grid)
    const renderSettings = useStore(state => state.renderSettings)

    const handlePresetClick = (index) => {
        if (isSaving) {
            if (cameraControlsRef.current) {
                const controls = cameraControlsRef.current
                const position = new THREE.Vector3()
                const target = new THREE.Vector3()
                controls.getPosition(position)
                controls.getTarget(target)
                const zoom = cameraControlsRef.current.camera.zoom
                setSavedView(index, { position, target, zoom })
                setIsSaving(false)
            }
        } else {
            if (savedViews[index]) {
                setCameraView(`custom-${index}`)
            }
        }
    }

    useEffect(() => {
        if (cameraControlsRef.current) {
            // Optional logic
        }
    }, [projection])

    const views = ['iso', 'top', 'front', 'left', 'right']

    // Light mode background
    const sceneBackground = '#ffffff'

    return (
        <div className="flex-1 bg-white relative overflow-hidden">
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
                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${currentView === view ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        >
                            {view.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Custom Views Row */}
                <div className="flex gap-2 items-center bg-gray-900/50 p-1 rounded backdrop-blur-sm shadow-lg border border-gray-800">
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
                                        : 'bg-gray-800 border-gray-700 text-gray-600'
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
                        <option value="ifc">IFC (BIM)</option>
                        <option disabled>──────────</option>
                        <option value="png">PNG (Image)</option>
                        <option value="jpg">JPG (Image)</option>
                        <option value="svg">SVG (Vector)</option>
                    </select>

                    <select
                        value={`${useStore.getState().viewSettings.exportSettings.width}x${useStore.getState().viewSettings.exportSettings.height}`}
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

            {/* High-Quality Canvas */}
            <Canvas
                shadows="soft"
                gl={{
                    preserveDrawingBuffer: true,
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    alpha: true,
                }}
                style={{ background: sceneBackground }}
                onPointerMissed={() => {
                    const { deselectAllBuildings } = useStore.getState()
                    if (deselectAllBuildings) deselectAllBuildings()
                }}
            >
                <color attach="background" args={[sceneBackground]} />

                {/* Soft shadows removed due to shader incompatibility with Three r182 */}
                {/* <SoftShadows size={25} samples={16} focus={0.5} /> */}

                {/* Studio Lighting for realistic shading */}
                <StudioLighting />

                {/* Contact shadows for ground-level detail */}
                {renderSettings.contactShadows && (
                    <ContactShadows
                        position={[0, 50, -0.15]}
                        opacity={0.4}
                        scale={200}
                        blur={2}
                        far={100}
                        resolution={512}
                        color="#000000"
                    />
                )}

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

                <Selection>
                    <group ref={contentRef}>
                        <SceneContent />
                    </group>
                </Selection>

                {gridLayer && (
                    <AdaptiveGrid gridSettings={gridSettings} />
                )}

                {gimbalLayer && (
                    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                        <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
                    </GizmoHelper>
                )}

                {/* Post-processing effects */}
                <PostProcessing renderSettings={renderSettings} />
            </Canvas>
        </div>
    )
}

export default Viewer3D
