import { Color4, Tools } from '@babylonjs/core'
import {
  findInstancesInSight,
  getActionCondition,
  getClosestInstance,
  getIconPath,
  getInstanceClosestFreeCellPath,
  getInstanceDegree,
  getInstancePath,
  instanceContactInstance,
  instanceRotate,
  instancesDistance,
  moveTowardPoint,
  throttle,
  uuidv4,
} from '../lib/'
import { config, edgeSize, loadingFoodTypes, typeAction } from '../constants'

export default class Unit {
  constructor(options, context) {
    this.context = context

    const {
      context: { map, meshes, menu },
    } = this

    this.id = uuidv4()
    this.name = 'unit'

    Object.keys(options).forEach(prop => {
      this[prop] = options[prop]
    })
    Object.keys(config.units[this.type]).forEach(prop => {
      this[prop] = config.units[this.type][prop]
    })

    this.path = []
    this.action = null
    this.loading = 0
    this.loadingType = null
    this.size = 1
    this.visible = false
    this.isDead = false
    this.isDestroyed = false
    this.realDest
    this.hitPoints = this.totalHitPoints
    this.actionInterval = null
    this.inactif = true

    this.interface = {
      info: element => {
        const data = this.owner.config.units[this.type]
        this.setDefaultInterface(element, data)
        if (this.showLoading && this.owner.isPlayed) {
          element.appendChild(this.getLoadingElement())
        }
      },
      menu:
        this.showBuildings && this.owner.isPlayed
          ? [
              {
                icon: 'interface/50721/002_50721.png',
                children: Object.keys(this.owner.config.buildings).map(key => menu.getBuildingButton(key)),
              },
            ]
          : [],
    }

    this.currentCell = map.grid[this.x][this.z]
    this.currentCell.has = this
    this.currentCell.solid = true

    this.mesh = meshes[this.type].createInstance()
    const { mesh } = this
    this.height = 0.5
    this.speed = 0.05
    mesh.position.x = this.x
    mesh.position.y = this.currentCell.position.y + this.height / 2
    mesh.position.z = this.z
    mesh.class = this
    map.shadowGenerator && map.shadowGenerator.addShadowCaster(mesh)

    this.rotation = {
      get x() {
        return mesh.rotation.x
      },
      set x(val) {
        mesh.rotation.x = val
      },
      get y() {
        return Tools.ToDegrees(mesh.rotation.y)
      },
      set y(val) {
        if (val < 0) {
          val = 360
        }
        if (val > 360) {
          val = 0
        }
        mesh.rotation.y = Tools.ToRadians(val)
      },
      get z() {
        return mesh.rotation.z
      },
      set z(val) {
        mesh.rotations.z = val
      },
    }
    this.position = {
      get x() {
        return mesh.position.x
      },
      set x(val) {
        mesh.position.x = val
      },
      get y() {
        return mesh.position.y
      },
      set y(val) {
        mesh.position.y = val
      },
      get z() {
        return mesh.position.z
      },
      set z(val) {
        mesh.position.z = val
      },
    }

    this.sendTo = throttle(this.sendToEvt, 100)

    setInterval(() => this.step(), 16.66)
  }

  select() {
    if (this.selected) {
      return
    }
    this.selected = true
    this.mesh.enableEdgesRendering()
    this.mesh.edgesWidth = edgeSize
    this.mesh.edgesColor = new Color4(0, 1, 0, 1)
    //canUpdateMinimap(this, player) && menu.updatePlayerMiniMapEvt(this.owner)
  }

  unselect() {
    if (!this.selected) {
      return
    }
    this.selected = false
    this.mesh.disableEdgesRendering()
    //canUpdateMinimap(this, player) && menu.updatePlayerMiniMapEvt(this.owner)
  }

  hasPath() {
    return this.path.length > 0
  }

  setDest(dest) {
    this.delDest()
    if (!dest) {
      this.stop()
      return
    }
    this.dest = dest
    this.realDest = {
      x: dest.position.x,
      z: dest.position.z,
      y: dest.position.y,
    }
  }

  setPath(path) {
    if (!path.length) {
      this.stop()
      return
    }
    this.inactif = false
    this.path = path
  }

  delDest() {
    clearInterval(this.actionInterval)
    this.actionInterval = null
  }

