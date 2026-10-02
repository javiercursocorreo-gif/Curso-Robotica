const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1); // Fondo gris oscuro

    // --- 1. Cámara ---
    const camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 35, -120), scene);
    camera.setTarget(new BABYLON.Vector3(0, 20, 0));
    camera.attachControl(canvas, true);
    
    // Desactivar controles de movimiento de la cámara para que quede fija,
    // pero permitimos mirar alrededor con el ratón.
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];

    // --- 2. Iluminación ---
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;
    ambientLight.diffuse = new BABYLON.Color3(0.8, 0.8, 1);

    const padLight = new BABYLON.PointLight("padLight", new BABYLON.Vector3(0, 40, 0), scene);
    padLight.intensity = 0.8;
    padLight.diffuse = new BABYLON.Color3(0.5, 0.8, 1); // Luz azulada desde arriba del pad

    // --- 3. Materiales Procedimentales ---
    const darkMetalMat = new BABYLON.StandardMaterial("darkMetal", scene);
    darkMetalMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    darkMetalMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.6);

    const lightMetalMat = new BABYLON.StandardMaterial("lightMetal", scene);
    lightMetalMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.55);
    lightMetalMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.9);

    const emissiveWhiteMat = new BABYLON.StandardMaterial("glowWhite", scene);
    emissiveWhiteMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    emissiveWhiteMat.disableLighting = true;

    // --- 4. Construcción del Escenario (Transporter Room) ---
    // Suelo
    const floor = BABYLON.MeshBuilder.CreateGround("floor", {width: 200, height: 200}, scene);
    floor.material = lightMetalMat;

    // Escalón Base
    const baseStep = BABYLON.MeshBuilder.CreateCylinder("baseStep", {height: 4, diameter: 70}, scene);
    baseStep.position.y = 2;
    baseStep.material = darkMetalMat;

    // Escalón Superior
    const topStep = BABYLON.MeshBuilder.CreateCylinder("topStep", {height: 2, diameter: 60}, scene);
    topStep.position.y = 5;
    topStep.material = darkMetalMat;

    // Luz Central del Pad
    const centerLight = BABYLON.MeshBuilder.CreateCylinder("centerLight", {height: 2.1, diameter: 20}, scene);
    centerLight.position.y = 5;
    centerLight.material = emissiveWhiteMat;

    // Luces Exteriores    // Pads exteriores (5 pads para 5 personajes teletransportándose)
    for(let i=0; i<5; i++) {
        let angle = (i * Math.PI * 2) / 5;
        let pad = BABYLON.MeshBuilder.CreateCylinder("outerPad" + i, {height: 2.1, diameter: 12}, scene);
        pad.position.x = Math.cos(angle) * 22;
        pad.position.z = Math.sin(angle) * 22;
        pad.position.y = 5;
        pad.material = emissiveWhiteMat;
    }

    // Pared Trasera Plana (Garantizado que no bloquea la cámara)
    const backWall = BABYLON.MeshBuilder.CreateBox("backWall", {width: 120, height: 60, depth: 2}, scene);
    backWall.position.y = 30;
    backWall.position.z = 45; // Fondo de la sala
    backWall.material = lightMetalMat;

    // Paneles Luminosos en la pared
    for(let i=0; i<5; i++) {
        let panel = BABYLON.MeshBuilder.CreateBox("panel" + i, {width: 4, height: 40, depth: 1}, scene);
        panel.position.x = -40 + (i * 20); // Distribuidos en la pared trasera plana
        panel.position.z = 44; // Justo delante de la pared
        panel.position.y = 30;
        panel.material = emissiveWhiteMat;
    }

    // Techo (Plano superior)
    const ceiling = BABYLON.MeshBuilder.CreateBox("ceiling", {width: 120, height: 2, depth: 60}, scene);
    ceiling.position.y = 60;
    ceiling.position.z = 15; // Cubre la mitad trasera
    ceiling.material = lightMetalMat;

    // Consola de Control (Frontal izquierda)
    const consoleBox = BABYLON.MeshBuilder.CreateBox("consoleBox", {width: 15, height: 12, depth: 8}, scene);
    consoleBox.position = new BABYLON.Vector3(-30, 6, -30);
    // Orientarla mirando hacia el centro de la sala
    consoleBox.rotation.y = Math.PI * 0.25; 
    consoleBox.material = darkMetalMat;
    
    const consoleTop = BABYLON.MeshBuilder.CreateBox("consoleTop", {width: 14, height: 1, depth: 7}, scene);
    consoleTop.position = new BABYLON.Vector3(-30, 12, -30);
    consoleTop.rotation.y = Math.PI / 4;
    consoleTop.rotation.x = Math.PI / 6; // Inclinado
    consoleTop.material = emissiveWhiteMat; // Pantalla brillante

    // --- 5. Importar a los Capitanes (3 clones) ---
    let captains = [];
    let characterMaterials = []; // Guardamos los materiales para animar el alpha
    let teleportAlpha = 1.0; // Estado inicial: materializados
    
    BABYLON.SceneLoader.ImportMeshAsync("", "low_poly_-_star_trek_captains_rigged_male/", "scene.gltf", scene).then((result) => {
        if (result.skeletons) {
            result.skeletons.forEach(s => s.dispose());
        }
        result.meshes.forEach(m => {
            m.skeleton = null;
        });

        const captainGroups = [
            { name: "TOS", meshes: [0, 1, 2, 3, 4, 5], restX: -2.0 },
            { name: "DISC", meshes: [6, 7, 8, 9, 10], restX: -6.0 },
            { name: "ENT", meshes: [11, 12, 13, 14, 15, 16], restX: -10.0 },
            { name: "TNG", meshes: [17, 18, 19, 20], restX: 2.0 },
            { name: "VOY", meshes: [21, 22, 23, 24, 25], restX: 6.0 },
            { name: "DS9", meshes: [26, 27, 28, 29, 30], restX: 10.0 }
        ];

        captainGroups.forEach((group, i) => {
            const capPivot = new BABYLON.TransformNode("capPivot_" + group.name, scene);
            capPivot.scaling = new BABYLON.Vector3(6, 6, 6);

            let worldX, worldY, worldZ, rotY;
            if (i === 5) {
                // 6º capitán en la consola
                worldX = -30;
                worldY = 0;
                worldZ = -30;
                rotY = Math.PI * 1.25;
            } else {
                // 5 capitanes en los 5 pads
                const angle = (i * Math.PI * 2) / 5;
                worldX = Math.cos(angle) * 22;
                worldY = 6.1;
                worldZ = Math.sin(angle) * 22;
                rotY = 0;
            }

            capPivot.position = new BABYLON.Vector3(worldX, worldY, worldZ);
            capPivot.rotation = new BABYLON.Vector3(0, rotY, 0);

            group.meshes.forEach(mIdx => {
                const mesh = scene.getMeshByName("Object_" + mIdx);
                if (mesh) {
                    mesh.setParent(capPivot);
                    mesh.position = new BABYLON.Vector3(-group.restX, 0, 0);
                    mesh.rotation = BABYLON.Vector3.Zero();
                    mesh.scaling = BABYLON.Vector3.One();

                    if (mesh.material) {
                        if (i === 5) {
                            mesh.material = mesh.material.clone(mesh.material.name + "_console");
                            mesh.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                            mesh.material.alpha = 1.0;
                        } else {
                            mesh.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                            mesh.material.alpha = teleportAlpha;
                            if (!characterMaterials.includes(mesh.material)) {
                                characterMaterials.push(mesh.material);
                            }
                        }
                    }
                }
            });
        });
    });

    // --- 6. Sistema de Partículas (Teletransporte) ---
    // Aumentamos la capacidad para que sean más densas
    const particleSystem = new BABYLON.ParticleSystem("particles", 15000, scene);
    // Crear una textura de burbuja blanca perfecta programáticamente para asegurar un color 100% blanco
    const bubbleTexture = new BABYLON.DynamicTexture("bubbleTexture", 64, scene, true);
    const ctx = bubbleTexture.getContext();
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; // Blanco puro
    ctx.fill();
    
    // Suavizado de bordes (glow)
    ctx.shadowColor = "white";
    ctx.shadowBlur = 10;
    ctx.fill();
    bubbleTexture.update();
    
    particleSystem.particleTexture = bubbleTexture;
    
    // Emitir desde una caja que cubra a todos los capitanes
    particleSystem.createBoxEmitter(new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(-25, 6, -25), new BABYLON.Vector3(25, 6, 25));
    
    particleSystem.color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0); // Burbujas blancas puras
    particleSystem.color2 = new BABYLON.Color4(0.9, 0.9, 0.9, 1.0); // Blancas ligeramente grises para volumen
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
    
    // Burbujas más pequeñas como en la película
    particleSystem.minSize = 0.2;
    particleSystem.maxSize = 0.8;
    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 2.5;
    particleSystem.emitRate = 0; // Apagado por defecto
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    particleSystem.gravity = new BABYLON.Vector3(0, 20, 0); // Partículas flotan hacia arriba
    particleSystem.direction1 = new BABYLON.Vector3(-1, 5, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 5, 1);
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    particleSystem.minEmitPower = 5;
    particleSystem.maxEmitPower = 15;
    particleSystem.updateSpeed = 0.02;
    particleSystem.start();


    // --- 7. Lógica de Materialización / Desmaterialización ---
    let teleportState = "idle"; // idle, pre_dissolve, dissolving, post_dissolve, idle_empty, pre_materialize, materializing, post_materialize
    let targetTime = 0;
    
    function triggerDematerialize() {
        if (teleportAlpha >= 0.5) {
            teleportState = "pre_dissolve";
            targetTime = Date.now() + 1500;
            particleSystem.emitRate = 4000;
        }
    }

    function triggerMaterialize() {
        if (teleportAlpha <= 0.5) {
            teleportState = "pre_materialize";
            targetTime = Date.now() + 1500;
            particleSystem.emitRate = 4000;
        }
    }

    const btnDem = document.getElementById("btn-dematerialize");
    if (btnDem) btnDem.addEventListener("click", triggerDematerialize);

    const btnMat = document.getElementById("btn-materialize");
    if (btnMat) btnMat.addEventListener("click", triggerMaterialize);

    // Forzar el foco en el canvas para que las flechas siempre funcionen
    canvas.addEventListener("click", () => canvas.focus());
    canvas.focus();
    
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            if (kbInfo.event.key === "ArrowUp") {
                triggerDematerialize();
            }
            if (kbInfo.event.key === "ArrowDown") {
                triggerMaterialize();
            }
        }
    });

    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();
        let speed = 0.01 * (dt / 16.66); // Ajustado al framerate
        let now = Date.now();
        
        if (teleportState === "pre_dissolve") {
            if (now >= targetTime) teleportState = "dissolving";
        } 
        else if (teleportState === "dissolving") {
            teleportAlpha -= speed;
            
            if (teleportAlpha <= 0) {
                teleportAlpha = 0;
                teleportState = "post_dissolve";
                targetTime = Date.now() + 2000; // Esperar 2 segundos después
            }
        }
        else if (teleportState === "post_dissolve") {
            if (now >= targetTime) {
                teleportState = "idle_empty";
                particleSystem.emitRate = 0; // Apagar burbujas
            }
        }
        else if (teleportState === "pre_materialize") {
            if (now >= targetTime) teleportState = "materializing";
        }
        else if (teleportState === "materializing") {
            teleportAlpha += speed;
            
            if (teleportAlpha >= 1) {
                teleportAlpha = 1;
                teleportState = "post_materialize";
                targetTime = Date.now() + 2000; // Esperar 2 segundos después
            }
        }
        else if (teleportState === "post_materialize") {
            if (now >= targetTime) {
                teleportState = "idle";
                particleSystem.emitRate = 0; // Apagar burbujas
            }
        }

        // Aplicar alpha a todos los materiales de los capitanes
        characterMaterials.forEach(mat => {
            mat.alpha = teleportAlpha;
        });
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});
