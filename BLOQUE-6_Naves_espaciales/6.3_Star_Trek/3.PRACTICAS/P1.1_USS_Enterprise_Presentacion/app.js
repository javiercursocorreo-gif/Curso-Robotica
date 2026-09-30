const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro profundo

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100)); // Mirando hacia el fondo

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.95;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    dirLight.intensity = 1.9;
    dirLight.position = new BABYLON.Vector3(-500, -500, -500);

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.4;

    // --- 2. Fondo de Estrellas (Particle System) ---
    const starSystem = new BABYLON.ParticleSystem("stars", 10000, scene);
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
    starSystem.maxSize = 2.2;
    starSystem.minLifeTime = 999999;
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 10000;
    starSystem.renderingGroupId = 0;
    starSystem.start();

    // --- 3. Nodo de la Nave USS ENTERPRISE NCC-1701 ---
    const shipMesh = new BABYLON.TransformNode("shipMesh", scene);
    let sequenceStarted = false;
    let titleShown = false;
    let isLoaded = false;

    const modelUrl = "../../../../MODELOS/STAR%20TRECK/U.S.S.%20Enterprise%20NCC%20-%201701/";
    const modelFile = "scene.gltf";

    BABYLON.SceneLoader.ImportMeshAsync("", modelUrl, modelFile, scene).then((result) => {
        const rootMesh = result.meshes[0];
        rootMesh.parent = shipMesh;
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

        // CORRECCIÓN ROTACIÓN ROLL 180º:
        // El modelo importado estaba boca abajo. Al aplicar rotación de 180º en Z (roll),
        // el puente y la cubierta superior del platillo quedan arriba (visibles desde el inicio)
        // y el deflector de cobre y la panza quedan abajo.
        rootMesh.rotation.z = Math.PI;

        // Renderizado nítido en capa 1
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // Luces estroboscópicas sobre la superficie del casco corregido
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 0.035 }, scene);
            const mat = new BABYLON.StandardMaterial("blinkMat", scene);
            mat.emissiveColor = color;
            mat.diffuseColor = color;
            mat.disableLighting = true;
            sphere.material = mat;
            sphere.parent = rootMesh;
            sphere.position = pos;
            sphere.renderingGroupId = 1;
            window.blinkLights.push(sphere);
        };

        // Luces en el platillo y puente
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(0.44, 0.00, 0.16));  // Babor (Rojo)
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(-0.44, 0.00, 0.16)); // Estribor (Verde)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.00, -0.13, 0.16)); // Cúpula Puente
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.00, 0.12, -0.02)); // Quilla Inferior

        // Fuego / Plasma de curvatura en las dos barquillas traseras
        const createEngineFire = (pos) => {
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", { size: 0.02 }, scene);
            emitterMesh.parent = rootMesh;
            emitterMesh.position = pos;
            emitterMesh.isVisible = false;

            const fire = new BABYLON.ParticleSystem("warpFire", 1000, scene);
            fire.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
            fire.emitter = emitterMesh;
            fire.isLocal = true;

            fire.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 1.0); // Cyan
            fire.color2 = new BABYLON.Color4(0.1, 0.2, 1.0, 1.0); // Azul oscuro
            fire.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

            fire.minSize = 0.5;
            fire.maxSize = 1.0;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 500;

            fire.direction1 = new BABYLON.Vector3(-0.04, -0.04, -8);
            fire.direction2 = new BABYLON.Vector3(0.04, 0.04, -10);

            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        createEngineFire(new BABYLON.Vector3(0.18, -0.08, -0.48));  // Barquilla Babor
        createEngineFire(new BABYLON.Vector3(-0.18, -0.08, -0.48)); // Barquilla Estribor

        // Escala del USS Enterprise
        shipMesh.scaling = new BABYLON.Vector3(750, 750, 750);

        // Posición inicial: abajo a la izquierda en el espacio profundo
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Orientación angular: platillo apuntando hacia la trayectoria de vuelo
        const moveDir = new BABYLON.Vector3(10, 4, -15);
        const yaw = Math.atan2(10, -15);
        const pitch = -0.15; // Inclinación suave para vista dorsal perfecta desde el inicio
        const roll = -0.20;  // Alabeo elegante hacia la cámara

        shipMesh.rotationQuaternion = null;
        shipMesh.rotation = new BABYLON.Vector3(pitch, yaw, roll);

        isLoaded = true;
    }).catch(err => {
        console.error("Error cargando USS Enterprise:", err);
    });

    // --- 4. Eventos de la Interfaz ---
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

    // --- 5. Bucle de Animación Continuo y Fluido (Sin parones ni saltos) ---
    scene.onBeforeRenderObservable.add(() => {
        const rawDt = engine.getDeltaTime();
        const dt = Math.min(Math.max(rawDt, 10), 33.33);

        if (sequenceStarted && isLoaded) {
            // Velocidad constante y progresiva (nunca se frena a mitad de camino)
            const zDist = Math.max(0, shipMesh.position.z);
            const distanceFactor = Math.min(1.0, zDist / 1200);
            const speedMultiplier = 0.45 + 0.55 * distanceFactor;
            const speed = 0.28 * speedMultiplier * (dt / 16.666);

            // Desplazamiento continuo en diagonal
            shipMesh.position.z -= speed * 15; // Hacia la cámara
            shipMesh.position.x += speed * 10; // Hacia la derecha
            shipMesh.position.y += speed * 4;  // Hacia arriba

            // Luces estroboscópicas de navegación
            if (window.blinkLights) {
                const now = performance.now();
                window.blinkLights.forEach((light, index) => {
                    const cycle = 1800;
                    const offset = index * 450;
                    light.isVisible = ((now + offset) % cycle < 110);
                });
            }

            // Detección de cruce de cámara y despliegue del título
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
