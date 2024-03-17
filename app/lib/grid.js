import * as exports from './maths'
Object.entries(exports).forEach(([name, exported]) => (window[name] = exported))

/**
 * Check a instance is in contact with another one
 * @param {object} a
 * @param {object} b
 */
export function instanceContactInstance(a, b) {
  return Math.floor(instancesDistance(a, b)) <= ((b.size + 1) || 2) && !b.isDestroyed
}

export function instanceRotate(instance, target) {
  const speed = 6
  if (target > instance.rotation.y && target - instance.rotation.y <= 180) {
    const curs = target - instance.rotation.y
    instance.rotation.y += curs > speed ? speed : curs
  } else if (target > instance.rotation.y && target - instance.rotation.y > 180) {
    const curs = target - instance.rotation.y
    instance.rotation.y -= curs > speed ? speed : curs
  } else if (instance.rotation.y > target && instance.rotation.y - target <= 180) {
    const curs = instance.rotation.y - target
    instance.rotation.y -= curs > speed ? speed : curs
  } else if (instance.rotation.y > target && instance.rotation.y - target > 180) {
    const curs = instance.rotation.y - target
    instance.rotation.y += curs > speed ? speed : curs
  }
}

/**
 * Move instance straight to a position
 * @param {object} instance
 * @param {number} x
 * @param {number} y
 * @param {number} speed
 */
export function moveTowardPoint(instance, target, speed) {
  const dist = pointsDistance(target.x, target.z, instance.position.x, instance.position.z)
  const tX = target.x - instance.position.x
  const tZ = target.z - instance.position.z
  const tY = target.y + instance.height / 2 - instance.position.y
  const velX = (tX / dist) * speed
  const velZ = (tZ / dist) * speed
  const velY = (tY / dist) * speed
  let tR = (Math.atan2(tX, tZ) * 180) / Math.PI
  if (tR < 0) {
    tR += 360
  }

  instance.position.x += velX
  instance.position.z += velZ
  instance.position.y += velY
  instanceRotate(instance, tR)
}

/**
 * Get the first free cell coordinate around a point
 * @param {number} x
 * @param {number} y
 * @param {object} grid
 */
export function getFreeCellAroundPoint(x, y, size, grid, condition) {
  for (let i = size - 1; i < 50; i++) {
    let cells = getCellsAroundPoint(x, y, grid, i, cell => condition(cell))
    if (cells.length) {
      return randomItem(cells)
    }
  }
  return null
}

/**
 * Get the closest available path for a instance to a destination
 * @param {object} instance
 * @param {number} x
 * @param {number} y
 * @param {object} map
 */
export function getInstanceClosestFreeCellPath(instance, target, map) {
  let size = target.size || (target.has && target.has.size) || 1
  let paths = []
  getPlainCellsAroundPoint(target.position.x, target.position.z, map.grid, size === 3 ? 2 : 1, cell => {
    let path = getInstancePath(instance, cell.position.x, cell.position.z, map)
    if (path.length) {
      paths.push(path)
    }
  })
  paths.sort((a, b) => a.length - b.length)

  if (paths[0]) {
    return paths[0]
  }
  return []
}

/**
 * Get the shortest path for a instance to a destination
 * @param {object} instance
 * @param {number} x
 * @param {number} y
 * @param {object} map
 */
export function getInstancePath(instance, x, z, map) {
  const maxZone = 10
  const end = map.grid[x][z]
  const start = map.grid[Math.round(instance.position.x)][Math.round(instance.position.z)]
  let minX = Math.max(Math.min(start.position.x, end.position.x) - maxZone, 0)
  let maxX = Math.min(Math.max(start.position.x, end.position.x) + maxZone, map.size)
  let minZ = Math.max(Math.min(start.position.z, end.position.z) - maxZone, 0)
  let maxZ = Math.min(Math.max(start.position.z, end.position.z) + maxZone, map.size)
  let cloneGrid = []
  for (var i = minX; i <= maxX; i++) {
    for (var j = minZ; j <= maxZ; j++) {
      if (cloneGrid[i] == null) {
        cloneGrid[i] = []
      }
      cloneGrid[i][j] = {
        position: { x: map.grid[i][j].position.x, y: map.grid[i][j].position.y, z: map.grid[i][j].position.z },
        solid: map.grid[i][j].solid,
      }
    }
  }
  let isFinish = false
  let path = []
  let openCells = []
  let closedCells = []
  const cloneEnd = cloneGrid[end.position.x][end.position.z]
  const cloneStart = cloneGrid[start.position.x][start.position.z]
  openCells.push(cloneStart)
  while (!isFinish) {
    if (openCells.length > 0) {
      //find the lowest f in open cells
      let lowestF = 0
      for (let i = 0; i < openCells.length; i++) {
        if (openCells[i].f < openCells[lowestF].f) {
          lowestF = i
        }
        if (openCells[i].f == openCells[lowestF].f) {
          if (openCells[i].g > openCells[lowestF].g) {
            lowestF = i
          }
        }
      }
      let current = openCells[lowestF]
      if (current === cloneEnd) {
        //reached the end cell
        isFinish = true
      }
      //calculate path
      path = [cloneEnd]
      let temp = current

      while (temp.previous) {
        path.push(temp.previous)
        temp = temp.previous
      }
      openCells.splice(openCells.indexOf(current), 1)
      closedCells.push(current)
      //check neighbours
      getCellsAroundPoint(current.position.x, current.position.z, cloneGrid, 1, neighbour => {
        if (!closedCells.includes(neighbour) && !neighbour.solid && Math.abs(current.position.y - neighbour.position.y) < 1) {
          let tempG = current.g + instancesDistance(neighbour, current)
          if (!openCells.includes(neighbour)) {
            openCells.push(neighbour)
            neighbour.g = tempG
            neighbour.h = instancesDistance(neighbour, cloneEnd)
            neighbour.f = neighbour.g + neighbour.h
            neighbour.previous = current
          }
        }
      })
    } else {
      //no solution
      path = []
      isFinish = true
    }
  }
  path.pop()
  return [...path]
}

