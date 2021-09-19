class Map{
	constructor(scene){
		this.size = 100;
		this.grid = [];
		this.units = [];
		this.instances = {};

		// This creates and positions a free camera (non-mesh)
		this.camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 10, 0), scene);
		this.camera.attachControl(canvas, true);

		/*this.camBox = new BABYLON.Mesh.CreateBox('box', 20, scene);
        let material = new BABYLON.StandardMaterial("material", scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#d2c9ac');
        material.wireframe = true;

        this.camBox.material = material;
		this.camBox.position.x = this.size / 2;
		this.camBox.position.z = this.size / 2;*/

		// Lights
		const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 0, 0), scene);
		hemiLight.position = new BABYLON.Vector3(0, 0, 0);
		hemiLight.diffuse = new BABYLON.Color3(0.85,0.85,0.85);
		hemiLight.specular = new BABYLON.Color3(0.85,0.85,0.85);
		hemiLight.groundColor = new BABYLON.Color3(0.55,0.55,0.55);
		hemiLight.intensity = .6; 
		
		const light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(-1, -5, -1), scene);
		light.position = new BABYLON.Vector3(this.size, 30, this.size);
		light.intensity = .7;

		// Shadows
		this.shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
		this.shadowGenerator.useBlurExponentialShadowMap = true;
		this.shadowGenerator.useKernelBlur = true;
		this.shadowGenerator.blurKernel = 3;

		// Skybox
		/*const skybox = BABYLON.Mesh.CreateBox('skyBox', 5000.0, scene)
		const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene)
		skyboxMaterial.backFaceCulling = false
		skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('//www.babylonjs.com/assets/skybox/TropicalSunnyDay', scene)
		skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
		skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0)
		skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0)
		skyboxMaterial.disableLighting = true
		skybox.material = skyboxMaterial*/

		// Create terrain material
		
		this.terrainMaterial = new BABYLON.TerrainMaterial("terrainMaterial", scene);
		this.terrainMaterial.mixTexture = new BABYLON.Texture("textures/mixMap.jpg", scene);
		this.terrainMaterial.diffuseTexture1 = new BABYLON.Texture("textures/grass.png", scene);
		this.terrainMaterial.diffuseTexture2 = new BABYLON.Texture("textures/grass.png", scene);
		this.terrainMaterial.diffuseTexture3 = new BABYLON.Texture("textures/grass.png", scene);
		this.terrainMaterial.diffuseTexture1.uScale = this.terrainMaterial.diffuseTexture1.vScale = 128;
		this.terrainMaterial.diffuseTexture2.uScale = this.terrainMaterial.diffuseTexture2.vScale = 128;
		this.terrainMaterial.diffuseTexture3.uScale = this.terrainMaterial.diffuseTexture3.vScale = 128;
		
		this.initInstances();
		this.initMap();
		this.afterLoad();
	}
	initInstances(){
		this.instances["leaves1"] = getLeaves();
		this.instances["trunk1"] = getTrunk();
	}
	initMap(){
		const paths = [];  
		const reliefGrid = this.generateGridRelief();
		const ressourceGrid = this.generateGridResource();
		for (let i = 0; i <= this.size; i++){
			const path = [];   
			for (let j = 0; j <= this.size; j++){ 
				if(!this.grid[i]){
					this.grid[i] = [];	
				}
				const y = reliefGrid[i][j];
				const vector = new BABYLON.Vector3(i, y, j)
				this.grid[i][j] = new Grass(i, y, j, this);
				if (ressourceGrid[i][j] === "t"){
					new Tree(i, y - .1, j, this);
				}
				path.push(vector);
			}
			paths.push(path);
		}

		this.ground = BABYLON.MeshBuilder.CreateRibbon("ground", {pathArray: paths}, scene);
		this.ground.material = this.terrainMaterial;
		this.ground.checkCollisions = true;
		this.ground.receiveShadows = true;
		//this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0 });
		this.ground.convertToUnIndexedMesh();
		this.ground.convertToFlatShadedMesh();
	}
	generateGridResource(){
		const grid = []
		const chanceOfForest = .004;
		const chanceOfSet = .01;
		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if(!grid[i]){
					grid[i] = [];	
				}
	 
				if (Math.random() < chanceOfSet){
					grid[i][j] = "t";
				}else{
					grid[i][j] = "n";
				}
			}
		}
		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if (Math.random() < chanceOfForest){
					const cursorSize = randomRange(4, 18);
					if (getPlainCellsAroundPoint(i, j, grid, cursorSize, (cell) => {
						let pointDistance = pointsDistance(i, j, cell.x, cell.z);
						if (pointDistance < cursorSize && Math.random() > .1 * (pointDistance * 2)){
							grid[cell.x][cell.z] = "t";
						}
					}, true));
				}
			}
		}
		return grid;
	}
	generateGridRelief(){
		const grid = []
		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if(!grid[i]){
					grid[i] = [];	
				}
				const y = Math.random() / 2;
				grid[i][j] = y;
			}
		}
		const chanceOfRelief = .01;
		const reliefPattern = [
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 
			3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
			4, 4, 4, 4, 4, 4, 4, 4, 4,
			5, 5, 5, 5,
			6, 6,
			7, 
		];
		for(let i = 0; i <= this.size; i++){
			for(let j = 0; j <= this.size; j++){
				if (Math.random() < chanceOfRelief){
					const level = randomItem(reliefPattern);
					const cursorSize = level * randomRange(1, 4);
					const type = randomItem(algoLine()); 
					if (getPlainCellsAroundPoint(i, j, grid, cursorSize, (cell) => {
						const pointDistance = pointsDistance(cell.x, cell.z, i, j);
						if (pointDistance < cursorSize){
							const calc = type(pointDistance, cursorSize, level)
							grid[cell.x][cell.z] = grid[cell.x][cell.z] < calc ? (calc + Math.random() / 2) : grid[cell.x][cell.z];
						}
					}, true));
				}
			}
		}

		function algoLine(){
			return [
				(x, r, c) => -(Math.pow(5, -2) * (5 * 2)) * x + c,
				(x, r, c) => (-x / (r + r )) * x + c,
			]
		}
		return grid;
	}

	exportGrid(grid){
		const { size } = this;
		const link = document.createElement('a');
		link.setAttribute('download', 'map.txt');
		link.href = makeMapFile();
		link.click();
		function makeMapFile(){
			let textFile;
			let text = '';
			for (let i = 0; i <= size; i++){
				for (let j = 0; j <= size; j++){
					text += grid[i][j];
				}
				text += '\n';
			}
			var data = new Blob([text], {type: 'text/plain'});
			if (textFile) {
				window.URL.revokeObjectURL(textFile);
			}
			textFile = window.URL.createObjectURL(data);
			return textFile;
		}
	}

	afterLoad(){
		window.camera = this.camera;
		this.units.push(new Kiki(this.size/2, this.grid[this.size/2][this.size/2].position.y, this.size/2, this));
		Object.keys(this.instances).forEach((prop) => this.instances[prop].isVisible = false);
	}
}