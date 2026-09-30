const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let rocketNode = null;
let isLaunching = false;

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.4, 0.6, 0.9, 1.0); // Cielo azul claro

    // Cámara
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 100, new BABYLON.Vector3(0, 20, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 10;
    camera.minZ = 0.1;

    // Luz
    const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    light.position = new BABYLON.Vector3(20, 40, 20);
    light.intensity = 1.5;

    const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.5;

    // Suelo de lanzamiento
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 500, height: 500}, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Asfalto
    ground.material = groundMat;

    // 1. Cargar la Torre de Lanzamiento (Scenery estático)
    BABYLON.SceneLoader.ImportMesh("", "../assets/falcon_launch/", "scene.gltf", scene, function (launchMeshes) {
        
        // Esconder las mallas que pertenecen al cohete dentro del modelo de la torre (para no tener dos cohetes)
        const rocketMaterials = ["Body_Black", "Main_Body", "Parts", "SVGMat.001", "SVGMat.002", "Silver_PARTS", "White_Non-Metal", "White_Tanks"];
        launchMeshes.forEach(mesh => {
            if (mesh.material && rocketMaterials.includes(mesh.material.name)) {
                mesh.setEnabled(false);
            }
        });

        // 2. Cargar el modelo del Falcon 9 (Solo el cohete) que será el que despegue
        BABYLON.SceneLoader.ImportMesh("", "../assets/falcon_rocket/", "scene.gltf", scene, function (rocketMeshes) {
            
            // El nodo raíz del modelo importado
            rocketNode = rocketMeshes[0];
            rocketNode.scaling = new BABYLON.Vector3(1, 1, 1);
            rocketNode.position.y = 0;
        
        // Sistema de partículas de fuego (inicialmente apagado)
        const fireParticles = new BABYLON.ParticleSystem("fire", 2000, scene);
        fireParticles.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
        fireParticles.emitter = new BABYLON.Vector3(0, 0, 0); // Lo engancharemos a la base del cohete
        fireParticles.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        fireParticles.color2 = new BABYLON.Color4(1, 0, 0, 1.0);
        fireParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        fireParticles.minSize = 2;
        fireParticles.maxSize = 8;
        fireParticles.minLifeTime = 0.2;
        fireParticles.maxLifeTime = 0.5;
        fireParticles.emitRate = 1000;
        fireParticles.direction1 = new BABYLON.Vector3(-2, -10, -2);
        fireParticles.direction2 = new BABYLON.Vector3(2, -10, 2);
        fireParticles.gravity = new BABYLON.Vector3(0, -9.8, 0);
        
        // Botón de lanzamiento
        document.getElementById("btn-launch").addEventListener("click", () => {
            if (!isLaunching && rocketNode) {
                isLaunching = true;
                fireParticles.start();
                
                // Animación simple de despegue en el renderLoop
                scene.onBeforeRenderObservable.add(() => {
                    // Aceleración progresiva (física de cohetes muy básica)
                    rocketNode.position.y += 0.2; 
                    fireParticles.emitter = new BABYLON.Vector3(rocketNode.position.x, rocketNode.position.y + 2, rocketNode.position.z);
                    
                    // La cámara sigue al cohete
                    camera.target.y = rocketNode.position.y + 20;
                });
                
                document.getElementById("btn-launch").innerText = "DESPEGUE CONFIRMADO";
                document.getElementById("btn-launch").style.backgroundColor = "#555";
            }
        });

        }); // Cierra ImportMesh falcon_rocket
    }); // Cierra ImportMesh falcon_launch

    return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
