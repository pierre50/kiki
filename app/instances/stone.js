import { AbstractMesh, Color3, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core'

export function getStone(scene) {
  const height = 1
  const bush = getBush(height)
  const berries = [getBerry(0, -1, 0), getBerry(-0.5, -1.5, 0), getBerry(0, -1.5, -0.5)]
  const mesh = Mesh.MergeMeshes([bush, ...berries], true, true, undefined, false, true)

  mesh.receiveShadows = true
  mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
  mesh.doNotSyncBoundingInfo = false
  mesh.ignoreNonUniformScaling = true
  mesh.convertToUnIndexedMesh()
  mesh.convertToFlatShadedMesh()
  mesh.freezeWorldMatrix()
  return mesh

  function getBush() {
    const options = {
      width: 1,
      height: 1,
      depth: 1,
    }

    const material = new StandardMaterial('material', scene)
    material.diffuseColor = Color3.FromHexString('#999999')
    material.freeze()

    const mesh = new MeshBuilder.CreateBox('bush', options, scene)
    mesh.material = material
    mesh.position.y = -1.5

    return mesh
  }
  function getBerry(x, y, z) {
    const options = {
      width: 0.5,
      height: 0.5,
      depth: 0.5,
    }

    const material = new StandardMaterial('material', scene)
    material.diffuseColor = Color3.FromHexString('#D1D1D1')
    material.freeze()

    const mesh = new MeshBuilder.CreateBox('berry', options, scene)
    mesh.material = material
    mesh.position.x = x
    mesh.position.y = y
    mesh.position.z = z

    return mesh
  }
}
