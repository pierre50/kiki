function refundCost(player, cost) {
	Object.keys(cost).forEach(prop => {
		player[prop] += cost[prop];
	})
}
function payCost(player, cost) {
	Object.keys(cost).forEach(prop => {
		player[prop] -= cost[prop];
	})
}
function canAfford(player, cost) {
	let can = true
	Object.keys(cost).forEach(prop => {
		if (player[prop] < cost[prop]) {
			can = false;
		}
	})
	return can;
}

function getIconPath(name) {
	const id = name.split('_')[1];
	const index = name.split('_')[0];
	return `data/interface/${id}/${index}_${id}.png`;
}
function getTexture(name) {
	const id = name.split('_')[1];
	const index = name.split('_')[0];
	const spritesheet = app.loader.resources[id].spritesheet;
	const textureName = `${index}_${id}.png`;
	spritesheet.textures[textureName].hitArea = spritesheet.data.frames[textureName].hitArea;
	return spritesheet.textures[textureName];
}

function changeSpriteColor(sprite, color) {
	if (color === 'blue') {
		return;
	}
	//8 Hex
	const source = [0x93bbd7, 0x739bc7, 0x577bb3, 0x3f5f9f, 0x273f8f, 0x17277b, 0x070f67, 0x000057];
	const colors = {
		red: [0xff8f8f, 0xff5f5f, 0xff2f2f, 0xe30b00, 0xc71700, 0x8f1f00, 0x6f0b07, 0x530b00],
		yellow: [0xe3e300, 0xdfcf0f, 0xdfcf0f, 0xc3a31b, 0xa37317, 0x876727, 0x6b4b27, 0x4f3723],
		brown: [0xcfa343, 0xb78b2b, 0xa3734f, 0x8b5b37, 0x734727, 0x5f331b, 0x3f3723, 0x23231f],
		orange: [0xfb9f1f, 0xf78b17, 0xf3770f, 0xef6307, 0xcf4300, 0x9f3300, 0x872b00, 0x6f2300],
		green: [0x8b9f4f, 0x7f8b37, 0x637b2f, 0x4b6b2b, 0x375f27, 0x1b431b, 0x133313, 0x0b1b0b],
		grey: [0xdbdbdb, 0xc7c7c7, 0xb3b3b3, 0x8f8f8f, 0x6b6b6b, 0x474747, 0x373737, 0x232323],
		cyan: [0x5fd39f, 0x2bbf93, 0x00ab93, 0x00837b, 0x006f6b, 0x004f4f, 0x003f43, 0x002327],
	};
	if (!colors[color]) {
		return;
	}
	let final = [];
	for (let i = 0; i < source.length; i++) {
		final.push([source[i], colors[color][i]]);
	}
	sprite.filters = [new PIXI.filters.MultiColorReplaceFilter(final, .1)];
}

function debounce(func, timeout = 300) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => { func.apply(this, args); }, timeout);
	};
}

/**
 * Format a number with three character
 * @param {number} nbr 
 */
function formatNumber(nbr) {
	return ('00' + nbr).slice(-3);
}

/**
 * Get percentage with two numbers
 * @param {number} a 
 * @param {number} b 
 */
function getPercentage(a, b) {
	return Math.floor(a / b * 100);
}

function getValuePercentage(val, perc) {
	return Math.floor((perc * val) / 100);
}
/**
 * Check if point is between two points can be used with line thickness
 * @param {object} line1 
 * @param {object} line2 
 * @param {object} pnt 
 * @param {number} lineThickness 
 */
function pointIsBetweenTwoPoint(line1, line2, pnt, lineThickness) {
	let L2 = (((line2.x - line1.x) * (line2.x - line1.x)) + ((line2.y - line1.y) * (line2.y - line1.y)));
	if (L2 == 0) return false;
	let r = (((pnt.x - line1.x) * (line2.x - line1.x)) + ((pnt.y - line1.y) * (line2.y - line1.y))) / L2;
	if (r < 0) {
		return (Math.sqrt(((line1.x - pnt.x) * (line1.x - pnt.x)) + ((line1.y - pnt.y) * (line1.y - pnt.y))) <= lineThickness);
	} else if ((0 <= r) && (r <= 1)) {
		let s = (((line1.y - pnt.y) * (line2.x - line1.x)) - ((line1.x - pnt.x) * (line2.y - line1.y))) / L2;
		return (Math.abs(s) * Math.sqrt(L2) <= lineThickness);
	} else {
		return (Math.sqrt(((line2.x - pnt.x) * (line2.x - pnt.x)) + ((line2.y - pnt.y) * (line2.y - pnt.y))) <= lineThickness);
	}
}

