

function getTree(){
    const height = 4;
    const trunk = getTrunk(height);
    const leaves = getLeaves(height);
    const mesh = new BABYLON.Mesh.MergeMeshes([trunk, leaves], true, true, undefined, false, true);
    mesh.convertToUnIndexedMesh();
    mesh.convertToFlatShadedMesh();
    return mesh;
    
    function getTrunk(height){
        const options = {
            height: height, 
            width: .5,
            depth: .5,
        }

        const material = new BABYLON.StandardMaterial('material', scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#52392a');
        material.freeze();

        const trunk = BABYLON.MeshBuilder.CreateBox('trunk', options, scene);
        trunk.material = material;

        return trunk;
    }

    function getLeaves(height){
        const options = {
            width: 2,
            height: 2,
            depth: 2,
        }

        const material = new BABYLON.StandardMaterial('material', scene);
        material.diffuseColor = new BABYLON.Color3.FromHexString('#183d18');
        material.freeze();
        
        const leaves = BABYLON.MeshBuilder.CreateBox('leaves', options, scene)
        leaves.material = material;
        leaves.position.y = height / 2;
   
        return leaves;
    }
} 