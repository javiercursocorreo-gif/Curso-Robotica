const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1); // Fondo oscuro elegante

    // Cámara orbital para poder ver la nave desde cualquier ángulo
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;

    // Iluminación de estudio
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.8;

    // Brillo para los neones
    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.0;

    try {
        // Cargar el modelo
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "", 
            "../../BLOQUE-5_Androides/MODELOS/", 
            "futuristic_transport_shuttle_animated.glb", 
            scene
        );

        // Guardamos las animaciones
        window.shipAnimations = result.animationGroups;
        
        // Detenerlas al principio
        window.shipAnimations.forEach(a => {
            a.stop();
            a.loopAnimation = true; // Para que el despegue/aterrizaje se repita en bucle en el visor
        });

        // Hacemos que la cámara mire al centro de la nave y ajustamos escala
        const root = result.meshes[0];
        root.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);

        // Ocultar base si la hay
        result.meshes.forEach(m => {
            const name = m.name.toLowerCase();
            if (name.includes("base") || name.includes("plane") || name.includes("shadow") || name.includes("grid")) {
                m.isVisible = false;
            }
        });

    } catch (e) {
        console.error("Error cargando la nave en el showroom:", e);
    }

    // Eventos UI
    document.getElementById("btn-play").addEventListener("click", () => {
        if(window.shipAnimations && window.shipAnimations.length > 0) {
            window.shipAnimations[0].play(true);
        }
    });

    document.getElementById("btn-pause").addEventListener("click", () => {
        if(window.shipAnimations && window.shipAnimations.length > 0) {
            window.shipAnimations[0].pause();
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
