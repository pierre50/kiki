import Map from '../classes/map'
import Menu from '../classes/menu'
import { Engine, Scene } from "@babylonjs/core";
import { getTree } from '../instances/tree';
import { getKiki } from '../instances/kiki';
import Controls from '../classes/controls';
import Unit from '../classes/unit';

export default class Game {
	constructor(){
    this.start()
    }
    start(){
      // initialize babylon scene and engine
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.zIndex = "1000";
      canvas.id = "game";
      document.body.appendChild(canvas);
      const engine = new Engine(canvas, true);
      const scene = new Scene(engine);

      const context = {
        scene,
        canvas,
        menu: null,
        player: null,
        players: [],
        map: null,
        controls: null,
        meshes: {
          'Tree': getTree(scene),
		      'Villager':  getKiki(scene)
        }
      }

      context.map = new Map(context)
      context.menu = new Menu(context)
      context.controls = new Controls(context)

      context.map.generateMap();
      context.menu.init()

      const {map } = context
      for (let i= 0; i < 20; i++){
        new Unit({
          x: map.size / 2, 
          y: map.grid[map.size / 2][map.size / 2].position.y, 
          z: map.size / 2 + i, 
          type: 'Villager'
        }, context)
  
      }
 
      // run the main render loop
      engine.runRenderLoop(() => {
          scene.render();
      });
    }
}