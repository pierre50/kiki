import { AbstractMesh, Color3, Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";

export function getVillager(scene) {
    const mesh = Mesh.MergeMeshes([getBody(), getEyes(), getPants()], true, true, undefined, false, true);
    mesh.receiveShadows = true;
    mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    mesh.doNotSyncBoundingInfo = false;
    mesh.ignoreNonUniformScaling = true;
    mesh.convertToUnIndexedMesh();
    mesh.convertToFlatShadedMesh();
    mesh.freezeWorldMatrix();
    return mesh;

    function getBody() {
        const options = {
            height: 2,
            width: 0.5,
            depth: 0.5
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#FAB573');
        material.freeze();

        const mesh = MeshBuilder.CreateBox('body', options, scene);
        mesh.material = material;

        return mesh;
    }
    function getPants() {
        const options = {
            height: 0.4,
            width: 0.6,
            depth: 0.6
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#ff0000');
        material.freeze();

        const mesh = MeshBuilder.CreateBox('body', options, scene);
        mesh.material = material;
        mesh.position.y = 0.3;
        return mesh;
    }
    function getEyes() {
        const options = {
            height: 0.2,
            width: 0.1,
            depth: 0.1,
        }

        const material = new StandardMaterial('material', scene);
        material.diffuseColor = Color3.FromHexString('#00000');
        material.freeze();

        const eye1 = MeshBuilder.CreateBox('eye', options, scene);
        eye1.material = material;
        eye1.position.z = 0.2;
        eye1.position.y = 0.8;
        eye1.position.x = -0.1;

        const eye2 = MeshBuilder.CreateBox('eye', options, scene);
        eye1.material = material;
        eye2.position.z = 0.2;
        eye2.position.y = 0.8;
        eye2.position.x = 0.1;

        return Mesh.MergeMeshes([eye1, eye2], true, true, undefined, false, true);
    }
}