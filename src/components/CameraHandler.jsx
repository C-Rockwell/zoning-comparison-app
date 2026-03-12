import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import CameraControlsImpl from 'camera-controls'
import { useStore } from '../store/useStore'

const CameraHandler = ({ controlsRef }) => {
    const cameraView = useStore((state) => state.viewSettings.cameraView)
    const viewVersion = useStore((state) => state.viewSettings.viewVersion) // Trigger for updates
    const projection = useStore((state) => state.viewSettings.projection)
    const setProjection = useStore((state) => state.setProjection)
    const sceneBounds = useStore((state) => state.sceneBounds)
    const { camera, gl } = useThree()

    useEffect(() => {
        if (!controlsRef.current) return

        const controls = controlsRef.current
        const transition = true

        // Enforce Z-Up always to prevent rotation issues
        camera.up.set(0, 0, 1)
        camera.updateProjectionMatrix()

        // Scene bounds with defaults
        const b = sceneBounds ?? { minX: -50, maxX: 50, minY: 0, maxY: 100, maxZ: 40 }

        // Scene center
        const cx = (b.minX + b.maxX) / 2
        const cy = (b.minY + b.maxY) / 2
        const cz = b.maxZ / 2

        // Extents
        const extX = Math.max(b.maxX - b.minX, 1)
        const extY = Math.max(b.maxY - b.minY, 1)
        const extZ = Math.max(b.maxZ, 1)

        // Compute ortho zoom to fit worldW × worldH into canvas
        const canvas = gl.domElement
        const PADDING = 0.75
        const ISO_PADDING = 0.95
        const fitZoom = (worldW, worldH, padding = PADDING) => {
            const zoomW = canvas.clientWidth / worldW
            const zoomH = canvas.clientHeight / worldH
            return Math.min(zoomW, zoomH) * padding
        }

        switch (cameraView) {
            case 'top':
                // Top: Looking from +Z down, slight Y offset to avoid gimbal lock
                controls.setLookAt(cx, cy - 0.01, 150, cx, cy, 0, transition)
                if (projection === 'orthographic') {
                    controls.zoomTo(fitZoom(extX, extY), transition)
                } else {
                    controls.zoomTo(1, transition)
                }
                break
            case 'front':
                // Front: Looking from -Y (South) towards +Y
                controls.setLookAt(cx, cy - 100, cz, cx, cy, cz, transition)
                if (projection === 'orthographic') controls.zoomTo(fitZoom(extX, Math.max(extZ, extX * 0.4)), transition)
                else controls.zoomTo(1, transition)
                break
            case 'right': // East Side
                controls.setLookAt(cx + 150, cy, cz, cx, cy, cz, transition)
                if (projection === 'orthographic') controls.zoomTo(fitZoom(extY, Math.max(extZ, extY * 0.4)), transition)
                else controls.zoomTo(1, transition)
                break
            case 'left': // West Side
                controls.setLookAt(cx - 150, cy, cz, cx, cy, cz, transition)
                if (projection === 'orthographic') controls.zoomTo(fitZoom(extY, Math.max(extZ, extY * 0.4)), transition)
                else controls.zoomTo(1, transition)
                break
            case 'iso':
                setProjection('orthographic')
                // Fixed direction vector — keeps angle constant regardless of model size
                const dir = new THREE.Vector3(200, -150, 200).normalize()
                const isoPos = new THREE.Vector3(cx, cy, 0).addScaledVector(dir, 300)
                controls.setLookAt(isoPos.x, isoPos.y, isoPos.z, cx, cy, 0, transition)
                // ISO projection: use larger of XY extents + height, with slight extra margin
                const isoW = Math.max(extX, extY) * 1.15
                const isoH = Math.max(Math.max(extX, extY) * 0.7 + extZ * 0.7, extZ)
                controls.zoomTo(fitZoom(isoW, isoH, ISO_PADDING), transition)
                break
            default:
                if (cameraView.startsWith('custom-')) {
                    const index = parseInt(cameraView.split('-')[1])
                    const viewData = useStore.getState().savedViews[index]

                    if (viewData && viewData.position && viewData.target) {
                        const { position, target, zoom } = viewData
                        controls.setLookAt(
                            position.x, position.y, position.z,
                            target.x, target.y, target.z,
                            transition
                        )
                        if (zoom) controls.zoomTo(zoom, transition)
                    }
                }
                break
        }
    }, [viewVersion, controlsRef, setProjection, camera, cameraView, projection, sceneBounds, gl])

    // Remap mouse buttons: left=none (free for drawing), middle=orbit, right=pan (unchanged)
    useEffect(() => {
        if (!controlsRef.current) return
        const controls = controlsRef.current
        controls.mouseButtons.left = CameraControlsImpl.ACTION.NONE
        controls.mouseButtons.middle = CameraControlsImpl.ACTION.ROTATE
        // right stays as TRUCK (pan), wheel stays as DOLLY
    }, [controlsRef])

    return null
}

export default CameraHandler