/**
 * Get a random cell on the grid
 * @param {object} grid 
 */
function getRandomCell(grid) {
	return grid[Math.floor(Math.random() * size)][Math.floor(Math.random() * size)];
}

/**
 * Check a instance is in contact with another one
 * @param {object} a 
 * @param {object} b 
 */
function instanceContactInstance(a, b) {
	return Math.floor(instancesDistance(a.position, b.position)) <= (b.size - 1 || 1) && !b.isDestroyed;
}

/**
 * Get a random number between two numbers
 * @param {number} min 
 * @param {number} max 
 */
function randomRange(min, max, floor = true) {
	let r = Math.random() * (max - min + 1) + min;
	return floor ? Math.floor(r) : r;
}

/**
 * Get a random item from a array
 * @param {array} array 
 */
function randomItem(array) {
	return array[Math.round(Math.random() * (array.length - 1))];
}

/**
 * Get distance between two instances, can use iso (x, y) or cartesian (i, j)
 * @param {object} a 
 * @param {object} b 
 * @param {boolean} useCartesian
 */
function instancesDistance(a, b) {
	return pointsDistance(a.x, a.z, b.x, b.z);
}

/**
 * Get the difference between two number
 * @param {number} a 
 * @param {number} b 
 */
function diff(a, b) {
	return Math.abs(a - b);
}

/**
 * Get degree of instance according to a point
 * @param {object} instance 
 * @param {number} x 
 * @param {number} y 
 */
function getInstanceDegree(x1, z1, x2, z2) {
	const tX = x1 - x2;
	const tZ = z1 - z2;
	let result = (Math.atan2(tX, tZ)) * 180 / Math.PI;
	if (result < 0) {
		result + 360;
	}
	return (result + 180) % 360;
}

/**
 * Move instance straight to a position
 * @param {object} instance 
 * @param {number} x 
 * @param {number} y 
 * @param {number} speed 
 */
function moveTowardPoint(instance, target, speed) {
	const dist = pointsDistance(target.x, target.z, instance.position.x, instance.position.z);
	const tX = target.x - instance.position.x;
	const tZ = target.z - instance.position.z;
	const tY = (target.y + (instance.height / 2)) - instance.position.y;
	const velX = ((tX) / dist) * speed;
	const velZ = ((tZ) / dist) * speed;
	const velY = ((tY) / dist) * speed;
	let tR = (Math.atan2(tX, tZ)) * 180 / Math.PI;
	if (tR < 0) {
		tR += 360;
	}

	instance.position.x += velX;
	instance.position.z += velZ;
	instance.position.y += velY;
	instanceRotate(instance, tR);
}

function instanceRotate(instance, target) {
	const speed = 6;
	if (target > instance.rotation.y && target - instance.rotation.y <= 180) {
		const curs = target - instance.rotation.y;
		instance.rotation.y += curs > speed ? speed : curs;
	} else if (target > instance.rotation.y && target - instance.rotation.y > 180) {
		const curs = target - instance.rotation.y;
		instance.rotation.y -= curs > speed ? speed : curs;
	} else if (instance.rotation.y > target && instance.rotation.y - target <= 180) {
		const curs = instance.rotation.y - target;
		instance.rotation.y -= curs > speed ? speed : curs;
	} else if (instance.rotation.y > target && instance.rotation.y - target > 180) {
		const curs = instance.rotation.y - target;
		instance.rotation.y += curs > speed ? speed : curs;
	}
}

/**
 * Get distance between two points
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 */
function pointsDistance(x1, y1, x2, y2) {
	let a = x1 - x2;
	let b = y1 - y2;
	return Math.sqrt(a * a + b * b);
}

/**
 * Check if point is in a rectangle or not
 * @param {number} x 
 * @param {number} y 
 * @param {number} left 
 * @param {number} top 
 * @param {number} width 
 * @param {number} height 
 */
function pointInRectangle(x, y, left, top, width, height) {
	return (x > left && x < left + width && y > top && y < top + height);
}

/**
 * Get the first free cell coordinate around a point
 * @param {number} x 
 * @param {number} y 
 * @param {object} grid 
 */
function getFreeCellAroundPoint(x, y, grid) {
	let founded;
	for (let i = 1; i < 100; i++) {
		getCellsAroundPoint(x, y, grid, i, (cell) => {
			if (!cell.solid) {
				founded = cell;
			}
		});
		if (founded) {
			return founded;
		}
	}
	return null;
}

