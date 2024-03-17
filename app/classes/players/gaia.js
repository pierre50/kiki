import { Player } from './player'

export class Gaia extends Player {
  constructor(context) {
    super({ x: 0, z: 0, type: 'Gaia' }, context)
  }
}
