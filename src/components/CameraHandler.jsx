import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'

const CameraHandler = ({ controlsRef }) => {
    const cameraView = useStore((state) => state.viewSettings.cameraView)
    const viewVersion = useStore((state) => state.viewSettings.viewVersion) // Trigger for updates
    const projection = useStore((state) => state.viewSettings.projection)
    const setProjection = useStore((state) => state.setProjection)
    const { camera } = useThree()

    useEffect(() => {
        if (!controlsRef.current) return

        const controls = controlsRef.current
        const transition = true

        // Note: We deliberately DO NOT force Perspective on Top/Front/Side views anymore.
        // This allows the user to stay in their preferred mode (2D or 3D).
        // ISO view default logic is handled in the switch case.

        // Enforce Z-Up always to prevent rotation issues
        camera.up.set(0, 0, 1)
        camera.updateProjectionMatrix()

        switch (cameraView) {
            case 'top':
                // Top: Looking from +Z down
                // Offset Y slightly to avoid gimbal lock singularity with Z-Up
                // Center model at Y=50
                controls.setLookAt(0, 49.99, 150, 0, 50, 0, transition)
                // Orthographic Zoom Handling: Distance doesn't affect scale, Zoom does.
                if (projection === 'orthographic') {
                    controls.zoomTo(6, transition)
                } else {
                    controls.zoomTo(1, transition)
                }
                break
            case 'front':
                // Front: Looking from -Y (South) towards +Y
                // Shift Pos/Target Y by +50.
                controls.setLookAt(0, -50, 20, 0, 50, 20, transition)
                if (projection === 'orthographic') controls.zoomTo(6, transition)
                else controls.zoomTo(1, transition)
                break
            case 'right': // East Side
                // Shift Pos/Target Y by +50
                controls.setLookAt(150, 50, 20, 0, 50, 20, transition)
                if (projection === 'orthographic') controls.zoomTo(6, transition)
                else controls.zoomTo(1, transition)
                break
            case 'left': // West Side
                // Shift Pos/Target Y by +50 (Pos Y was 0, now 50)
                controls.setLookAt(-150, 50, 20, 0, 50, 20, transition)
                if (projection === 'orthographic') controls.zoomTo(6, transition)
                else controls.zoomTo(1, transition)
                break
            case 'iso':
                setProjection('orthographic')
                // Iso: Balanced X, -Y, Z. Shift Y by +50.
                // Orig Pos: 200, -200, 200. New Pos: 200, -150, 200.
                controls.setLookAt(200, -150, 200, 0, 50, 0, transition)
                controls.zoomTo(6, transition)
                break
            default:
                if (cameraView.startsWith('custom-')) {
                    const index = parseInt(cameraView.split('-')[1])
                    const viewData = useStore.getState().savedViews[index]

                    if (viewData) {
                        // Restore saved view
                        // If it was saved in Ortho, should we switch to Ortho?
                        // For now, let's respect the current projection or maybe store projection too?
                        // Let's just restore position/target.
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
    }, [viewVersion, controlsRef, setProjection, camera, cameraView, projection]) // Depend on version

    return null
}

export default CameraHandler
