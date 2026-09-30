const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.03, 1);

    // --- CÁMARA (VISTA ISOMÉTRICA LATERAL) ---
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2.6, Math.PI / 2.8, 85, new BABYLON.Vector3(0, 5, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 30;
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 250;

    // --- ILUMINACIÓN ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.8;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.2;

    const gridLight = new BABYLON.HemisphericLight("gridLight", new BABYLON.Vector3(0, 1, 0), scene);
    gridLight.intensity = 1.0;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.0;

    // --- NAVE USS ENTERPRISE ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    shipRoot.position = new BABYLON.Vector3(0, 12, 0);

    let shipMesh = null;
    try {
        // Cargar el modelo optimizado del Enterprise
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "../P1.1_USS_Enterprise_Presentacion/model/", "scene.gltf", scene);
        shipMesh = result.meshes[0];
        shipMesh.setParent(shipRoot);
        
        // Normalizar y escalar adecuadamente
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        shipMesh.getChildMeshes().forEach(m => {
            if (m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const b = m.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
            }
        });
        const size = max.subtract(min);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scale = 28 / maxDim;
            shipMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
        }
        // Orientación hacia el frente del viaje (+Z)
        shipMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    } catch (e) {
        console.warn("Cargando modelo de respaldo para Warp...", e);
        try {
            const result2 = await BABYLON.SceneLoader.ImportMeshAsync("", "../P1.4_Star_Trek_Intro/uss_intrepid_ncc_79520/", "scene.gltf", scene);
            shipMesh = result2.meshes[0];
            shipMesh.setParent(shipRoot);
            shipMesh.scaling = new BABYLON.Vector3(18, 18, 18);
            shipMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
        } catch (e2) {
            console.error("Error cargando naves para Warp:", e2);
        }
    }

    // --- MALLA DE ESPACIO-TIEMPO (MÉTRICA DE ALCUBIERRE) ---
    const gridSubdivisions = 100;
    const gridSize = 1400;
    const cellSize = gridSize / gridSubdivisions;

    const ground = BABYLON.MeshBuilder.CreateGround("spacetime", {
        width: gridSize,
        height: gridSize,
        subdivisions: gridSubdivisions,
        updatable: true
    }, scene);

    ambientLight.excludedMeshes.push(ground);
    dirLight.excludedMeshes.push(ground);
    gridLight.includedOnlyMeshes.push(ground);
    ground.position.y = -25;

    const gridMat = new BABYLON.StandardMaterial("gridMat", scene);
    gridMat.wireframe = true;
    gridMat.emissiveColor = BABYLON.Color3.White();
    gridMat.useVertexColors = true;
    gridMat.linkEmissiveWithDiffuse = true;
    ground.material = gridMat;

    ground.hasVertexAlpha = true;
    const initialColors = new Float32Array(ground.getTotalVertices() * 4);
    for (let i = 0; i < initialColors.length; i += 4) {
        initialColors[i] = 0.2;
        initialColors[i+1] = 0.3;
        initialColors[i+2] = 0.5;
        initialColors[i+3] = 0.4;
    }
    ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, initialColors, true);

    let gridOffsetZ = 0;

    // --- FONDO DE ESTRELLAS DE CURVATURA ---
    const starSystem = new BABYLON.ParticleSystem("warpStars", 2500, scene);
    const starTex = new BABYLON.DynamicTexture("starTex", 16, scene, true);
    const sCtx = starTex.getContext();
    sCtx.clearRect(0, 0, 16, 16);
    sCtx.beginPath();
    sCtx.arc(8, 8, 7, 0, Math.PI * 2);
    sCtx.fillStyle = "#FFFFFF";
    sCtx.fill();
    starTex.update();
    starSystem.particleTexture = starTex;

    starSystem.createBoxEmitter(
        new BABYLON.Vector3(0, 0, -20),
        new BABYLON.Vector3(0, 0, -50),
        new BABYLON.Vector3(-300, 20, 200),
        new BABYLON.Vector3(300, 300, 600)
    );
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.color2 = new BABYLON.Color4(0.6, 0.8, 1, 1);
    starSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0);
    starSystem.minSize = 0.4;
    starSystem.maxSize = 1.8;
    starSystem.minLifeTime = 1.5;
    starSystem.maxLifeTime = 3.0;
    starSystem.emitRate = 800;
    starSystem.start();

    // --- LÓGICA DE SALTO WARP ---
    let isWarping = false;
    let warpProgress = 0;
    let warpFactor = 1.0;

    const btnWarp = document.getElementById("btn-warp");
    const telemetry = document.getElementById("telemetry");

    btnWarp.addEventListener("click", () => {
        if (!isWarping) {
            isWarping = true;
            telemetry.innerText = "SISTEMA WARP: ACTIVADO • CURVATURA ESPACIO-TIEMPO EN PROCESO";
            btnWarp.innerText = "DESACTIVAR SALTO WARP";
            btnWarp.classList.add("danger");
        } else {
            isWarping = false;
            telemetry.innerText = "SISTEMA WARP: DESACTIVANDO • REGRESANDO A VELOCIDAD IMPULSO";
            btnWarp.innerText = "ACTIVAR SALTO WARP";
            btnWarp.classList.remove("danger");
        }
    });

    const baseX = shipRoot.position.x;
    const baseY = shipRoot.position.y;

    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();

        if (isWarping) {
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 1, 0.02);
            warpFactor = 1.0 + warpProgress * 8.9;
            if (warpProgress > 0.95) {
                telemetry.innerText = `SISTEMA WARP: FACTOR ${warpFactor.toFixed(1)} • DEFORMACIÓN MÉTRICA ESTABLE`;
            }
        } else {
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 0, 0.04);
            warpFactor = 1.0 + warpProgress * 8.9;
            if (warpProgress < 0.05 && telemetry.innerText.includes("DESACTIVANDO")) {
                telemetry.innerText = "SISTEMA WARP: EN ESPERA (VELOCIDAD SUB-LUZ)";
            }
        }

        // Velocidad visual de la cuadrícula
        let gridSpeed = (0.5 + warpProgress * 4.0) * (dt / 16.66);
        gridOffsetZ -= gridSpeed;
        gridOffsetZ = gridOffsetZ % cellSize;
        ground.position.z = gridOffsetZ;

        // Modificación geométrica de la Métrica de Alcubierre en tiempo real
        const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const col = ground.getVerticesData(BABYLON.VertexBuffer.ColorKind);

        for (let i = 0; i < pos.length; i += 3) {
            let localX = pos[i];
            let localZ = pos[i+2];
            let worldX = localX;
            let worldZ = localZ + gridOffsetZ;

            let Y = 0;
            let frontInfluence = 0;
            let backInfluence = 0;

            if (warpProgress > 0.01) {
                let zFront = 45;   // Contracción delante de la nave (+Z)
                let zBack = -45;   // Expansión detrás de la nave (-Z)
                let zSpread = 1200;
                let xSpread = 3200;

                let xFactor = Math.exp(-Math.pow(worldX, 2) / xSpread);

                // Pozo gravitatorio delantero (Contracción del espacio)
                frontInfluence = Math.exp(-Math.pow(worldZ - zFront, 2) / zSpread) * xFactor;
                let dip = frontInfluence * 35;

                // Cresta trasera (Expansión del espacio)
                backInfluence = Math.exp(-Math.pow(worldZ - zBack, 2) / zSpread) * xFactor;
                let hill = backInfluence * 40;

                Y = (hill - dip) * warpProgress;
            }

            pos[i+1] = Y;

            // Coloreado por gradiente térmico de curvatura
            let vIdx = (i / 3) * 4;
            let r = 0.2, g = 0.3, b = 0.5, a = 0.35;

            if (frontInfluence > 0.01) {
                // Azul brillante / Cyan (Contracción frontal)
                let intensity = Math.min(frontInfluence * warpProgress, 1.0);
                r = 0.0;
                g = BABYLON.Scalar.Lerp(0.5, 0.9, intensity);
                b = 1.0;
                a = BABYLON.Scalar.Lerp(0.3, 0.95, intensity);
            } else if (backInfluence > 0.01) {
                // Naranja / Ámbar (Expansión trasera)
                let intensity = Math.min(backInfluence * warpProgress, 1.0);
                r = 1.0;
                g = BABYLON.Scalar.Lerp(0.3, 0.65, intensity);
                b = 0.0;
                a = BABYLON.Scalar.Lerp(0.3, 0.95, intensity);
            }

            col[vIdx] = r;
            col[vIdx+1] = g;
            col[vIdx+2] = b;
            col[vIdx+3] = a;
        }

        ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
        ground.updateVerticesData(BABYLON.VertexBuffer.ColorKind, col);

        // Microvibración del casco de la nave
        shipRoot.position.x = baseX + (Math.random() - 0.5) * 0.25 * warpProgress;
        shipRoot.position.y = baseY + (Math.random() - 0.5) * 0.25 * warpProgress;
    });

    return scene;
};

createScene().then(scene => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});
