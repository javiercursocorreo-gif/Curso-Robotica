const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA ESTÁTICA ---
    // Cámara fija y bloqueada
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

    // --- NAVE HALCÓN MILENARIO ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_halcon_milenario/",
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];
        model.setParent(shipRoot);
        
        // --- CORRECCIÓN DE PIVOTE ---
        // Los modelos GLTF suelen tener el origen descentrado. Calculamos su centro geométrico real
        // y lo desplazamos para que rote perfectamente sobre su eje sin orbitar ni salirse de plano.
        const boundingInfo = model.getHierarchyBoundingVectors();
        const center = boundingInfo.max.add(boundingInfo.min).scale(0.5);
        model.position = center.scale(-1);
        
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

    // Eliminar la UI de botones Warp para la presentación
    const btnWarp = document.getElementById("btn-warp");
    if(btnWarp) btnWarp.style.display = "none";
    const telemetry = document.getElementById("telemetry");
    if(telemetry) telemetry.style.display = "none";
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    // --- ANIMACIÓN DE INSPECCIÓN MACRO ---
    const shipPivot = new BABYLON.TransformNode("shipPivot", scene);
    
    // Posicionamos la nave en Y=0 (ya que ahora el centro geométrico está perfectamente alineado).
    // La alejamos a Z=-20 para no nacer dentro de ella.
    shipPivot.position = new BABYLON.Vector3(0, 0, -20); 
    
    shipRoot.setParent(shipPivot);
    // Ya no aplicamos rotación estática aquí, lo haremos frame a frame en el bucle

    let progress = 0; 
    let rotationSpeed = 0.002; // Velocidad de rotación ultra lenta para el travelling
    let currentYaw = 0;

    scene.onBeforeRenderObservable.add(() => {
        // Incrementamos el giro lateral
        currentYaw += rotationSpeed; 
        
        // Reseteamos y aplicamos rotaciones locales en orden para evitar que se desplace (órbita)
        shipRoot.rotation = BABYLON.Vector3.Zero();
        // 1. Inclinamos el morro hacia ABAJO (pitch negativo en este sistema local) para ver la cubierta superior
        shipRoot.rotate(BABYLON.Axis.X, -Math.PI / 16, BABYLON.Space.LOCAL);
        // 2. Giramos la nave sobre sí misma como un tocadiscos
        shipRoot.rotate(BABYLON.Axis.Y, currentYaw, BABYLON.Space.LOCAL);
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
