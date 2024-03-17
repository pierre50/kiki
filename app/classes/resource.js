import { Color4, Mesh, VertexBuffer } from '@babylonjs/core'
import { config, edgeSize } from '../constants'
import { getIconPath, getPlainCellsAroundPoint, uuidv4 } from '../lib'

export class Resource {
  constructor(options, context) {
    this.context = context

    const {
      context: { map, meshes },
    } = this

    this.id = uuidv4()
    this.name = 'resource'

    Object.keys(options).forEach(prop => {
      this[prop] = options[prop]
    })
    Object.keys(config.resources[this.type]).forEach(prop => {
      this[prop] = config.resources[this.type][prop]
    })

    this.mesh = meshes[this.type].createInstance()

    this.selected = false
    this.visible = false
    this.isDead = false
    this.isDestroyed = false
    this.size = 1
    this.hitPoints = this.totalHitPoints

    this.interface = {
      info: element => {
        const data = config.resources[this.type]
        this.setDefaultInterface(element, data)
      },
    }

    this.currentCell = map.grid[this.x][this.z]
    this.currentCell.has = this
    this.currentCell.solid = true

    const { mesh } = this
    mesh.position.x = this.x
    mesh.position.y = this.currentCell.position.y + 4 / 2
    mesh.position.z = this.z
    mesh.class = this

    this.position = {
      get x() {
        return mesh.position.x
      },
      get y() {
        return mesh.position.y
      },
      get z() {
        return mesh.position.z
      },
    }
    map.shadowGenerator && map.shadowGenerator.addShadowCaster(mesh)
    //this.parent.waterGround.material.addToRenderList(mesh);
  }

  select() {
    if (this.selected) {
      return
    }
    this.selected = true
	this.mesh.enableEdgesRendering()
    this.mesh.edgesWidth = edgeSize
    this.mesh.edgesColor = new Color4(0, 1, 0, 1)
    /*const selection = new Graphics()
    selection.name = 'selection'
    selection.zIndex = 3
    selection.lineStyle(1, 0xffffff)
    const path = [-32 * this.size, 0, 0, -16 * this.size, 32 * this.size, 0, 0, 16 * this.size]
    selection.drawPolygon(path)
    this.addChildAt(selection, 0)*/
  }

  unselect() {
    if (!this.selected) {
      return
    }
    this.selected = false
	this.mesh.disableEdgesRendering()
    /*const selection = this.getChildByName('selection')
    if (selection) {
      this.removeChild(selection)
    }*/
  }

  die(immediate) {
    if (this.isDead) {
      return
    }
    const {
      context: { player, players, map, menu },
    } = this
    if (this.selected && player.selectedOther === this) {
      player.unselectAll()
    }
    const listName = 'founded' + this.type + 's'
    for (let i = 0; i < players.length; i++) {
      if (players[i].type === 'AI') {
        const list = players[i][listName]
        if (list) {
          const index = list.indexOf(this)
          list.splice(index, 1)
        }
      }
    }
    // Remove from map resources
    let index = map.resources.indexOf(this)
    if (index >= 0) {
      map.resources.splice(index, 1)
    }
    menu.updateResourcesMiniMap()
    this.isDead = true
    if (this.type === 'Tree' && !immediate) {
      this.onTreeDie()
    } else {
      this.clear()
    }
  }

  setCuttedTreeTexture() {
    this.meshes
    this.mesh.subMeshes[0].dispose()
    const mesh = this.mesh.subMeshes[0].getMesh()
    var positions = mesh.getVerticesData(VertexBuffer.PositionKind)
    var normals = mesh.getVerticesData(VertexBuffer.NormalKind)
    var colors = mesh.getVerticesData(VertexBuffer.ColorKind)
    var uvs = mesh.getVerticesData(VertexBuffer.UVKind)
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions)
    this.mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, colors)
    this.mesh.updateVerticesData(VertexBuffer.UVKind, uvs)
    /*const sprite = this.getChildByName('sprite')
    const spritesheet = Assets.cache.get('636')
    const textureName = `00${randomRange(0, 3)}_636.png`
    const texture = spritesheet.textures[textureName]
    sprite.texture = texture
    const points = [-cellWidth / 2, 0, 0, -cellHeight / 2, cellWidth / 2, 0, 0, cellHeight / 2]
    sprite.hitArea = new Polygon(points)
    sprite.anchor.set(texture.defaultAnchor.x, texture.defaultAnchor.y)*/
  }

  onTreeDie() {
    const {
      context: { map },
    } = this
    /*const spritesheet = Assets.cache.get('623')
    const textureName = `00${randomRange(0, 3)}_623.png`
    const texture = spritesheet.textures[textureName]
    const sprite = this.getChildByName('sprite')
    sprite.texture = texture
    sprite.eventMode = 'none'
    this.zIndex--*/
    if (this.currentCell.has === this) {
      this.currentCell.has = null
      this.currentCell.corpses.push(this)
      this.currentCell.solid = false
    }
  }

  clear() {
    if (this.isDestroyed) {
      return
    }
    const {
      context: { map },
    } = this
    this.isDestroyed = true
    if (this.currentCell.has === this) {
      this.currentCell.has = null
      this.currentCell.solid = false
    }
    const corpseIndex = this.currentCell.corpses.indexOf(this)
    corpseIndex >= 0 && this.currentCell.corpses.splice(corpseIndex, 1)
    map.removeChild(this)
    this.destroy({ child: true, texture: true })
  }

  setDefaultInterface(element, data) {
    const {
      context: { menu },
    } = this
    const typeDiv = document.createElement('div')
    typeDiv.id = 'type'
    typeDiv.textContent = this.type
    element.appendChild(typeDiv)

    const iconImg = document.createElement('img')
    iconImg.id = 'icon'
    iconImg.src = getIconPath(data.icon)
    element.appendChild(iconImg)

    if (this.hitPoints) {
      const hitPointsDiv = document.createElement('div')
      hitPointsDiv.id = 'hitPoints'
      hitPointsDiv.textContent = this.hitPoints + '/' + this.totalHitPoints
      element.appendChild(hitPointsDiv)
    }
    if (this.quantity) {
      const quantityDiv = document.createElement('div')

      quantityDiv.id = 'quantity'
      quantityDiv.className = 'resource-quantity'

      let iconToUse
      switch (this.type) {
        case 'Tree':
          iconToUse = menu.infoIcons['wood']
          break
        case 'Salmon':
        case 'Berrybush':
          iconToUse = menu.infoIcons['food']
          break
        case 'Stone':
          iconToUse = menu.infoIcons['stone']
          break
        case 'Gold':
          iconToUse = menu.infoIcons['gold']
          break
      }
      const smallIconImg = document.createElement('img')
      smallIconImg.src = iconToUse
      smallIconImg.className = 'resource-quantity-icon'
      const textDiv = document.createElement('div')
      textDiv.id = 'quantity-text'
      textDiv.textContent = this.quantity
      quantityDiv.appendChild(smallIconImg)
      quantityDiv.appendChild(textDiv)
      element.appendChild(quantityDiv)
    }
  }
}
