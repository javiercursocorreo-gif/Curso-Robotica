const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100)); // Mirando hacia el fondo espacial

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6; // Luz ambiente equilibrada para detalles del fuselaje

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    dirLight.intensity = 1.6;
    dirLight.position = new BABYLON.Vector3(-500, -500, -500);

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

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
    starSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
    starSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.minSize = 0.5;
    starSystem.maxSize = 2.0;
    starSystem.minLifeTime = 999999;
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 10000;
    starSystem.renderingGroupId = 0;
    starSystem.start();

    // --- 3. Modelo de la Nave USS ENTERPRISE NCC-1701.2 ---
    let shipMesh = null;
    let sequenceStarted = false;
    let titleShown = false;

    // Ruta al nuevo modelo limpio y optimizado
    const modelUrl = "../../../../MODELOS/STAR%20TRECK/U.S.S.%20Enterprise%20NCC%20-%201701.2/U.S.S.%20Enterprise%20NCC%20-%201701.2/";
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
            }
        });

        // Luces estroboscópicas de navegación
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 1.5 }, scene);
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

        // Posiciones en el casco del Enterprise (Platillo en -Z, Barquillas en +Z, Puente en +Y)
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(52.0, 10.0, -75.0));   // Babor (Rojo)
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(-52.0, 10.0, -75.0));  // Estribor (Verde)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, 35.0, -75.0));    // Cúpula Puente
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, -20.0, -20.0));   // Quilla Inferior

        // Fuego / Plasma Warp en los escapes traseros (+Z en coordenadas locales de la Enterprise)
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

            // Disparar plasma hacia la popa (+Z)
            fire.direction1 = new BABYLON.Vector3(-0.05, -0.05, 8);
            fire.direction2 = new BABYLON.Vector3(0.05, 0.05, 10);

            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        createEngineFire(new BABYLON.Vector3(50.0, 26.0, 150.0));  // Góndola Babor
        createEngineFire(new BABYLON.Vector3(-50.0, 26.0, 150.0)); // Góndola Estribor

        // Escala del nuevo modelo (igual a la escala visual de Intrepid)
        shipMesh.scaling = new BABYLON.Vector3(2.8, 2.8, 2.8);

        // Posición inicial: abajo a la izquierda en el espacio profundo
        // Al comenzar abajo (Y = -550, Z = 3000), la cámara mira hacia abajo enfocando la parte SUPERIOR (platillo y puente).
        // Al ascender y cruzar rozando por encima (Z = 0, Y = +250), la cámara enfoca toda la parte INFERIOR (panza y deflector).
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Vector de trayectoria en diagonal ascendente
        const moveDir = new BABYLON.Vector3(10, 4, -15);

        // Orientación idéntica a Intrepid: Math.PI de corrección yaw
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), Math.PI, 0, 0);

    }).catch(err => {
        console.error("Error cargando el nuevo modelo USS Enterprise:", err);
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

    // --- 5. Bucle de Animación Cinemática (Idéntico a Intrepid) ---
    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();

        if (sequenceStarted && shipMesh) {
            let zDist = Math.abs(shipMesh.position.z);
            let distanceFactor = Math.min(1.0, zDist / 1200);
            let speedMultiplier = 0.08 + 0.92 * distanceFactor;
            let speed = 0.25 * speedMultiplier * (dt / 16.66);

            // Desplazamiento diagonal
            shipMesh.position.z -= speed * 15; // Hacia la cámara
            shipMesh.position.x += speed * 10; // Hacia la derecha
            shipMesh.position.y += speed * 4;  // Hacia arriba

            // Luces estroboscópicas de navegación
            if (window.blinkLights) {
                let time = Date.now();
                window.blinkLights.forEach((light, index) => {
                    let cycle = 2000;
                    let offset = index * 500;
                    light.isVisible = ((time + offset) % cycle < 100);
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
