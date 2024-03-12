
function getPlant(color = "green") {
	const colors = {
		yellow: '#e9dd73',
		green: '#778737',
		red: '#f17c7c',
		white: '#eeeaea'
	}
	const dist = 2;
	const options = {
		height: 0.5,
		width: 0.1,
		depth: 0.1,
	}

	const material = new BABYLON.StandardMaterial('material', scene);
	material.diffuseColor = BABYLON.Color3.FromHexString(colors[color]);
	material.freeze();

	const grass1 = BABYLON.MeshBuilder.CreateBox('grass1', options, scene);
	grass1.material = material;
	grass1.position.x = (-0.1 * dist);
	grass1.position.z = (0.3 * dist) - 0.5;

	const grass2 = BABYLON.MeshBuilder.CreateBox('grass2', options, scene);
	grass2.material = material;
	grass2.position.x = (0 * dist);
	grass2.position.z = (0.2 * dist) - 0.5;

	const grass3 = BABYLON.MeshBuilder.CreateBox('grass3', options, scene);
	grass3.material = material;
	grass3.position.x = (0.1 * dist);
	grass3.position.z = (0.3 * dist) - 0.5;

	const mesh = new BABYLON.Mesh.MergeMeshes([grass1, grass2, grass3]);
	grass1.convertToUnIndexedMesh();
	grass1.convertToFlatShadedMesh();

	return grass1;
} 
