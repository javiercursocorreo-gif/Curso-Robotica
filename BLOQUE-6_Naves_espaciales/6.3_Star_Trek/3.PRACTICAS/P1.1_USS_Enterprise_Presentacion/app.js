const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

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

    // --- 3. Nodo Raíz de la Nave USS ENTERPRISE NCC-1701 ---
    const shipMesh = new BABYLON.TransformNode("shipMesh", scene);

    let isLoaded = false;
    let animGroup = null;

    const modelUrl = "../../../../MODELOS/STAR%20TRECK/U.S.S.%20Enterprise%20NCC%20-%201701/";
    const modelFile = "scene.gltf";

    BABYLON.SceneLoader.ImportMeshAsync("", modelUrl, modelFile, scene).then((result) => {
        const rootMesh = result.meshes[0];
        rootMesh.parent = shipMesh;
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

        // Optimización de rendimiento para 742 mallas (elimina cualquier salto o tirones)
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            if (mesh.material) {
                mesh.material.needDepthPrePass = true;
                mesh.material.backFaceCulling = false;
            }
        });

        // Luces estroboscópicas de navegación acopladas a los extremos reales del platillo
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

        // Babor (Rojo), Estribor (Verde), Puente (Blanco), Quilla (Blanco)
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-0.44, 0.00, 0.16));
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(0.44, 0.00, 0.16));
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.00, 0.13, 0.16));
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.00, -0.12, -0.02));

        // Fuego / Plasma de curvatura en las dos barquillas traseras (-Z)
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

        createEngineFire(new BABYLON.Vector3(-0.18, 0.08, -0.48));
        createEngineFire(new BABYLON.Vector3(0.18, 0.08, -0.48));

        // Escala del USS Enterprise
        shipMesh.scaling = new BABYLON.Vector3(750, 750, 750);

        // Posición y orientación iniciales en reposo
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);
        shipMesh.rotation = new BABYLON.Vector3(-0.48, Math.atan2(10, -15), -0.38);

        // --- SISTEMA DE ANIMACIÓN POR CLAVES NATIVO DE BABYLON (100% FLUIDO A 60 FPS) ---
        const frameRate = 60;
        const totalFrames = 600;

        // 1. Animación de Posición
        const animPos = new BABYLON.Animation("animPos", "position", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const posKeys = [
            { frame: 0, value: new BABYLON.Vector3(-1700, -550, 3000) },
            { frame: 320, value: new BABYLON.Vector3(-350, -80, 800) },
            { frame: 450, value: new BABYLON.Vector3(250, 220, -100) },
            { frame: totalFrames, value: new BABYLON.Vector3(750, 450, -850) }
        ];
        const easePos = new BABYLON.QuadraticEase();
        easePos.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        animPos.setEasingFunction(easePos);
        animPos.setKeys(posKeys);

        // 2. Animación de Rotación (Muestra el lomo/platillo al inicio y la panza al cruzar)
        const animRot = new BABYLON.Animation("animRot", "rotation", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const yawAngle = Math.atan2(10, -15);
        const rotKeys = [
            // Inicio en el espacio lejano: inclinación hacia delante (-0.48 rad) y alabeo (-0.38 rad)
            // Esto apunta directamente la cubierta superior del platillo y el puente hacia el objetivo de la cámara.
            { frame: 0, value: new BABYLON.Vector3(-0.48, yawAngle, -0.38) },
            { frame: 300, value: new BABYLON.Vector3(-0.25, yawAngle, -0.22) },
            // Cruce sobre la cámara: la nave asciende por encima y muestra la panza, deflector y motores
            { frame: 450, value: new BABYLON.Vector3(0.12, yawAngle, -0.08) },
            { frame: totalFrames, value: new BABYLON.Vector3(0.18, yawAngle, 0.00) }
        ];
        animRot.setKeys(rotKeys);

        shipMesh.animations = [animPos, animRot];

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
        
        // Disparar animación nativa por hardware
        scene.beginAnimation(shipMesh, 0, 600, false, 1.0, () => {
            // Animación finalizada
        });

        // Revelar título de Star Trek tras el cruce rasante de la nave
        setTimeout(() => {
            titleDiv.classList.remove("hidden");
            titleDiv.style.display = "block";
            void titleDiv.offsetWidth;
            titleDiv.style.opacity = 1;
        }, 7500);
    });

    // --- 5. Luces Estroboscópicas Continuas ---
    scene.onBeforeRenderObservable.add(() => {
        if (window.blinkLights) {
            let time = performance.now();
            window.blinkLights.forEach((light, index) => {
                let cycle = 1800;
                let offset = index * 450;
                light.isVisible = ((time + offset) % cycle < 110);
            });
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
