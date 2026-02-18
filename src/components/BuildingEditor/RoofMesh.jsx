import { useMemo } from 'react'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { generateRoofGeometry } from '../../utils/roofGeometry'

// Renders roof geometry on top of building
const RoofMesh = ({
    vertices,
    roofSettings,
    baseZ,
    maxHeight,
    styles,
    lineScale = 1,
    scaleFactor = 1,
}) => {
    const { roofFaces, roofEdges } = styles

    // Determine ridge height
    const ridgeZ = useMemo(() => {
        if (roofSettings.overrideHeight && roofSettings.ridgeHeight != null) {
            return roofSettings.ridgeHeight
        }
        return maxHeight
    }, [roofSettings.overrideHeight, roofSettings.ridgeHeight, maxHeight])

    // Generate roof geometry
    const geometry = useMemo(() => {
        if (!vertices || vertices.length < 3) return null
        if (roofSettings.type === 'flat') return null
        if (ridgeZ <= baseZ) return null

        return generateRoofGeometry(vertices, roofSettings.type, baseZ, ridgeZ, {
            ridgeDirection: roofSettings.ridgeDirection,
            shedDirection: roofSettings.shedDirection,
        })
    }, [vertices, roofSettings.type, baseZ, ridgeZ, roofSettings.ridgeDirection, roofSettings.shedDirection])

    if (!geometry) return null

    return (
        <group>
            <mesh castShadow receiveShadow renderOrder={4}>
                <primitive object={geometry} attach="geometry" />
                <meshStandardMaterial
                    color={roofFaces.color}
                    transparent={roofFaces.opacity < 1}
                    opacity={roofFaces.opacity}
                    side={THREE.DoubleSide}
                    depthWrite={roofFaces.opacity >= 0.95}
                    roughness={0.7}
                    metalness={0.1}
                />
                {roofEdges.visible && (
                    <Edges
                        linewidth={roofEdges.width * scaleFactor * lineScale}
                        threshold={15}
                        color={roofEdges.color}
                        transparent
                        opacity={roofEdges.opacity}
                    />
                )}
            </mesh>
        </group>
    )
}

export default RoofMesh
