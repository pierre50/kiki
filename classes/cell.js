class Cell {
	constructor(x, y, z, map, options) {
		this.name = 'cell';
		this.parent = map;
		this.has = null;
		this.inclined = false;

		Object.keys(options).forEach((prop) => {
			this[prop] = options[prop];
		})

		let _y = y;
		this.position = {
			x,
			z,
			get y() {
				return _y;
			},
			set y(val) {
				_y = val;
				if (map.grid[x][z].has) {
					map.grid[x][z].has.position.y = _y;
				}
				map.ground.updateMeshPositions((position) => {
					position[3 * (x * (map.size + 1) + z) + 1] = val;
				}, true)
			}
		}
	}
}