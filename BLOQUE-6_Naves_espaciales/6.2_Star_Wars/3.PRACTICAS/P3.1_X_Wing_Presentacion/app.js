const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA ESTÁTICA CINEMATOGRÁFICA ---
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -50), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.detachControl();

    // --- LUCES ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.5;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE X-WING ---
    // El pivote se mueve por la ruta. El shipRoot aplica las rotaciones cinemáticas.
    const pivotNode = new BABYLON.TransformNode("pivotNode", scene);
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    shipRoot.setParent(pivotNode);

    // Variables para la ruta
    let path3d;
    let isModelLoaded = false;

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_x_wing_fighter/",
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];
        
        // 1. DETENER ANIMACIONES INTEGRADAS (Esto causaba el vuelo errante/pendular)
        if (result.animationGroups && result.animationGroups.length > 0) {
            result.animationGroups.forEach(ag => ag.stop());
        }

        // 2. CENTRAR EL PIVOTE MANUALMENTE
        // Calculamos el centro real de toda la geometría de la nave
        let boundingInfo = model.getHierarchyBoundingVectors();
        let center = boundingInfo.max.add(boundingInfo.min).scale(0.5);
        let size = boundingInfo.max.subtract(boundingInfo.min);
        let maxDimension = Math.max(size.x, size.y, size.z);
        
        // La escalamos uniformemente
        let scaleFactor = 1 / maxDimension;
        model.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
        
        // VOLVEMOS A LA ORIENTACIÓN ORIGINAL QUE FUNCIONABA EN LA v18
        // El morro estaba bien, el problema era que el alabeo giraba hacia el lado equivocado.
        model.setParent(shipRoot);
        
        if (model.rotationQuaternion) {
            model.rotationQuaternion = null;
        }
        
        // Simplemente lo giramos para que mire hacia el frente (+Z)
        model.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);

        // Escala majestuosa
        shipRoot.scaling = new BABYLON.Vector3(100, 100, 100); 
        isModelLoaded = true;

    } catch (e) {
        console.error("Error cargando el X-Wing:", e);
    }

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    // TRUCO ÓPTICO: Hacemos los puntos mucho más GRANDES (0.5)
    // Así tu monitor es capaz de pintarlos aunque estén lejísimos, y el cielo parecerá lleno.
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.5, height: 0.5, depth: 0.5});
    // Aumentamos a 8000 para que se vea muy lleno
    SPS.addShape(starShape, 8000);
    starShape.dispose();
    const starsMesh = SPS.buildMesh();
    
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starMat.disableLighting = true;
    starsMesh.material = starMat;

    // --- ESTRELLAS ESTÁTICAS DE FONDO ---
    SPS.initParticles = function() {
        for (let p = 0; p < SPS.nbParticles; p++) {
            const particle = SPS.particles[p];
            // Expandimos enormemente los límites para que llenen los laterales
            particle.position.x = (Math.random() - 0.5) * 2000;
            particle.position.y = (Math.random() - 0.5) * 1500;
            particle.position.z = -100 + Math.random() * 2000;
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    // Eliminar la UI de botones Warp para la presentación
    const btnWarp = document.getElementById("btn-warp");
    if(btnWarp) btnWarp.style.display = "none";
    const telemetry = document.getElementById("telemetry");
    if(telemetry) {
        telemetry.style.display = "block"; // Lo mostramos para ver posibles errores o telemetría
        telemetry.innerText = "SISTEMAS ONLINE";
    }
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    // --- TRAYECTORIA 3D (Línea Recta - Estilo Halcón) ---
    // Origen: Cuadrante Derecho, abajo (Empezando más a la derecha)
    let startPos = new BABYLON.Vector3(160, -30, 200); 
    // Destino: Cuadrante Superior Izquierdo (Misma trayectoria pero bajando la cota de altura)
    let endPos = new BABYLON.Vector3(-60, 10, -40); 

    // El pivote sigue la ruta en línea recta
    pivotNode.position = startPos;
    pivotNode.lookAt(endPos);

    let progress = 0.0; 
    let baseSpeed = 0.00066; // Velocidad reducida aprox un 33% (antes 0.001)

    scene.onBeforeRenderObservable.add(() => {
        if (!isModelLoaded) return;

        try {
            // --- CONTROL DE VELOCIDAD DINÁMICA ---
            let currentSpeed = baseSpeed;
            if (progress < 0.33) {
                currentSpeed = baseSpeed * 2.2; 
            } else if (progress < 0.50) {
                let t = (progress - 0.33) / 0.17;
                currentSpeed = baseSpeed * 2.2 * (1 - t) + baseSpeed * t;
            } else if (progress < 0.75) {
                let t = (progress - 0.50) / 0.25;
                currentSpeed = baseSpeed * (1 - t) + (baseSpeed * 0.15) * t; 
            } else {
                currentSpeed = baseSpeed * 0.15;
            }

            progress += currentSpeed;
            if (progress > 1) {
                progress = 0; // Se repite en bucle infinito
            }

            // 1. Mover el PIVOTE en línea recta exacta
            pivotNode.position = BABYLON.Vector3.Lerp(startPos, endPos, progress);
            
            // 2. ANIMACIÓN CINEMÁTICA (Aplicada al ACTOR/shipRoot) igual que el Halcón
            let currentRoll = 0; 
            let currentPitch = Math.PI / 12; // Morro levemente inclinado
            // Alabeo invertido a petición del usuario
            let maxRoll = Math.PI / 2.5; 

            if (progress <= 0.05) {
                currentRoll = 0;
                currentPitch = Math.PI / 12;
            } else if (progress > 0.05 && progress <= 0.25) {
                let t = (progress - 0.05) / 0.20;
                let ease = t * t * (3 - 2 * t); 
                currentRoll = ease * maxRoll;
            } else if (progress > 0.25 && progress <= 0.60) {
                currentRoll = maxRoll; 
            } else if (progress > 0.60 && progress <= 0.85) {
                let t = (progress - 0.60) / 0.25;
                let ease = t * t * (3 - 2 * t);
                currentRoll = maxRoll * (1 - ease);
                currentPitch = (Math.PI / 12) * (1 - ease);
            } else {
                currentRoll = 0;
                currentPitch = 0;
            }

            // 3. Aplicamos rotaciones estables locales al actor
            shipRoot.rotation = BABYLON.Vector3.Zero();
            shipRoot.rotate(BABYLON.Axis.X, currentPitch, BABYLON.Space.LOCAL);
            shipRoot.rotate(BABYLON.Axis.Z, currentRoll, BABYLON.Space.LOCAL);
            
        } catch (e) {
            let telemetry = document.getElementById("telemetry");
            if(telemetry) telemetry.innerText = "ERROR: " + e.message;
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
