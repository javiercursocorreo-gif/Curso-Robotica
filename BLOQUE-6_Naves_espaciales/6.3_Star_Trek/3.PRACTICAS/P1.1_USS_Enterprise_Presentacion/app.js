const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100)); // Mirando hacia el fondo

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.9;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    dirLight.intensity = 1.8;
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
    starSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
    starSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.minSize = 0.5;
    starSystem.maxSize = 2.0;
    starSystem.minLifeTime = 999999;
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 10000;
    starSystem.renderingGroupId = 0;
    starSystem.start();

    // --- 3. Modelo de la Nave USS ENTERPRISE NCC-1701 ---
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

        // Centrado dinámico basado en geometría visible
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

        // Capa de renderizado 1 y materiales nítidos
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // INVERSIÓN DE EJE VERTICAL (Corregir posición del puente arriba y panza abajo)
        // El modelo original venía con la panza hacia arriba. Al rotar 180º en Z, el platillo y el puente
        // quedan arriba (visibles desde el inicio) y el deflector / panza quedan abajo.
        modelWrapper.rotation = new BABYLON.Vector3(0, 0, Math.PI);

        // Encontrar las mallas reales de luces en el modelo 3D de la Enterprise
        window.blinkLights = [];
        const attachBlinkLightToMesh = (meshName, color, fallbackLocalPos) => {
            const targetMesh = scene.getMeshByName(meshName);
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 0.02 }, scene);
            const mat = new BABYLON.StandardMaterial("blinkMat", scene);
            mat.emissiveColor = color;
            mat.diffuseColor = color;
            mat.disableLighting = true;
            sphere.material = mat;
            sphere.renderingGroupId = 1;

            if (targetMesh) {
                sphere.parent = targetMesh;
                sphere.position = BABYLON.Vector3.Zero();
            } else {
                sphere.parent = rootMesh;
                sphere.position = fallbackLocalPos;
            }
            window.blinkLights.push(sphere);
        };

        // Luces acopladas directamente a las submallas originales del modelo
        attachBlinkLightToMesh("Object_391_red bits_2_0", new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(0.22, -0.01, -0.17)); // Babor Rojo
        attachBlinkLightToMesh("Object_389_green bits_2_0", new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(-0.22, -0.01, -0.17)); // Estribor Verde
        attachBlinkLightToMesh("Object_468_lights_2_0", new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, -0.12, -0.17)); // Cúpula Puente
        attachBlinkLightToMesh("Object_385_lights_2_0", new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, 0.12, 0.02));  // Casco Inferior

        // Fuego / Plasma Warp acoplado a las rejillas traseras de las dos góndolas
        const attachEngineFireToMesh = (meshName, fallbackLocalPos) => {
            const targetMesh = scene.getMeshByName(meshName);
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", { size: 0.01 }, scene);
            if (targetMesh) {
                emitterMesh.parent = targetMesh;
                emitterMesh.position = BABYLON.Vector3.Zero();
            } else {
                emitterMesh.parent = rootMesh;
                emitterMesh.position = fallbackLocalPos;
            }
            emitterMesh.isVisible = false;

            const fire = new BABYLON.ParticleSystem("warpFire", 1000, scene);
            fire.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
            fire.emitter = emitterMesh;
            fire.isLocal = true;

            fire.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 1.0); // Cyan
            fire.color2 = new BABYLON.Color4(0.1, 0.2, 1.0, 1.0); // Azul oscuro
            fire.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

            fire.minSize = 0.4;
            fire.maxSize = 0.9;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 500;

            // Proyección del chorro de plasma hacia la popa
            fire.direction1 = new BABYLON.Vector3(-0.02, -0.02, -8);
            fire.direction2 = new BABYLON.Vector3(0.02, 0.02, -10);

            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            fire.renderingGroupId = 1;
            fire.start();
        };

        attachEngineFireToMesh("Object_182_grille_2_0", new BABYLON.Vector3(0.13, -0.06, 0.49));
        attachEngineFireToMesh("Object_183_grille_2_0", new BABYLON.Vector3(-0.13, -0.06, 0.49));

        // Escala del USS Enterprise
        shipMesh.scaling = new BABYLON.Vector3(750, 750, 750);

        // Posición inicial: en el fondo a la izquierda (Z = 3000, Y = -550)
        // Desde esta posición inferior lejana, la cámara (Y = 0) mira HACIA ABAJO viendo el lomo y platillo superior.
        // Al subir y cruzar cerca por encima (Z = 0, Y = +250), la cámara mira HACIA ARRIBA viendo la panza inferior.
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Vector de trayectoria en diagonal ascendente
        const moveDir = new BABYLON.Vector3(10, 4, -15);

        // Orientación de avance frontal
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), 0, 0, 0);

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

    // --- 5. Bucle de Animación ---
    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();

        if (sequenceStarted && isLoaded) {
            let zDist = Math.abs(shipMesh.position.z);
            let distanceFactor = Math.min(1.0, zDist / 1200);
            let speedMultiplier = 0.08 + 0.92 * distanceFactor;
            let speed = 0.25 * speedMultiplier * (dt / 16.66);

            // Desplazamiento diagonal
            shipMesh.position.z -= speed * 15; // Hacia la cámara
            shipMesh.position.x += speed * 10; // Hacia la derecha
            shipMesh.position.y += speed * 4;  // Hacia arriba

            // Parpadeo de luces estroboscópicas sincronizado
            if (window.blinkLights) {
                let time = Date.now();
                window.blinkLights.forEach((light, index) => {
                    let cycle = 2000;
                    let offset = index * 500;
                    light.isVisible = ((time + offset) % cycle < 100);
                });
            }

            // Detección de paso de cámara y despliegue del título tras 2 segundos
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
