
class resource {
	constructor(x, y, z, map, options) {
		this.name = 'resource';
		this.parent = map;
		this.path = [];

		Object.keys(options).forEach((prop) => {
			this[prop] = options[prop];
		})

		this.cell = this.parent.grid[Math.round(x)][Math.round(z)];
		this.cell.has = this;
		this.cell.solid = this.solid;

		const { height, mesh } = this;
		if (mesh) {
			mesh.position.x = x;
			mesh.position.y = y + height / 2;
			mesh.position.z = z;
			mesh.class = this;

			this.position = {
				get x() {
					return mesh.position.x;
				},
				get y() {
					return mesh.position.y;
				},
				get z() {
					return mesh.position.z;
				}
			}
			this.parent.shadowGenerator.addShadowCaster(mesh);
			//this.parent.waterGround.material.addToRenderList(mesh);
		} else {
			this.position = { x, y, z }
		}
	}
}

class Tree extends resource {
	constructor(x, y, z, map) {
		const options = {
			type: 'Tree',
			life: 10,
			height: 4,
			mesh: map.instances['tree1'].createInstance(),
			solid: true
		}

		super(x, y, z, map, options);
	}
}

class Grass extends resource {
	constructor(x, y, z, map) {
		const options = {
			type: 'Grass',
			life: 1,
			solid: false
		}

		super(x, y, z, map, options);
	}
	eaten() {
		if (this.life > 0) {
			this.life -= 1
		}

		if (this.life <= 0) {
			this.life = 0;
		}
	}
}