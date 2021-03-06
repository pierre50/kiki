function getKiki() {
    const body = getBody();
    const eyes = getEyes();
    const mesh = new BABYLON.Mesh.MergeMeshes([body, eyes], true, true, undefined, false, true);
    mesh.receiveShadows = true;
    mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
    mesh.doNotSyncBoundingInfo = false;
    mesh.ignoreNonUniformScaling = true;
    mesh.convertToUnIndexedMesh();
    mesh.convertToFlatShadedMesh();
    mesh.freezeWorldMatrix();
    return mesh;

    function getBody() {
        const options = {
            height: 0.5,
            width: 0.5,
            depth: 0.8
        }

        const material = new BABYLON.StandardMaterial('material', scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#d2c9ac');
        material.freeze();

        const body = BABYLON.MeshBuilder.CreateBox('body', options, scene);
        body.material = material;

        return body;
    }
    function getEyes() {
        const options = {
            height: 0.1,
            width: 0.1,
            depth: 0.1,
        }

        const material = new BABYLON.StandardMaterial('material', scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#00000');
        material.freeze();

        const eye1 = BABYLON.MeshBuilder.CreateBox('eye', options, scene);
        eye1.material = material;
        eye1.position.z = 0.2;
        eye1.position.y = 0.3;
        eye1.position.x = -0.1;

        const eye2 = BABYLON.MeshBuilder.CreateBox('eye', options, scene);
        eye1.material = material;
        eye2.position.z = 0.2;
        eye2.position.y = 0.3;
        eye2.position.x = 0.1;

        return new BABYLON.Mesh.MergeMeshes([eye1, eye2], true, true, undefined, false, true);
    }
}