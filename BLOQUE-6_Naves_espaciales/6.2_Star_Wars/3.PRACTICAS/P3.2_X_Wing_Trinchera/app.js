const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA ESTÁTICA ---
    // Volvemos a la cámara fija mirando hacia adelante
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -50), scene);
    
    // --- ILUMINACIÓN ---
    // Luz ambiental (vital para rellenar las sombras, especialmente en el material PBR de la nave)
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6; 
    
    // Luz direccional dura (Sol lejano) para crear contraste en los bloques
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.8, -1, 0.5), scene);
    dirLight.intensity = 1.2;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE X-WING ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    
    // Posición inicial: Primerísimo primer plano del culo de la nave (cockpit view garantizado)
    shipRoot.position = new BABYLON.Vector3(0, -2, -35); // Cámara en -50. Distancia = 15.
    shipRoot.rotation = new BABYLON.Vector3(0, 0, 0);
    
    // Nodo intermedio para corregir la orientación sin afectar al pivote
    const alignNode = new BABYLON.TransformNode("alignNode", scene);
    alignNode.parent = shipRoot;
    alignNode.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);

    // Nodos emisores de láser anclados a alignNode (Teniendo en cuenta que está girado -90º en Y)
    // El eje X local es ahora el "frente" de la nave, y el eje Z local es la "anchura" de las alas.
    const cannonL = new BABYLON.TransformNode("cannonL", scene);
    cannonL.parent = alignNode;
    cannonL.position = new BABYLON.Vector3(0.2, 0.02, -0.4); 
    
    const cannonR = new BABYLON.TransformNode("cannonR", scene);
    cannonR.parent = alignNode;
    cannonR.position = new BABYLON.Vector3(0.2, 0.02, 0.4);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_x_wing_fighter/",
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];
        
        // 1. IGNORAR COORDENADAS GLOBALES ORIGINALES (Usamos parent directo, NO setParent)
        model.parent = alignNode;
        
        // 2. RESETEAR ROTACIÓN NATIVA
        if (model.rotationQuaternion) {
            model.rotationQuaternion = null;
        }
        model.rotation = BABYLON.Vector3.Zero();
        
        // 3. CALCULAR CAJA Y CENTRAR (SOLO GEOMETRÍA REAL)
        // Aislamos el modelo en el origen para medirlo sin distorsiones
        model.parent = null;
        model.position = BABYLON.Vector3.Zero();
        model.scaling = BABYLON.Vector3.One();
        model.computeWorldMatrix(true);
        
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        
        model.getChildMeshes().forEach(m => {
            // Ignoramos nodos vacíos (cámaras, luces, pivotes fantasmas de Sketchfab) que desplazan el centro
            if (m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const b = m.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
            }
        });
        
        const center = max.add(min).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // 4. ESCALAR A 1x1x1 Y CENTRAR PIVOTE EN LOCAL
        const scaleFactor = 1 / maxDimension;
        model.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
        model.position = center.scale(-scaleFactor);
        
        // EMPARENTAR FINALMENTE
        model.parent = alignNode;
        
        // 5. ESCALA FINAL DEL NODO PADRE
        shipRoot.scaling = new BABYLON.Vector3(20, 20, 20); // 20 unidades, ocupará gran parte de la pantalla

    } catch (e) {
        console.error("Error cargando el X-Wing:", e);
    }

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const starSPS = new BABYLON.SolidParticleSystem("starSPS", scene);
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {size: 0.8});
    starSPS.addShape(starShape, 800); 
    starShape.dispose(); // Limpiamos la malla base
    
    const starsMesh = starSPS.buildMesh();
    
    // Material luminoso para estrellas
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starsMesh.material = starMat;
    starMat.disableLighting = true;

    // --- ESTRELLAS ESTÁTICAS DE FONDO ---
    starSPS.initParticles = function() {
        for (let p = 0; p < starSPS.nbParticles; p++) {
            const particle = starSPS.particles[p];
            // Estrellas restringidas al cielo (Y > 40) y siempre por delante de los edificios de fondo (Z < 700)
            particle.position.x = (Math.random() - 0.5) * 1000; 
            particle.position.y = 40 + Math.random() * 400; 
            particle.position.z = Math.random() * 700; 
        }
    };
    starSPS.initParticles();
    starSPS.setParticles();

    // --- TRINCHERA PROCEDURAL Y SUELO IRREGULAR (SPS) ---
    const trenchSPS = new BABYLON.SolidParticleSystem("trenchSPS", scene);
    const blockShape = BABYLON.MeshBuilder.CreateBox("block", {width: 10, height: 20, depth: 10});
    trenchSPS.addShape(blockShape, 400); // 400 bloques (200 para muros, 200 para suelo irregular)
    blockShape.dispose();
    const trenchMesh = trenchSPS.buildMesh();
    
    const blockMat = new BABYLON.StandardMaterial("blockMat", scene);
    blockMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gris medio (más claro)
    blockMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    trenchMesh.material = blockMat;

    // --- EDIFICIOS DE FONDO (Bloquean el horizonte del espacio) ---
    // Muro base brutalista
    const baseWall = BABYLON.MeshBuilder.CreateBox("baseWall", {width: 500, height: 80, depth: 40}, scene);
    baseWall.position = new BABYLON.Vector3(0, 20, 750);
    
    // Torres asimétricas tipo Estrella de la Muerte
    const tower1 = BABYLON.MeshBuilder.CreateBox("tower1", {width: 40, height: 180, depth: 40}, scene);
    tower1.position = new BABYLON.Vector3(-100, 80, 760);
    
    const tower2 = BABYLON.MeshBuilder.CreateBox("tower2", {width: 60, height: 120, depth: 40}, scene);
    tower2.position = new BABYLON.Vector3(80, 50, 740);

    const tower3 = BABYLON.MeshBuilder.CreateBox("tower3", {width: 25, height: 250, depth: 40}, scene);
    tower3.position = new BABYLON.Vector3(20, 100, 780);
    
    const horizonMat = new BABYLON.StandardMaterial("horizonMat", scene);
    horizonMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.25); // Más oscuro que el gris normal para simular distancia
    horizonMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    baseWall.material = horizonMat;
    tower1.material = horizonMat;
    tower2.material = horizonMat;
    tower3.material = horizonMat;

    trenchSPS.initParticles = function() {
        for (let p = 0; p < trenchSPS.nbParticles; p++) {
            const particle = trenchSPS.particles[p];
            
            if (p < 200) {
                // MUROS LATERALES
                let side = p % 2 === 0 ? -1 : 1;
                // Distribuimos los bloques a diferentes profundidades (X) para que no sea una pared lisa
                particle.position.x = side * (45 + Math.random() * 35); 
                particle.position.y = -10 + Math.random() * 15; 
                particle.position.z = Math.random() * 800; 
                
                // Variación extrema de formas para hacer la pared mucho más caótica y detallada
                particle.scale.x = 0.5 + Math.random() * 4; // Algunos muy anchos
                particle.scale.y = 0.5 + Math.random() * 5; // Algunos muy altos
                particle.scale.z = 0.5 + Math.random() * 4; // Algunos muy profundos
            } else {
                // SUELO IRREGULAR (Greebles)
                particle.position.x = (Math.random() - 0.5) * 85; // Repartidos por todo el ancho de la trinchera
                particle.position.y = -12; // Anclados al suelo base
                particle.position.z = Math.random() * 800;
                
                // Cajas más aplastadas y aleatorias
                particle.scale.x = 0.5 + Math.random() * 1.5;
                particle.scale.y = 0.1 + Math.random() * 0.4; // Altura pequeña
                particle.scale.z = 0.5 + Math.random() * 1.5;
            }
        }
    };
    trenchSPS.initParticles();
    trenchSPS.setParticles();

    // --- SUELO DE LA TRINCHERA ---
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 150, height: 1000}, scene);
    ground.position.y = -12;
    ground.position.z = 400; // Centrado en la trinchera
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;

    // Eliminar la UI de botones Warp
    const btnWarp = document.getElementById("btn-warp");
    if(btnWarp) btnWarp.style.display = "none";
    const telemetry = document.getElementById("telemetry");
    if(telemetry) telemetry.innerText = "FLECHAS O BOTONES: ALABEO | ESPACIO: DISPARAR";
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    // --- CONTROLES DE ALABEO (ROLL) E INTERFAZ ---
    const keys = { left: false, right: false };

    // Botones UI Alabeo
    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");

    if (btnLeft) {
        btnLeft.addEventListener("mousedown", () => keys.left = true);
        btnLeft.addEventListener("mouseup", () => keys.left = false);
        btnLeft.addEventListener("mouseleave", () => keys.left = false);
        btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys.left = true; }, {passive: false});
        btnLeft.addEventListener("touchend", () => keys.left = false);
    }
    
    if (btnRight) {
        btnRight.addEventListener("mousedown", () => keys.right = true);
        btnRight.addEventListener("mouseup", () => keys.right = false);
        btnRight.addEventListener("mouseleave", () => keys.right = false);
        btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys.right = true; }, {passive: false});
        btnRight.addEventListener("touchend", () => keys.right = false);
    }

    // --- SISTEMA DE DISPARO (LÁSERES) ---
    const lasers = [];
    
    const fireLaser = () => {
        // Crear dos cilindros finos (uno para cada ala)
        const laserL = BABYLON.MeshBuilder.CreateCylinder("laserL", {height: 8, diameter: 0.4}, scene);
        const laserR = BABYLON.MeshBuilder.CreateCylinder("laserR", {height: 8, diameter: 0.4}, scene);
        
        // Material emisivo VERDE (Petición del usuario)
        const laserMat = new BABYLON.StandardMaterial("laserMat", scene);
        laserMat.emissiveColor = new BABYLON.Color3(0.1, 1, 0.1); 
        laserMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        laserMat.disableLighting = true;
        
        laserL.material = laserMat;
        laserR.material = laserMat;
        
        // Tumbarlos para que apunten en Z
        laserL.rotation.x = Math.PI / 2;
        laserR.rotation.x = Math.PI / 2;
        
        // Instanciarlos exactamente en la posición absoluta de los cañones invisibles anclados a las alas
        laserL.position = cannonL.getAbsolutePosition().clone();
        laserR.position = cannonR.getAbsolutePosition().clone();
        
        // Ajustar el ángulo inicial por si la nave está alabeada (para que no salgan torcidos visualmente si quisieran)
        // Como son cilindros apuntando en Z, no hace falta.
        
        lasers.push(laserL, laserR);
    };

    const btnFire = document.getElementById("btn-fire");
    if (btnFire) {
        btnFire.addEventListener("mousedown", fireLaser);
        btnFire.addEventListener("touchstart", (e) => { e.preventDefault(); fireLaser(); }, {passive: false});
    }
    
    // --- Controles de Teclado (Súper redundantes para evitar fallos de focus) ---
    keys.space = false;

    const handleKeyDown = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
        if (e.key === " ") {
            if (!keys.space) {
                keys.space = true;
                fireLaser();
            }
        }
    };

    const handleKeyUp = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
        if (e.key === " ") keys.space = false;
    };

    // Captura global en la ventana
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    // Captura en el documento (por si está embebido)
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Captura nativa de BabylonJS (por si el canvas roba el focus exclusivo)
    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                handleKeyDown(kbInfo.event);
                break;
            case BABYLON.KeyboardEventTypes.KEYUP:
                handleKeyUp(kbInfo.event);
                break;
        }
    });

    // --- ANIMACIÓN DE TRINCHERA, NAVE Y LÁSERES ---
    let speed = 4; // Velocidad de avance por la trinchera
    let laserSpeed = 12; // Velocidad de los láseres hacia adelante

    let targetRoll = 0;

    scene.onBeforeRenderObservable.add(() => {
        // Calcular target basado en teclas activas (SOLO INCLINACIÓN, NO DESPLAZAMIENTO)
        if (keys.left) {
            targetRoll = Math.PI / 4;
        } else if (keys.right) {
            targetRoll = -Math.PI / 4;
        } else {
            targetRoll = 0;
        }

        // Mover estrellas (Efecto túnel espacial)
        starSPS.particles.forEach(p => {
            p.position.z -= (speed * 1.5);
            if (p.position.z < -50) {
                p.position.z = 700; // Renacen justo por delante del horizonte
                p.position.x = (Math.random() - 0.5) * 1000;
                p.position.y = 40 + Math.random() * 400; // Siempre en lo alto
            }
        });

        // Mover trinchera hacia la cámara
        trenchSPS.particles.forEach(p => {
            p.position.z -= speed;
            if (p.position.z < -20) {
                p.position.z = 800; // Resetear bloque al fondo
            }
        });
        trenchSPS.setParticles();
        starSPS.setParticles();

        // Mover láseres disparados
        for (let i = lasers.length - 1; i >= 0; i--) {
            const laser = lasers[i];
            laser.position.z += laserSpeed;
            
            // Destruir el láser si llega muy lejos (liberar memoria)
            if (laser.position.z > 600) {
                laser.dispose();
                lasers.splice(i, 1);
            }
        }

        // DESTRUIR EL CUATERNIÓN: BabylonJS a veces bloquea las rotaciones Euler (.rotation.z) si existe esto.
        shipRoot.rotationQuaternion = null;

        // Suavizar el alabeo de la nave (Lerp). SOLO ROTACIÓN, la nave no se mueve del sitio
        shipRoot.rotation.z = BABYLON.Scalar.Lerp(shipRoot.rotation.z, targetRoll, 0.1);
        
        // Pequeña vibración en Y (mantenemos la cota base en -2)
        shipRoot.position.y = -2 + (Math.sin(Date.now() / 100) * 0.2);
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
