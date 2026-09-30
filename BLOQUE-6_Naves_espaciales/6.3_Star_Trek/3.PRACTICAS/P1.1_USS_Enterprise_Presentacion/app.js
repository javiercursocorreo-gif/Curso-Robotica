const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.03, 1);

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100));

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.9;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.8;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- 2. Fondo de Estrellas ---
    const starSystem = new BABYLON.ParticleSystem("stars", 8000, scene);
    const starTexture = new BABYLON.DynamicTexture("starTex", 16, scene, true);
    const ctx = starTexture.getContext();
    ctx.clearRect(0, 0, 16, 16);
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    starTexture.update();
    
    starSystem.particleTexture = starTexture;
    starSystem.createBoxEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(-2000, -2000, 0), new BABYLON.Vector3(2000, 2000, 5000));
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.color2 = new BABYLON.Color4(0.85, 0.9, 1, 1);
    starSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.minSize = 0.5;
    starSystem.maxSize = 2.0;
    starSystem.minLifeTime = 999999;
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 8000;
    starSystem.renderingGroupId = 0;
    starSystem.start();
    
    // --- 3. Nodo Raíz de la Nave USS ENTERPRISE ---
    const shipMesh = new BABYLON.TransformNode("shipMesh", scene);
    const modelWrapper = new BABYLON.TransformNode("modelWrapper", scene);
    modelWrapper.parent = shipMesh;

    let sequenceStarted = false;
    let titleShown = false;
    let isLoaded = false;

    const modelUrl = "../../../../MODELOS/STAR%20TRECK/U.S.S.%20Enterprise%20NCC%20-%201701/";
    const modelFile = "scene.gltf";

    BABYLON.SceneLoader.ImportMeshAsync("", modelUrl, modelFile, scene).then((result) => {
        const rootMesh = result.meshes[0];
        rootMesh.parent = modelWrapper;
        rootMesh.normalizeToUnitCube();

        // Centrado dinámico
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        rootMesh.getChildMeshes().forEach(m => {
            if (m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const b = m.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
            }
        });
        const center = BABYLON.Vector3.Center(min, max);
        rootMesh.position.subtractInPlace(center);

        // Sin rotaciones forzadas: Babylon carga el modelo horizontalmente con el platillo hacia +Z
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // Luces estroboscópicas de navegación
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 0.035 }, scene);
            const mat = new BABYLON.StandardMaterial("blinkMat", scene);
            mat.emissiveColor = color;
            mat.diffuseColor = color;
            mat.disableLighting = true;
            sphere.material = mat;
            sphere.parent = shipMesh;
            sphere.position = pos;
            sphere.renderingGroupId = 1;
            window.blinkLights.push(sphere);
        };

        // Posiciones sobre el platillo y casco (Platillo en +Z, Góndolas en -Z)
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-0.35, 0.04, 0.18)); // Babor Rojo
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(0.35, 0.04, 0.18));  // Estribor Verde
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, 0.16, 0.15));     // Cúpula Superior
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, -0.12, 0.0));     // Quilla Inferior

        // Fuego / Plasma de curvatura en las dos barquillas traseras (-Z)
        const createEngineFire = (pos) => {
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", { size: 0.04 }, scene);
            emitterMesh.parent = shipMesh;
            emitterMesh.position = pos;
            emitterMesh.isVisible = false;
            
            const fire = new BABYLON.ParticleSystem("warpFire", 1000, scene);
            fire.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
            fire.emitter = emitterMesh;
            fire.isLocal = true;
            fire.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 1.0);
            fire.color2 = new BABYLON.Color4(0.1, 0.2, 1.0, 1.0);
            fire.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
            fire.minSize = 0.4;
            fire.maxSize = 0.9;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 450;
            fire.direction1 = new BABYLON.Vector3(-0.04, -0.04, -8);
            fire.direction2 = new BABYLON.Vector3(0.04, 0.04, -10);
            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        createEngineFire(new BABYLON.Vector3(-0.21, 0.13, -0.42)); // Barquilla Babor
        createEngineFire(new BABYLON.Vector3(0.21, 0.13, -0.42));  // Barquilla Estribor

        // Escala y posición inicial en el espacio profundo
        shipMesh.scaling = new BABYLON.Vector3(650, 650, 650);
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Orientación de vuelo hacia la cámara (+Z platillo apunta a la dirección de movimiento)
        const moveDir = new BABYLON.Vector3(10, 4, -15);
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), 0, 0, 0);

        isLoaded = true;
    }).catch(err => {
        console.error("Error al cargar modelo Enterprise:", err);
    });

    // --- 4. UI ---
    const startBtn = document.getElementById("startButton");
    const titleDiv = document.getElementById("tng-title");

    startBtn.addEventListener("click", () => {
        if (!isLoaded) {
            startBtn.innerText = "CARGANDO MODELO...";
            return;
        }
        startBtn.style.display = "none";
        sequenceStarted = true;
    });

    // --- 5. Animación de Vuelo Continuo y Fluido ---
    scene.onBeforeRenderObservable.add(() => {
        if (sequenceStarted && isLoaded) {
            const dt = engine.getDeltaTime();
            const zDist = Math.max(0, shipMesh.position.z);
            const distanceFactor = Math.min(1.0, zDist / 1200);
            const speedMultiplier = 0.10 + 0.90 * distanceFactor;
            const speed = 0.25 * speedMultiplier * (dt / 16.666);

            shipMesh.position.z -= speed * 15;
            shipMesh.position.x += speed * 10;
            shipMesh.position.y += speed * 4;

            // Luces estroboscópicas
            if (window.blinkLights) {
                const now = performance.now();
                window.blinkLights.forEach((light, index) => {
                    const cycle = 1800;
                    const offset = index * 450;
                    light.visibility = ((now + offset) % cycle < 120) ? 1 : 0;
                });
            }

            // Rótulo tras el paso de la nave
            if (shipMesh.position.z < 150 && !titleShown) {
                titleShown = true;
                setTimeout(() => {
                    titleDiv.classList.remove("hidden");
                    titleDiv.style.display = "block";
                    void titleDiv.offsetWidth;
                    titleDiv.style.opacity = 1;
                }, 2000);
            }
        }
    });

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => {
    scene.render();
});
window.addEventListener("resize", () => {
    engine.resize();
});
