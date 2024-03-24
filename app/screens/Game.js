import Map from '../classes/map'
import Menu from '../classes/menu'
import { Engine, Scene } from '@babylonjs/core'
import { getTree } from '../instances/tree'
import { getVillager } from '../instances/villager'
import Controls from '../classes/controls'
import { getBerryBush } from '../instances/berrybush'
import { getGold } from '../instances/gold'
import { getStone } from '../instances/stone'
import { getTownCenter } from '../instances/towncenter'
import { getHouse } from '../instances/house'
import { getBarracks } from '../instances/barracks'
import { getClubman } from '../instances/clubman'

export default class Game {
  constructor() {
    this.start()
  }
  start() {
    // initialize babylon scene and engine
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.zIndex = '1000'
    canvas.id = 'game'
    document.body.appendChild(canvas)
    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)
    scene.blockMaterialDirtyMechanism = true
    scene.getAnimationRatio()
    scene.useGeometryIdsMap = true
    scene.useMaterialMeshMap = true
    scene.useClonedMeshMap = true
    scene.particlesEnabled = false
    scene.physicsEnabled = false

    const context = {
      scene,
      canvas,
      menu: null,
      player: null,
      players: [],
      map: null,
      controls: null,
      meshes: {
        //Ressources
        Tree: getTree(scene),
        Berrybush: getBerryBush(scene),
        Stone: getStone(scene),
        Gold: getGold(scene),
        // Units
        Villager: getVillager(scene),
        Clubman: getClubman(scene),
        // Buildings
        TownCenter: getTownCenter(scene),
        House: getHouse(scene),
        Barracks: getBarracks(scene),
      },
    }

    context.map = new Map(context)
    context.menu = new Menu(context)
    context.controls = new Controls(context)

    context.map.generateMap()
    context.players = context.map.generatePlayers()
    context.player = context.players[0]
    context.menu.init()
    context.map.placePlayers()
    context.controls.init()

    // run the main render loop
    engine.runRenderLoop(() => {
      scene.render()
    })
  }
}
