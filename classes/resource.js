class resource{
	constructor(x, y, z, map){
        this.parent = map;
        this.path = [];
    
        this.cell = this.parent.grid[Math.round(x)][Math.round(z)];
		this.cell.has = this;
        this.cell.solid = true;

        this.life = 10;
        this.height = randomRange(3, 6, false);
        this.type = 'Tree';
        let options = {
            height: this.height, 
            diameterTop: .4,
            diameterBottom: .5
        }
        let material = new BABYLON.StandardMaterial("material", scene);
        material.diffuseColor = BABYLON.Color3.FromHexString('#5d4538');

        let mesh = BABYLON.MeshBuilder.CreateCylinder("trunk", options, scene);
        mesh.material = material;
        mesh.position.x = x;
        mesh.position.y = y + this.height / 2;
        mesh.position.z = z;
        mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0});
        mesh.freezeWorldMatrix();
        mesh.class = this;

        const { height } = this;
        this.position = {
            get x(){
                return mesh.position.x;
            },
            get y(){
                return mesh.position.y;
            },
            set y(val){
                mesh.position.y = val + height / 2;
            },
            get z(){
                return mesh.position.z;
            },
        }
        this.mesh = mesh;
        this.parent.shadowGenerator.addShadowCaster(mesh);
        //this.parent.waterGround.material.addToRenderList(mesh);
        
	}
}
