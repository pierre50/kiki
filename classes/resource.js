
class resource{
	constructor(x, y, z, map, options){
		this.name = 'resource';
		this.parent = map;
		this.path = [];
	
		this.cell = this.parent.grid[Math.round(x)][Math.round(z)];
		this.cell.has = this;
		this.cell.solid = true;

		Object.keys(options).forEach((prop) => {
			this[prop] = options[prop];
		})
		
		const { height, mesh } = this;
		mesh.position.x = x;
		mesh.position.y = y + height / 2;
		mesh.position.z = z;

		this.position = {
			get x(){
				return mesh.position.x;
			},
			get y(){
				return mesh.position.y;
			},
			set y(val){
				mesh.position.y = val + height / 2;
			},
			get z(){
				return mesh.position.z;
			},
		}
		this.parent.shadowGenerator.addShadowCaster(mesh);
		//this.parent.waterGround.material.addToRenderList(mesh);
		
	}
}

class Tree extends resource{
	constructor(x, y, z, map){
		const mesh = new BABYLON.Mesh("tree");
		mesh.isVisible = false;
		const leave = map.instances["leaves1"].createInstance();
		const trunk = map.instances["trunk1"].createInstance();
		leave.parent = mesh;
		trunk.parent = mesh;
		
		const options = {
			type: "Tree",
			life: 10,
			height: 4,
			mesh,
		}

		super(x, y, z, map, options);
	}
}