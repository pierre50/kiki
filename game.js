const canvas = document.getElementById('renderCanvas');
const divFps = document.getElementById('fps');

var engine = null;
var scene = null;
var sceneToRender = null;
var createDefaultEngine = function () { return new BABYLON.Engine(canvas, false, null, true); };
var createScene = function () {
	// This creates a basic Babylon Scene object (non-mesh)
	const scene = new BABYLON.Scene(engine);
	scene.blockMaterialDirtyMechanism = true;
	scene.getAnimationRatio();
	scene.useGeometryIdsMap = true;
	scene.useMaterialMeshMap = true;
	scene.useClonedMeshMap = true;
	scene.particlesEnabled = false;
	scene.physicsEnabled = false;

	const map = new Map(scene);

	document.addEventListener('pointerup', () => {
		const pickResult = scene.pick(scene.pointerX, scene.pointerY);
		if (!pickResult || !pickResult.pickedPoint) {
			return;
		}
		const x = Math.round(pickResult.pickedPoint.x);
		const z = Math.round(pickResult.pickedPoint.z);
		map.units.forEach((unit) => {
			if (pickResult.pickedMesh && pickResult.pickedMesh.class) {
				const dest = pickResult.pickedMesh.class;
				switch (dest.type) {
					case "Grass":
						unit.sendTo(dest, 'eat');
						break;
					default:
						unit.sendTo(map.grid[x][z]);
				}
			} else if (pickResult.pickedPoint) {
				if (map.grid[x][z]) {
					unit.sendTo(map.grid[x][z]);
				}
			}
		})
	})
	return scene;
};

var engine;
try {
	engine = createDefaultEngine();
} catch (e) {
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