/**
 * To get a sized zone in a grid
 * @param {object} zone
 * @param {object} grid
 * @param {number} size
 * @param {export function} condition
 */
export function getZoneInGridWithCondition(zone, grid, size, condition) {
  for (let i = zone.minX; i <= zone.maxX; i++) {
    for (let j = zone.minY; j <= zone.maxY; j++) {
      if (!grid[i] || !grid[i][j]) {
        continue
      }
      let isFree = true
      getPlainCellsAroundPoint(i, j, grid, size, cell => {
        if (!condition(cell)) {
          isFree = false
        }
      })
      if (isFree) {
        return { x: i, z: j }
      }
    }
  }
}

/**
 * Allow to find all the instances around and instance with his sight
 * @param {object} instance
 * @param {export function} condition
 */
export function findInstancesInSight(instance, grid, condition) {
  const { x, z } = instance.position
  let instances = []
  for (let i = x - instance.sight; i < x + instance.sight; i++) {
    for (let j = z - instance.sight; j < z + instance.sight; j++) {
      if (pointsDistance(x, z, i, j) <= instance.sight && grid[i] && grid[i][j]) {
        let cell = grid[i][j]
        if (cell.has && typeof condition === 'function' && condition(cell.has)) {
          instances.push(cell.has)
        }
      }
    }
  }
  return instances
}

/**
 * Render cell if is on sight of instance
 * @param {object} instance
 */
export function renderCellOnInstanceSight(instance) {
  const { player } = instance.context
  const instanceCell = instance.parent.grid[instance.i][instance.j]
  if (
    instance.owner.isPlayed ||
    instance.parent.revealEverything ||
    instanceIsInPlayerSight(instance, player) ||
    (instance.name === 'building' &&
      instance.owner.views[instance.i][instance.j].has &&
      instance.owner.views[instance.i][instance.j].has.id === instance.id)
  ) {
    instanceCell.removeFog()
  } else {
    instanceCell.setFog()
  }
  getPlainCellsAroundPoint(instance.i, instance.j, instance.owner.views, instance.sight, cell => {
    if (pointsDistance(instance.i, instance.j, cell.i, cell.j) <= instance.sight) {
      const globalCell = instance.parent.grid[cell.i][cell.j]
      if (instance.owner.isPlayed && !instance.parent.revealEverything) {
        globalCell.removeFog()
      } else if (instance.owner.type === 'AI' && globalCell.has && (!cell.has || cell.has.id !== globalCell.has.id)) {
        cell.has = globalCell.has
        if (
          globalCell.has.type === 'Tree' &&
          globalCell.has.quantity > 0 &&
          instance.owner.foundedTrees.indexOf(globalCell.has) === -1
        ) {
          instance.owner.foundedTrees.push(globalCell.has)
        }
        if (
          globalCell.has.type === 'Berrybush' &&
          globalCell.has.quantity > 0 &&
          instance.owner.foundedBerrybushs.indexOf(globalCell.has) === -1
        ) {
          instance.owner.foundedBerrybushs.push(globalCell.has)
        }
        if (
          globalCell.has.name === 'building' &&
          globalCell.has.hitPoints > 0 &&
          globalCell.has.owner.id !== instance.owner.id &&
          instance.owner.foundedEnemyBuildings.indexOf(globalCell.has) === -1
        ) {
          instance.owner.foundedEnemyBuildings.push(globalCell.has)
        }
      }
      if (
        globalCell.has &&
        globalCell.has.sight &&
        instancesDistance(instance, globalCell.has) <= globalCell.has.sight &&
        typeof globalCell.has.detect === 'function'
      ) {
        globalCell.has.detect(instance)
      }
      if (cell.viewBy.indexOf(instance) === -1) {
        cell.viewBy.push(instance)
      }
      if (!cell.viewed) {
        instance.owner.cellViewed++
        cell.onViewed()
        cell.viewed = true
      }
    }
  })
}

