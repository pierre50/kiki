import {
  AbstractMesh,
  Color3,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  ShadowGenerator,
  Texture,
  Vector3,
} from '@babylonjs/core'
import { TerrainMaterial } from '@babylonjs/materials'
import {
  colors,
  getPlainCellsAroundPoint,
  getZoneInGridWithCondition,
  pointsDistance,
  randomItem,
  randomRange,
} from '../lib'
import Cell from './cell'
import { Resource } from './resource'
import { Human } from './players/human'

export default class Map {
  constructor(context) {
    const { scene } = context
    this.context = context
    this.size = 300

    this.ready = false
    this.grid = []
    this.sortableChildren = true

    this.allTechnologies = false
    this.noAI = true

    this.devMode = false
    this.revealEverything = this.devMode || false
    this.revealTerrain = this.devMode || false

    this.x = 0
    this.y = 0
    this.startingUnits = 3

    this.players = []
    this.playersPos = []
    this.positionsCount = 2
    this.gaia = null
    this.resources = []
    this.totalCells

    // Lights
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 0, 0), scene)
    hemiLight.position = new Vector3(0, 0, 0)
    hemiLight.diffuse = new Color3(0.85, 0.85, 0.85)
    hemiLight.specular = new Color3(0.85, 0.85, 0.85)
    hemiLight.groundColor = new Color3(0.55, 0.55, 0.55)
    hemiLight.intensity = 0.9

    const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene)
    light.position = new Vector3(this.size, 50, this.size)
    light.intensity = 0.6

    // Shadows
    this.shadowGenerator = new ShadowGenerator(1024 * 2, light, true)

    this.canvas = this.generateMixTexture()
    // Create terrain material
    this.terrainMaterial = new TerrainMaterial('terrainMaterial', scene)
    this.terrainMaterial.mixTexture = new Texture(this.getCanvasURL(this.canvas), scene)
    this.terrainMaterial.diffuseTexture1 = new Texture('textures/dirt.png', scene)
    this.terrainMaterial.diffuseTexture2 = new Texture('textures/forest.png', scene)
    this.terrainMaterial.diffuseTexture3 = new Texture('textures/grass.png', scene)
    this.terrainMaterial.diffuseTexture1.uScale = this.terrainMaterial.diffuseTexture1.vScale = 128
    this.terrainMaterial.diffuseTexture2.uScale = this.terrainMaterial.diffuseTexture2.vScale = 128
    this.terrainMaterial.diffuseTexture3.uScale = this.terrainMaterial.diffuseTexture3.vScale = 128
  }

  placeResourceGroup(player, instance, quantity, range) {
    const { context, grid } = this
    function getRandomCells(loop = 0) {
      if (loop > 100) {
        return []
      }
      const randomI = randomRange(range[0], range[1])
      const randomJ = randomRange(range[0], range[1])
      const finalX = player.x + randomItem([-randomI, randomI])
      const finalZ = player.z + randomItem([-randomJ, randomJ])
      let cpt = 0
      if (grid[finalX] && grid[finalX][finalZ]) {
        const dist = Math.round(Math.sqrt(quantity, 2))
        const cells = getPlainCellsAroundPoint(finalX, finalZ, grid, dist, cell => {
          cpt++
          if (!cell.solid && cell.category !== 'Water' && !cell.has && !cell.border && !cell.inclined) {
            return true
          }
        })
        if (cells.length >= cpt) {
          return cells
        } else {
          return getRandomCells(loop + 1)
        }
      } else {
        return getRandomCells(loop + 1)
      }
    }
    const cells = getRandomCells()
    if (!cells.length) {
      return
    }
    for (let i = 0; i < quantity; i++) {
      const cell = randomItem(cells)
      cells.splice(cells.indexOf(cell), 1)
      this.resources.push(new Resource({ x: cell.position.x, z: cell.position.z, type: instance }, context))
    }
  }

  getCanvasURL(oldCanvas) {
    //create a new canvas
    const newCanvas = document.createElement('canvas')
    const context = newCanvas.getContext('2d')
    //set dimensions
    newCanvas.width = oldCanvas.width
    newCanvas.height = oldCanvas.height
    //apply the old canvas to the new one
    context.setTransform(1, 0, 0, -1, 0, oldCanvas.height)
    context.drawImage(oldCanvas, 0, 0)
    return newCanvas.toDataURL()
  }

  generateResourcesAroundPlayers(playersPos) {
    for (let i = 0; i < playersPos.length; i++) {
      this.placeResourceGroup(playersPos[i], 'Berrybush', 6, [5, 10])
      this.placeResourceGroup(playersPos[i], 'Stone', 7, [10, 15])
      this.placeResourceGroup(playersPos[i], 'Gold', 7, [10, 15])
      this.placeResourceGroup(playersPos[i], 'Tree', 20, [10, 25])
      this.placeResourceGroup(playersPos[i], 'Tree', 30, [10, 25])
      this.placeResourceGroup(playersPos[i], 'Tree', 20, [10, 25])
      this.placeResourceGroup(playersPos[i], 'Tree', 30, [10, 25])
      this.placeResourceGroup(playersPos[i], 'Tree', 50, [10, 30])
    }
  }

  generateMixTexture() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.height = this.size
    canvas.width = this.size

    ctx.beginPath()
    ctx.rect(0, 0, this.size, this.size)
    ctx.fillStyle = 'blue'
    ctx.fill()

    const chanceOfForest = 0.0007

    for (let i = 0; i <= this.size; i++) {
      for (let j = 0; j <= this.size; j++) {
        if (Math.random() < chanceOfForest) {
          const cursorSize = randomRange(4, 18)
          const radgrad2 = ctx.createRadialGradient(i, j, 0, i, j, cursorSize)
          radgrad2.addColorStop(0, 'rgba(0,255,0,1)')
          radgrad2.addColorStop(0.7, 'rgba(0,255,0,.7)')
          radgrad2.addColorStop(1, 'rgba(0,255,0,0)')
          ctx.fillStyle = radgrad2
          ctx.fillRect(0, 0, this.size, this.size)
        }
      }
    }

    return canvas
  }

  generatePlayers() {
    const { context } = this

    const players = []
    const poses = []
    const randoms = Array.from(Array(this.playersPos.length).keys())

    for (let i = 0; i < this.playersPos.length; i++) {
      const pos = randomItem(randoms)
      poses.push(pos)
      randoms.splice(randoms.indexOf(pos), 1)
    }

    for (let i = 0; i < this.positionsCount; i++) {
      const x = this.playersPos[poses[i]].x
      const z = this.playersPos[poses[i]].z
      const color = colors[i]
      if (!i) {
        players.push(
          new Human(
            {
              x,
              z,
              age: 0,
              civ: 'Greek',
              color,
              isPlayed: true,
            },
            context
          )
        )
      } else if (!this.noAI) {
        players.push(new AI({ x, z, age: 0, civ: 'Greek', color }, context))
      }
    }
    return players
  }

  placePlayers() {
    const {
      context: { players },
    } = this

    // Place a town center
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const towncenter = player.spawnBuilding(player.x, player.z, 'TownCenter', true)
      for (let i = 0; i < this.startingUnits; i++) {
        towncenter.placeUnit('Villager')
      }
    }
  }

  generateMap(repeat) {
    const { scene } = this.context
    const paths = []
    const biomesGrid = this.generateBiomesFromCanvas()
    const reliefGrid = this.generateGridRelief(biomesGrid)
    const ressourceGrid = this.generateGridResource(biomesGrid)
    for (let i = 0; i <= this.size; i++) {
      const path = []
      for (let j = 0; j <= this.size; j++) {
        if (!this.grid[i]) {
          this.grid[i] = []
        }
        const y = reliefGrid[i][j] - 1
        const vector = new Vector3(i, y, j)
        let type
        switch (biomesGrid[i][j]) {
          case 3:
            type = 'Desert'
            break
          default:
            type = 'Grass'
        }
        this.grid[i][j] = new Cell({ x: i, y, z: j, type }, this.context)
        switch (ressourceGrid[i][j]) {
          case 't':
            new Resource({ x: i, z: j, type: 'Tree' }, this.context)
            break
        }
        path.push(vector)
      }
      paths.push(path)
    }

    this.ground = MeshBuilder.CreateRibbon('ground', { pathArray: paths }, scene)
    this.ground.material = this.terrainMaterial
    this.ground.checkCollisions = true
    this.ground.receiveShadows = true
    this.ground.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
    this.ground.doNotSyncBoundingInfo = false
    this.ground.convertToUnIndexedMesh()
    this.ground.convertToFlatShadedMesh()
    this.ground.freezeWorldMatrix()
    switch (this.size) {
      case 120:
        this.positionsCount = 2
        break
      case 144:
        this.positionsCount = 3
        break
      case 168:
        this.positionsCount = 4
        break
      case 200:
        this.positionsCount = 4
        break
      case 220:
        this.positionsCount = 4
        break
      default:
        this.positionsCount = 2
    }

    this.totalCells = Math.pow(this.size, 2)
    this.playersPos = this.findPlayerPlaces()
    if (this.playersPos.length < this.positionsCount) {
      if (repeat >= 10) {
        alert('Error while generating the map')
      }
      this.generateMap(repeat + 1)
      return
    }

    this.generateResourcesAroundPlayers(this.playersPos)
  }

  findPlayerPlaces() {
    const results = []
    const outBorder = 50
    const inBorder = Math.floor(this.size / 4)
    const zones = [
      {
        minX: outBorder,
        minY: this.size / 2 + inBorder,
        maxX: this.size / 2 - inBorder,
        maxY: this.size - outBorder,
      },
      {
        minX: outBorder,
        minY: outBorder,
        maxX: this.size / 2 - inBorder,
        maxY: this.size / 2 - inBorder,
      },
      {
        minX: this.size / 2 + inBorder,
        minY: outBorder,
        maxX: this.size - outBorder,
        maxY: this.size / 2 - inBorder,
      },
      {
        minX: this.size / 2 + inBorder,
        minY: this.size / 2 + inBorder,
        maxX: this.size - outBorder,
        maxY: this.size - outBorder,
      },
    ]
    for (let i = 0; i < zones.length; i++) {
      const pos = getZoneInGridWithCondition(zones[i], this.grid, 5, cell => {
        return !cell.border && !cell.solid && !cell.inclined
      })
      if (pos) {
        results.push(pos)
      }
    }
    return results
  }

  generateBiomesFromCanvas() {
    const ctx = this.canvas.getContext('2d')
    const grid = []
    for (let i = 0; i <= this.size; i++) {
      for (let j = 0; j <= this.size; j++) {
        if (!grid[i]) {
          grid[i] = []
        }
        const imageData = ctx.getImageData(j, i, 1, 1).data
        const rgb = [imageData[0], imageData[1], imageData[2]]
        if (rgb[0] > 150) {
          grid[i][j] = 2
        } else if (rgb[1] > 150) {
          grid[i][j] = 3
        } else {
          grid[i][j] = 1
        }
      }
    }
    return grid
  }

  generateGridResource(biomesGrid) {
    const grid = []

    for (let i = 0; i <= this.size; i++) {
      for (let j = 0; j <= this.size; j++) {
        if (!grid[i]) {
          grid[i] = []
        }
        const option = getBiomeOptions(biomesGrid[i][j])
        if (Math.random() < option.chanceOfGrass) {
          grid[i][j] = 'g'
        } else if (Math.random() < option.chanceOfTree) {
          grid[i][j] = 't'
        } else {
          grid[i][j] = 'n'
        }
      }
    }
    return grid

    function getBiomeOptions(biome) {
      const options = {
        1: {
          // Plains
          chanceOfTree: 0.003,
          chanceOfGrass: 0.3,
        },
        2: {
          // Desert
          chanceOfTree: 0.00008,
          chanceOfGrass: 0,
        },
        3: {
          // Forest
          chanceOfTree: 0.2,
          chanceOfGrass: 0.005,
        },
      }
      return options[biome]
    }
  }

  generateGridRelief() {
    const grid = []
    for (let i = 0; i <= this.size; i++) {
      for (let j = 0; j <= this.size; j++) {
        if (!grid[i]) {
          grid[i] = []
        }
        grid[i][j] = 0
      }
    }
    const chanceOfRelief = 0.006
    const reliefPattern = [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2,
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
      3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7,
    ]
    for (let i = 0; i <= this.size; i++) {
      for (let j = 0; j <= this.size; j++) {
        if (Math.random() < chanceOfRelief) {
          const level = randomItem(reliefPattern)
          const cursorSize = level * randomRange(1, 6)
          const type = randomItem(algoLine())
          if (
            getPlainCellsAroundPoint(
              i,
              j,
              grid,
              cursorSize,
              cell => {
                const pointDistance = pointsDistance(cell.x, cell.z, i, j)
                if (pointDistance < cursorSize) {
                  const calc = type(pointDistance, cursorSize, level)
                  grid[cell.x][cell.z] = grid[cell.x][cell.z] < calc ? calc + Math.random() / 4 : grid[cell.x][cell.z]
                }
              },
              true
            )
          );
        }
      }
    }

    function algoLine() {
      return [(x, r, c) => -(Math.pow(5, -2) * (5 * 2)) * x + c, (x, r, c) => (-x / (r + r)) * x + c]
    }
    return grid
  }

  moveCamera(dir, speed = 1) {
    let angle = Tools.ToDegrees(this.camera.rotation.y)
    if (dir === 'up' || 'down') {
      angle += 90
    } else {
      angle += 45
    }
    if (angle < 0) {
      angle += 360
    }
    let rad = Tools.ToRadians(angle)
    if (dir === 'left') {
      this.camera.position.x += Math.cos(rad) * speed
      this.camera.position.z -= Math.sin(rad) * speed
    } else if (dir === 'right') {
      this.camera.position.x -= Math.cos(rad) * speed
      this.camera.position.z -= Math.sin(rad) * speed
    }
    if (dir === 'up') {
      this.camera.position.x -= Math.cos(rad) * speed
      this.camera.position.z += Math.sin(rad) * speed
    } else if (dir === 'down') {
      this.camera.position.x += Math.cos(rad) * speed
      this.camera.position.z -= Math.sin(rad) * speed
    }
  }

  exportCanvas(canvas) {
    const link = document.createElement('a')
    link.download = 'canvas.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  exportGrid(grid) {
    const { size } = this
    const link = document.createElement('a')
    link.setAttribute('download', 'map.txt')
    link.href = makeMapFile()
    link.click()
    function makeMapFile() {
      let textFile
      let text = ''
      for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
          text += grid[i][j]
        }
        text += '\n'
      }
      var data = new Blob([text], { type: 'text/plain' })
      if (textFile) {
        window.URL.revokeObjectURL(textFile)
      }
      textFile = window.URL.createObjectURL(data)
      return textFile
    }
  }
}