function instanceIsSurroundedBySolid(instance) {
	let size = (instance.size || 1) === 3 ? 2 : 1;
	let solids = 0;
	let neighbours = getCellsAroundPoint(instance.i, instance.j, instance.parent.grid, size, (cell) => {
		if (cell.solid) {
			solids++;
		}
		return true;
	});
	return neighbours.length === solids;
}

function getNewInstanceClosestFreeCellPath(instance, target, map) {
	for (let i = 1; i < 100; i++) {
		let size = (target.size || 1) === 3 ? 2 : 1;
		let paths = [];
		getCellsAroundPoint(target.i, target.j, map.grid, size * i, (cell) => {
			if (cell.has && cell.has.type === target.type) {
				getCellsAroundPoint(cell.i, cell.j, map.grid, size, (neighbour) => {
					if (!neighbour.solid) {
						let path = getInstancePath(instance, neighbour.i, neighbour.j, map);
						if (path.length) {
							paths.push({
								target: cell.has,
								path
							});
						}
					}
				});
			}
		});
		paths.sort((a, b) => a.path.length - b.path.length);
		if (paths[0]) {
			return paths[0];
		}
	}
	return null;
}

/**
 * Get the closest available path for a instance to a destination 
 * @param {object} instance 
 * @param {number} x 
 * @param {number} y 
 * @param {object} map 
 */
function getInstanceClosestFreeCellPath(instance, target, map) {
	let size = target.size || (target.has && target.has.size) || 1;
	let paths = [];
	getPlainCellsAroundPoint(target.position.x, target.position.z, map.grid, size === 3 ? 2 : 1, (cell) => {
		let path = getInstancePath(instance, cell.position.x, cell.position.z, map);
		if (path.length) {
			paths.push(path);
		}
	});
	paths.sort((a, b) => a.length - b.length);

	if (paths[0]) {
		return paths[0];
	}
	return [];
}

/**
 * Drawing selection blinking on instance
 * @param {object} instance 
 */
function drawInstanceBlinkingSelection(instance) {
	let selection = new PIXI.Graphics();
	selection.name = 'selection';
	selection.zIndex = 3;
	selection.lineStyle(1, 0x00FF00);
	const path = [(-32 * instance.size), 0, 0, (-16 * instance.size), (32 * instance.size), 0, 0, (16 * instance.size)];
	selection.drawPolygon(path);
	instance.addChildAt(selection, 0);
	setTimeout(() => {
		selection.alpha = 0;
		setTimeout(() => {
			selection.alpha = 1;
			setTimeout(() => {
				selection.alpha = 0;
				setTimeout(() => {
					selection.alpha = 1;
					setTimeout(() => {
						instance.removeChild(selection);
					}, 300)
				}, 300)
			}, 300)
		}, 500)
	}, 500)
}

function diff(a, b) {
	return Math.abs(a - b);
}

/**
 * Get the shortest path for a instance to a destination
 * @param {object} instance 
 * @param {number} x 
 * @param {number} y 
 * @param {object} map 
 */
function getInstancePath(instance, x, z, map) {
	const maxZone = 10;
	const end = map.grid[x][z];
	const start = map.grid[Math.round(instance.position.x)][Math.round(instance.position.z)];
	let minX = Math.max(Math.min(start.position.x, end.position.x) - maxZone, 0);
	let maxX = Math.min(Math.max(start.position.x, end.position.x) + maxZone, map.size);
	let minZ = Math.max(Math.min(start.position.z, end.position.z) - maxZone, 0);
	let maxZ = Math.min(Math.max(start.position.z, end.position.z) + maxZone, map.size);
	let cloneGrid = [];
	for (var i = minX; i <= maxX; i++) {
		for (var j = minZ; j <= maxZ; j++) {
			if (cloneGrid[i] == null) {
				cloneGrid[i] = [];
			}
			cloneGrid[i][j] = {
				x: map.grid[i][j].position.x,
				y: map.grid[i][j].position.y,
				z: map.grid[i][j].position.z,
				solid: map.grid[i][j].solid,
			}
		}
	}
	let isFinish = false;
	let path = [];
	let openCells = [];
	let closedCells = [];
	const cloneEnd = cloneGrid[end.position.x][end.position.z];
	const cloneStart = cloneGrid[start.position.x][start.position.z];
	openCells.push(cloneStart);
	while (!isFinish) {
		if (openCells.length > 0) {
			//find the lowest f in open cells
			let lowestF = 0;
			for (let i = 0; i < openCells.length; i++) {
				if (openCells[i].f < openCells[lowestF].f) {
					lowestF = i;
				}
				if (openCells[i].f == openCells[lowestF].f) {
					if (openCells[i].g > openCells[lowestF].g) {
						lowestF = i;
					}
				}
			}
			let current = openCells[lowestF];
			if (current === cloneEnd) {
				//reached the end cell
				isFinish = true;
			}
			//calculate path
			path = [cloneEnd];
			let temp = current;

			while (temp.previous) {
				path.push(temp.previous);
				temp = temp.previous;
			}
			openCells.splice(openCells.indexOf(current), 1);
			closedCells.push(current);
			//check neighbours
			getCellsAroundPoint(current.x, current.z, cloneGrid, 1, (neighbour) => {
				if (!closedCells.includes(neighbour) && !neighbour.solid && (Math.abs(current.y - neighbour.y) < 1)) {
					let tempG = current.g + instancesDistance(neighbour, current);
					if (!openCells.includes(neighbour)) {
						openCells.push(neighbour);
						neighbour.g = tempG;
						neighbour.h = instancesDistance(neighbour, cloneEnd);
						neighbour.f = neighbour.g + neighbour.h;
						neighbour.previous = current
					}
				}
			});
		} else {
			//no solution
			path = [];
			isFinish = true;
		}
	}
	path.pop();
	return [...path];
}

