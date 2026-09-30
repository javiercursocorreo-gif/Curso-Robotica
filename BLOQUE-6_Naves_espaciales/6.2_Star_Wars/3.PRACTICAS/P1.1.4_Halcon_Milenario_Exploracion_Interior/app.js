const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA LIBRE (FIRST PERSON) ---
    // La cámara permite mirar en 360 grados haciendo click y arrastrando el ratón
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -50), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    // Orientamos la cabeza inicialmente hacia el encuadre dorado de la P1.1.3
    camera.rotation.y = -2.0100;
    camera.attachControl(canvas, true);
    
    // Desactivamos las teclas de movimiento (WASD/Flechas) para que el usuario no pueda 
    // atravesar las paredes y perderse en el espacio, solo girar la cabeza.
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];

    // --- LUCES ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.5;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE HALCÓN MILENARIO ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    
    // Posición inicial: Arriba a la derecha, lejos
    let startPos = new BABYLON.Vector3(40, 30, 100);
    // Posición final: Abajo a la izquierda, pasando cerca de la cámara
    let endPos = new BABYLON.Vector3(-40, -20, -50);
    
    shipRoot.position = startPos.clone();
    
    // Rotación para que mire hacia donde va (hacia abajo a la izquierda) y veamos su lomo (desde arriba)
    shipRoot.rotation = new BABYLON.Vector3(0.2, -Math.PI / 4, Math.PI / 8);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_halcon_milenario/",
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];
        model.setParent(shipRoot);
        
        // Escala intermedia (0.1). Suficientemente pequeña para empezar lejos, 
        // pero lo bastante grande para que la cubierta llene tu visión al acercarse.
        shipRoot.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1); 

        // --- MEJORA DE CALIDAD VISUAL (Filtro Anisotrópico Avanzado y Super-Sampling) ---
        // Forzamos al motor a renderizar todo al doble de resolución (200%) para eliminar borrosidad
        engine.setHardwareScalingLevel(0.5); 

        // Iteramos directamente sobre las texturas (más fiable que sobre los materiales en modelos GLTF)
        scene.textures.forEach(texture => {
            if (texture.updateSamplingMode) {
                // 3 = TRILINEAR_SAMPLINGMODE (necesario para el filtro anisotrópico)
                texture.updateSamplingMode(3);
                texture.anisotropicFilteringLevel = 16;
            }
        });

    } catch (e) {
        console.error("Error cargando el Halcón Milenario:", e);
    }

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    // TRUCO ÓPTICO: Hacemos los puntos mucho más GRANDES (0.5)
    // Así tu monitor es capaz de pintarlos aunque estén lejísimos, y el cielo parecerá lleno.
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.5, height: 0.5, depth: 0.5});
    // Límite de seguridad ampliado a 2000 estrellas.
    SPS.addShape(starShape, 2000);
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
            particle.position.x = (Math.random() - 0.5) * 500;
            particle.position.y = (Math.random() - 0.5) * 500;
            particle.position.z = Math.random() * 1200;
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    const btnWarp = document.getElementById("btn-warp");
    if(btnWarp) btnWarp.style.display = "none";
    const telemetry = document.getElementById("telemetry");
    if(telemetry) telemetry.style.display = "none";
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    // --- ANIMACIÓN DE INSPECCIÓN MACRO ---
    const shipPivot = new BABYLON.TransformNode("shipPivot", scene);
    
    // Recuperamos la ruta de Vuelo Rasante (Versión 22) que funcionaba perfecta.
    // Usamos estas coordenadas (70, 35, 80) para que la cámara no la recorte (clipping).
    // Como ahora la velocidad es mucho menor, dará la sensación de venir desde lejos sin romperse.
    startPos = new BABYLON.Vector3(70, 35, 80); 
    // Z=-73 y Y=-12 está calculado al milímetro para que pase rozando.
    endPos = new BABYLON.Vector3(-12, -12, -73); 

    // El pivote sigue la ruta perfectamente
    shipPivot.position = startPos;
    shipPivot.lookAt(endPos);

    shipRoot.setParent(shipPivot);
    
    // FIJAMOS el progreso en 0.85 exactos, que es el momento perfecto donde la cámara está dentro de los motores.
    let progress = 0.85; 

    scene.onBeforeRenderObservable.add(() => {
        
        // La nave se queda totalmente estática en la Z perfecta
        shipPivot.position = BABYLON.Vector3.Lerp(startPos, endPos, progress);
        
        // Desplazamiento Y calibrado: ajustado a -10.93 a petición del usuario
        shipPivot.position.y += -10.93;

        // --- ANIMACIÓN CINEMÁTICA ESTÁTICA ---
        let currentRoll = 0; 
        let currentPitch = Math.PI / 12; // Inclinación inicial del morro
        let maxRoll = Math.PI / 2.5; 

        if (progress <= 0.05) {
            // 0. Inicio: Morro inclinado, sin alabeo (Corrige el bug del pequeño salto)
            currentRoll = 0;
            currentPitch = Math.PI / 12;
        } else if (progress > 0.05 && progress <= 0.25) {
            // 1. Alabea para enseñar la cubierta
            let t = (progress - 0.05) / 0.20;
            let ease = t * t * (3 - 2 * t); 
            currentRoll = ease * maxRoll;
        } else if (progress > 0.25 && progress <= 0.60) {
            // 2. Mantiene la pose espectacular
            currentRoll = maxRoll; 
        } else if (progress > 0.60 && progress <= 0.85) {
            // 3. Se endereza (se pone plana) para el vuelo rasante
            let t = (progress - 0.60) / 0.25;
            let ease = t * t * (3 - 2 * t);
            currentRoll = maxRoll * (1 - ease);
            currentPitch = (Math.PI / 12) * (1 - ease);
        } else {
            // 4. Vuelo rasante (totalmente horizontal por debajo de la cámara)
            currentRoll = 0;
            currentPitch = 0;
        }

        // Aplicamos la rotación (necesario para anular el offset de inicialización y mantener el ángulo bugueado)
        shipRoot.rotation = BABYLON.Vector3.Zero();
        shipRoot.rotate(BABYLON.Axis.X, currentPitch, BABYLON.Space.LOCAL); 
        shipRoot.rotate(BABYLON.Axis.Z, currentRoll, BABYLON.Space.LOCAL);  

        // En el modo de Exploración Libre, la cámara está controlada por el ratón del usuario.
        // Aplicamos límites para que no pueda mirar más a la izquierda del "encuadre dorado" (-2.0100)
        // ni más a la derecha del límite seguro (-0.0624).
        if (camera.rotation.y < -2.0100) {
            camera.rotation.y = -2.0100;
        } else if (camera.rotation.y > -0.0624) {
            camera.rotation.y = -0.0624;
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
