import {
  canAfford,
  drawInstanceBlinkingSelection,
  payCost,
  uuidv4,
  getHexColor,
  updateObject,
  getActionCondition,
  canUpdateMinimap,
} from '../../lib'
import { config, technology, populationMax } from '../../constants'
import Unit from '../unit'
import { Building } from '../building'

export class Player {
  constructor(options, context) {
    this.name = 'player'
    this.context = context

    const { map } = context

    this.id = uuidv4()

    Object.keys(options).forEach((prop) => {
        this[prop] = options[prop];
    })

    this.wood = map.devMode ? 10000 : 200
    this.food = map.devMode ? 10000 : 200
    this.stone = map.devMode ? 10000 : 150
    this.gold = map.devMode ? 10000 : 0
    this.units = []
    this.buildings = []
    this.population = 0
    this.populationMax = map.devMode ? populationMax : 0
    this.colorHex = getHexColor(this.color)
    this.config = {...config}
    this.techs = { ...technology }
    this.hasBuilt = map.devMode ? Object.keys(this.config.buildings).map(key => key) : []
    this.technologies = []
    this.cellViewed = 0
    const cloneGrid = []
    for (let i = 0; i <= map.size; i++) {
      for (let j = 0; j <= map.size; j++) {
        if (cloneGrid[i] == null) {
          cloneGrid[i] = []
        }
        cloneGrid[i][j] = {
          i,
          j,
          has: null,
          viewBy: [],
          onViewed: () => {
            const {
              context: { menu, map },
            } = this
            if (this.isPlayed && !map.revealEverything) {
              menu.updateTerrainMiniMap(i, j)
            }
          },
          viewed: (this.isPlayed && this.type === 'Human' && map.revealTerrain) || false,
        }
      }
    }
    this.views = cloneGrid
  }

  spawnBuilding(...args) {
    const building = this.createBuilding(...args)
    if (this.isPlayed) {
      let hasSentVillager = false
      let hasSentOther = false

      for (let i = 0; i < this.selectedUnits.length; i++) {
        const unit = this.selectedUnits[i]
        if (unit.type === 'Villager') {
          if (getActionCondition(unit, building, 'build')) {
            hasSentVillager = true
            unit.sendToBuilding(building)
          }
        } else {
          unit.sendTo(building)
          hasSentOther = true
        }
      }
      if (hasSentVillager) {
        //drawInstanceBlinkingSelection(building)
      }
      /*if (hasSentOther) {
        const voice = randomItem(['5075', '5076', '5128', '5164'])
        sound.play(voice)
        return
      } else if (hasSentVillager) {
        const voice = this.config.units.Villager.sounds.build
        sound.play(voice)
        return
      }*/
    }

    return building
  }

  onAgeChange() {
    const {
      context: { players, menu },
    } = this
    if (this.isPlayed) {
      sound.play('5169')
    }
    for (let i = 0; i < this.buildings.length; i++) {
      const building = this.buildings[i]
      if (building.isBuilt && !building.isDead) {
        building.finalTexture()
      }
    }
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      if (player.type === 'Human') {
        if (player.selectedUnit && player.selectedUnit.owner.id === this.id) {
          menu.setBottombar(player.selectedUnit)
        } else if (player.selectedBuilding && player.selectedBuilding.owner.id === this.id) {
          menu.setBottombar(player.selectedBuilding)
        } else if (player.selectedOther && player.selectedOther.owner.id === this.id) {
          menu.setBottombar(player.selectedOther)
        }
      }
    }
  }

  otherPlayers() {
    const {
      context: { players },
    } = this
    const others = [...players]
    others.splice(players.indexOf(this), 1)
    return others
  }

  updateConfig(operations) {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      const types = Array.isArray(operation.type) ? operation.type : [operation.type]
      for (let j = 0; j < types.length; j++) {
        const type = types[j]
        if (Object.keys(this.config.buildings).includes(type)) {
          this.config.buildings[type] && updateObject(this.config.buildings[type], operation)
        } else if (Object.keys(this.config.units).includes(type)) {
          this.config.units[type] && updateObject(this.config.units[type], operation)
        }
      }
    }
  }

  buyBuilding(i, j, type) {
    const {
      context: { menu, map },
    } = this
    const config = this.config.buildings[type]
    if (canAfford(this, config.cost)) {
      this.spawnBuilding(i, j, type, map.devMode)
      payCost(this, config.cost)
      this.isPlayed && menu.updateTopbar()
      return true
    }
    return false
  }

  createUnit(x, z, type) {
    const { context } = this
    let unit = new Unit({ x, z, type, owner: this }, context)
    this.units.push(unit)
    canUpdateMinimap(unit, context.player) && context.menu.updatePlayerMiniMapEvt(this)
    return unit
  }

  createBuilding(i, j, type, isBuilt = false) {
    const { context } = this
    const building = new Building({ x: i, z: j, owner: this, type, isBuilt }, context)
    this.buildings.push(building)
    canUpdateMinimap(building, context.player) && context.menu.updatePlayerMiniMapEvt(this)
    return building
  }
}
