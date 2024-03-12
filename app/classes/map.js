import { AbstractMesh, Color3, DirectionalLight, HemisphericLight, MeshBuilder, ShadowGenerator, Texture, Vector3 } from '@babylonjs/core';
import { TerrainMaterial } from '@babylonjs/materials';
import { getPlainCellsAroundPoint, pointsDistance, randomItem, randomRange } from '../libs/utils';
import Cell from './cell';
import { Resource } from './resource';

export default class Map {
	constructor(context) {
		const { scene } = context
		this.context = context;
		this.size = 500;
		this.grid = [];
		this.units = [];
		
		// Lights
		const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 0, 0), scene);
		hemiLight.position = new Vector3(0, 0, 0);
		hemiLight.diffuse = new Color3(0.85, 0.85, 0.85);
		hemiLight.specular = new Color3(0.85, 0.85, 0.85);
		hemiLight.groundColor = new Color3(0.55, 0.55, 0.55);
		hemiLight.intensity = 0.2;

		const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
		light.position = new Vector3(this.size, 50, this.size);
		light.intensity = 1;

		// Shadows
		this.shadowGenerator = new ShadowGenerator(1024 * 2, light, true);
		this.shadowGenerator.setDarkness(0.5);

		this.canvas = this.generateMixTexture();
		// Create terrain material
		this.terrainMaterial = new TerrainMaterial('terrainMaterial', scene);
		this.terrainMaterial.mixTexture = new Texture(this.getCanvasURL(this.canvas), scene);
		this.terrainMaterial.diffuseTexture1 = new Texture('textures/dirt.png', scene);
		this.terrainMaterial.diffuseTexture2 = new Texture('textures/forest.png', scene);
		this.terrainMaterial.diffuseTexture3 = new Texture('textures/grass.png', scene);
		this.terrainMaterial.diffuseTexture1.uScale = this.terrainMaterial.diffuseTexture1.vScale = 128;
		this.terrainMaterial.diffuseTexture2.uScale = this.terrainMaterial.diffuseTexture2.vScale = 128;
		this.terrainMaterial.diffuseTexture3.uScale = this.terrainMaterial.diffuseTexture3.vScale = 128;
	}

	getCanvasURL(oldCanvas) {
		//create a new canvas
		const newCanvas = document.createElement('canvas');
		const context = newCanvas.getContext('2d');
		//set dimensions
		newCanvas.width = oldCanvas.width;
		newCanvas.height = oldCanvas.height;
		//apply the old canvas to the new one
		context.setTransform(1, 0, 0, -1, 0, oldCanvas.height);
		context.drawImage(oldCanvas, 0, 0);
		return newCanvas.toDataURL();
	}

	generateMixTexture() {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.height = this.size;
		canvas.width = this.size;

		ctx.beginPath();
		ctx.rect(0, 0, this.size, this.size);
		ctx.fillStyle = 'blue';
		ctx.fill();

		const chanceOfForest = 0.0007;

		for (let i = 0; i <= this.size; i++) {
			for (let j = 0; j <= this.size; j++) {
				if (Math.random() < chanceOfForest) {
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

	generateMap() {
		const { scene } = this.context
		const paths = [];
		const biomesGrid = this.generateBiomesFromCanvas();
		const reliefGrid = this.generateGridRelief(biomesGrid);
		const ressourceGrid = this.generateGridResource(biomesGrid);
		for (let i = 0; i <= this.size; i++) {
			const path = [];
			for (let j = 0; j <= this.size; j++) {
				if (!this.grid[i]) {
					this.grid[i] = [];
				}
				const y = reliefGrid[i][j];
				const vector = new Vector3(i, y, j);
				let type 
				switch (biomesGrid[i][j]){
					case 3:
						type = 'Desert'
						break;
					default: 
						type = 'Grass'
				}
				this.grid[i][j] = new Cell({x: i, y, z: j, type }, this.context);
				switch (ressourceGrid[i][j]) {
					case 't':
						new Resource({x: i, y: y - .1, z: j, type: "Tree"}, this.context);
						break;
				}
				path.push(vector);
			}
			paths.push(path);
		}

		this.ground = MeshBuilder.CreateRibbon('ground', { pathArray: paths }, scene);
		this.ground.material = this.terrainMaterial;
		this.ground.checkCollisions = true;
		this.ground.receiveShadows = true;
		this.ground.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
		this.ground.doNotSyncBoundingInfo = false;
		this.ground.convertToUnIndexedMesh();
		this.ground.convertToFlatShadedMesh();
		this.ground.freezeWorldMatrix();
	}

	generateBiomesFromCanvas() {
		const ctx = this.canvas.getContext('2d');
		const grid = []
		for (let i = 0; i <= this.size; i++) {
			for (let j = 0; j <= this.size; j++) {
				if (!grid[i]) {
					grid[i] = [];
				}
				const imageData = ctx.getImageData(j, i, 1, 1).data;
				const rgb = [imageData[0], imageData[1], imageData[2]];
				if (rgb[0] > 150) {
					grid[i][j] = 2;
				} else if (rgb[1] > 150) {
					grid[i][j] = 3;
				} else {
					grid[i][j] = 1;
				}
			}
		}
		return grid;
	}

	generateGridResource(biomesGrid) {
		const grid = []

		for (let i = 0; i <= this.size; i++) {
			for (let j = 0; j <= this.size; j++) {
				if (!grid[i]) {
					grid[i] = [];
				}
				const option = getBiomeOptions(biomesGrid[i][j]);
				if (Math.random() < option.chanceOfGrass) {
					grid[i][j] = 'g';
				} else if (Math.random() < option.chanceOfTree) {
					grid[i][j] = 't';
				} else {
					grid[i][j] = 'n';
				}
			}
		}
		return grid;

		function getBiomeOptions(biome) {
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

	generateGridRelief() {
		const grid = []
		for (let i = 0; i <= this.size; i++) {
			for (let j = 0; j <= this.size; j++) {
				if (!grid[i]) {
					grid[i] = [];
				}
				const y = Math.random() / 4;
				grid[i][j] = y;
			}
		}
		const chanceOfRelief = .005;
		const reliefPattern = [
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
			3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
			4, 4, 4, 4, 4, 4, 4, 4,
			5, 5, 5, 5,
			6, 6,
			7,
		];
		for (let i = 0; i <= this.size; i++) {
			for (let j = 0; j <= this.size; j++) {
				if (Math.random() < chanceOfRelief) {
					const level = randomItem(reliefPattern);
					const cursorSize = level * randomRange(1, 6);
					const type = randomItem(algoLine());
					if (getPlainCellsAroundPoint(i, j, grid, cursorSize, (cell) => {
						const pointDistance = pointsDistance(cell.x, cell.z, i, j);
						if (pointDistance < cursorSize) {
							const calc = type(pointDistance, cursorSize, level)
							grid[cell.x][cell.z] = grid[cell.x][cell.z] < calc ? (calc + Math.random() / 4) : grid[cell.x][cell.z];
						}
					}, true));
				}
			}
		}

		function algoLine() {
			return [
				(x, r, c) => -(Math.pow(5, -2) * (5 * 2)) * x + c,
				(x, r, c) => (-x / (r + r)) * x + c,
			]
		}
		return grid;
	}

	moveCamera(dir, speed = 1) {
		let angle = Tools.ToDegrees(this.camera.rotation.y);
		if (dir === 'up' || 'down') {
			angle += 90;
		} else {
			angle += 45;
		}
		if (angle < 0) {
			angle += 360;
		}
		let rad = Tools.ToRadians(angle);
		if (dir === 'left') {
			this.camera.position.x += Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
		} else if (dir === 'right') {
			this.camera.position.x -= Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
		}
		if (dir === 'up') {
			this.camera.position.x -= Math.cos(rad) * speed;
			this.camera.position.z += Math.sin(rad) * speed;
		} else if (dir === 'down') {
			this.camera.position.x += Math.cos(rad) * speed;
			this.camera.position.z -= Math.sin(rad) * speed;
		}
		this.camBox.position.x = this.camera.position.x;
		this.camBox.position.z = this.camera.position.z;
	}

	exportCanvas(canvas) {
		const link = document.createElement('a');
		link.download = 'canvas.png';
		link.href = canvas.toDataURL();
		link.click();
	}

	exportGrid(grid) {
		const { size } = this;
		const link = document.createElement('a');
		link.setAttribute('download', 'map.txt');
		link.href = makeMapFile();
		link.click();
		function makeMapFile() {
			let textFile;
			let text = '';
			for (let i = 0; i <= size; i++) {
				for (let j = 0; j <= size; j++) {
					text += grid[i][j];
				}
				text += '\n';
			}
			var data = new Blob([text], { type: 'text/plain' });
			if (textFile) {
				window.URL.revokeObjectURL(textFile);
			}
			textFile = window.URL.createObjectURL(data);
			return textFile;
		}
	}
}