export function clearCellOnInstanceSight(instance) {
  if (instance.parent.revealEverything) {
    return
  }
  getPlainCellsAroundPoint(instance.i, instance.j, instance.owner.views, instance.sight, cell => {
    if (pointsDistance(instance.i, instance.j, cell.i, cell.j) <= instance.sight) {
      cell.viewBy.splice(cell.viewBy.indexOf(instance), 1)
      if (instance.parent) {
        const globalCell = instance.parent.grid[cell.i][cell.j]
        if (!cell.viewBy.length && instance.owner.isPlayed && !instance.parent.revealEverything) {
          globalCell.setFog()
        }
      }
    }
  })
}

export function getPositionInGridAroundInstance(instance, grid, space, size, allowInclined = false, extraCondition) {
  const maxSpace = space[1]
  const minSpace = space[0]
  const zone = {
    minX: instance.i - maxSpace,
    minY: instance.j - maxSpace,
    maxX: instance.i + maxSpace,
    maxY: instance.j + maxSpace,
  }
  let pos = getZoneInGridWithCondition(zone, grid, size, cell => {
    return (
      cell.i > 0 &&
      cell.j > 0 &&
      cell.i < cell.parent.size &&
      cell.j < cell.parent.size &&
      instancesDistance(instance, cell, true) > minSpace &&
      instancesDistance(instance, cell, true) < maxSpace &&
      !cell.solid &&
      !cell.border &&
      (allowInclined || !cell.inclined) &&
      (!extraCondition || extraCondition(cell))
    )
  })
  return pos || null
}

/**
 * Instance is in a player sight
 * @param {object} instance
 * @param {object} player
 */
export function instanceIsInPlayerSight(instance, player) {
  return player.views[instance.i][instance.j].viewBy.length > 0
}

/**
 * Get all the coordinate around a point with a maximum distance
 * @param {number} startX
 * @param {number} startY
 * @param {number} dist
 */
export function getPlainCellsAroundPoint(startX, startZ, grid, dist, callback, onlyCoordinate = false) {
  let result = []
  if (!dist) {
    const cell = onlyCoordinate ? { x: startX, z: startZ } : grid[startX][startZ]
    if (typeof callback === 'function') {
      if (callback(cell, result.length)){
        result.push(cell)
      }
    }else{
      result.push(cell)
    }
    return result
  }
  for (let i = startX - dist; i <= startX + dist; i++) {
    for (let j = startZ - dist; j <= startZ + dist; j++) {
      if (grid[i] !== undefined && grid[i][j] !== undefined) {
        const cell = onlyCoordinate ? { x: i, z: j } : grid[i][j]
        if (typeof callback === 'function') {
          if (callback(cell, result.length)){
            result.push(cell)
          }
        }else{
          result.push(cell)
        }
      }
    }
  }
  return result
}

/**
 * Get the coordinate around point at a certain distance
 * @param {number} startX
 * @param {number} startY
 * @param {number} dist
 */
export function getCellsAroundPoint(startX, startY, grid, dist, callback) {
  const finalDist = dist - 1
  let result = []
  if (!dist) {
    const cell = grid[startX][startY]
    if (typeof callback === 'function') {
      if (callback(cell)) {
        result.push(cell)
      }
    } else {
      result.push(cell)
    }
    return result
  }
  let x = startX - dist
  let y = startY - dist
  let loop = 0
  let velX = 1
  let velY = 0
  let line = 0
  for (let i = 0; i < 8 + finalDist * 8; i++) {
    x += velX
    y += velY
    if (grid[x] && grid[x][y]) {
      const cell = grid[x][y]
      if (typeof callback === 'function') {
        if (callback(cell)) {
          result.push(cell)
        }
      } else {
        result.push(cell)
      }
    }
    line++
    if (line === dist * 2) {
      let speed = loop > 0 ? -1 : 1
      if (loop % 2) {
        velX = speed
        velY = 0
      } else {
        velX = 0
        velY = speed
      }
      line = 0
      loop++
    }
  }
  return result
}

/**
 * Get the closest instances to another instance
 * @param {object} instance
 * @param {object} instances
 */
export function getClosestInstance(instance, instances) {
  let distances = []
  for (let i = 0; i < instances.length; i++) {
    distances.push({
      instance: instances[i],
      dist: instancesDistance(instance, instances[i]),
    })
  }
  distances.sort((a, b) => a.dist - b.dist)
  return (distances.length && distances[0].instance) || false
}

export function getClosestInstanceWithPath(instance, instances) {
  let distances = []
  for (let i = 0; i < instances.length; i++) {
    let path = getInstanceClosestFreeCellPath(instance, instances[i], instance.parent)
    if (path.length) {
      distances.push({
        instance: instances[i],
        path,
      })
    }
  }
  distances.sort((a, b) => a.path.length - b.path.length)
  return distances[0] || null
}
