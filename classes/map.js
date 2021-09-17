class Map{
	constructor(scene){
        this.size = 100;
        this.grid = [];
        this.units = [];

        // This creates and positions a free camera (non-mesh)
        this.camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 10, 0), scene);
        this.camera.attachControl(canvas, true);

        // Lights
        const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 0, 0), scene);
        hemiLight.position = new BABYLON.Vector3(0, 0, 0);
        hemiLight.diffuse = new BABYLON.Color3(0.85,0.85,0.85);
        hemiLight.specular = new BABYLON.Color3(0.85,0.85,0.85);
        hemiLight.groundColor = new BABYLON.Color3(0.55,0.55,0.55);
        hemiLight.intensity = .6; 
        
        const light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(-1, -5, -1), scene);
        light.position = new BABYLON.Vector3(this.size, 30, this.size);
        light.intensity = .7;

        // Shadows
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.useKernelBlur = true;
        this.shadowGenerator.blurKernel = 3;

        // Skybox
        /*const skybox = BABYLON.Mesh.CreateBox('skyBox', 5000.0, scene)
        const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene)
        skyboxMaterial.backFaceCulling = false
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('//www.babylonjs.com/assets/skybox/TropicalSunnyDay', scene)
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0)
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0)
        skyboxMaterial.disableLighting = true
        skybox.material = skyboxMaterial*/

        // Create terrain material
        this.terrainMaterial = new BABYLON.TerrainMaterial("terrainMaterial", scene);
        this.terrainMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.terrainMaterial.specularPower = 64;
        this.terrainMaterial.mixTexture = new BABYLON.Texture("textures/mixMap.jpg", scene);
        this.terrainMaterial.diffuseTexture1 = new BABYLON.Texture("textures/floor.png", scene);
        this.terrainMaterial.diffuseTexture2 = new BABYLON.Texture("textures/rock.png", scene);
        this.terrainMaterial.diffuseTexture3 = new BABYLON.Texture("textures/grass.png", scene);
        this.terrainMaterial.bumpTexture1 = new BABYLON.Texture("textures/floor_bump.png", scene);
        this.terrainMaterial.bumpTexture2 = new BABYLON.Texture("textures/rockn.png", scene);
        this.terrainMaterial.bumpTexture3 = new BABYLON.Texture("textures/grassn.png", scene);
        this.terrainMaterial.diffuseTexture1.uScale = this.terrainMaterial.diffuseTexture1.vScale = 128;
        this.terrainMaterial.diffuseTexture2.uScale = this.terrainMaterial.diffuseTexture2.vScale = 128;
        this.terrainMaterial.diffuseTexture3.uScale = this.terrainMaterial.diffuseTexture3.vScale = 128;
        
        this.initMap();
        //this.shadowGenerator.addShadowCaster(mesh);

        // Our built-in 'ground' shape
        /*const subdivs = 140;
        this.ground = BABYLON.Mesh.CreateGroundFromHeightMap("ground", "textures/worldHeightMap.jpg", this.size + 1, this.size + 1, subdivs, 0, 5, scene, true, () => {
            this.ground.position.x = this.size/2;
            this.ground.position.z = this.size/2;
            this.ground.receiveShadows = true;
            this.ground.updateCoordinateHeights();
            this.ground.material = this.terrainMaterial;
            this.ground.checkCollisions = true;
            
            for (let i = 0; i <= this.size; i++){
                for (let j = 0; j <= this.size; j++){ 
                    let x = i - this.size / 2;
                    let z = j - this.size / 2;
                    let y = this.ground.getHeightAtCoordinates(x, z);
                    if(!this.grid[i]){
                        this.grid[i] = [];	
                    }
                    this.grid[i][j] = {
                        has: null,
                        inclined: false,
                        position: {
                            x: i,
                            z: j,
                            y
                        }
                    }; 
                }
            }
            for (let i = 0; i <= this.size; i++){
                for (let j = 0; j <= this.size; j++){ 
                    let source = this.grid[i][j];
                    getCellsAroundPoint(i, j, this.grid, 1, (cell) => {
                        const heightDiff = diff(source.position.y, cell.position.y) 
                        if (heightDiff > 1){
                            source.solid = true;
                            source.inclined = true;
                            return
                        }else if (heightDiff > 0 && heightDiff <= 1){
                            source.inclined = true;
                        }
                    })
                }
            }
            this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0 });

            this.waterGround = BABYLON.Mesh.CreateGroundFromHeightMap("ground", "textures/waterMap.jpg", this.size + 1, this.size + 1, subdivs, 0, 5, scene, true, () => {
                this.waterGround.position.x = this.size/2;
                this.waterGround.position.z = this.size/2;
                
                var water = new BABYLON.WaterMaterial("water", scene, new BABYLON.Vector2(1024, 1024));
                water.backFaceCulling = true;
                water.bumpTexture = new BABYLON.Texture("textures/waterbump.png", scene);
                water.windForce = -5;
                water.waveHeight = 0;
                water.bumpHeight = 0.1;
                water.waveLength = 0.1;
                water.colorBlendFactor = 0;
                water.addToRenderList(this.ground);
                water.addToRenderList(skybox);
    
                this.waterGround.material = water; 

                this.afterLoad();
            });
        });*/
        this.afterLoad();
    }
    initMap(){
        const paths = [];  
        const reliefGrid = this.generateGridRelief();
        const ressourceGrid = this.generateGridResource();
        for (let i = 0; i <= this.size; i++){
            const path = [];   
            for (let j = 0; j <= this.size; j++){ 
                if(!this.grid[i]){
                    this.grid[i] = [];	
                }
                const y = reliefGrid[i][j];
                const vector = new BABYLON.Vector3(i, y, j)
                this.grid[i][j] = new Grass(i, y, j, this);
                if (ressourceGrid[i][j] === "t"){
                    new resource(i, y - .1, j, this);
                }
                path.push(vector);
            }
            paths.push(path);
        }

        this.map = BABYLON.MeshBuilder.CreateRibbon("map", {pathArray: paths, updatable: true}, scene);
        this.map.material = this.terrainMaterial;
        this.map.checkCollisions = true;
        this.map.receiveShadows = true;
        this.map.physicsImpostor = new BABYLON.PhysicsImpostor(this.map, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0 });
    }
    generateGridResource(){
        const grid = []
        const chanceOfForest = .006;
        const chanceOfSet = .01;
        for (let i = 0; i <= this.size; i++){
            for (let j = 0; j <= this.size; j++){ 
                if(!grid[i]){
                    grid[i] = [];	
                }
     
                if (Math.random() < chanceOfSet){
                    grid[i][j] = "t";
                }else{
                    grid[i][j] = "n";
                }
            }
        }
        for (let i = 0; i <= this.size; i++){
            for (let j = 0; j <= this.size; j++){ 
                if (Math.random() < chanceOfForest){
                    const cursorSize = randomRange(4, 18);
                    if (getPlainCellsAroundPoint(i, j, grid, cursorSize, (cell) => {
                        let pointDistance = pointsDistance(i, j, cell.x, cell.z);
                        if (pointDistance < cursorSize && Math.random() > .1 * (pointDistance * 2)){
                            grid[cell.x][cell.z] = "t";
                        }
                    }, true));
                }
            }
        }
        return grid;
    }
    generateGridRelief(){
        const grid = []
        for (let i = 0; i <= this.size; i++){
            for (let j = 0; j <= this.size; j++){ 
                if(!grid[i]){
                    grid[i] = [];	
                }
                const y = Math.random() / 2;
                grid[i][j] = y;
            }
        }
        const chanceOfRelief = .01;
        const reliefPattern = [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 
            3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
            4, 4, 4, 4, 4, 4, 4, 4, 4,
            5, 5, 5, 5,
            6, 6,
            7, 
        ];
        for(let i = 0; i <= this.size; i++){
            for(let j = 0; j <= this.size; j++){
                if (Math.random() < chanceOfRelief){
                    const level = randomItem(reliefPattern);
                    const cursorSize = level * randomRange(1, 4);
                    const type = randomItem(algoLine()); 
                    if (getPlainCellsAroundPoint(i, j, grid, cursorSize, (cell) => {
                        const pointDistance = pointsDistance(cell.x, cell.z, i, j);
                        if (pointDistance < cursorSize){
                            const calc = type(pointDistance, cursorSize, level)
                            grid[cell.x][cell.z] = grid[cell.x][cell.z] < calc ? (calc + Math.random() / 2) : grid[cell.x][cell.z];
                        }
                    }, true));
                }
            }
        }

        function algoLine(){
            return [
                (x, r, c) => -(Math.pow(5, -2) * (5 * 2)) * x + c,
                (x, r, c) => (-x / (r + r )) * x + c,
            ]
        }
        return grid;
    }

    exportGrid(grid){
        const { size } = this;
		const link = document.createElement('a');
        link.setAttribute('download', 'map.txt');
        link.href = makeMapFile();
        link.click();
        function makeMapFile(){
            let textFile;
            let text = '';
            for (let i = 0; i <= size; i++){
                for (let j = 0; j <= size; j++){
                    text += grid[i][j];
                }
                text += '\n';
            }
            var data = new Blob([text], {type: 'text/plain'});
            if (textFile) {
                window.URL.revokeObjectURL(textFile);
            }
            textFile = window.URL.createObjectURL(data);
            return textFile;
        }
    }

    afterLoad(){
        window.camera = this.camera;
        this.units.push(new Unit(this.size/2, this.grid[this.size/2][this.size/2].position.y, this.size/2, this));
    }
}