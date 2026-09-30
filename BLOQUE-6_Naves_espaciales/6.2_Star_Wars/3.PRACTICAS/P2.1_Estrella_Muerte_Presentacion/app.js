const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA (APROXIMACIÓN DESDE LEJOS) ---
    // Empezamos a Z = -1000 para verla minúscula
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -1000), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    // --- LUCES ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.5;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- ESTRELLA DE LA MUERTE ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    
    // Posición central e imponente
    shipRoot.position = new BABYLON.Vector3(0, 0, 0);
    shipRoot.rotation = new BABYLON.Vector3(0, 0, 0);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_estrella_muerte/",
            "scene.gltf",
            scene
        );

        // Detener cualquier animación que el artista 3D haya guardado en el archivo
        if (result.animationGroups) {
            result.animationGroups.forEach(ag => {
                ag.stop();
                ag.reset(); // Forzar al fotograma 0 original
            });
        }

        const model = result.meshes[0];
        
        // NORMALIZACIÓN: Forzamos que el modelo mida exactamente 1 unidad
        model.normalizeToUnitCube(); 
        
        // CENTRADO EXACTO: Buscamos el centro real de la malla principal
        let mainMesh = null;
        let maxVerts = 0;
        result.meshes.forEach(m => {
            let verts = m.getTotalVertices();
            if (verts > maxVerts) {
                maxVerts = verts;
                mainMesh = m;
            }
        });

        if (mainMesh) {
            mainMesh.computeWorldMatrix(true);
            let center = mainMesh.getBoundingInfo().boundingBox.centerWorld;
            model.position.subtractInPlace(center); // Clavamos el centro en (0,0,0)
        }
        
        model.setParent(shipRoot);
        
        // Al normalizar a 1, si le damos escala 200, sabemos que su radio exacto será 100.
        // Su superficie estará exactamente en Z = -100 (la parte frontal)
        shipRoot.scaling = new BABYLON.Vector3(200, 200, 200); 

    } catch (e) {
        console.error("Error cargando la Estrella de la Muerte:", e);
    }

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    // TRUCO ÓPTICO: Hacemos los puntos mucho más GRANDES (0.5)
    // Así tu monitor es capaz de pintarlos aunque estén lejísimos, y el cielo parecerá lleno.
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.5, height: 0.5, depth: 0.5});
    // Aumentamos a 5000 estrellas para compensar que ahora las vamos a esparcir mucho más
    SPS.addShape(starShape, 5000);
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
            // Distribuimos las estrellas en una caja MUCHO más ancha (4000x4000)
            particle.position.x = (Math.random() - 0.5) * 4000;
            particle.position.y = (Math.random() - 0.5) * 4000;
            // Como la cámara ahora puede ir hasta Z = -1000, llenamos de estrellas desde -1500 hasta +1500
            particle.position.z = (Math.random() - 0.5) * 3000;
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    // Ocultamos el cartel de carga (heredado de otra práctica)
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    // --- CONTROLES MANUALES (SLIDERS) ---
    const zoomSlider = document.getElementById("zoom-slider");
    const rotSlider = document.getElementById("rot-slider");

    if (zoomSlider && rotSlider) {
        // Al mover el slider de Zoom, actualizamos la cámara Z
        zoomSlider.addEventListener("input", (e) => {
            camera.position.z = parseFloat(e.target.value);
        });

        // Al mover el slider de Rotación, giramos la Estrella de la Muerte
        rotSlider.addEventListener("input", (e) => {
            // Convertimos grados (0 a 360) a radianes
            let grados = parseFloat(e.target.value);
            shipRoot.rotation.y = grados * (Math.PI / 180);
        });
    }

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
