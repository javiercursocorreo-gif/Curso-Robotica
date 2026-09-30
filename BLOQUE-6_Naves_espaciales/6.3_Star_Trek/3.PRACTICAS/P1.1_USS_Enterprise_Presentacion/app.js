const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro profundo

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100)); // Mirando hacia el fondo espacial

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

    // --- 3. Modelo de la Nave USS ENTERPRISE NCC-1701 ---
    let shipMesh = null;
    let sequenceStarted = false;
    let titleShown = false;

    const modelUrl = "../../../../MODELOS/STAR%20TRECK/U.S.S.%20Enterprise%20NCC%20-%201701/";
    const modelFile = "scene.gltf";

    BABYLON.SceneLoader.ImportMeshAsync("", modelUrl, modelFile, scene).then((result) => {
        shipMesh = result.meshes[0];

        // Capa de renderizado 1 y materiales nítidos
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.transparencyMode = 0;
                mesh.material.alphaMode = 0;
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // Luces estroboscópicas sobre el casco nativo del USS Enterprise
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 1.2 }, scene);
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

        // Posiciones nativas sobre el casco
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-29.3, 31.0, -15.0)); // Babor Platillo (Rojo)
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(29.3, 31.0, -15.0));  // Estribor Platillo (Verde)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, 53.0, -15.0));   // Cúpula Puente Superior (Blanco)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, 20.0, -5.0));    // Quilla Inferior (Blanco)

        // Fuego / Plasma Warp en ambas góndolas traseras
        const createEngineFire = (pos) => {
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", { size: 1.0 }, scene);
            emitterMesh.parent = shipMesh;
            emitterMesh.position = pos;
            emitterMesh.isVisible = false;

            const fire = new BABYLON.ParticleSystem("warpFire", 1000, scene);
            fire.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
            fire.emitter = emitterMesh;
            fire.isLocal = true;

            fire.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 1.0); // Cyan
            fire.color2 = new BABYLON.Color4(0.1, 0.2, 1.0, 1.0); // Azul oscuro
            fire.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

            fire.minSize = 6.0;
            fire.maxSize = 14.0;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 500;

            fire.direction1 = new BABYLON.Vector3(-0.5, -0.5, 60);
            fire.direction2 = new BABYLON.Vector3(0.5, 0.5, 80);

            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        createEngineFire(new BABYLON.Vector3(-17.5, 46.0, 36.0)); // Barquilla Babor
        createEngineFire(new BABYLON.Vector3(17.5, 46.0, 36.0));  // Barquilla Estribor

        // Escala del USS Enterprise
        shipMesh.scaling = new BABYLON.Vector3(6.5, 6.5, 6.5);

        // Posición inicial: abajo a la izquierda en el espacio profundo
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Vector de trayectoria en diagonal ascendente
        const moveDir = new BABYLON.Vector3(10, 4, -15);

        // Orientación: Inversión de Roll (Math.PI) para que el platillo superior y puente queden ARRIBA
        // apuntando de frente en la trayectoria de vuelo
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), 0, 0, Math.PI);

    }).catch(err => {
        console.error("Error cargando USS Enterprise:", err);
    });

    // --- 4. Eventos de la Interfaz ---
    const startBtn = document.getElementById("startButton");
    const titleDiv = document.getElementById("tng-title");

    startBtn.addEventListener("click", () => {
        if (!shipMesh) {
            startBtn.innerText = "CARGANDO MODELO...";
            return;
        }
        startBtn.style.display = "none";
        sequenceStarted = true;
    });

    // --- 5. Bucle de Animación Rápido, Continuo y Dinámico ---
    scene.onBeforeRenderObservable.add(() => {
        const rawDt = engine.getDeltaTime();
        const dt = Math.min(Math.max(rawDt, 10), 33.33);

        if (sequenceStarted && shipMesh) {
            // Velocidad rápida y continua (Warp Speed)
            const zDist = Math.max(0, shipMesh.position.z);
            const distanceFactor = Math.min(1.0, zDist / 1200);
            const speedMultiplier = 0.35 + 0.65 * distanceFactor;
            const speed = 0.70 * speedMultiplier * (dt / 16.666);

            // Desplazamiento diagonal continuo
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

            // Despliegue de título tras cruzar la cámara
            if (shipMesh.position.z < 150 && !titleShown) {
                titleShown = true;
                setTimeout(() => {
                    titleDiv.classList.remove("hidden");
                    titleDiv.style.display = "block";
                    void titleDiv.offsetWidth;
                    titleDiv.style.opacity = 1;
                }, 1500);
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
