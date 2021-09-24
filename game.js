const canvas = document.getElementById('renderCanvas');
const divFps = document.getElementById('fps');

var engine = null;
var scene = null;
var sceneToRender = null;
var createDefaultEngine = function() { return new BABYLON.Engine(canvas, false); };
var createScene = function () {
	// This creates a basic Babylon Scene object (non-mesh)
	const scene = new BABYLON.Scene(engine);
	//scene.enablePhysics();
	//scene.collisionsEnabled = true;
	scene.blockMaterialDirtyMechanism = true;
	scene.clearColor = BABYLON.Color3.Black();
	scene.getAnimationRatio();

	const map = new Map(scene);
	document.addEventListener('keydown', (evt) => {
        switch (evt.code){
            case 'ArrowLeft': 
                map.moveCamera('left');
                break;
            case 'ArrowRight': 
                map.moveCamera('right');
                break;  
            case 'ArrowUp': 
                map.moveCamera('up');
                break;  
            case 'ArrowDown': 
                map.moveCamera('down');
                break;
		}
	})
	document.addEventListener('pointerup', () => {
		const pickResult = scene.pick(scene.pointerX, scene.pointerY);
		const x = Math.round(pickResult.pickedPoint.x);
		const z = Math.round(pickResult.pickedPoint.z);
		map.units.forEach((unit) => {
			if (pickResult.pickedMesh && pickResult.pickedMesh.class){
				const dest = pickResult.pickedMesh.class;
				switch (dest.type){
					case "Grass":
						unit.sendTo(dest, 'eat');
						break;
					default:
						unit.sendTo(map.grid[x][z]);
				}
			} else if (pickResult.pickedPoint){
				if (map.grid[x][z]){
					unit.sendTo(map.grid[x][z]);
				}
			}
		})
	})

	scene.registerBeforeRender(() => {
		
	});

	const showAxis = function(size) {
		const makeTextPlane = function(text, color, size) {
			const dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
			dynamicTexture.hasAlpha = true;
			dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
			const plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
			plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
			plane.material.backFaceCulling = false;
			plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
			plane.material.diffuseTexture = dynamicTexture;
			return plane;
		};
	  
		const axisX = BABYLON.Mesh.CreateLines("axisX", [ 
		  	new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
		  	new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
		], scene);
		axisX.color = new BABYLON.Color3(1, 0, 0);
		const xChar = makeTextPlane("X", "red", size / 10);
		xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
		const axisY = BABYLON.Mesh.CreateLines("axisY", [
			new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
			new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
		], scene);
		axisY.color = new BABYLON.Color3(0, 1, 0);
		const yChar = makeTextPlane("Y", "green", size / 10);
		yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
		const axisZ = BABYLON.Mesh.CreateLines("axisZ", [
			new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
			new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
		], scene);
		axisZ.color = new BABYLON.Color3(0, 0, 1);
		const zChar = makeTextPlane("Z", "blue", size / 10);
		zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
	};

	showAxis(5);
	return scene;
};

var engine;
try {
	engine = createDefaultEngine();
} catch(e) {
	console.log('the available createEngine function failed. Creating the default engine instead');
	engine = createDefaultEngine();
}
if (!engine) throw 'engine should not be null.';
scene = createScene();
sceneToRender = scene

engine.runRenderLoop(() => {
	divFps.innerHTML = engine.getFps().toFixed() + ' fps';
	if (sceneToRender) {
		sceneToRender.render();
	}
});

// Resize
window.addEventListener('resize', () => {
	engine.resize();
}); 