function cellIsDiag(src, target) {
	return Math.abs(target.x - src.x) === Math.abs(target.z - src.z);
}
function getZoneInZoneWithCondition(zone, grid, size, condition) {
	for (let i = zone.minX; i <= zone.maxX; i++) {
		for (let j = zone.minY; j <= zone.maxY; j++) {
			if (!grid[i] || !grid[i][j]) {
				continue;
			}
			let isFree = true;
			getPlainCellsAroundPoint(i, j, grid, size, (cell) => {
				if (!condition(cell)) {
					isFree = false;
				}
			});
			if (isFree) {
				return { i, j };
			}
		}
	}
}

/**
 * Allow to find all the instances around and instance with his sight
 * @param {object} instance 
 * @param {function} condition 
 */
function findInstancesInSight(instance, condition) {
	const { x, z } = instance.position;
	let instances = [];
	for (let i = x - instance.sight; i < x + instance.sight; i++) {
		for (let j = z - instance.sight; j < z + instance.sight; j++) {
			if (pointsDistance(x, z, i, j) <= instance.sight && instance.parent.grid[i] && instance.parent.grid[i][j]) {
				let cell = instance.parent.grid[i][j];
				if (cell.has && typeof condition === 'function' && condition(cell.has)) {
					instances.push(cell.has);
				}
			}
		}
	}
	return instances;
}

/**
 * Render cell if is on sight of instance
 * @param {object} instance 
 */
function renderCellOnInstanceSight(instance) {
	getPlainCellsAroundPoint(instance.i, instance.j, instance.player.views, instance.sight, (cell) => {
		if (pointsDistance(instance.i, instance.j, cell.i, cell.j) <= instance.sight) {
			let globalCell = instance.parent.grid[cell.i][cell.j];
			globalCell.removeFog();
			if (globalCell.has) {
				if (globalCell.has.type === 'Tree'
					&& globalCell.has.quantity > 0
					&& instance.player.foundedTrees.indexOf(globalCell.has) === -1) {
					instance.player.foundedTrees.push(globalCell.has);
				}
				if (globalCell.has.type === 'Berrybush'
					&& globalCell.has.quantity > 0
					&& instance.player.foundedBerrybushs.indexOf(globalCell.has) === -1) {
					instance.player.foundedBerrybushs.push(globalCell.has);
				}
				if (globalCell.has.name === 'building'
					&& globalCell.has.life > 0
					&& globalCell.has.player !== instance.player
					&& instance.player.foundedEnemyBuildings.indexOf(globalCell.has) === -1) {
					instance.player.foundedEnemyBuildings.push(globalCell.has);
				}
				//if (globalCell.has.player && globalCell.has.player.isPlayed){
				//globalCell.has.visible = true;
				//}
			}
			if (cell.viewedBy.indexOf(instance) === -1) {
				cell.viewedBy.push(instance);
			}
			cell.viewed = true;
		}
	})
}
function clearCellOnInstanceSight(instance) {
	getPlainCellsAroundPoint(instance.i, instance.j, instance.player.views, instance.sight, (cell) => {
		if (pointsDistance(instance.i, instance.j, cell.i, cell.j) <= instance.sight) {
			cell.viewedBy.splice(cell.viewedBy.indexOf(instance), 1);
			if (instance.parent) {
				let globalCell = instance.parent.grid[cell.i][cell.j];
				if (!cell.viewedBy.length) {
					globalCell.setFog();
					/*if (globalCell.has){
						if (globalCell.has.player && !globalCell.has.player.isPlayed && globalCell.has.name === 'unit'){
							globalCell.has.visible = false;
						}
					}*/
				}
			}
		}
	})
}

