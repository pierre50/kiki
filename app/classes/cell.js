import { config } from '../constants'

export default class Cell {
  constructor(options, context) {
    this.name = 'cell'
    this.context = context
    this.inclined = false
    this.border = false
    this.waterBorder = false
    this.has = null
    this.corpses = []
    this.solid = false
    this.visible = false
    this.viewed = false
    this.viewBy = []

    Object.keys(options).forEach(prop => {
      this[prop] = options[prop]
    })
    Object.keys(config.cells[this.type]).forEach(prop => {
      this[prop] = config.cells[this.type][prop]
    })
    let _y = this.y
    this.position = {
      x: this.x,
      z: this.z,
      get y() {
        return _y
      },
      set y(val) {
        _y = val
        if (map.grid[x][z].has) {
          map.grid[x][z].has.position.y = _y
        }
        map.ground.updateMeshPositions(position => {
          position[3 * (x * (map.size + 1) + z) + 1] = val
        }, true)
      },
    }
  }
}
