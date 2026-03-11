import { useState, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { loadIFCMeshes } from '../utils/ifcLoader'

const API_BASE = 'http://localhost:3001/api'
const METERS_TO_FEET = 3.28084

const ImportedModelMesh = ({ lotId, filename, x = 0, y = 0, rotation = 0, scale = 1, units = 'auto', style }) => {
  const [meshData, setMeshData] = useState(null)
  const [detectedUnits, setDetectedUnits] = useState('feet')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const groupRef = useRef()

  const currentProject = useStore(state => state.currentProject)
  const setImportedModelPosition = useStore(state => state.setImportedModelPosition)

  const faces = style?.faces
  const edges = style?.edges

  // Load IFC file
  useEffect(() => {
    if (!currentProject?.id || !filename) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const url = `${API_BASE}/projects/${encodeURIComponent(currentProject.id)}/exports/${encodeURIComponent(filename)}`

    loadIFCMeshes(url)
      .then((result) => {
        if (!cancelled) {
          console.log('[IFC Mesh] Received', result.meshes.length, 'meshes from loader, detected units:', result.detectedUnits)
          setMeshData(result.meshes)
          setDetectedUnits(result.detectedUnits)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[IFC Mesh] Load error:', err)
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [currentProject?.id, filename])

  // Resolve effective units: default is feet (no scaling). Only scale when explicitly set to meters.
  const effectiveUnits = units === 'auto' ? detectedUnits : units
  const needsScaling = effectiveUnits === 'meters'

  // Build Three.js geometries from mesh data
  const { geometries, center, zMin } = useMemo(() => {
    if (!meshData || meshData.length === 0) {
      console.log('[IFC Mesh] No mesh data to build geometries from')
      return { geometries: [], center: [0, 0, 0], zMin: 0 }
    }

    const geos = []
    const bbox = new THREE.Box3()

    for (const mesh of meshData) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.positions), 3))
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(mesh.normals), 3))
      geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1))

      // Apply the placement transform
      const mat = new THREE.Matrix4()
      mat.fromArray(mesh.transform)
      geo.applyMatrix4(mat)

      // Scale meters → feet only if source is in meters
      if (needsScaling) {
        const scaleMat = new THREE.Matrix4().makeScale(METERS_TO_FEET, METERS_TO_FEET, METERS_TO_FEET)
        geo.applyMatrix4(scaleMat)
      }

      // Y-up → Z-up: IFC uses Y-up, our app uses Z-up (XY = ground, Z = height)
      // +90° X rotation: (x, y, z) → (x, -z, y) — IFC Y (height) becomes our Z (vertical)
      const yUpToZUp = new THREE.Matrix4().makeRotationX(Math.PI / 2)
      geo.applyMatrix4(yUpToZUp)

      geo.computeBoundingBox()
      bbox.union(geo.boundingBox)

      geos.push({ geometry: geo, color: mesh.color })
    }

    // Compute center for auto-centering
    const c = new THREE.Vector3()
    bbox.getCenter(c)
    const size = new THREE.Vector3()
    bbox.getSize(size)

    // Auto-detect meters: if units='auto', no scaling was applied, and max dimension < 15
    // (a building under 15ft is implausible), assume the file is in meters and scale up
    const maxDim = Math.max(size.x, size.y, size.z)
    if (units === 'auto' && !needsScaling && maxDim < 15 && maxDim > 0.5) {
      console.log('[IFC Mesh] Auto-detected meters (maxDim:', maxDim.toFixed(2), '< 15ft). Scaling to feet.')
      const scaleMat = new THREE.Matrix4().makeScale(METERS_TO_FEET, METERS_TO_FEET, METERS_TO_FEET)
      for (const g of geos) {
        g.geometry.applyMatrix4(scaleMat)
        g.geometry.computeBoundingBox()
      }
      // Recompute bbox after scaling
      bbox.makeEmpty()
      for (const g of geos) {
        bbox.union(g.geometry.boundingBox)
      }
      bbox.getCenter(c)
      bbox.getSize(size)
    }

    console.log('[IFC Mesh] Built', geos.length, 'geometries')
    console.log('[IFC Mesh] Effective units:', effectiveUnits, '| Scaled:', needsScaling)
    console.log('[IFC Mesh] BBox min:', bbox.min.toArray().map(v => v.toFixed(2)), '→ max:', bbox.max.toArray().map(v => v.toFixed(2)))
    console.log('[IFC Mesh] Dimensions (ft):', size.x.toFixed(1), 'W ×', size.y.toFixed(1), 'D ×', size.z.toFixed(1), 'H')
    console.log('[IFC Mesh] Center:', [c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2)])
    return { geometries: geos, center: [c.x, c.y, c.z], zMin: bbox.min.z }
  }, [meshData, needsScaling, effectiveUnits, units])

  // Dispose geometries on unmount
  useEffect(() => {
    return () => {
      for (const g of geometries) {
        g.geometry.dispose()
      }
    }
  }, [geometries])

  if (!currentProject?.id || !filename) { console.log('[IFC Mesh] No project or filename'); return null }
  if (loading) return null
  if (error) { console.log('[IFC Mesh] Error state:', error); return null }
  if (geometries.length === 0) { console.log('[IFC Mesh] No geometries built'); return null }

  const faceColor = faces?.color ?? null
  const faceOpacity = faces?.opacity ?? 1.0
  const edgesVisible = edges?.visible ?? true
  const edgeColor = edges?.color ?? '#000000'
  const edgeWidth = edges?.width ?? 1.5
  const edgeOpacity = edges?.opacity ?? 1.0

  return (
    <group
      ref={groupRef}
      position={[x, y, 0.102]}
      rotation={[0, 0, rotation]}
      scale={[scale, scale, scale]}
    >
      {/* Center horizontally (XY), ground vertically (floor at Z=0) */}
      <group position={[-center[0], -center[1], -zMin]}>
        {geometries.map((g, i) => (
          <mesh key={i} geometry={g.geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color={faceColor ? faceColor : new THREE.Color(g.color.r, g.color.g, g.color.b)}
              opacity={faceOpacity}
              transparent={faceOpacity < 1}
              depthWrite={faceOpacity >= 0.95}
              side={THREE.DoubleSide}
              flatShading
            />
            {edgesVisible && (
              <Edges
                linewidth={edgeWidth}
                threshold={15}
                color={edgeColor}
                transparent={edgeOpacity < 1}
                opacity={edgeOpacity}
              />
            )}
          </mesh>
        ))}
      </group>
    </group>
  )
}

export default ImportedModelMesh
