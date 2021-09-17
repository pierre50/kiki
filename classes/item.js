class Item{
	constructor(x, y, z, map){

        this.type = 'Item';
        this.parent = map;
        let impulseDirection = new BABYLON.Vector3(randomRange(-1, 1, false), 1, randomRange(-1, 1, false));
        let impulseMagnitude = 1;
        let contactLocalRefPoint = BABYLON.Vector3.Zero();
        let options = {width: .5, height: .5, depth: .5};
        
        this.fadeBehavior = new BABYLON.FadeInOutBehavior();
        let mesh = BABYLON.MeshBuilder.CreateBox("box", options, scene);
        mesh.position.set(x, y, z);
        mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, friction: .2, restitution: 0 });
        mesh.physicsImpostor.applyImpulse(impulseDirection.scale(impulseMagnitude), mesh.getAbsolutePosition().add(contactLocalRefPoint));
        mesh.addBehavior(this.fadeBehavior);
        mesh.class = this;
        this.position = {
            get x(){
                return Math.round(mesh.position.x);
            },
            get y(){
                return Math.round(mesh.position.y);
            },
            get z(){
                return Math.round(mesh.position.z);
            },
        }
        this.mesh = mesh;
        this.fadeBehavior.fadeIn(true);
        this.parent.shadowGenerator.addShadowCaster(mesh);
        //this.parent.waterGround.material.addToRenderList(mesh);

        setTimeout(() => {
            this.fadeBehavior.fadeIn(false);
            setTimeout(() => {
                this.die();
            }, 300);
        }, 30000);
    }
    die(){
        this.mesh.dispose();
        this.isDestroyed = true;
    }
}