const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.003, 0.003, 0.008, 1); // Espacio negro profundo

    // --- CÁMARA (VISTA ISOMÉTRICA LATERAL ELEVADA) ---
    // Encuadre idéntico a la fotografía teórica de Alcubierre:
    // - Izquierda: Cresta naranja de expansión (en popa)
    // - Centro: USS Enterprise en la burbuja plana
    // - Derecha: Pozo azul de contracción (en proa)
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2 + 0.30,  // Perspectiva frontal-derecha
        Math.PI / 2.68,       // Ángulo elevado (~67°)
        78,                   // Distancia óptima para encuadrar la onda completa
        new BABYLON.Vector3(0, 3, 0),
        scene
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 30;
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 200;

    // --- ILUMINACIÓN EQUILIBRADA (PARA NO QUEMAR EL CASCO DEL ENTERPRISE) ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.35; // Luz difusa suave

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1.8, 1), scene);
    dirLight.intensity = 0.70; // Luz direccional que genera volumen y sombras

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 0.60;

    // --- NAVE USS ENTERPRISE NCC-1701 ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    shipRoot.position = new BABYLON.Vector3(0, 4.8, 0); // Flotando en la burbuja plana

    // Ángulo de avance: hacia la derecha con ligera inclinación hacia la cámara
    const flightAngle = 0.22; // rad
    const cosA = Math.cos(flightAngle);
    const sinA = Math.sin(flightAngle);

    let shipMesh = null;
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "../P1.1_USS_Enterprise_Presentacion/model/", "scene.gltf", scene);
        shipMesh = result.meshes[0];
        shipMesh.parent = shipRoot;
        shipMesh.position = BABYLON.Vector3.Zero();
        shipMesh.rotationQuaternion = null;
        
        // Tinte gris compuesto metálico de la Flota Estelar para que NO se vea blanca
        // y se lean perfectamente los rótulos y paneles
        const hullTone = new BABYLON.Color3(0.50, 0.54, 0.58);

        result.meshes.forEach(m => {
            m.renderingGroupId = 1;
            gl.addExcludedMesh(m); // Excluir del GlowLayer para evitar que se queme
            if (m.material) {
                m.material.transparencyMode = 0;
                m.material.alphaMode = 0;
                m.material.needDepthPrePass = true;
                
                if (m.material.albedoColor) {
                    m.material.albedoColor = hullTone;
                }
                if (m.material.diffuseColor) {
                    m.material.diffuseColor = hullTone;
                }
                if (m.material.metallic !== undefined) {
                    m.material.metallic = 0.30;
                }
                if (m.material.roughness !== undefined) {
                    m.material.roughness = 0.55;
                }
                if (m.material.emissiveIntensity !== undefined) {
                    m.material.emissiveIntensity = 0.18; // Resplandor sutil en ventanas y bussards
                }
            }
        });
        
        // Normalizar tamaño
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
            const scale = 25 / maxDim;
            shipMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
        }
        
        // Orientación: platillo (proa) hacia la DERECHA (hacia el pozo azul)
        // Barquillas (popa) hacia la IZQUIERDA (hacia la cresta naranja)
        shipMesh.rotation = new BABYLON.Vector3(0, -Math.PI / 2 - flightAngle, 0);
    } catch (e) {
        console.warn("Cargando modelo de respaldo para Warp...", e);
        try {
            const result2 = await BABYLON.SceneLoader.ImportMeshAsync("", "../P1.4_Star_Trek_Intro/uss_intrepid_ncc_79520/", "scene.gltf", scene);
            shipMesh = result2.meshes[0];
            shipMesh.parent = shipRoot;
            shipMesh.position = BABYLON.Vector3.Zero();
            shipMesh.rotationQuaternion = null;
            result2.meshes.forEach(m => {
                m.renderingGroupId = 1;
                gl.addExcludedMesh(m);
            });
            shipMesh.scaling = new BABYLON.Vector3(16, 16, 16);
            shipMesh.rotation = new BABYLON.Vector3(0, -Math.PI / 2 - flightAngle, 0);
        } catch (e2) {
            console.error("Error cargando nave:", e2);
        }
    }

    // --- MALLA DE ESPACIO-TIEMPO (CUADRÍCULA ORTOGONAL PURA) ---
    const gridXCount = 80;
    const gridZCount = 56;
    const gridWidth = 140;
    const gridDepth = 98;
    const stepX = gridWidth / gridXCount;
    const stepZ = gridDepth / gridZCount;
    const halfW = gridWidth / 2;
    const halfD = gridDepth / 2;

    // Parámetros de la Métrica de Alcubierre:
    const uBack = -28.0;  // Cresta naranja en popa (izquierda)
    const uFront = 28.0;  // Pozo azul en proa (derecha)
    const spreadU = 320.0;
    const spreadW = 620.0;

    function getSpacetimeData(x, z, warpAmount) {
        const u = x * cosA + z * sinA;
        const w = -x * sinA + z * cosA;

        // Amortiguación hacia los bordes para que la colina no toque el borde del plano
        const edgeNormX = Math.abs(x) / halfW;
        const edgeNormZ = Math.abs(z) / halfD;
        const edgeFactor = Math.max(0, 1.0 - Math.pow(edgeNormX, 3.5)) * Math.max(0, 1.0 - Math.pow(edgeNormZ, 3.5));

        // 1. Cresta de Expansión trasera (Izquierda - Montaña naranja en popa)
        const backD2 = Math.pow(u - uBack, 2);
        const backW2 = Math.pow(w, 2);
        const backInf = Math.exp(-backD2 / spreadU - backW2 / spreadW) * edgeFactor;
        const hill = backInf * 24.0;

        // 2. Pozo de Contracción delantero (Derecha - Embudo azul en proa)
        const frontD2 = Math.pow(u - uFront, 2);
        const frontW2 = Math.pow(w, 2);
        const frontInf = Math.exp(-frontD2 / spreadU - frontW2 / spreadW) * edgeFactor;
        const dip = frontInf * 24.0;

        // Amplitud de deformación
        const y = (hill - dip) * warpAmount;

        // Coloración del vértice:
        // En reposo (antes del salto): Malla completamente BLANCA
        // Durante el salto: la popa se tiñe de naranja vivo y la proa de cyan vivo
        let r = 0.90, g = 0.92, b = 0.96, a = 0.50; // Blanco nítido neutro en reposo

        if (warpAmount > 0.01) {
            if (backInf > 0.02) {
                // Naranja / ámbar cálido y vivo (Expansión)
                const intensity = Math.min(backInf * warpAmount * 1.6, 1.0);
                r = 1.0;
                g = BABYLON.Scalar.Lerp(0.92, 0.45, intensity);
                b = BABYLON.Scalar.Lerp(0.96, 0.02, intensity);
                a = BABYLON.Scalar.Lerp(0.50, 0.95, intensity);
            } else if (frontInf > 0.02) {
                // Cyan eléctrico / turquesa vivo (Contracción)
                const intensity = Math.min(frontInf * warpAmount * 1.6, 1.0);
                r = BABYLON.Scalar.Lerp(0.90, 0.02, intensity);
                g = BABYLON.Scalar.Lerp(0.92, 0.85, intensity);
                b = 1.0;
                a = BABYLON.Scalar.Lerp(0.50, 0.95, intensity);
            }
        }

        return { y, color: new BABYLON.Color4(r, g, b, a) };
    }

    function buildGridLines(warpFactor) {
        const lines = [];
        const colors = [];

        // 1. Líneas paralelas al eje X
        for (let j = 0; j <= gridZCount; j++) {
            const z = -halfD + j * stepZ;
            const line = [];
            const lineColors = [];
            for (let i = 0; i <= gridXCount; i++) {
                const x = -halfW + i * stepX;
                const pt = getSpacetimeData(x, z, warpFactor);
                line.push(new BABYLON.Vector3(x, pt.y, z));
                lineColors.push(pt.color);
            }
            lines.push(line);
            colors.push(lineColors);
        }

        // 2. Líneas paralelas al eje Z
        for (let i = 0; i <= gridXCount; i++) {
            const x = -halfW + i * stepX;
            const line = [];
            const lineColors = [];
            for (let j = 0; j <= gridZCount; j++) {
                const z = -halfD + j * stepZ;
                const pt = getSpacetimeData(x, z, warpFactor);
                line.push(new BABYLON.Vector3(x, pt.y, z));
                lineColors.push(pt.color);
            }
            lines.push(line);
            colors.push(lineColors);
        }

        return { lines, colors };
    }

    // Inicializar malla plana y blanca
    const initialGrid = buildGridLines(0.0);

    // Malla sólida oscura subyacente (Capa Oclusora de Profundidad)
    // Ocluye físicamente las líneas del fondo para que la colina naranja sea opaca y sólida,
    // eliminando por completo cualquier línea blanca que cruce la cresta desde atrás.
    const darkGround = BABYLON.MeshBuilder.CreateGround("darkGround", {
        width: gridWidth,
        height: gridDepth,
        subdivisionsX: gridXCount,
        subdivisionsY: gridZCount,
        updatable: true
    }, scene);
    const darkMat = new BABYLON.StandardMaterial("darkMat", scene);
    darkMat.diffuseColor = new BABYLON.Color3(0.003, 0.003, 0.008);
    darkMat.emissiveColor = new BABYLON.Color3(0.003, 0.003, 0.008);
    darkMat.specularColor = BABYLON.Color3.Black();
    darkMat.disableDepthWrite = false;
    darkMat.backFaceCulling = false;
    darkGround.material = darkMat;
    darkGround.renderingGroupId = 0;
    gl.addExcludedMesh(darkGround);

    const spacetimeLines = BABYLON.MeshBuilder.CreateLineSystem("spacetime", {
        lines: initialGrid.lines,
        colors: initialGrid.colors,
        updatable: true
    }, scene);
    spacetimeLines.renderingGroupId = 0;
    gl.addExcludedMesh(spacetimeLines); // Excluir del GlowLayer para conservar colores nítidos

    // --- ENTORNO ESPACIAL Y ESTRELLAS (CUBREN TODO EL FONDO DE EXTREMO A EXTREMO) ---
    // El emisor abarca desde el lateral izquierdo (-140) hasta el derecho (+140)
    const starCount = 2500;
    const starSystem = new BABYLON.ParticleSystem("stars", starCount, scene);
    const starTex = new BABYLON.DynamicTexture("starTex", 16, scene, true);
    const sCtx = starTex.getContext();
    sCtx.clearRect(0, 0, 16, 16);
    sCtx.beginPath();
    sCtx.arc(8, 8, 5, 0, Math.PI * 2);
    sCtx.fillStyle = "#FFFFFF";
    sCtx.fill();
    starTex.update();
    starSystem.particleTexture = starTex;

    // Emisor en el fondo negro profundo distribuido en todo el ancho (-140 a +140)
    starSystem.createBoxEmitter(
        new BABYLON.Vector3(-15 * cosA, 0, -15 * sinA),
        new BABYLON.Vector3(-30 * cosA, 0, -30 * sinA),
        new BABYLON.Vector3(-140, -30, 35),   // Extremo IZQUIERDO (-140)
        new BABYLON.Vector3(140, 75, 130)     // Extremo DERECHO (+140)
    );
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.85);
    starSystem.color2 = new BABYLON.Color4(0.7, 0.85, 1, 0.85);
    starSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0);

    // Estrellas pequeñitas en reposo
    starSystem.minSize = 0.12;
    starSystem.maxSize = 0.35;
    starSystem.minLifeTime = 3.5;
    starSystem.maxLifeTime = 7.0;
    starSystem.emitRate = 500;
    starSystem.renderingGroupId = 0; // En la capa de fondo
    starSystem.start();

    // --- INTERFAZ Y TELEMETRÍA WARP ---
    let isWarping = false;
    let warpProgress = 0.0; // En reposo: 0.0 (plana y blanca)
    let warpFactor = 1.0;

    const btnWarp = document.getElementById("btn-warp");
    const telemetry = document.getElementById("telemetry");
    telemetry.innerText = "SISTEMA WARP: EN ESPERA (VELOCIDAD SUB-LUZ) • ESPACIO EUCLÍDEO PLANO";

    btnWarp.addEventListener("click", () => {
        if (!isWarping) {
            isWarping = true;
            telemetry.innerText = "SISTEMA WARP: CURVATURA EN PROCESO • EXPANDIENDO ESPACIO POPA / COMPRIMIENDO PROA";
            btnWarp.innerText = "DESACTIVAR SALTO WARP";
            btnWarp.classList.add("danger");
        } else {
            isWarping = false;
            telemetry.innerText = "SISTEMA WARP: DESACTIVANDO • DISIPACIÓN GRADUAL DE LA CURVATURA MÉTRICA";
            btnWarp.innerText = "ACTIVAR SALTO WARP";
            btnWarp.classList.remove("danger");
        }
    });

    const baseX = shipRoot.position.x;
    const baseY = shipRoot.position.y;
    const baseZ = shipRoot.position.z;

    let animTime = 0;

    scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime();
        animTime += dt * 0.001;

        if (isWarping) {
            // Activación a ritmo pausado (a la mitad de rapidez, majestuoso como al bajar)
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 1.0, 0.010);
            warpFactor = 1.0 + warpProgress * 8.9;
            if (warpProgress > 0.95) {
                telemetry.innerText = `SISTEMA WARP: FACTOR ${warpFactor.toFixed(1)} • DEFORMACIÓN ESPACIO-TIEMPO AL MÁXIMO`;
            }
        } else {
            // Desactivación pausada (baja la cresta y el pozo suavemente)
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 0.0, 0.008);
            warpFactor = 1.0 + warpProgress * 8.9;
            if (warpProgress < 0.008) {
                warpProgress = 0.0;
                if (!telemetry.innerText.includes("EN ESPERA")) {
                    telemetry.innerText = "SISTEMA WARP: EN ESPERA (VELOCIDAD SUB-LUZ) • ESPACIO EUCLÍDEO PLANO";
                }
            }
        }

        // Ondulación métrica activa únicamente durante el salto warp
        const currentAmp = warpProgress + (isWarping && warpProgress > 0.4 ? Math.sin(animTime * 3.0) * 0.025 : 0);
        const updated = buildGridLines(currentAmp);

        BABYLON.MeshBuilder.CreateLineSystem("spacetime", {
            lines: updated.lines,
            colors: updated.colors,
            instance: spacetimeLines
        }, scene);

        // Actualizar la malla oscura subyacente para ocluir con precisión física el fondo
        const darkPos = darkGround.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let idx = 0; idx < darkPos.length; idx += 3) {
            const vx = darkPos[idx];
            const vz = darkPos[idx + 2];
            const pt = getSpacetimeData(vx, vz, currentAmp);
            darkPos[idx + 1] = pt.y - 0.06; // Ligeramente por debajo de las líneas para evitar z-fighting
        }
        darkGround.updateVerticesData(BABYLON.VertexBuffer.PositionKind, darkPos);

        // Dinámica de estrellas:
        // En reposo son muy lentas (0.002) y pequeñas (0.12 a 0.35)
        // En warp se aceleran (hasta 0.035) y crecen levemente
        if (starSystem) {
            starSystem.updateSpeed = 0.002 + warpProgress * 0.032;
            starSystem.minSize = 0.12 + warpProgress * 0.10;
            starSystem.maxSize = 0.35 + warpProgress * 0.25;
        }

        // Microvibración del casco de la nave solo durante el salto warp
        const vib = isWarping ? (0.04 + 0.18 * warpProgress) : 0.0;
        if (vib > 0) {
            shipRoot.position.x = baseX + (Math.random() - 0.5) * vib;
            shipRoot.position.y = baseY + (Math.random() - 0.5) * vib;
            shipRoot.position.z = baseZ + (Math.random() - 0.5) * vib;
        } else {
            shipRoot.position.x = baseX;
            shipRoot.position.y = baseY;
            shipRoot.position.z = baseZ;
        }
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