function getPositionInZoneAroundInstance(instance, grid, space, size, allowInclined = false, extraCondition) {
	const maxSpace = space[1];
	const minSpace = space[0];
	const zone = {
		minX: instance.i - maxSpace,
		minY: instance.j - maxSpace,
		maxX: instance.i + maxSpace,
		maxY: instance.j + maxSpace
	}
	let pos = getZoneInZoneWithCondition(zone, grid, size, (cell) => {
		return (
			cell.i > 0 && cell.j > 0 && cell.i < cell.parent.size && cell.j < cell.parent.size &&
			instancesDistance(instance, cell, true) > minSpace &&
			instancesDistance(instance, cell, true) < maxSpace &&
			!cell.solid && !cell.border && (allowInclined || !cell.inclined)
			&& (!extraCondition || extraCondition(cell)));
	});
	return pos || null;
}

function instanceIsInPlayerSight(instance, player) {
	return player.views[instance.i][instance.j].viewedBy.length > 0;
}
/**
 * Get all the coordinate around a point with a maximum distance
 * @param {number} startX 
 * @param {number} startY 
 * @param {number} dist 
 */
function getPlainCellsAroundPoint(startX, startZ, grid, dist, callback, onlyCoordinate = false) {
	let result = [];
	if (!dist) {
		const cell = onlyCoordinate ? { x: startX, z: startZ } : grid[startX][startZ];
		if (typeof callback === 'function') {
			callback(cell, result.length)
		}
		result.push(cell);
		return result;
	}
	for (let i = startX - dist; i <= startX + dist; i++) {
		for (let j = startZ - dist; j <= startZ + dist; j++) {
			if (grid[i] !== undefined && grid[i][j] !== undefined) {
				const cell = onlyCoordinate ? { x: i, z: j } : grid[i][j];
				if (typeof callback === 'function') {
					callback(cell, result.length);
				}
				result.push(cell);
			}
		}
	}
	return result;
}

/**
 * Get the coordinate around point at a certain distance
 * @param {number} startX 
 * @param {number} startY 
 * @param {number} dist 
 */
function getCellsAroundPoint(startX, startY, grid, dist, callback) {
	let result = [];
	if (!dist) {
		const cell = grid[startX][startY];
		if (typeof callback === 'function') {
			if (callback(cell)) {
				result.push(cell);
			}
		} else {
			result.push(cell);
		}
		return result;
	}
	let x = startX - dist;
	let y = startY - dist;
	let loop = 0;
	let velX = 1;
	let velY = 0;
	let line = 0;
	for (let i = 0; i < 8 + (dist - 1) * 8; i++) {
		x += velX;
		y += velY;
		if (grid[x] && grid[x][y]) {
			const cell = grid[x][y];
			if (typeof callback === 'function') {
				if (callback(cell)) {
					result.push(cell);
				}
			} else {
				result.push(cell);
			}
		}
		line++;
		if (line === dist * 2) {
			let speed = loop > 0 ? -1 : 1;
			if (loop % 2) {
				velX = speed;
				velY = 0;
			} else {
				velX = 0;
				velY = speed;
			}
			line = 0;
			loop++;
		}
	}
	return result;
}

/**
 * Get the closest instances to another instance
 * @param {object} instance 
 * @param {object} instances 
 */
function getClosestInstance(instance, instances) {
	let distances = [];
	for (let i = 0; i < instances.length; i++) {
		distances.push({
			instance: instances[i],
			dist: instancesDistance(instance, instances[i])
		})
	}
	distances.sort((a, b) => a.dist - b.dist);
	return (distances.length && distances[0].instance) || false;
}

function getClosestInstanceWithPath(instance, instances) {
	let distances = [];
	for (let i = 0; i < instances.length; i++) {
		let path = getInstanceClosestFreeCellPath(instance, instances[i], instance.parent);
		if (path.length) {
			distances.push({
				instance: instances[i],
				path,
			})
		}
	}
	distances.sort((a, b) => a.path.length - b.path.length);
	return distances[0] || null;
}