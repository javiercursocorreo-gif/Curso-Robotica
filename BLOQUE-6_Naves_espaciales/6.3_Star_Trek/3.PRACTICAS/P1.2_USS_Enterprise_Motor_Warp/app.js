window.addEventListener("error", function (e) {
    const errorMsg = document.createElement("div");
    errorMsg.style.position = "absolute";
    errorMsg.style.top = "10px";
    errorMsg.style.left = "10px";
    errorMsg.style.color = "red";
    errorMsg.style.backgroundColor = "black";
    errorMsg.style.zIndex = "10000";
    errorMsg.style.fontSize = "20px";
    errorMsg.style.padding = "10px";
    errorMsg.innerHTML = "ERROR CRÍTICO: " + e.message + "<br>En línea: " + e.lineno;
    document.body.appendChild(errorMsg);
});

window.addEventListener("unhandledrejection", function (e) {
    const errorMsg = document.createElement("div");
    errorMsg.style.position = "absolute";
    errorMsg.style.top = "80px";
    errorMsg.style.left = "10px";
    errorMsg.style.color = "orange";
    errorMsg.style.backgroundColor = "black";
    errorMsg.style.zIndex = "10000";
    errorMsg.style.fontSize = "20px";
    errorMsg.style.padding = "10px";
    errorMsg.innerHTML = "PROMISE ERROR: " + e.reason;
    document.body.appendChild(errorMsg);
});

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA (VISTA DE COSTADO ISOMÉTRICA) ---
    // Nos ponemos de lado y un poco desde arriba para ver la ola 3D perfecta
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(-80, 40, -80), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    // --- LUCES ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.5;

    // Luz exclusiva para la cuadrícula para no "quemar" (saturar a blanco/amarillo) los colores
    const gridLight = new BABYLON.HemisphericLight("gridLight", new BABYLON.Vector3(0, 1, 0), scene);
    gridLight.intensity = 1.0; 

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE USS ENTERPRISE ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    
    // Elevamos la nave para que no se incruste en la ola (clipping)
    shipRoot.position = new BABYLON.Vector3(0, 15, 0);
    // Alineación totalmente recta
    shipRoot.rotation = new BABYLON.Vector3(0, 0, 0);

    try {
        const modelUrl = "../../../../MODELOS/STAR%20TRECK/tyr_class_space_control_ship_v2/";
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            modelUrl,
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];
        model.setParent(shipRoot);
        shipRoot.scaling = new BABYLON.Vector3(0.04, 0.04, 0.04); 
    } catch (e) {
        console.warn("Cargando modelo alternativo para Motor Warp...", e);
        try {
            const result2 = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "../P1.4_Star_Trek_Intro/uss_intrepid_ncc_79520/",
                "scene.gltf",
                scene
            );
            const model2 = result2.meshes[0];
            model2.setParent(shipRoot);
            shipRoot.scaling = new BABYLON.Vector3(0.06, 0.06, 0.06);
        } catch (e2) {
            console.error("Error cargando naves para Warp:", e2);
        }
    }

    // --- FASE 2: MALLA DE ESPACIO-TIEMPO (ALCUBIERRE METRIC GRID) ---
    // Creamos un plano gigantesco subdividido para poder deformar sus vértices.
    const gridSubdivisions = 120;
    const gridSize = 1600;
    const cellSize = gridSize / gridSubdivisions; // 13.333
    
    const ground = BABYLON.MeshBuilder.CreateGround("spacetime", {
        width: gridSize, 
        height: gridSize, 
        subdivisions: gridSubdivisions, 
        updatable: true
    }, scene);
    
    // Evitamos que las luces de la nave iluminen la cuadrícula (para que no la vuelvan blanca/amarilla)
    ambientLight.excludedMeshes.push(ground);
    dirLight.excludedMeshes.push(ground);
    // Solo le afecta la luz pura (1.0)
    gridLight.includedOnlyMeshes.push(ground);
    
    // Hundimos la malla para que el pico más alto de la ola (la colina trasera)
    // quede por debajo de la nave y no la atraviese.
    ground.position.y = -35; 
    
    // Material tipo Wireframe holográfico
    const gridMat = new BABYLON.StandardMaterial("gridMat", scene);
    gridMat.wireframe = true;
    // Para que los colores de los vértices brillen por sí mismos:
    // 1. Usamos emissive blanco puro como base de luz.
    gridMat.emissiveColor = BABYLON.Color3.White(); 
    // 2. Extraemos el color de los vértices (se aplica al canal difuso).
    gridMat.useVertexColors = true; 
    // 3. ¡TRUCO CLAVE! Multiplicamos la luz blanca emisiva por el color difuso del vértice.
    gridMat.linkEmissiveWithDiffuse = true;
    
    ground.material = gridMat;
    
    // Inicializamos los colores por vértice para poder pintarlo de azul y naranja
    ground.hasVertexAlpha = true;
    const initialColors = new Float32Array(ground.getTotalVertices() * 4);
    for (let i = 0; i < initialColors.length; i += 4) {
        initialColors[i] = 0.2;   // R
        initialColors[i+1] = 0.2; // G
        initialColors[i+2] = 0.3; // B
        initialColors[i+3] = 0.3; // Alpha (tenue)
    }
    ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, initialColors, true);
    
    let gridOffsetZ = 0;

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.1, height: 0.1, depth: 0.5});
    SPS.addShape(starShape, 3000);
    starShape.dispose();
    const starsMesh = SPS.buildMesh();
    
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starMat.disableLighting = true;
    starsMesh.material = starMat;

    SPS.initParticles = function() {
        for (let p = 0; p < SPS.nbParticles; p++) {
            const particle = SPS.particles[p];
            particle.position.x = (Math.random() - 0.5) * 400;
            // Las movemos a la parte superior (zona negra) para no manchar la cuadrícula de abajo
            particle.position.y = 20 + Math.random() * 300; 
            particle.position.z = (Math.random() * 1000) - 100;
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    // --- LÓGICA DE SALTO WARP ---
    let isWarping = false;
    let warpProgress = 0;
    let baseStarSpeed = 0.5;

    const btnWarp = document.getElementById("btn-warp");
    const telemetry = document.getElementById("telemetry");

    btnWarp.addEventListener("click", () => {
        if (!isWarping) {
            isWarping = true;
            telemetry.innerText = "SISTEMA WARP: ACTIVADO - ACELERANDO";
            btnWarp.innerText = "SALIR DEL WARP";
            btnWarp.classList.add("danger");
        } else {
            isWarping = false;
            telemetry.innerText = "SISTEMA WARP: DESACTIVANDO - FRENANDO";
            btnWarp.innerText = "ACTIVAR SALTO WARP";
            btnWarp.classList.remove("danger");
        }
    });

    // POSICIÓN BASE PARA VIBRACIÓN
    const baseX = shipRoot.position.x;
    const baseY = shipRoot.position.y;

    scene.onBeforeRenderObservable.add(() => {
        let currentSpeed = baseStarSpeed;
        
        if (isWarping) {
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 1, 0.015);
            if (warpProgress > 0.95) {
                telemetry.innerText = "SISTEMA WARP: VELOCIDAD LUZ ALCANZADA";
            }
        } else {
            warpProgress = BABYLON.Scalar.Lerp(warpProgress, 0, 0.03); // Frenada más rápida
            if (warpProgress < 0.05 && telemetry.innerText.includes("FRENANDO")) {
                telemetry.innerText = "SISTEMA WARP: EN ESPERA";
            }
        }

        currentSpeed = baseStarSpeed + (warpProgress * 60);

        // ANIMACIÓN DE LA MALLA DE ESPACIO-TIEMPO
        // 1. Movemos la malla hacia atrás para simular velocidad.
        // Para evitar la ilusión óptica de que la malla "va y viene" a altas velocidades (Wagon-wheel effect),
        // limitamos drásticamente la velocidad visual de la cuadrícula a un 15% de la celda por fotograma.
        // Esto garantiza que el ojo humano siempre vea las líneas venir HACIA LA CÁMARA (-Z).
        let gridVisualSpeed = Math.min(currentSpeed, cellSize * 0.15);
        gridOffsetZ -= gridVisualSpeed;
        gridOffsetZ = gridOffsetZ % cellSize; 
        
        ground.position.z = gridOffsetZ;
        
        // 2. Deformamos matemáticamente los vértices basándonos en su posición MUNDIAL
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
                let zFront = 60; 
                let zBack = -50;
                let zSpread = 1500; 
                let xSpread = 4000; 
                
                let xFactor = Math.exp(-Math.pow(worldX, 2) / xSpread);
                
                frontInfluence = Math.exp(-Math.pow(worldZ - zFront, 2) / zSpread) * xFactor;
                let dip = frontInfluence * 40; // Profundidad
                
                backInfluence = Math.exp(-Math.pow(worldZ - zBack, 2) / zSpread) * xFactor;
                let hill = backInfluence * 45; // Altura
                
                Y = (hill - dip) * warpProgress; 
            }
            
            // Aplicar la deformación Y al vértice
            pos[i+1] = Y;
            
            // Colorear el vértice (Degradados puros basados en la influencia de la ola)
            let vIdx = (i / 3) * 4;
            let r = 0.3, g = 0.3, b = 0.3, a = 0.3; // Grid inactivo (gris tenue)
            
            // Si el vértice está siendo afectado por la contracción (Hueco delantero)
            if (frontInfluence > 0.01) {
                // Degradado Azul: El borde (baja influencia) es Cyan brillante, el fondo (alta influencia) es Azul profundo
                let intensity = Math.min(frontInfluence * warpProgress, 1.0);
                r = 0.0;
                g = BABYLON.Scalar.Lerp(1.0, 0.4, intensity); // De 1.0 (Cyan) a 0.4 (Azul)
                b = 1.0;
                a = BABYLON.Scalar.Lerp(0.3, 1.0, intensity);
            } 
            // Si el vértice está siendo afectado por la expansión (Colina trasera)
            else if (backInfluence > 0.01) {
                // Degradado Naranja puro: Sin rastro de blanco.
                let intensity = Math.min(backInfluence * warpProgress, 1.0);
                r = 1.0;
                g = BABYLON.Scalar.Lerp(0.6, 0.2, intensity); // De 0.6 (Naranja vibrante) a 0.2 (Naranja rojizo)
                b = 0.0; // 0 absoluto de azul, para que no se vuelva blanco
                a = BABYLON.Scalar.Lerp(0.3, 1.0, intensity);
            }
            
            col[vIdx] = r;
            col[vIdx+1] = g;
            col[vIdx+2] = b;
            col[vIdx+3] = a;
        }
        
        // Volcar las modificaciones a la tarjeta gráfica
        ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
        ground.updateVerticesData(BABYLON.VertexBuffer.ColorKind, col);

        // La vibración también depende de warpProgress
        shipRoot.position.x = baseX + (Math.random() - 0.5) * 0.4 * warpProgress;
        shipRoot.position.y = baseY + (Math.random() - 0.5) * 0.4 * warpProgress;
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
