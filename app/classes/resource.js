import { config } from "../constants";

export class Resource {
	constructor(options, context) {
		this.context = context

        const {
          context: { map, meshes },
        } = this

		this.name = 'resource';
		this.parent = map;
		this.path = [];

		Object.keys(options).forEach((prop) => {
			this[prop] = options[prop];
		})
		Object.keys(config.resources[this.type]).forEach(prop => {
			this[prop] = config.resources[this.type][prop]
		})

		this.mesh = meshes[this.type].createInstance()

		this.cell = this.parent.grid[Math.round(this.x)][Math.round(this.z)];
		this.cell.has = this;
		this.cell.solid = true;

		const { mesh } = this;
		if (mesh) {
			mesh.position.x = this.x;
			mesh.position.y = this.cell.y + 4 / 2;
			mesh.position.z = this.z;
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
			this.parent.shadowGenerator && this.parent.shadowGenerator.addShadowCaster(mesh);
			//this.parent.waterGround.material.addToRenderList(mesh);
		} else {
			this.position = { x, y, z }
		}
	}
}
