import * as WebIFC from 'web-ifc'

let initPromise = null

export async function initIFC() {
  if (!initPromise) {
    initPromise = (async () => {
      const api = new WebIFC.IfcAPI()
      api.SetWasmPath('/')
      await api.Init()
      console.log('[IFC] WASM initialized')
      return api
    })()
  }
  return initPromise
}

export async function loadIFCMeshes(url) {
  const api = await initIFC()
  console.log('[IFC] Fetching:', url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch IFC: ${response.status}`)
  const buffer = await response.arrayBuffer()
  console.log('[IFC] File loaded:', buffer.byteLength, 'bytes')

  // web-ifc normalizes ALL geometry to meters internally, regardless of file units
  const detectedUnits = 'meters'
  console.log('[IFC] Units: meters (web-ifc always normalizes to meters)')

  const modelID = api.OpenModel(new Uint8Array(buffer))
  if (modelID < 0) throw new Error('web-ifc failed to open IFC model')
  console.log('[IFC] Model opened, ID:', modelID)

  const meshes = []
  let meshCallbackCount = 0

  api.StreamAllMeshes(modelID, (mesh) => {
    meshCallbackCount++
    const placedGeometries = mesh.geometries
    for (let i = 0; i < placedGeometries.size(); i++) {
      const pg = placedGeometries.get(i)
      const geomData = api.GetGeometry(modelID, pg.geometryExpressID)

      const verts = api.GetVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize())
      const indices = api.GetIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize())

      // Skip empty geometries
      if (verts.length === 0 || indices.length === 0) {
        geomData.delete()
        continue
      }

      // verts is [x, y, z, nx, ny, nz, ...] — 6 floats per vertex
      const vertexCount = verts.length / 6
      const positions = new Float32Array(vertexCount * 3)
      const normals = new Float32Array(vertexCount * 3)
      for (let v = 0; v < vertexCount; v++) {
        positions[v * 3] = verts[v * 6]
        positions[v * 3 + 1] = verts[v * 6 + 1]
        positions[v * 3 + 2] = verts[v * 6 + 2]
        normals[v * 3] = verts[v * 6 + 3]
        normals[v * 3 + 1] = verts[v * 6 + 4]
        normals[v * 3 + 2] = verts[v * 6 + 5]
      }

      // Copy transform to plain JS array BEFORE CloseModel invalidates WASM memory
      const flatTransform = Array.from(pg.flatTransformation)

      // Extract color — default alpha to 1.0 when 0, undefined, or NaN
      const alpha = (pg.color.w > 0 && !isNaN(pg.color.w)) ? pg.color.w : 1.0
      const color = {
        r: pg.color.x,
        g: pg.color.y,
        b: pg.color.z,
        a: alpha,
      }

      meshes.push({
        positions,
        normals,
        indices: new Uint32Array(indices),
        transform: flatTransform,
        color,
      })

      geomData.delete()
    }
  })

  console.log('[IFC] StreamAllMeshes done — callbacks:', meshCallbackCount, 'meshes:', meshes.length)
  api.CloseModel(modelID)
  return { meshes, detectedUnits }
}
