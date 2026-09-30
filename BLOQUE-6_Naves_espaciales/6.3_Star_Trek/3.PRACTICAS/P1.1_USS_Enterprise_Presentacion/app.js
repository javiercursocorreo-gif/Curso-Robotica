const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro profundo

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100));

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.8;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    dirLight.intensity = 1.6;
    dirLight.position = new BABYLON.Vector3(-500, -500, -500);

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.3;

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
    starSystem.maxSize = 2.0;
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

        // Capa de renderizado 1 y materiales opacos para profundidad correcta
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // Luces estroboscópicas ajustadas exactamente a la escala del modelo
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 1.4 }, scene);
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

        // Posiciones sobre la superficie del casco del USS Enterprise
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-29.2, 0.4, 10.0));  // Babor Platillo (Rojo)
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(29.2, 0.4, 10.0));   // Estribor Platillo (Verde)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, 12.0, 14.0));     // Cúpula Superior (Blanco)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, -9.5, -4.0));     // Quilla Inferior (Blanco)

        // Fuego / Plasma de curvatura en las dos barquillas traseras
        const createEngineFire = (pos) => {
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", { size: 1.0 }, scene);
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

            fire.minSize = 8.0;
            fire.maxSize = 18.0;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 450;

            fire.direction1 = new BABYLON.Vector3(-0.5, -0.5, -80);
            fire.direction2 = new BABYLON.Vector3(0.5, 0.5, -100);

            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        // Salidas traseras de las dos góndolas Warp
        createEngineFire(new BABYLON.Vector3(-17.2, 8.5, -44.0)); // Góndola Babor
        createEngineFire(new BABYLON.Vector3(17.2, 8.5, -44.0));  // Góndola Estribor

        // Escala del USS Enterprise para igualar presencia visual del Intrepid
        shipMesh.scaling = new BABYLON.Vector3(7.0, 7.0, 7.0);

        // Posición inicial idéntica a P1.4: abajo a la izquierda y lejos en el espacio profundo
        // Al comenzar abajo (Y=-550) y lejos (Z=3000), la cámara ve el platillo desde ARRIBA (vista dorsal).
        // Al cruzar cerca (Z=0, Y=+250), pasa por encima de la cámara, viéndose toda la panza (vista ventral).
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Vector de trayectoria en diagonal ascendente
        const moveDir = new BABYLON.Vector3(10, 4, -15);
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), 0, 0, 0);

    }).catch(err => {
        console.error("Error al cargar USS Enterprise:", err);
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

    // --- 5. Bucle de Animación ---
    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();

        if (sequenceStarted && shipMesh) {
            let zDist = Math.abs(shipMesh.position.z);
            let distanceFactor = Math.min(1.0, zDist / 1200);
            let speedMultiplier = 0.08 + 0.92 * distanceFactor;
            let speed = 0.25 * speedMultiplier * (dt / 16.66);

            // Desplazamiento diagonal: subiendo (+Y), a la derecha (+X) y hacia la cámara (-Z)
            shipMesh.position.z -= speed * 15;
            shipMesh.position.x += speed * 10;
            shipMesh.position.y += speed * 4;

            // Parpadeo de luces estroboscópicas de navegación
            if (window.blinkLights) {
                let time = Date.now();
                window.blinkLights.forEach((light, index) => {
                    let cycle = 2000;
                    let offset = index * 500;
                    light.isVisible = ((time + offset) % cycle < 100);
                });
            }

            // Despliegue de rótulo Star Trek USS Enterprise tras cruzar la cámara
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
