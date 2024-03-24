import { AbstractMesh, Color3, Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";

export function getBarracks(scene) {
    const height = 2;
    const trunk = getTrunk(height);
    const mesh = Mesh.MergeMeshes([trunk], true, true, undefined, false, true);

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
            width: 3,
            depth: 3,
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#ff0000');
        material.freeze();

        const trunk = new MeshBuilder.CreateBox('trunk', options, scene);
        trunk.material = material;

        return trunk;
    }
} 