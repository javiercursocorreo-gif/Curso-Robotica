const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let scene;
let camera;
let shipMesh;

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.0, 1.0); // Negro absoluto (Interstellar)

    // Cámara ArcRotate para orbitar alrededor de la nave
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 50, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    
    // Configuración cinematográfica de la cámara (rotación automática)
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = 0.05; // Velocidad de órbita muy lenta y solemne
    camera.autoRotationBehavior.idleRotationWaitTime = 1000;
    camera.autoRotationBehavior.idleRotationSpinupTime = 2000;
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 200;

    // --- ILUMINACIÓN CINEMATOGRÁFICA ---
    // En Interstellar, la luz del agujero negro (Gargantua) o del sol es muy direccional,
    // creando un alto contraste de luz y sombras absolutas en el lado opuesto.
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-1, -0.5, 1), scene);
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.8); // Luz ligeramente dorada/cálida
    sunLight.intensity = 3.0;

    // Luz de relleno muy tenue para no dejar el lado oscuro completamente invisible
    const fillLight = new BABYLON.HemisphericLight("fillLight", new BABYLON.Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.1;
    fillLight.groundColor = new BABYLON.Color3(0.0, 0.0, 0.05);

    // Efecto brillante (Glow)
    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 0.5;

    // --- FONDO DE ESTRELLAS ---
    const stars = new BABYLON.ParticleSystem("stars", 3000, scene);
    stars.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
    stars.emitter = camera;
    stars.minEmitBox = new BABYLON.Vector3(-1000, -1000, -1000);
    stars.maxEmitBox = new BABYLON.Vector3(1000, 1000, 1000);
    stars.color1 = new BABYLON.Color4(1, 1, 1, 1);
    stars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.8);
    stars.minSize = 0.5;
    stars.maxSize = 1.5;
    stars.minLifeTime = 999999;
    stars.maxLifeTime = 999999;
    stars.emitRate = 3000;
    stars.updateSpeed = 0; // Estrellas totalmente estáticas
    stars.start();

    // --- CARGA DEL MODELO (ENDURANCE) ---
    BABYLON.SceneLoader.ImportMeshAsync("", "interstellar__endurance_high_fidelity/", "scene.gltf", scene).then((result) => {
        shipMesh = result.meshes[0];
        
        // Ajustar escala si es necesario
        shipMesh.scaling = new BABYLON.Vector3(1, 1, 1); 
        
        // Centrar el modelo en el origen
        const boundingInfo = shipMesh.getHierarchyBoundingVectors();
        const center = boundingInfo.max.add(boundingInfo.min).scale(0.5);
        shipMesh.position = center.scale(-1);

        // Crear un nodo padre para facilitar la rotación sobre su centro de masa
        const pivot = new BABYLON.TransformNode("pivot");
        shipMesh.parent = pivot;
        
        // Ajustar la cámara al tamaño de la nave
        const size = boundingInfo.max.subtract(boundingInfo.min);
        const maxDimension = Math.max(size.x, size.y, size.z);
        // Hacemos la cámara un poco más lejana para que se vea más nave
        camera.radius = maxDimension * 1.8;
        camera.lowerRadiusLimit = maxDimension * 0.5;
        camera.upperRadiusLimit = maxDimension * 4;

        // --- SIMULACIÓN DE GRAVEDAD ARTIFICIAL ---
        // La Endurance gira a 5.6 RPM para generar 1G de gravedad terrestre en los módulos
        // 5.6 RPM = 5.6 * (2 * PI) / 60 radianes por segundo = ~0.586 rad/s
        const rpm = 5.6;
        const radPerSec = (rpm * 2 * Math.PI) / 60;

        scene.onBeforeRenderObservable.add(() => {
            // Calculamos el tiempo transcurrido desde el último frame (deltaTime)
            const deltaTime = engine.getDeltaTime() / 1000; // en segundos
            
            // Rotamos la nave sobre su eje Z (o Y dependiendo del modelo)
            // Asumimos Z como el eje central del anillo, si gira raro, cambiamos a BABYLON.Axis.Y
            pivot.rotate(BABYLON.Axis.Z, radPerSec * deltaTime, BABYLON.Space.LOCAL);
        });
    });

    return scene;
};

scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
