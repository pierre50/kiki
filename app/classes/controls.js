import {
  isometricToCartesian,
  pointIsBetweenTwoPoint,
  pointsDistance,
  getPlainCellsAroundPoint,
  changeSpriteColor,
  getTexture,
  debounce,
  getActionCondition,
} from '../lib'
import { colorWhite, colorRed, cellWidth, cellHeight, maxSelectUnits, typeAction } from '../constants'
import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Plane,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core'
import pointInPolygon from 'point-in-polygon'

export default class Controls {
  constructor(context) {
    this.context = context

    const { canvas, scene } = context

    this.sortableChildren = true

    this.mouse = {
      x: 0,
      y: 0,
      prevent: false,
    }

    const cameraHeight = 50
    const ratio = canvas.height / canvas.width
    this.altitude = 50 * 1.5
    this.wtf = (-1.2 * this.altitude) / 2
    this.camera = new UniversalCamera('UniversalCamera', new Vector3(0, cameraHeight, 0), scene)
    this.camera.inputs.attached.mouse.buttons = [2]
    this.camera.rotation.x = Math.PI / 4
    this.camera.rotation.y = Math.PI / 4
    this.camera.attachControl(canvas, true)
    this.camera.speed = 1
    //this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
    this.camera.orthoLeft = this.wtf
    this.camera.orthoRight = -this.camera.orthoLeft
    if (this.camera.orthoLeft && this.camera.orthoRight) {
      this.camera.orthoTop = this.camera.orthoRight * ratio
      this.camera.orthoBottom = this.camera.orthoLeft * ratio
    }
    this.camera.onViewMatrixChangedObservable.add(() => {
      this.camera.position.y = cameraHeight
      debounce(this.updateInstanceInCamera())
    })

    this.lines = null
    this.markers = []
    this.mousePos0
    this.mousePos1

    this.mouseHoldTimeout
    this.keysPressed = {}
    this.keyInterval
    this.keySpeed = 0
    this.eventMode = 'auto'
    this.allowMove = false
    this.allowClick = false
    this.mouseRectangle
    this.mouseTouch
    this.mouseDrag = false
    this.moveCameraInterval

    this.canv = document.createElement('canvas')
    this.canv.width = window.innerWidth
    this.canv.height = window.innerHeight
    this.canv.style.position = 'absolute'
    this.canv.style.left = '0'
    this.canv.style.top = '0'
    this.canv.style.zIndex = '1000'
    this.canv.style.pointerEvents = 'none'
    this.canvasContext = this.canv.getContext('2d')
    document.body.appendChild(this.canv)
    this.minimapRectangle

    scene.onPointerDown = evt => this.onMouseDown(evt)
    scene.onPointerMove = evt => this.onMouseMove(evt)
    scene.onPointerUp = evt => this.onMouseUp(evt)
    /*
    document.addEventListener('pointermove', evt => this.onMouseMove(evt))
    document.addEventListener('pointerdown', evt => this.onMouseDown(evt))
    document.addEventListener('pointerup', evt => this.onMouseUp(evt))*/
  }

