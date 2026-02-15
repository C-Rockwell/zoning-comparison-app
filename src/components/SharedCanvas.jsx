import { useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, CameraControls, Grid, PerspectiveCamera, OrthographicCamera, ContactShadows } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping, SMAA, Outline, Selection } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import CameraHandler from './CameraHandler'
import Exporter from './Exporter'

// ============================================
// StudioLighting — High-quality lighting setup
// ============================================
export const StudioLighting = () => {
    const lighting = useStore(state => state.viewSettings.lighting)

    const azimuth = lighting?.azimuth ?? 0.785
    const altitude = lighting?.altitude ?? 0.523
    const intensityRaw = lighting?.intensity ?? 1.5
    const shadowsEnabled = lighting?.shadows ?? true

    const radius = 100
    const x = radius * Math.sin(azimuth) * Math.cos(altitude)
    const y = radius * Math.cos(azimuth) * Math.cos(altitude)
    const z = radius * Math.sin(altitude)

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

// ============================================
// PostProcessing — AO, tone mapping, AA, outline
// ============================================
export const PostProcessing = ({ renderSettings }) => {
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

// ============================================
// AdaptiveGrid — scales grid cells based on zoom
// ============================================
export const AdaptiveGrid = ({ gridSettings }) => {
    const { camera } = useThree()
    const [gridScale, setGridScale] = useState({ cellSize: 10, sectionSize: 50 })
    const lastScaleRef = useRef({ cellSize: 10, sectionSize: 50 })

    useFrame(() => {
        let effectiveZoom
        if (camera.isOrthographicCamera) {
            effectiveZoom = camera.zoom
        } else {
            effectiveZoom = 100 / camera.position.length()
        }

        let cellSize, sectionSize

        if (effectiveZoom > 8) {
            cellSize = 1
            sectionSize = 5
        } else if (effectiveZoom > 4) {
            cellSize = 2
            sectionSize = 10
        } else if (effectiveZoom > 2) {
            cellSize = 5
            sectionSize = 25
        } else if (effectiveZoom > 1) {
            cellSize = 10
            sectionSize = 50
        } else {
            cellSize = 20
            sectionSize = 100
        }

        if (cellSize !== lastScaleRef.current.cellSize || sectionSize !== lastScaleRef.current.sectionSize) {
            lastScaleRef.current = { cellSize, sectionSize }
            setGridScale({ cellSize, sectionSize })
        }
    })

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

// ============================================
// SharedCanvas — Reusable R3F Canvas with all
// infrastructure (lighting, cameras, controls,
// grid, gizmo, post-processing, export).
// Accepts children for scene content.
// ============================================
const SharedCanvas = forwardRef(({ children, onPointerMissed }, ref) => {
    const cameraControlsRef = useRef()
    const contentRef = useRef()

    const showAxes = useStore(state => state.viewSettings.layers.axes)
    const projection = useStore(state => state.viewSettings.projection)
    const gimbalLayer = useStore(state => state.viewSettings.layers.gimbal)
    const gridLayer = useStore(state => state.viewSettings.layers.grid)
    const gridSettings = useStore(state => state.viewSettings.styleSettings?.grid)
    const renderSettings = useStore(state => state.renderSettings)

    // Expose cameraControlsRef and contentRef to parent
    useImperativeHandle(ref, () => ({
        cameraControls: cameraControlsRef.current,
        contentGroup: contentRef.current,
    }))

    const sceneBackground = '#ffffff'

    return (
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
            onPointerMissed={onPointerMissed}
        >
            <color attach="background" args={[sceneBackground]} />

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
                    {children}
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
    )
})

SharedCanvas.displayName = 'SharedCanvas'

export default SharedCanvas