  destHasMoved() {
    return (
      (this.dest.position.x !== this.realDest.x || this.dest.position.z !== this.realDest.z) &&
      instancesDistance(this, this.dest) <= this.sight
    )
  }

  isUnitAtDest(action, dest) {
    if (!action) {
      return false
    }
    if (!dest) {
      this.affectNewDest()
      return false
    }
    if ((this.type !== 'Villager' || action === 'hunt') && this.range && instancesDistance(this, dest) <= this.range) {
      return true
    }
    return instanceContactInstance(this, dest)
  }

  handleChangeDest() {
    if (this.dest && this.dest.position.xsUsedBy === this) {
      this.dest.position.xsUsedBy = null
    }
  }

  getLoadingElement() {
    const {
      context: { menu },
    } = this
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'unit-loading'
    loadingDiv.id = 'loading'

    if (this.loading) {
      const iconImg = document.createElement('img')
      iconImg.className = 'unit-loading-icon'
      iconImg.src = menu.infoIcons[loadingFoodTypes.includes(this.loadingType) ? 'food' : this.loadingType]
      const textDiv = document.createElement('div')
      textDiv.id = 'loading-text'
      textDiv.textContent = this.loading
      loadingDiv.appendChild(iconImg)
      loadingDiv.appendChild(textDiv)
    }
    return loadingDiv
  }

  updateInterfaceLoading() {
    const {
      context: { menu },
    } = this
    if (this.selected && this.owner.isPlayed && this.owner.selectedUnit === this) {
      if (this.loading === 1) {
        menu.updateInfo('loading', element => (element.innerHTML = this.getLoadingElement().innerHTML))
      } else if (this.loading > 1) {
        menu.updateInfo('loading-text', this.loading)
      } else {
        menu.updateInfo('loading', element => (element.innerHTML = ''))
      }
    }
  }

  goBackToPrevious() {
    const {
      context: { map },
    } = this

    if (!this.previousDest) {
      this.stop()
      return
    }
    const dest = this.previousDest
    const cell = map.grid[dest.position.x][dest.position.z]
    const type = dest.category || dest.type
    this.previousDest = null
    if (dest.name === 'animal') {
      if (this.getActionCondition(dest, 'takemeat')) {
        this.sendToTakeMeat(dest)
      } else {
        this.sendTo(cell, 'hunt')
      }
    } else if (dest.name === 'building') {
      if (this.getActionCondition(dest, 'build')) {
        this.sendToBuilding(dest)
      } else if (this.getActionCondition(dest, 'farm')) {
        this.sendToFarm(dest)
      } else {
        this.sendTo(cell, 'build')
      }
    } else if (typeAction[type]) {
      if (this.getActionCondition(dest, typeAction[type])) {
        const sendToFunc = `sendTo${type}`
        typeof this[sendToFunc] === 'function' ? this[sendToFunc](dest) : this.stop()
      } else {
        this.sendTo(cell, typeAction[type])
      }
    } else {
      this.sendTo(cell)
    }
  }

