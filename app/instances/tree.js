import { AbstractMesh, Color3, Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";

export function getTree(scene) {
    const height = 4;
    const trunk = getTrunk(height);
    const leaves = getLeaves(height);
    const mesh = Mesh.MergeMeshes([trunk, leaves], true, true, undefined, false, true);

    mesh.receiveShadows = true;
    mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    mesh.doNotSyncBoundingInfo = false;
    mesh.ignoreNonUniformScaling = true;
    mesh.convertToUnIndexedMesh();
    mesh.convertToFlatShadedMesh();
    mesh.freezeWorldMatrix();
    return mesh;

    function getTrunk(height) {
        const options = {
            height: height,
            width: .5,
            depth: .5,
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#52392a');
        material.freeze();

        const mesh = new MeshBuilder.CreateBox('trunk', options, scene);
        mesh.material = material;

        return mesh;
    }

    function getLeaves(height) {
        const options = {
            width: 2,
            height: 2,
            depth: 2,
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#183d18');
        material.freeze();

        const mesh = new MeshBuilder.CreateBox('leaves', options, scene)
        mesh.material = material;
        mesh.position.y = height / 2;

        return mesh;
    }
} 