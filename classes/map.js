class Map{
	constructor(scene){
		this.size = 300;
		this.grid = [];
		this.units = [];
		this.instances = {};

		// This creates and positions a free camera (non-mesh)
		this.camera = new BABYLON.UniversalCamera('UniversalCamera', new BABYLON.Vector3(this.size / 2, 20, this.size / 2), scene);
		this.camera.rotation.x = Math.PI / 4;
		this.camera.rotation.y = Math.PI / 4;
		this.camera.attachControl(canvas, true);
		//this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
		this.camera.onViewMatrixChangedObservable.add(() => {
			
			setTimeout(() => {
				for(var ms in scene.meshes){
					ms = scene.meshes[ms];
					if (ms.name === "ground"){
						this.ground.dispose();
					}
					if (this.camera.isInFrustum(ms)) {
						ms.isVisible = true;
					} else {
						ms.isVisible = false;
					}
			
				}
			}, 10000)

		});
	
		// Lights
		const hemiLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 0, 0), scene);
		hemiLight.position = new BABYLON.Vector3(0, 0, 0);
		hemiLight.diffuse = new BABYLON.Color3(0.85,0.85,0.85);
		hemiLight.specular = new BABYLON.Color3(0.85,0.85,0.85);
		hemiLight.groundColor = new BABYLON.Color3(0.55,0.55,0.55);
		hemiLight.intensity = .6; 
		
		const light = new BABYLON.DirectionalLight('light', new BABYLON.Vector3(-1, -5, -1), scene);
		light.position = new BABYLON.Vector3(this.size, 30, this.size);
		light.intensity = .7;

		// Shadows
		this.shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
		this.shadowGenerator.useBlurExponentialShadowMap = true;
		this.shadowGenerator.useKernelBlur = true;
		this.shadowGenerator.blurKernel = 3;

		// Skybox
		/*const skybox = BABYLON.Mesh.CreateBox('skyBox', 5000.0, scene);
		const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene);
		skyboxMaterial.backFaceCulling = false;
		skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('//www.babylonjs.com/assets/skybox/TropicalSunnyDay', scene);
		skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
		skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
		skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.convertToUnIndexedMesh();*/


		this.canvas = this.generateMixTexture();	
		// Create terrain material
		this.terrainMaterial = new BABYLON.TerrainMaterial('terrainMaterial', scene);
		this.terrainMaterial.mixTexture = new BABYLON.Texture(this.getCanvasURL(this.canvas), scene);
		this.terrainMaterial.diffuseTexture1 = new BABYLON.Texture('textures/dirt.png', scene);
		this.terrainMaterial.diffuseTexture2 = new BABYLON.Texture('textures/forest.png', scene);
		this.terrainMaterial.diffuseTexture3 = new BABYLON.Texture('textures/grass.png', scene);
		this.terrainMaterial.diffuseTexture1.uScale = this.terrainMaterial.diffuseTexture1.vScale = 128;
		this.terrainMaterial.diffuseTexture2.uScale = this.terrainMaterial.diffuseTexture2.vScale = 128;
		this.terrainMaterial.diffuseTexture3.uScale = this.terrainMaterial.diffuseTexture3.vScale = 128;

		this.initInstances();
		this.initMap();
		this.afterLoad();
	}

	getCanvasURL(oldCanvas) {
		//create a new canvas
		const newCanvas = document.createElement('canvas');
		const context = newCanvas.getContext('2d');
		//set dimensions
		newCanvas.width = oldCanvas.width;
		newCanvas.height = oldCanvas.height;
		//apply the old canvas to the new one
		context.setTransform(1,0,0,-1,0,oldCanvas.height);
		context.drawImage(oldCanvas, 0, 0);
		return newCanvas.toDataURL();
	}

	generateMixTexture(){
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.height= this.size;
		canvas.width = this.size;

		ctx.beginPath();
		ctx.rect(0, 0, this.size, this.size);
		ctx.fillStyle = 'blue';
		ctx.fill();

		const chanceOfForest = 0.0007;

		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if (Math.random() < chanceOfForest){
					const cursorSize = randomRange(4, 18);
					const radgrad2 = ctx.createRadialGradient(i, j, 0, i, j, cursorSize);
					radgrad2.addColorStop(0, 'rgba(0,255,0,1)');
					radgrad2.addColorStop(0.7, 'rgba(0,255,0,.7)');
					radgrad2.addColorStop(1, 'rgba(0,255,0,0)');
					ctx.fillStyle = radgrad2;
					ctx.fillRect(0, 0, this.size, this.size);
				}
			}
		}

		return canvas;
	}

	initInstances(){
		this.instances['tree1'] = getTree();
		this.instances['kiki1'] = getKiki();
		this.instances['grass1'] = getPlant();
		this.instances['flower1'] = getPlant("white");
		this.instances['flower2'] = getPlant("yellow");
	}

	initMap(){
		const paths = [];  
		const biomesGrid = this.generateBiomesFromCanvas();
		const reliefGrid = this.generateGridRelief(biomesGrid);
		const ressourceGrid = this.generateGridResource(biomesGrid);
		for (let i = 0; i <= this.size; i++){
			const path = [];   
			for (let j = 0; j <= this.size; j++){ 
				if(!this.grid[i]){
					this.grid[i] = [];	
				}
				const y = reliefGrid[i][j];
				const vector = new BABYLON.Vector3(i, y, j);
				const type = biomesGrid[i][j];
				this.grid[i][j] = new Cell(i, y, j, this, { type });
				switch (ressourceGrid[i][j]){
					case 't':
						new Tree(i, y - .1, j, this);
						break;
					case 'g':
						new Grass(i, y - .1, j, this);
						break;
				}
				path.push(vector);
			}
			paths.push(path);
		}

		this.ground = BABYLON.MeshBuilder.CreateRibbon('ground', {pathArray: paths}, scene);
		this.ground.material = this.terrainMaterial;
		this.ground.checkCollisions = true;
		this.ground.receiveShadows = true;
		//this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0 });
		this.ground.convertToUnIndexedMesh();
		this.ground.convertToFlatShadedMesh();
	}

	
	generateBiomesFromCanvas(){
		const ctx = this.canvas.getContext('2d');
		const grid = []
		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if(!grid[i]){
					grid[i] = [];	
				}
				const imageData = ctx.getImageData(j, i, 1, 1).data;
				const rgb = [imageData[0], imageData[1], imageData[2]];
				if (rgb[0] > 150){
					grid[i][j] = 2;
				}else if (rgb[1] > 150){
					grid[i][j] = 3;
				}else{
					grid[i][j] = 1;
				}
			}
		}
		return grid;
	}

	generateGridResource(biomesGrid){
		const grid = []

		for (let i = 0; i <= this.size; i++){
			for (let j = 0; j <= this.size; j++){ 
				if(!grid[i]){
					grid[i] = [];	
				}
				const option = getBiomeOptions(biomesGrid[i][j]);
				if (Math.random() < option.chanceOfGrass){
					grid[i][j] = 'g';
				}else if (Math.random() < option.chanceOfTree){
					grid[i][j] = 't';
				}else{
					grid[i][j] = 'n';
				}
			}
		}
		return grid;

		function getBiomeOptions(biome){
			const options = {
				1: { // Plains
					chanceOfTree: 0.003,
					chanceOfGrass: 0.3,
				},
				2: { // Desert
					chanceOfTree: 0.00008,
					chanceOfGrass: 0,
				},
				3: { // Forest
					chanceOfTree: 0.2,
					chanceOfGrass: 0.005,
				}
			}
			return options[biome];
		}
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
			3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
			4, 4, 4, 4, 4, 4, 4, 4,
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

	moveCamera(dir, speed = 1){
		let angle = BABYLON.Tools.ToDegrees(this.camera.rotation.y);
		if (dir === 'up' || 'down'){
			angle += 90;
		}else{
			angle += 45;
		}
		if (angle < 0){
			angle += 360;
		}
		let rad =  BABYLON.Tools.ToRadians(angle);
		console.log(rad);
		if (dir === 'left'){
			this.camera.position.x += Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
		}else if (dir === 'right'){
			this.camera.position.x -= Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
        }
        if (dir === 'up'){
			this.camera.position.x -= Math.cos(rad) * speed;
			this.camera.position.z += Math.sin(rad) * speed;
        }else if (dir === 'down'){
			this.camera.position.x += Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
        }
		this.camBox.position.x = this.camera.position.x;
		this.camBox.position.z = this.camera.position.z;
	}

	exportCanvas(canvas){
		const link = document.createElement('a');
		link.download = 'canvas.png';
		link.href = canvas.toDataURL();
		link.click();
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
		this.units.push(new Kiki(this.size/2, this.grid[this.size/2][this.size/2].position.y, this.size/2, this));
		Object.keys(this.instances).forEach((prop) => this.instances[prop].isVisible = false);
	}
}