  onMouseDown(evt) {
    const { scene } = this.context
    this.mousePos0 = { x: scene.pointerX, y: scene.pointerY }
    this.lines = MeshBuilder.CreateLines(
      'lines',
      {
        points: [
          new Vector3(0, 0, 0),
          new Vector3(1, 0, 0),
          new Vector3(1, 1, 0),
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 0),
        ],
      },
      scene
    )
    this.lines.isPickable = false
    this.lines.billboardMode = 7
    for (let i = 0; i < 4; i++) {
      const mesh = Mesh.CreateSphere('', 5, 0.0004, scene)
      mesh.isPickable = false
      this.markers.push(mesh)
    }
    let ray0 = scene.createPickingRay(this.mousePos0.x, this.mousePos0.y)
    this.markers[0].position = ray0.origin.add(ray0.direction)
    if (!this.isMouseInApp(evt)) {
      return
    }
  }

  onMouseMove(evt) {
    const {
      context: { map, player, app, scene },
    } = this
    if (this.mousePos0 && pointsDistance(this.mousePos0.x, this.mousePos0.y, scene.pointerX, scene.pointerY) > 5) {
      this.mousePos1 = { x: scene.pointerX, y: scene.pointerY }
      let rays = []
      rays.push(scene.createPickingRay(this.mousePos0.x, this.mousePos0.y))
      rays.push(scene.createPickingRay(this.mousePos1.x, this.mousePos0.y))
      rays.push(scene.createPickingRay(this.mousePos0.x, this.mousePos1.y))
      rays.push(scene.createPickingRay(this.mousePos1.x, this.mousePos1.y))

      for (let i = 0; i < 4; i++) {
        this.markers[i].position = rays[i].origin.add(rays[i].direction)
      }
      this.lines.position.copyFrom(this.markers[0].position)
      this.lines.scaling.x = Vector3.Distance(this.markers[0].position, this.markers[1].position)
      this.lines.scaling.y = -Vector3.Distance(this.markers[0].position, this.markers[2].position)

      this.lines.lookAt(this.markers[1].position, (5 * Math.PI) / 4)

      if (this.mousePos1.y < this.mousePos0.y) {
        this.lines.scaling.y *= -1
      }
    }

    return
    this.mouse.x = evt.pageX
    this.mouse.y = evt.pageY

    // Mouse building to place construction
    if (this.mouseBuilding) {
      const pos = isometricToCartesian(
        this.mouse.x - map.x,
        this.mouse.y >= app.screen.height ? app.screen.height - map.y : this.mouse.y - map.y
      )
      const i = Math.min(Math.max(pos[0], 0), map.size)
      const j = Math.min(Math.max(pos[1], 0), map.size)
      if (map.grid[i] && map.grid[i][j]) {
        const cell = map.grid[i][j]
        this.mouseBuilding.x = cell.x - this.camera.x
        this.mouseBuilding.y = cell.y - this.camera.y
        let isFree = true

        const dist = this.mouseBuilding.size === 3 ? 1 : 0
        if (this.mouseBuilding.buildOnWater) {
          let waterBorderedCells = 0
          let waterCells = 0
          getPlainCellsAroundPoint(i, j, map.grid, dist, cell => {
            if (cell.inclined || cell.solid || !cell.visible) {
              isFree = false
              return
            }
            if (cell.waterBorder) {
              waterBorderedCells++
            } else if (cell.category === 'Water') {
              waterCells++
            }
          })
          if (waterBorderedCells < 2 || waterCells < 4) {
            isFree = false
          }
        } else {
          getPlainCellsAroundPoint(i, j, map.grid, dist, cell => {
            if (cell.category === 'Water' || cell.solid || cell.inclined || cell.border || !cell.visible) {
              isFree = false
              return
            }
          })
        }
        // Color image of mouse building depend on buildable or not
        const sprite = this.mouseBuilding.getChildByName('sprite')
        const color = this.mouseBuilding.getChildByName('color')
        if (isFree) {
          sprite.tint = colorWhite
          if (color) {
            color.tint = colorWhite
          }
        } else {
          sprite.tint = colorRed
          if (color) {
            color.tint = colorRed
          }
        }
        this.mouseBuilding.isFree = isFree
      }
      return
    }

    // Create and draw mouse selection
    if (
      !this.mouseRectangle &&
      this.pointerStart &&
      pointsDistance(this.mouse.x, this.mouse.y, this.pointerStart.x, this.pointerStart.y) > 5
    ) {
      this.mouseRectangle = {
        x: this.pointerStart.x,
        y: this.pointerStart.y,
        width: 0,
        height: 0,
      }
    }

    if (this.mouseRectangle && !this.mouseBuilding) {
      if (player && (player.selectedUnits.length || player.selectedBuilding)) {
        player.unselectAll()
      }
      const { canvasContext, canv } = this
      this.mouseRectangle.width = Math.round(this.mouse.x - this.mouseRectangle.x)
      this.mouseRectangle.height = Math.round(this.mouse.y - this.mouseRectangle.y)
      canvasContext.clearRect(0, 0, canv.width, canv.height)
      canvasContext.strokeStyle = '#ffffff'
      canvasContext.beginPath()
      canvasContext.rect(
        this.mouseRectangle.x,
        this.mouseRectangle.y,
        this.mouseRectangle.width,
        this.mouseRectangle.height
      )
      canvasContext.stroke()
    }
  }

  onMouseUp(evt) {
    const {
      context: { menu, map, player, scene, canvas, camera },
    } = this
    const pickResult = scene.pick(scene.pointerX, scene.pointerY)
    const instance = pickResult?.pickedMesh?.class

    if (this.mousePos1) {
      player.unselectAll()
      let selectVillager
      let countSelect = 0
      this.mousePos1 = { x: scene.pointerX, y: scene.pointerY }
      if (this.mousePos0.x > this.mousePos1.x) {
        let t = this.mousePos0.x
        this.mousePos0.x = this.mousePos1.x
        this.mousePos1.x = t
      }
      if (this.mousePos0.y > this.mousePos1.y) {
        let t = this.mousePos0.y
        this.mousePos0.y = this.mousePos1.y
        this.mousePos1.y = t
      }
      const rays = []
      rays.push(scene.createPickingRay(this.mousePos0.x, this.mousePos0.y))
      rays.push(scene.createPickingRay(this.mousePos1.x, this.mousePos0.y))
      rays.push(scene.createPickingRay(this.mousePos0.x, this.mousePos1.y))
      rays.push(scene.createPickingRay(this.mousePos1.x, this.mousePos1.y))

      for (let i = 0; i < 4; i++) {
        this.markers[i].position = rays[i].origin.add(rays[i].direction)
      }

      const n = []
      n.push(Vector3.Cross(rays[0].direction, rays[1].direction))
      n.push(Vector3.Cross(rays[1].direction, rays[3].direction))
      n.push(Vector3.Cross(rays[2].direction, rays[0].direction))
      n.push(Vector3.Cross(rays[3].direction, rays[2].direction))

      const planes = []
      for (let i = 0; i < 4; i++) {
        planes.push(
          new Plane(
            n[i].x,
            n[i].y,
            n[i].z,
            -rays[i].origin.x * n[i].x - rays[i].origin.y * n[i].y - rays[i].origin.z * n[i].z
          )
        )
      }

      for (let i = 0; i < player.units.length; i++) {
        const unit = player.units[i]
        let contains = true
        for (let j = 0; j < 4; j++) {
          if (planes[j].signedDistanceTo(unit.mesh.position) > 0) {
            contains = false
            break
          }
        }
        if (contains) {
          unit.select()
          countSelect++
          if (unit.type === 'Villager') {
            selectVillager = unit
          }
          player.selectedUnits.push(unit)
        }
      }
      // Set our bottombar
      if (countSelect) {
        if (selectVillager) {
          player.selectedUnit = selectVillager
          menu.setBottombar(selectVillager)
        } else {
          // TODO SELECT UNITS THAT HAVE THE MOST FREQUENCY
          player.selectedUnit = player.selectedUnits[0]
          menu.setBottombar(player.selectedUnits[0])
        }
      }
    } else if (instance) {
      if (player.selectedUnits.length) {
        const action = typeAction[instance.category || instance.type]
        // Send Villager to forage the berry
        let hasVillager = false
        let hasOther = false
        for (let i = 0; i < player.selectedUnits.length; i++) {
          const unit = player.selectedUnits[i]
          if (getActionCondition(unit, instance, action)) {
            hasVillager = true
            const sendToFunc = `sendTo${instance.category || instance.type}`
            typeof unit[sendToFunc] === 'function' ? unit[sendToFunc](instance) : unit.sendTo(instance)
          } else {
            hasOther = true
            unit.sendTo(instance)
          }
        }
        /*if (hasVillager) {
        drawInstanceBlinkingSelection(this)
      }
      if (hasOther) {
        const voice = randomItem(['5075', '5076', '5128', '5164'])
        voice && sound.play(voice)
      } else if (hasVillager) {
        const voice = Assets.cache.get('config').units.Villager.sounds[action]
        voice && sound.play(voice)
      }*/
      } else if (instance.name === 'resource') {
        player.unselectAll()
        instance.select()
        menu.setBottombar(instance)
        player.selectedOther = instance
      } else if (instance.name === 'building') {
        let hasSentVillager = false
        let hasSentOther = false
        if (instance.owner.isPlayed) {
          // Send Villager to build the building
          if (!instance.isBuilt) {
            for (let i = 0; i < player.selectedUnits.length; i++) {
              const unit = player.selectedUnits[i]
              if (unit.type === 'Villager') {
                if (getActionCondition(unit, instance, 'build')) {
                  hasSentVillager = true
                  unit.sendToBuilding(instance)
                }
              } else {
                unit.sendTo(instance)
                hasSentOther = true
              }
            }
            if (hasSentVillager) {
              //drawInstanceBlinkingSelection(this)
            }
            if (hasSentOther) {
              //const voice = randomItem(['5075', '5076', '5128', '5164'])
              //sound.play(voice)
              return
            } else if (hasSentVillager) {
              //const voice = Assets.cache.get('config').units.Villager.sounds.build
              //sound.play(voice)
              return
            }
          } else if (player.selectedUnits) {
            // Send Villager to give loading of resources
            for (let i = 0; i < player.selectedUnits.length; i++) {
              const unit = player.selectedUnits[i]
              const accept =
                unit.category === 'Boat'
                  ? instance.type === 'Dock'
                  : instance.type === 'TownCenter' || (instance.accept && instance.accept.includes(unit.loadingType))
              if (unit.type === 'Villager' && getActionCondition(unit, instance, 'build')) {
                hasSentVillager = true
                unit.previousDest = null
                unit.sendToBuilding(instance)
              } else if (unit.type === 'Villager' && getActionCondition(unit, instance, 'farm')) {
                hasSentVillager = true
                unit.sendToFarm(instance)
              } else if (accept && getActionCondition(unit, instance, 'delivery', { buildingTypes: [instance.type] })) {
                hasSentVillager = true
                unit.previousDest = null
                unit.sendTo(instance, 'delivery')
              }
            }
            if (hasSentVillager) {
              //drawInstanceBlinkingSelection(this)
            }
            if (hasSentVillager) {
              //const voice = Assets.cache.get('config').units.Villager.sounds.build
              //sound.play(voice)
              return
            }
          }
          if (instance.owner.selectedBuilding !== instance) {
            instance.owner.unselectAll()
            instance.select()
            menu.setBottombar(instance)
            instance.owner.selectedBuilding = instance
          }
        } else if (player.selectedUnits.length) {
          //drawInstanceBlinkingSelection(this)
          for (let i = 0; i < player.selectedUnits.length; i++) {
            const playerUnit = player.selectedUnits[i]
            if (playerUnit.type === 'Villager') {
              playerUnit.sendToAttack(instance)
            } else {
              playerUnit.sendTo(instance, 'attack')
            }
          }
        } else if (instanceIsInPlayerSight(instance, player) || map.revealEverything) {
          player.unselectAll()
          instance.select()
          menu.setBottombar(instance)
          player.selectedOther = instance
        }
      } else if (instance.name === 'unit') {
        if (instance.owner.isPlayed) {
          let hasSentHealer = false
          if (player.selectedUnits.length) {
            for (let i = 0; i < player.selectedUnits.length; i++) {
              const playerUnit = player.selectedUnits[i]
              if (playerUnit.work === 'healer' && instance.getActionCondition(playerUnit, 'heal')) {
                hasSentHealer = true
                playerUnit.sendTo(instance, 'heal')
              }
            }
          }
          if (hasSentHealer) {
            //drawInstanceBlinkingSelection(this)
          } else if (player.selectedUnit !== instance) {
            instance.owner.unselectAll()
            instance.select()
            menu.setBottombar(instance)
            player.selectedUnit = instance
            player.selectedUnits = [instance]
          }
        } else {
          let hasSentAttacker = false
          if (player.selectedUnits.length) {
            for (let i = 0; i < player.selectedUnits.length; i++) {
              const playerUnit = player.selectedUnits[i]
              if (instance.getActionCondition(playerUnit, 'attack'))
                if (playerUnit.type === 'Villager') {
                  hasSentAttacker = true
                  playerUnit.sendToAttack(instance)
                } else if (playerUnit.work === 'attacker') {
                  hasSentAttacker = true
                  playerUnit.sendTo(instance, 'attack')
                }
            }
          }
          if (hasSentAttacker) {
            drawInstanceBlinkingSelection(instance)
          } else if (
            (player.selectedOther !== instance && instanceIsInPlayerSight(instance, player)) ||
            map.revealEverything
          ) {
            player.unselectAll()
            instance.select()
            menu.setBottombar(instance)
            player.selectedOther = instance
          }
        }
      }
    } else if (pickResult?.pickedPoint) {
      const x = Math.round(pickResult.pickedPoint.x)
      const z = Math.round(pickResult.pickedPoint.z)
      if (map.grid[x] && map.grid[x][z]) {
        const cell = map.grid[x][z]
        if ((cell.solid || cell.has) && cell.visible) {
          return
        }
        if (this.mouseBuilding) {
          if (cell.inclined || cell.border) {
            return
          }
          if (this.mouseBuilding.isFree) {
            if (player.buyBuilding(x, z, this.mouseBuilding.type)) {
              this.removeMouseBuilding()
              if (menu.selection) {
                menu.setBottombar(menu.selection)
              }
            }
          }
        } else if (player.selectedUnits.length) {
          // Pointer animation
          /*const pointerSheet = Assets.cache.get('50405')
          const pointer = new AnimatedSprite(pointerSheet.animations['animation'])
          pointer.animationSpeed = 0.2 * accelerator
          pointer.loop = false
          pointer.anchor.set(0.5, 0.5)
          pointer.x = this.mouse.x
          pointer.y = this.mouse.y
          pointer.allowMove = false
          pointer.allowClick = false
          pointer.eventMode = 'auto'
          pointer.roundPixels = true
          pointer.onComplete = () => {
            pointer.destroy()
          }
          pointer.play()
          this.addChild(pointer)*/
          // Send units
          this.sendUnits(cell)
        }
      }
    }
    this.mousePos0 = null
    this.mousePos1 = null
    for (let i = 0; i < 4; i++) {
      this.markers[i].dispose()
    }
    this.lines.dispose()
    scene.createPickingRay()
    return
    //const pickResult = scene.pick(scene.pointerX, scene.pointerY)
    player && player.selectedBuilding && player.unselectAll()
    clearTimeout(this.mouseHoldTimeout)
    if (this.mouse.prevent || this.mouseDrag) {
      this.mouse.prevent = false
    } else if (this.mouseRectangle) {
      let selectVillager
      let countSelect = 0
      // Select units inside the rectangle
      if (player) {
        const getPos = (x, y, scene, map) => {
          const pickResult = scene.pick(x, y)?.pickedPoint
          if (!pickResult) {
            const p1 = scene.pick(Math.max(Math.min(x, 0), map.size), y)?.pickedPoint
            const p2 = scene.pick(x, Math.max(Math.min(y, 0), map.size))?.pickedPoint
            return [p1 && [p1.x, p1.z], p2 && [p2.x, p2.z]].filter(Boolean)
          } else {
            return [[pickResult.x, pickResult.z]]
          }
        }

        const calculatePixel = (obj, camera) => {
          const temp = new Vector3()
          const vertices = obj.getBoundingInfo().boundingBox.vectorsWorld
          const engine = scene.getEngine()
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
          let minX = 1e10,
            minY = 1e10,
            maxX = -1e10,
            maxY = -1e10
          for (const vertex of vertices) {
            Vector3.ProjectToRef(vertex, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport, temp)
            if (minX > temp.x) minX = temp.x
            if (maxX < temp.x) maxX = temp.x
            if (minY > temp.y) minY = temp.y
            if (maxY < temp.y) maxY = temp.y
          }
          const canvasZone = engine.getRenderingCanvas().parentNode
          const ofstX = canvasZone.offsetLeft
          const ofstY = canvasZone.offsetTop

          return {
            left: minX + ofstX,
            top: minY + ofstY,
            width: maxX - minX,
            height: maxY - minY,
          }
        }
        function rotate_point(pointX, pointY, originX, originY, angle) {
          angle = (angle * Math.PI) / 180.0
          return {
            x: Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX,
            y: Math.sin(angle) * (pointX - originX) + Math.cos(angle) * (pointY - originY) + originY,
          }
        }
        const cartesianToIso = (x, y) => {
          return Vector3.Unproject(
            new Vector3(x, y, 0.99),
            canvas.width,
            canvas.height,
            Matrix.Identity(),
            scene.getViewMatrix(),
            scene.getProjectionMatrix()
          )
        }

        const t = cartesianToIso(0, 0)
        const angle = 90
        const a = scene.pick(this.mouseRectangle?.x, this.mouseRectangle?.y)?.pickedPoint
        if (a) {
          const origin = {
            x: a.x,
            y: a.z,
          }
          const ta = calculatePixel(map.ground, this.camera)
          const coefX = ta.width / map.size
          const coefY = ta.height / map.size
          const p1 = rotate_point(a.x, a.z, origin.x, origin.y, angle)
          const p2 = rotate_point(a.x - this.mouseRectangle.width / coefX, a.z, origin.x, origin.y, angle)
          const p3 = rotate_point(
            a.x - this.mouseRectangle.width / coefX,
            a.z - this.mouseRectangle.height / coefY,
            origin.x,
            origin.y,
            angle
          )
          const p4 = rotate_point(a.x, a.z - this.mouseRectangle.height / coefY, origin.x, origin.y, angle)

          const material = new StandardMaterial('material', scene)
          material.diffuseColor = Color3.FromHexString('#52392a')
          material.freeze()

          const box1 = MeshBuilder.CreateSphere('box', { diameter: 1, color: Color3.Red() }, scene)
          box1.material = material
          box1.position = new Vector3(p1.x, 0, p1.y)
          const box2 = MeshBuilder.CreateSphere('box', { diameter: 1, color: Color3.Green() }, scene)
          box2.position = new Vector3(p2.x, 0, p2.y)
          const box3 = MeshBuilder.CreateSphere('box', { diameter: 1, color: Color3.Blue() }, scene)
          box3.position = new Vector3(p3.x, 0, p3.y)
          const box4 = MeshBuilder.CreateSphere('box', { diameter: 1, color: Color3.Yellow() }, scene)
          box4.position = new Vector3(p4.x, 0, p4.y)
        }

        if (this.mouseRectangle) {
          player.unselectAll()
          const poly = [
            ...getPos(this.mouseRectangle.x, this.mouseRectangle.y, scene, map),
            ...getPos(this.mouseRectangle.x + this.mouseRectangle.width, this.mouseRectangle.y, scene, map),
            ...getPos(
              this.mouseRectangle.x + this.mouseRectangle.width,
              this.mouseRectangle.y + this.mouseRectangle.height,
              scene,
              map
            ),
            ...getPos(this.mouseRectangle.x, this.mouseRectangle.y + this.mouseRectangle.height, scene, map),
          ]
          for (let i = 0; i < player.units.length; i++) {
            const unit = player.units[i]
            if (
              player.selectedUnits.length < maxSelectUnits &&
              pointInPolygon([unit.position.x, unit.position.z], poly)
            ) {
              unit.select()
              countSelect++
              if (unit.type === 'Villager') {
                selectVillager = unit
              }
              player.selectedUnits.push(unit)
            }
          }

          // Set our bottombar
          if (countSelect) {
            if (selectVillager) {
              player.selectedUnit = selectVillager
              menu.setBottombar(selectVillager)
            } else {
              // TODO SELECT UNITS THAT HAVE THE MOST FREQUENCY
              player.selectedUnit = player.selectedUnits[0]
              menu.setBottombar(player.selectedUnits[0])
            }
          }
        }
      }
    } else if (pickResult && pickResult.pickedPoint) {
      const x = Math.round(pickResult.pickedPoint.x)
      const z = Math.round(pickResult.pickedPoint.z)
      if (map.grid[x] && map.grid[x][z]) {
        const cell = map.grid[x][z]
        if ((cell.solid || cell.has) && cell.visible) {
          return
        }
        if (this.mouseBuilding) {
          if (cell.inclined || cell.border) {
            return
          }
          if (this.mouseBuilding.isFree) {
            if (player.buyBuilding(x, z, this.mouseBuilding.type)) {
              this.removeMouseBuilding()
              if (menu.selection) {
                menu.setBottombar(menu.selection)
              }
            }
          }
        } else if (player.selectedUnits.length) {
          // Pointer animation
          /*const pointerSheet = Assets.cache.get('50405')
          const pointer = new AnimatedSprite(pointerSheet.animations['animation'])
          pointer.animationSpeed = 0.2 * accelerator
          pointer.loop = false
          pointer.anchor.set(0.5, 0.5)
          pointer.x = this.mouse.x
          pointer.y = this.mouse.y
          pointer.allowMove = false
          pointer.allowClick = false
          pointer.eventMode = 'auto'
          pointer.roundPixels = true
          pointer.onComplete = () => {
            pointer.destroy()
          }
          pointer.play()
          this.addChild(pointer)*/
          // Send units
          this.sendUnits(cell)
        }
      }
    }
    // Reset mouse selection
    const { canvasContext, canv } = this
    canvasContext.clearRect(0, 0, canv.width, canv.height)
    this.mouseRectangle = null
    this.pointerStart = null
  }

  sendUnits(cell) {
    const {
      context: { player, map },
    } = this
    const minX = Math.min(...player.selectedUnits.map(unit => unit.x))
    const minY = Math.min(...player.selectedUnits.map(unit => unit.z))
    const maxX = Math.max(...player.selectedUnits.map(unit => unit.x))
    const maxY = Math.max(...player.selectedUnits.map(unit => unit.z))
    const centerX = minX + Math.round((maxX - minX) / 2)
    const centerY = minY + Math.round((maxY - minY) / 2)
    let hasSentVillager = false
    let hasSentSoldier = false
    for (let u = 0; u < player.selectedUnits.length; u++) {
      const unit = player.selectedUnits[u]
      const distCenterX = unit.x - centerX
      const distCenterY = unit.z - centerY
      const finalX = cell.x + distCenterX
      const finalY = cell.z + distCenterY
      if (unit.type === 'Villager') {
        hasSentVillager = true
      } else {
        hasSentSoldier = true
      }
      if (map.grid[finalX] && map.grid[finalX][finalY]) {
        player.selectedUnits[u].sendTo(map.grid[finalX][finalY])
      } else {
        player.selectedUnits[u].sendTo(cell)
      }
    }
    /*if (hasSentSoldier) {
      const voice = randomItem(['5075', '5076', '5128', '5164'])
      sound.play(voice)
    } else if (hasSentVillager) {
      sound.play('5006')
    }*/
  }

  isMouseInApp(evt) {
    return evt.target && (!evt.target.tagName || evt.target.closest('#game'))
  }

  removeMouseBuilding() {
    if (!this.mouseBuilding) {
      return
    }
    this.removeChild(this.mouseBuilding)
    this.mouseBuilding.destroy()
    this.mouseBuilding = null
  }

  setMouseBuilding(building) {
    const {
      context: { player },
    } = this
    this.mouseBuilding = new Container()
    const sprite = Sprite.from(getTexture(building.images.final, Assets))
    sprite.name = 'sprite'
    this.mouseBuilding.addChild(sprite)
    Object.keys(building).forEach(prop => {
      this.mouseBuilding[prop] = building[prop]
    })
    this.mouseBuilding.x = this.mouse.x
    this.mouseBuilding.y = this.mouse.y
    this.mouseBuilding.name = 'mouseBuilding'
    if (building.images.color) {
      const color = Sprite.from(getTexture(building.images.color, Assets))
      color.name = 'color'
      changeSpriteColor(color, player.color)
      this.mouseBuilding.addChild(color)
    } else {
      changeSpriteColor(sprite, player.color)
    }
    this.addChild(this.mouseBuilding)
  }

  moveCamera(dir, moveSpeed, isSpeedDivided) {
    /**
     * 	/A\
     * /   \
     *B     D
     * \   /
     *  \C/
     */

    const {
      context: { map, app, menu },
    } = this

    const dividedSpeed = isSpeedDivided ? 2 : 1
    const speed = (moveSpeed || 20) / dividedSpeed
    const A = { x: cellWidth / 2 - this.camera.x, y: -this.camera.y }
    const B = {
      x: cellWidth / 2 - (map.size * cellWidth) / 2 - this.camera.x,
      y: (map.size * cellHeight) / 2 - this.camera.y,
    }
    const D = {
      x: cellWidth / 2 + (map.size * cellWidth) / 2 - this.camera.x,
      y: (map.size * cellHeight) / 2 - this.camera.y,
    }
    const C = { x: cellWidth / 2 - this.camera.x, y: map.size * cellHeight - this.camera.y }
    const cameraCenter = {
      x: this.camera.x + app.screen.width / 2 - this.camera.x,
      y: this.camera.y + app.screen.height / 2 - this.camera.y,
    }
    this.clearInstancesOnScreen()

    if (dir === 'left') {
      if (cameraCenter.x - 100 > B.x && pointIsBetweenTwoPoint(A, B, cameraCenter, 50)) {
        this.camera.y += speed / (cellWidth / cellHeight)
        this.camera.x -= speed
      } else if (cameraCenter.x - 100 > B.x && pointIsBetweenTwoPoint(B, C, cameraCenter, 50)) {
        this.camera.y -= speed / (cellWidth / cellHeight)
        this.camera.x -= speed
      } else if (cameraCenter.x - 100 > B.x) {
        this.camera.x -= speed
      }
    } else if (dir === 'right') {
      if (cameraCenter.x + 100 < D.x && pointIsBetweenTwoPoint(A, D, cameraCenter, 50)) {
        this.camera.y += speed / (cellWidth / cellHeight)
        this.camera.x += speed
      } else if (cameraCenter.x + 100 < D.x && pointIsBetweenTwoPoint(D, C, cameraCenter, 50)) {
        this.camera.y -= speed / (cellWidth / cellHeight)
        this.camera.x += speed
      } else if (cameraCenter.x + 100 < D.x) {
        this.camera.x += speed
      }
    }
    if (dir === 'up') {
      if (cameraCenter.y - 50 > A.y && pointIsBetweenTwoPoint(A, B, cameraCenter, 50)) {
        this.camera.y -= speed / (cellWidth / cellHeight)
        this.camera.x += speed
      } else if (cameraCenter.y - 50 > A.y && pointIsBetweenTwoPoint(A, D, cameraCenter, 50)) {
        this.camera.y -= speed / (cellWidth / cellHeight)
        this.camera.x -= speed
      } else if (cameraCenter.y - 50 > A.y) {
        this.camera.y -= speed
      }
    } else if (dir === 'down') {
      if (cameraCenter.y + 50 < C.y && pointIsBetweenTwoPoint(D, C, cameraCenter, 50)) {
        this.camera.y += speed / (cellWidth / cellHeight)
        this.camera.x -= speed
      } else if (cameraCenter.y + 50 < C.y && pointIsBetweenTwoPoint(B, C, cameraCenter, 50)) {
        this.camera.y += speed / (cellWidth / cellHeight)
        this.camera.x += speed
      } else if (cameraCenter.y + 100 < C.y) {
        this.camera.y += speed
      }
    }

    menu.updateCameraMiniMap()
    map.setCoordinate(-this.camera.x, -this.camera.y)
    this.displayInstancesOnScreen()
  }

  moveCameraWithMouse(evt) {
    clearInterval(this.moveCameraInterval)
    const dir = []
    const mouse = {
      x: evt.pageX,
      y: evt.pageY,
    }
    const coef = 1
    const moveDist = 10

    const calcs = {
      left: (0 + moveDist - mouse.x) * coef,
      right: (mouse.x - (window.innerWidth - moveDist)) * coef,
      up: (0 + moveDist - mouse.y) * coef,
      down: (mouse.y - (window.innerHeight - moveDist)) * coef,
    }
    if (mouse.x >= 0 && mouse.x <= 0 + moveDist && mouse.y >= 0 && mouse.y <= window.innerHeight) {
      dir.push('left')
    } else if (
      mouse.x > window.innerWidth - moveDist &&
      mouse.x <= window.innerWidth &&
      mouse.y >= 0 &&
      mouse.y <= window.innerHeight
    ) {
      dir.push('right')
    }
    if (mouse.x >= 0 && mouse.x <= window.innerWidth && mouse.y >= 0 && mouse.y <= 0 + moveDist) {
      dir.push('up')
    } else if (
      mouse.x >= 0 &&
      mouse.x <= window.innerWidth &&
      mouse.y > window.innerHeight - moveDist &&
      mouse.y <= window.innerHeight
    ) {
      dir.push('down')
    }
    if (dir.length) {
      this.moveCameraInterval = setInterval(() => {
        dir.forEach(prop => {
          this.moveCamera(prop, calcs[prop])
        })
      }, 20)
    }
  }

  init() {
    const {
      context: { player },
    } = this
    // Set camera to player building else unit
    if (player.buildings.length) {
      this.setCamera(player.buildings[0].x, player.buildings[0].z)
    } else if (player.units.length) {
      this.setCamera(player.units[0].x, player.units[0].z)
    }
  }

  setCamera(x, z) {
    const {
      context: { map, app, menu },
    } = this
    //this.camera && this.clearInstancesOnScreen()
    this.camera.position.x = x - this.altitude / 2 // - app.screen.width / 2
    this.camera.position.z = z - this.altitude / 2 // - app.screen.height / 2

    //menu && menu.updateCameraMiniMap()
    //map.setCoordinate(-this.camera.x, -this.camera.y)
    //this.displayInstancesOnScreen()
  }

  updateInstanceInCamera() {
    const { scene } = this.context
    for (var ms in scene.meshes) {
      const mesh = scene.meshes[ms]
      if (this.camera.isInFrustum(mesh) && (mesh.name === 'ground' || instancesDistance(this.camera, mesh) < 200)) {
        mesh.isVisible = true
        mesh.setEnabled(true)
      } else {
        //mesh.isVisible = false
        //mesh.setEnabled(false)
      }
    }
  }
}
