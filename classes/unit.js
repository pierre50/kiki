class Unit{
	constructor(x, y, z, map, options){
        this.name = 'unit';
        this.parent = map;
        this.path = [];
        this.cell = this.parent.grid[Math.round(x)][Math.round(z)];
		this.cell.has = this;
        this.cell.solid = true;
        
        Object.keys(options).forEach((prop) => {
			this[prop] = options[prop];
        })

        const { height, mesh } = this;
        mesh.position.x = x;
        mesh.position.y = y + height / 2;
        mesh.position.z = z;
        this.parent.shadowGenerator.addShadowCaster(mesh);
        //this.parent.waterGround.material.addToRenderList(mesh);

        this.rotation = {
            get x(){
                return mesh.rotation.x;
            },
            set x(val){
                mesh.rotation.x = val;
            },
            get y(){
                return BABYLON.Tools.ToDegrees(mesh.rotation.y);
            },
            set y(val){
                if (val < 0){
                    val = 360;
                }
                if (val > 360){
                    val = 0;
                }
                mesh.rotation.y = BABYLON.Tools.ToRadians(val);
            },
            get z(){
                return mesh.rotation.z;
            },
            set z(val){
                mesh.rotations.z = val;
            }
        }
        this.position = {
            get x(){
                return mesh.position.x;
            },
            set x(val){
                mesh.position.x = val;
            },
            get y(){
                return mesh.position.y;
            },
            set y(val){
                mesh.position.y = val;
            },
            get z(){
                return mesh.position.z;
            },
            set z(val){
                mesh.position.z = val;
            }
        }

        this.actionInterval = null;
        this.inactif = true;

        this.action = "eat";
        this.affectNewDest();

        setInterval(() => this.step(), 16.66);
	}
    
	hasPath(){
		return this.path.length > 0;
	}

	setDest(dest){
        this.delDest();
		if (!dest){
			this.stop();
			return;
		}
		this.dest = dest;
		this.realDest = {
			x: dest.position.x,
			z: dest.position.z,
			y: dest.position.y
        }
    }

	setPath(path){
		if (!path.length){
			this.stop();
			return;
		}
		this.inactif = false;
		this.path = path;
    }

    delDest(){
        clearInterval(this.actionInterval);
        this.actionInterval = null;
    }

	sendTo(dest, action){
        let path = [];
        this.delDest();

		// No instance we cancel the destination
		if (!dest){
			return false;
		}

        this.action = action;
        this.setDest(dest);

		// Unit is already beside our target
        if (this.action && this.checkDestContact()){
            return true;
        }

        // Set unit path
		if (this.parent.grid[dest.position.x][dest.position.z].solid){
            // Destination is solid we send it beside the dest
			path = getInstanceClosestFreeCellPath(this, dest, this.parent);
			if (!path.length){
				this.affectNewDest();
				return false;
			}
		}else{
			path = getInstancePath(this, dest.position.x, dest.position.z, this.parent);
		}

		// Unit found a path
		if (path.length){
			this.setPath(path);
			return true;
		}

		this.stop();
		return false;
	}

    affectNewDest(){
		const targets = findInstancesInSight(this, (instance) => this.getActionCondition(this.action, instance));
		if (targets.length){
            const closedTarget = targets.find((target) => instanceContactInstance(this, target));
            if (closedTarget){
				this.setDest(closedTarget);
                if (this.checkDestContact()){
                    return;
                }
            }
			const farTarget = getClosestInstanceWithPath(this, targets);
			if (farTarget){
				this.setDest(farTarget.instance);
                this.setPath(farTarget.path);
                return;
			}
		}
        this.stop();
    }

	moveToPath(){
		const next = this.path[this.path.length - 1];
		const nextCell = this.parent.grid[next.x][next.z];
        if (nextCell.has && nextCell.has.name === 'unit' && nextCell.has !== this
            && nextCell.has.hasPath() && instancesDistance(this.position, nextCell.has.position) <= 1
            && !nextCell.has.inactif){ 
            return;
        }
        // Way is blocked
        if (nextCell.solid && this.dest){
			this.sendTo(this.dest, this.action);
			return;
		}
		if (instancesDistance(this.position, nextCell.position) < this.speed){
			this.position.x = nextCell.position.x;
            this.position.z = nextCell.position.z;
            if (this.cell.has === this){
				this.cell.has = null;
				this.cell.solid = false;
			}
			this.cell = this.parent.grid[nextCell.position.x][nextCell.position.z];
			if (this.cell.has === null){
				this.cell.has = this;
				this.cell.solid = true;
			}
            this.path.pop();

            if (this.dest && this.action){
                // Destination has moved
                if (this.dest.position.x !== this.realDest.x || this.dest.position.z !== this.realDest.z){
                    this.sendTo(this.dest, this.action);
                }
                if (!this.checkDestContact() && !this.hasPath){
                    this.affectNewDest();
                }
            }

            // No more path
			if (!this.hasPath && !this.dest){
				this.stop();
			}
		}else{
			// Move to next
			moveTowardPoint(this, nextCell.position, this.speed);
		}
	}

    checkDestContact(){
        // Destination in contact
        if (this.getActionCondition(this.action, this.dest) && instanceContactInstance(this, this.dest)){
            const newRotationY = getInstanceDegree(this.position.x, this.position.z, this.dest.position.x, this.dest.position.z);
            if (this.rotation.y === newRotationY){
                this.doAction();
            }else{
                this.rotate = newRotationY;
            }
            this.path = [];
            return true;
        }else{
            return false;
        }
    }

	getActionCondition(action, target){
		if (!target || !action){
			return false;
        }
		const conditions = {
			'chopwood': (instance) => instance && instance.type === 'Tree' && !instance.isDestroyed,
			'eat': (instance) => instance && instance.type === 'Grass' && !instance.isDestroyed && instance.life > 0,
			'forageberry': (instance) => instance && instance.type === 'Berrybush' && !instance.isDestroyed,
			'build': (instance) => instance && instance.player === this.player && instance.name === 'building' && instance.life > 0 && (!instance.isBuilt || instance.life < instance.lifeMax) && !instance.isDestroyed,
			'attack': (instance) => instance && instance.player !== this.player && (instance.name === 'building' || instance.name === 'unit') && instance.life > 0 && !instance.isDestroyed,
			'pick': (instance) => instance && !instance.isDestroyed
		}
		return conditions[this.action] ? conditions[this.action](target) : false;
	}

	stop(){
        this.delDest();
		this.inactif = true;
		this.dest = null;
		this.path = [];
    }

    doAction(){
        clearInterval(this.actionInterval);
        this.actionInterval = null;

        switch(this.action){
            case 'eat':
                this.actionInterval = setInterval(() => {
                    if (!this.getActionCondition(this.action, this.dest)){
                        this.affectNewDest();
                        return;
                    }
                    this.dest.eaten();
                }, 1000);
                break;
            case 'chopwood':
                this.actionInterval = setInterval(() => {
                    if (!this.getActionCondition(this.action, this.dest)){
                        this.stop();
                        return;
                    }
                    const s = Math.random() < .5 ? true : false
                    const x = s ? Math.random() < .5 ? -.5 : .5 : 0;
                    const z = !s ? Math.random() < .5 ? -.5 : .5 : 0;
                    new Item(this.dest.position.x + x, this.dest.position.y, this.dest.position.z + z, this.parent);
                }, 1000);
                break;
            case 'pick':
                if (!this.getActionCondition(this.action, this.dest)){
                    this.stop();
                    return;
                }
                this.dest.die();
                break;
        }
    }

	step(){
		if (this.hasPath()){
			this.moveToPath();
		} else if (this.rotate !== null){
            if (this.rotate === this.rotation.y){
                this.rotate = null;
                if (!this.checkDestContact()){
                    this.stop();
                }
            }
            instanceRotate(this, this.rotate);
        }
	}
}

class Kiki extends Unit{
	constructor(x, y, z, map){
        
        const options = {
            type: 'Kiki',
            life: 10,
            height: 0.5,
			mesh: map.instances['kiki1'].createInstance(),
            speed: 0.05,
            sight: 4
        }

        super(x, y, z, map, options);
    }
}