  getAction(name) {
    const {
      context: { menu, player, map },
    } = this
    //this.sprite.onLoop = null
    //this.sprite.onFrameChange = null
    switch (name) {
      case 'delivery':
        if (!this.getActionCondition(this.dest, this.action)) {
          this.stop()
          return
        }
        this.owner[loadingFoodTypes.includes(this.loadingType) ? 'food' : this.loadingType] += this.loading
        this.owner.isPlayed && menu.updateTopbar()
        this.loading = 0
        this.updateInterfaceLoading()
        /*if (this.allAssets && this.allAssets[this.work]) {
          this.standingSheet = Assets.cache.get(this.allAssets[this.work].standingSheet)
          this.walkingSheet = Assets.cache.get(this.allAssets[this.work].walkingSheet)
        }*/

        if (this.previousDest) {
          this.goBackToPrevious()
        } else {
          this.stop()
        }
        break
      case 'farm':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        this.dest.isUsedBy = this
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest.quantity <= 0) {
                this.dest.die()
              }
              this.affectNewDest()
              return
            }
            this.dest.isUsedBy = this
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              this.dest.isUsedBy = null
              return
            }
            // Villager farm the farm
            this.loading++
            this.loadingType = 'wheat'
            this.updateInterfaceLoading()

            //this.visible && sound.play('5178')
            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Destroy farm if it out of quantity
            if (this.dest.quantity <= 0) {
              this.dest.die()
              this.affectNewDest()
            }
            // Set the walking with berrybush animation
            if (this.loading > 0) {
              /*if (this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'chopwood':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest.quantity <= 0) {
                this.dest.die()
              }
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }

            //this.visible && sound.play('5048')

            // Tree destination is still alive we cut him until it's dead
            if (this.dest.hitPoints > 0) {
              this.dest.hitPoints = Math.max(this.dest.hitPoints - 1, 0)

              if (this.dest.selected && this.owner.isPlayed) {
                menu.updateInfo(
                  'hitPoints',
                  this.dest.hitPoints > 0 ? this.dest.hitPoints + '/' + this.dest.totalHitPoints : ''
                )
              }
              if (this.dest.hitPoints <= 0) {
                // Set cutted tree texture
                this.dest.hitPoints = 0
                this.dest.setCuttedTreeTexture()
              }
            } else {
              // Villager cut the stump
              this.loading++
              this.loadingType = 'wood'
              this.updateInterfaceLoading()

              this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
              if (this.dest.selected && this.owner.isPlayed) {
                menu.updateInfo('quantity-text', this.dest.quantity)
              }
              // Destroy tree if stump out of quantity
              if (this.dest.quantity <= 0) {
                this.dest.die()
                this.affectNewDest()
              }
              // Set the walking with wood animation
              if (this.loading > 0) {
                /* if (this.allAssets[this.work]) {
                  this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
                }
                this.standingSheet = null*/
              }
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'forageberry':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest.quantity <= 0) {
                this.dest.die()
              }
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }
            // Villager forage the berrybush
            this.loading++
            this.loadingType = 'berry'
            this.updateInterfaceLoading()

            //this.visible && sound.play('5085')

            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Destroy berrybush if it out of quantity
            if (this.dest.quantity <= 0) {
              this.dest.die()
              this.affectNewDest()
            }
            // Set the walking with berrybush animation
            if (this.loading > 0) {
              /*if (this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'minestone':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest.quantity <= 0) {
                this.dest.die()
              }
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }
            // Villager mine the stone
            this.loading++
            this.loadingType = 'stone'
            this.updateInterfaceLoading()

            //this.visible && sound.play('5159')

            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Destroy stone if it out of quantity
            if (this.dest.quantity <= 0) {
              this.dest.die()
              this.affectNewDest()
            }
            // Set the walking with stone animation
            if (this.loading > 0) {
              /*if (this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'minegold':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }
            // Villager mine the gold
            this.loading++
            this.loadingType = 'gold'
            this.updateInterfaceLoading()

            //this.visible && sound.play('5159')
            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Destroy gold if it out of quantity
            if (this.dest.quantity <= 0) {
              this.dest.die()
              this.affectNewDest()
            }
            // Set the walking with gold animation
            if (this.loading > 0) {
              /*if (this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'build':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest.type === 'Farm' && !this.dest.isUsedBy) {
                this.sendToFarm(this.dest)
              }
              this.affectNewDest()
              return
            }
            if (this.dest.hitPoints < this.dest.totalHitPoints) {
              //this.visible && sound.play('5107')
              this.dest.hitPoints = Math.min(
                Math.round(this.dest.hitPoints + this.dest.totalHitPoints / this.dest.constructionTime),
                this.dest.totalHitPoints
              )
              if (this.dest.selected && this.owner.isPlayed) {
                menu.updateInfo('hitPoints', this.dest.hitPoints + '/' + this.dest.totalHitPoints)
              }
              this.dest.updateHitPoints(this.action)
            } else {
              if (!this.dest.isBuilt) {
                this.dest.updateHitPoints(this.action)
                this.dest.isBuilt = true
                if (this.dest.type === 'Farm' && !this.dest.isUsedBy) {
                  this.sendToFarm(this.dest)
                }
              }
              this.affectNewDest()
            }
          },
          1000,
          false
        )
        break
      case 'attack':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        // this.setTextures('actionSheet')
        if (this.range && this.type !== 'Villager') {
          this.sprite.onLoop = () => {
            if (!this.getActionCondition(this.dest)) {
              if (this.dest && this.dest.hitPoints <= 0) {
                this.dest.die()
              }
              this.affectNewDest()
              return
            }
            if (!this.isUnitAtDest(this.action, this.dest)) {
              this.stop()
              return
            }
            if (this.destHasMoved()) {
              this.realDest.i = this.dest.i
              this.realDest.j = this.dest.j
              this.realDest.x = this.dest.x
              this.realDest.y = this.dest.y
              instanceRotate(this, getInstanceDegree(this, this.dest.position.x, this.dest.position.z))
            }
          }
          onSpriteLoopAtFrame(this.sprite, 6, () => {
            const projectile = new Projectile(
              {
                owner: this,
                target: this.dest,
                type: this.projectile,
                destination: this.realDest,
              },
              this.context
            )
            map.addChild(projectile)
          })
        } else {
          this.startInterval(
            () => {
              if (!this.getActionCondition(this.dest)) {
                if (this.dest && this.dest.hitPoints <= 0) {
                  this.dest.die()
                }
                this.affectNewDest()
                return
              }
              if (this.destHasMoved()) {
                this.realDest.i = this.dest.i
                this.realDest.j = this.dest.j
                this.realDest.x = this.dest.x
                this.realDest.y = this.dest.y
                instanceRotate(getInstanceDegree(this, this.dest.position.x, this.dest.position.z))
              }
              if (!this.isUnitAtDest(this.action, this.dest)) {
                this.sendTo(this.dest, 'attack')
                return
              }
              /*if (this.sounds && this.sounds.hit) {
                this.visible &&
                  sound.play(Array.isArray(this.sounds.hit) ? randomItem(this.sounds.hit) : this.sounds.hit)
              }*/
              if (this.dest.hitPoints > 0) {
                this.dest.hitPoints = getHitPointsWithDamage(this, this.dest)
                if (
                  this.dest.selected &&
                  (player.selectedUnit === this.dest ||
                    player.selectedBuilding === this.dest ||
                    player.selectedOther === this.dest)
                ) {
                  menu.updateInfo('hitPoints', this.dest.hitPoints + '/' + this.dest.totalHitPoints)
                }
                this.dest.isAttacked(this)
                if (this.dest.hitPoints <= 0) {
                  this.dest.die()
                  this.affectNewDest()
                }
              }
            },
            this.rateOfFire * 1000,
            false
          )
        }
        break
      case 'heal':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.sprite.onLoop = () => {
          if (!this.getActionCondition(this.dest)) {
            this.affectNewDest()
            return
          }
          if (this.destHasMoved()) {
            this.realDest.i = this.dest.i
            this.realDest.j = this.dest.j
            this.realDest.x = this.dest.x
            this.realDest.y = this.dest.y
            instanceRotate(getInstanceDegree(this, this.dest.position.x, this.dest.position.z))
          }
          if (!this.isUnitAtDest(this.action, this.dest)) {
            this.sendTo(this.dest, 'heal')
            return
          }
          if (this.dest.hitPoints < this.dest.totalHitPoints) {
            this.dest.hitPoints = Math.min(this.dest.hitPoints + this.healing, this.dest.totalHitPoints)
            if (this.dest.selected && player.selectedUnit === this.dest) {
              menu.updateInfo('hitPoints', this.dest.hitPoints + '/' + this.dest.totalHitPoints)
            }
          }
        }
        break
      case 'takemeat':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }
            // Villager take meat
            //this.visible && sound.play('5178')

            this.loading++
            this.loadingType = 'meat'
            this.updateInterfaceLoading()

            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            this.dest.updateTexture()
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Set the walking with meat animation
            if (this.loading > 0) {
              /*if (this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
            // Destroy corps if it out of quantity
            if (this.dest.quantity <= 0) {
              this.affectNewDest()
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        break
      case 'fishing':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        //this.setTextures('actionSheet')
        this.startInterval(
          () => {
            if (!this.getActionCondition(this.dest)) {
              this.affectNewDest()
              return
            }
            // Villager is full we send him delivery first
            if (this.loading === this.loadingMax[this.loadingType] || !this.dest) {
              this.sendToDelivery()
              return
            }
            // Villager fish
            this.loading++
            this.loadingType = 'fish'
            this.updateInterfaceLoading()

            this.dest.quantity = Math.max(this.dest.quantity - 1, 0)
            if (this.dest.selected && this.owner.isPlayed) {
              menu.updateInfo('quantity-text', this.dest.quantity)
            }
            // Set the walking with meat animation
            if (this.loading > 0) {
              /*if (this.allAssets && this.allAssets[this.work]) {
                this.walkingSheet = Assets.cache.get(this.allAssets[this.work].loadedSheet)
              }
              this.standingSheet = null*/
            }
            // Destroy corps if it out of quantity
            if (this.dest.quantity <= 0) {
              this.affectNewDest()
            }
          },
          (1 / this.gatheringRate[this.work]) * 1000,
          false
        )
        if (this.category !== 'Boat') {
          onSpriteLoopAtFrame(this.sprite, 6, () => {
            this.visible && sound.play('5125')
          })
        }
        break
      case 'hunt':
        if (!this.getActionCondition(this.dest)) {
          this.affectNewDest()
          return
        }
        if (this.dest.isDead) {
          this.previousDest ? this.goBackToPrevious() : this.sendToTakeMeat(this.dest)
        }
        //this.setTextures('actionSheet')
        this.sprite.onLoop = () => {
          if (!this.getActionCondition(this.dest)) {
            if (this.dest && this.dest.hitPoints <= 0) {
              this.dest.die()
              this.previousDest ? this.goBackToPrevious() : this.sendToTakeMeat(this.dest)
              return
            }
            this.affectNewDest()
            return
          }
          if (!this.isUnitAtDest(this.action, this.dest)) {
            this.stop()
            return
          }
          if (this.destHasMoved()) {
            this.realDest.i = this.dest.i
            this.realDest.j = this.dest.j
            this.realDest.x = this.dest.x
            this.realDest.y = this.dest.y
            instanceRotate(getInstanceDegree(this, this.dest.position.x, this.dest.position.z))
          }
        }
        onSpriteLoopAtFrame(this.sprite, 6, () => {
          const projectile = new Projectile(
            {
              owner: this,
              target: this.dest,
              type: 'Spear',
              destination: this.realDest,
              damage: 4,
            },
            this.context
          )
          map.addChild(projectile)
        })
        break
      default:
        this.stop()
    }
  }

  sendToEvt(dest, action) {
    const {
      context: { map },
    } = this
    this.handleChangeDest()
    this.stopInterval()
    let path = []
    // No instance we cancel the destination
    if (!dest) {
      return
    }
    // Unit is already beside our target
    if (this.isUnitAtDest(action, dest)) {
      this.setDest(dest)
      this.action = action
      instanceRotate(this, getInstanceDegree(this, dest.position.x, dest.position.z))
      this.getAction(action)
      return
    }
    // Set unit path
    if (map.grid[dest.position.x] && map.grid[dest.position.x][dest.position.z]) {
      const allowWaterCellCategory = this.category === 'Boat'
      if (map.grid[dest.position.x][dest.position.z].solid) {
        path = getInstanceClosestFreeCellPath(this, dest, map)
        if (!path.length && this.work) {
          this.action = action
          this.affectNewDest()
          return
        }
      } else if (!allowWaterCellCategory && dest.category === 'Water') {
        const cell = getFreeCellAroundPoint(
          dest.position.x,
          dest.position.z,
          1,
          map.grid,
          cell => cell.category !== 'Water' && !cell.solid
        )
        this.sendToEvt(cell)
        return
      }
    }
    if (!path.length) {
      path = getInstancePath(this, Math.round(dest.position.x), Math.round(dest.position.z), map)
    }
    // Unit found a path, set the action and play walking animation
    if (path.length) {
      this.setDest(dest)
      this.action = action
      this.setPath(path)
    } else {
      this.stop()
    }
  }

  sendToDelivery() {
    const {
      context: { map },
    } = this
    let buildingTypes = []
    if (this.category === 'Boat') {
      buildingTypes = ['Dock']
    } else {
      buildingTypes = ['TownCenter']
      const buildings = {
        Granary: this.owner.config.buildings.Granary,
        StoragePit: this.owner.config.buildings.StoragePit,
      }
      for (const [key, value] of Object.entries(buildings)) {
        if (value.accept && value.accept.includes(this.loadingType)) {
          buildingTypes.push(key)
          break
        }
      }
    }

    const targets = this.owner.buildings.filter(building =>
      getActionCondition(this, building, 'delivery', { buildingTypes })
    )
    const target = getClosestInstance(this, targets)
    if (this.dest) {
      this.previousDest = this.dest
    } else {
      this.previousDest = this.currentCell
    }
    this.sendTo(target, 'delivery')
  }

  sendToTree(tree) {
    const {
      context: { menu },
    } = this
    if (this.work !== 'woodcutter') {
      this.loading = 0
      this.updateInterfaceLoading()
      this.work = 'woodcutter'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.woodcutter.actionSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.woodcutter.standingSheet)
      this.walkingSheet = Assets.cache.get(this.allAssets.woodcutter.walkingSheet)
      this.dyingSheet = Assets.cache.get(this.allAssets.woodcutter.dyingSheet)
      this.corpseSheet = Assets.cache.get(this.allAssets.woodcutter.corpseSheet)*/
    }
    this.previousDest = null
    return this.sendTo(tree, 'chopwood')
  }


  sendToFish(target) {
    const {
      context: { menu, map },
    } = this
    if (!loadingFoodTypes.includes(this.loadingType)) {
      this.loading = 0
      this.updateInterfaceLoading()
    }
    if (this.work !== 'fisher') {
      this.work = 'fisher'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*if (this.allAssets && this.allAssets.fisher) {
        this.actionSheet = Assets.cache.get(this.allAssets.fisher.actionSheet)
        this.standingSheet = Assets.cache.get(this.allAssets.fisher.standingSheet)
        if (!this.loading) {
          this.walkingSheet = Assets.cache.get(this.allAssets.fisher.walkingSheet)
          this.dyingSheet = Assets.cache.get(this.allAssets.fisher.dyingSheet)
          this.corpseSheet = Assets.cache.get(this.allAssets.fisher.corpseSheet)
        }
      }*/
    }
    this.previousDest = null
    return this.sendTo(target, 'fishing')
  }

  sendToAttack(target) {
    const {
      context: { menu },
    } = this
    if (this.work !== 'attacker') {
      this.work = 'attacker'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.type)
      /*this.actionSheet = Assets.cache.get(this.allAssets.attack.actionSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.attack.standingSheet)
      if (!this.loading) {
        this.walkingSheet = Assets.cache.get(this.allAssets.attack.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.attack.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.attack.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(target, 'attack')
  }

  sendToTakeMeat(target) {
    const {
      context: { menu },
    } = this
    if (!loadingFoodTypes.includes(this.loadingType)) {
      this.loading = 0
      this.updateInterfaceLoading()
    }
    if (this.work !== 'hunter' || this.action !== 'takemeat') {
      this.work = 'hunter'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.hunter.harvestSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.hunter.standingSheet)
      if (!this.loading) {
        this.walkingSheet = Assets.cache.get(this.allAssets.hunter.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.hunter.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.hunter.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(target, 'takemeat')
  }

  sendToHunt(target) {
    const {
      context: { menu },
    } = this
    if (!loadingFoodTypes.includes(this.loadingType)) {
      this.loading = 0
      this.updateInterfaceLoading()
    }
    if (this.work !== 'hunter' || this.action !== 'hunt') {
      this.work = 'hunter'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.hunter.actionSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.hunter.standingSheet)
      if (!this.loading) {
        this.walkingSheet = Assets.cache.get(this.allAssets.hunter.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.hunter.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.hunter.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(target, 'hunt')
  }

  sendToBuilding(building) {
    const {
      context: { menu },
    } = this
    if (this.work !== 'builder') {
      this.updateInterfaceLoading()
      this.work = 'builder'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.builder.actionSheet)
      if (!this.loading) {
        this.standingSheet = Assets.cache.get(this.allAssets.builder.standingSheet)
        this.walkingSheet = Assets.cache.get(this.allAssets.builder.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.builder.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.builder.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(building, 'build')
  }

  sendToFarm(farm) {
    const {
      context: { menu },
    } = this
    if (!loadingFoodTypes.includes(this.loadingType)) {
      this.loading = 0
      this.updateInterfaceLoading()
    }
    if (this.work !== 'farmer') {
      this.work = 'farmer'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.farmer.actionSheet)
      if (!this.loading) {
        this.standingSheet = Assets.cache.get(this.allAssets.farmer.standingSheet)
        this.walkingSheet = Assets.cache.get(this.allAssets.farmer.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.farmer.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.farmer.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(farm, 'farm')
  }

  sendToBerrybush(berrybush) {
    const {
      context: { menu },
    } = this
    if (!loadingFoodTypes.includes(this.loadingType)) {
      this.loading = 0
      this.updateInterfaceLoading()
    }
    if (this.work !== 'forager') {
      this.work = 'forager'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.forager.actionSheet)
      if (!this.loading) {
        this.standingSheet = Assets.cache.get(this.allAssets.forager.standingSheet)
        this.walkingSheet = Assets.cache.get(this.allAssets.forager.walkingSheet)
        this.dyingSheet = Assets.cache.get(this.allAssets.forager.dyingSheet)
        this.corpseSheet = Assets.cache.get(this.allAssets.forager.corpseSheet)
      }*/
    }
    this.previousDest = null
    return this.sendTo(berrybush, 'forageberry')
  }

  sendToStone(stone) {
    const {
      context: { menu },
    } = this
    if (this.work !== 'stoneminer') {
      this.loading = 0
      this.updateInterfaceLoading()
      this.work = 'stoneminer'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.stoneminer.actionSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.stoneminer.standingSheet)
      this.walkingSheet = Assets.cache.get(this.allAssets.stoneminer.walkingSheet)
      this.dyingSheet = Assets.cache.get(this.allAssets.stoneminer.dyingSheet)
      this.corpseSheet = Assets.cache.get(this.allAssets.stoneminer.corpseSheet)*/
    }
    this.previousDest = null
    return this.sendTo(stone, 'minestone')
  }

  sendToGold(gold) {
    const {
      context: { menu },
    } = this
    if (this.work !== 'goldminer') {
      this.loading = 0
      this.updateInterfaceLoading()
      this.work = 'goldminer'
      this.owner.isPlayed && this.owner.selectedUnit === this && menu.updateInfo('type', this.work)
      /*this.actionSheet = Assets.cache.get(this.allAssets.goldminer.actionSheet)
      this.standingSheet = Assets.cache.get(this.allAssets.goldminer.standingSheet)
      this.walkingSheet = Assets.cache.get(this.allAssets.goldminer.walkingSheet)
      this.dyingSheet = Assets.cache.get(this.allAssets.goldminer.dyingSheet)
      this.corpseSheet = Assets.cache.get(this.allAssets.goldminer.corpseSheet)*/
    }
    this.previousDest = null
    return this.sendTo(gold, 'minegold')
  }

  affectNewDest() {
    const { map } = this.context
    this.stopInterval()
    if (this.previousDest && this.work !== 'delivery') {
      this.goBackToPrevious()
      return
    }
    let handleSuccess = false
    if (this.type === 'Villager' && (this.action === 'takemeat' || this.action === 'hunt')) {
      handleSuccess = this.handleAffectNewDestHunter()
    } else if (!this.dest || this.dest.name !== 'animal') {
      const targets = findInstancesInSight(this, map.grid, instance => this.getActionCondition(instance))
      if (targets.length) {
        const target = getClosestInstanceWithPath(this, targets)
        if (target) {
          if (instanceContactInstance(this, target)) {
            this.degree = getInstanceDegree(this, target.x, target.y)
            this.getAction(this.action)
            return
          }
          this.setDest(target.instance)
          this.setPath(target.path)
          return
        }
      }
    }
    if (!handleSuccess) {
      const notDeliveryWork = ['builder', 'attacker', 'healer']
      if (this.loading && !notDeliveryWork.includes(this.work)) {
        this.sendToDelivery()
      } else {
        this.stop()
      }
    }
  }

  moveToPath() {
    const {
      context: { map },
    } = this
    const next = this.path[this.path.length - 1]
    const nextCell = map.grid[next.position.x][next.position.z]
    if (!this.dest || this.dest.isDestroyed) {
      this.affectNewDest()
      return
    }
    // Collision with another walking unit, we block the mouvement
    if (
      nextCell.has &&
      nextCell.has.name === 'unit' &&
      nextCell.has.id !== this.id &&
      nextCell.has.hasPath() &&
      instancesDistance(this, nextCell.has) <= 1
    ) {
      //this.sprite.stop()
      return
    }
    if (nextCell.solid && this.dest) {
      this.sendTo(this.dest, this.action)
      return
    }

    //if (!this.sprite.playing) {
    //this.sprite.play()
    //}

    //this.zIndex = getInstanceZIndex(this)
    if (instancesDistance(this, nextCell) < this.speed) {
      //clearCellOnInstanceSight(this)
      //this.position.z = nextCell.z
      //this.i = nextCell.i
      //this.j = nextCell.j

      if (this.currentCell.has === this) {
        this.currentCell.has = null
        this.currentCell.solid = false
      }
      this.currentCell = map.grid[nextCell.position.x][nextCell.position.z]
      //this.currentCell = map.grid[this.position.x][this.position.z]
      if (this.currentCell.has === null) {
        this.currentCell.has = this
        this.currentCell.solid = true
      }

      //renderCellOnInstanceSight(this)
      this.path.pop()

      // Destination moved
      if (this.destHasMoved()) {
        this.sendTo(this.dest, this.action)
        return
      }
      if (this.isUnitAtDest(this.action, this.dest)) {
        this.path = []
        this.stopInterval()
        instanceRotate(this, this.dest.position.x, this.dest.position.z)
        this.getAction(this.action)
        return
      }

      if (!this.path.length) {
        this.stop()
      }
    } else {
      // Move to next
      let speed = this.speed
      if (this.loading > 0) {
        speed *= 0.8
      }
      moveTowardPoint(this, nextCell.position, this.speed)
      //canUpdateMinimap(this, player) && menu.updatePlayerMiniMap(this.owner)
      /*if (degreeToDirection(oldDeg) !== degreeToDirection(this.degree)) {
        // Change animation according to degree
        //this.setTextures('walkingSheet')
      }*/
    }
  }

  checkDestContact() {
    // Destination in contact
    if (this.getActionCondition(this.action, this.dest) && instanceContactInstance(this, this.dest)) {
      const newRotationY = getInstanceDegree(
        this.position.x,
        this.position.z,
        this.dest.position.x,
        this.dest.position.z
      )
      if (this.rotation.y === newRotationY) {
        this.doAction()
      } else {
        this.rotate = newRotationY
      }
      this.path = []
      return true
    } else {
      return false
    }
  }

  getActionCondition(target, action = this.action, props) {
    return getActionCondition(this, target, action, props)
  }

  stop() {
    this.delDest()
    this.inactif = true
    this.dest = null
    this.path = []
  }

  startInterval(callback, time, immediate = true) {
    if (this.isDead) {
      return
    }
    this.stopInterval()
    immediate && callback()
    this.interval = setInterval(callback, time)
  }

  stopInterval() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  step() {
    if (this.hitPoints <= 0) {
      this.die()
    } else if (this.hasPath()) {
      this.moveToPath()
    }
  }

  setDefaultInterface(element, data) {
    const civDiv = document.createElement('div')
    civDiv.id = 'civ'
    civDiv.textContent = this.owner.civ
    element.appendChild(civDiv)

    const typeDiv = document.createElement('div')
    typeDiv.id = 'type'
    typeDiv.textContent = this.type === 'Villager' ? this.work || this.type : this.type
    element.appendChild(typeDiv)

    const iconImg = document.createElement('img')
    iconImg.id = 'icon'
    iconImg.src = getIconPath(data.icon)
    element.appendChild(iconImg)

    const hitPointsDiv = document.createElement('div')
    hitPointsDiv.id = 'hitPoints'
    hitPointsDiv.textContent = this.hitPoints + '/' + this.totalHitPoints
    element.appendChild(hitPointsDiv)

    const infosDiv = document.createElement('div')
    infosDiv.id = 'infos'

    const infos = [
      ['meleeAttack', '007_50731'],
      ['pierceAttack', '006_50731'],
      ['meleeArmor', '008_50731'],
      ['pierceArmor', '010_50731'],
    ]

    for (let i = 0; i < infos.length; i++) {
      const info = infos[i]
      if (data[info[0]]) {
        const infoDiv = document.createElement('div')
        infoDiv.id = 'info'

        const attackImg = document.createElement('img')
        getIconPath
        attackImg.src = getIconPath(info[1])
        const attackDiv = document.createElement('div')
        attackDiv.id = info[0]
        attackDiv.textContent = data[info[0]]
        infoDiv.appendChild(attackImg)
        infoDiv.appendChild(attackDiv)
        infosDiv.appendChild(infoDiv)
      }
    }

    element.appendChild(infosDiv)
  }
}
