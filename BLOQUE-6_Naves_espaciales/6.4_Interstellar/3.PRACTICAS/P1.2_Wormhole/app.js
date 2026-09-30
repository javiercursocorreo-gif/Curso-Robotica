const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let scene;
let camera;
let shipMesh;
let isAnimating = false;
let animationRatio = 0; // 0 to 1

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1.0); // Espacio oscuro

    // Cámara arcRotate para poder explorar la topología
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 1500, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    // Limitar la cámara para que no se acerque demasiado
    camera.lowerRadiusLimit = 200;
    camera.upperRadiusLimit = 3000;

    // Iluminación
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5;

    // --- MATERIAL DE LA REJILLA (ESPACIO-TIEMPO) ---
    // Usamos el GridMaterial de BabylonJS para simular la malla gravitatoria
    const gridMat = new BABYLON.GridMaterial("gridMat", scene);
    gridMat.majorUnitFrequency = 5;
    gridMat.minorUnitVisibility = 0.45;
    gridMat.gridRatio = 15; // Tamaño de cada cuadro de la malla
    gridMat.backFaceCulling = false; // Queremos ver el interior de la malla
    gridMat.mainColor = new BABYLON.Color3(0, 0, 0); // Fondo negro (espacio)
    gridMat.lineColor = new BABYLON.Color3(0.2, 0.6, 1.0); // Líneas azules
    gridMat.opacity = 1.0;
    // Efecto brillante
    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.0;

    // --- GEOMETRÍA DEL AGUJERO DE GUSANO (FUNNEL/THROAT) ---
    const R_throat = 40; // Radio del cuello
    const H = 300;       // Altura de los planos (superior e inferior)
    const R_max = 2000;  // Radio inmenso de los universos planos para que no parezca que cae al vacío
    const a = (R_max - R_throat) / (H * H);

    const profile = [];
    // Calculamos el perfil parabólico desde arriba (H) hasta abajo (-H)
    for (let y = H; y >= -H; y -= 5) {
        let r = R_throat + a * y * y;
        profile.push(new BABYLON.Vector3(r, y, 0));
    }

    // Revolucionamos el perfil para crear la garganta
    const wormhole = BABYLON.MeshBuilder.CreateLathe("wormhole", {
        shape: profile,
        tessellation: 64, // Más resolución para la cuadrícula
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    wormhole.material = gridMat;

    // --- LUCES Y PARTÍCULAS DEL AGUJERO ---
    // Luz amarilla arriba (entrada)
    const topLight = new BABYLON.PointLight("topLight", new BABYLON.Vector3(0, H, 0), scene);
    topLight.diffuse = new BABYLON.Color3(1, 0.8, 0.2); // Amarillo
    topLight.intensity = 2.0;

    // Luz azul abajo (salida)
    const bottomLight = new BABYLON.PointLight("bottomLight", new BABYLON.Vector3(0, -H, 0), scene);
    bottomLight.diffuse = new BABYLON.Color3(0.2, 0.5, 1); // Azul
    bottomLight.intensity = 2.0;

    // --- ESTRELLAS (FONDO) ---
    const stars = new BABYLON.ParticleSystem("stars", 5000, scene);
    stars.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
    // IMPORTANTE: Anclamos el emisor de estrellas a la cámara para que el universo siempre tenga estrellas a nuestro alrededor
    stars.emitter = camera;
    stars.minEmitBox = new BABYLON.Vector3(-4000, -4000, -4000);
    stars.maxEmitBox = new BABYLON.Vector3(4000, 4000, 4000);
    stars.color1 = new BABYLON.Color4(1, 1, 1, 1);
    stars.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
    stars.minSize = 2;
    stars.maxSize = 5;
    stars.minLifeTime = 999999;
    stars.maxLifeTime = 999999;
    stars.emitRate = 5000;
    stars.updateSpeed = 0; // Estrellas estáticas
    stars.start();

    // --- CARGA DE LA NAVE (ENDURANCE) ---
    BABYLON.SceneLoader.ImportMeshAsync("", "interstellar__endurance_high_fidelity/", "scene.gltf", scene).then((result) => {
        shipMesh = result.meshes[0];
        
        // Ajustar escala y rotación de la nave
        // Dependiendo del modelo, quizás tengamos que escalar
        shipMesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); 
        
        // Posición inicial: Lejos en el plano superior
        shipMesh.position = new BABYLON.Vector3(R_max, H + 20, 0);
        
        // Hacer que la nave apunte hacia el centro (0, H+20, 0)
        shipMesh.lookAt(new BABYLON.Vector3(0, H + 20, 0));
        // Ajustar la rotación base si el modelo está girado 90 grados
        // shipMesh.rotation.y += Math.PI / 2; // Descomentar si la nave viaja de lado

        // Eliminar boton oculto
        document.getElementById("startButton").addEventListener("click", () => {
            document.getElementById("startButton").classList.add("hidden");
            startCinematic();
        });
    });

    // --- CINEMÁTICA ---
    // Trayectoria del atajo ajustada a la nueva inmensidad del mapa
    const pathPoints = [
        new BABYLON.Vector3(R_max - 200, H + 40, 0),       // Inicio (lejos en el universo superior)
        new BABYLON.Vector3(R_throat + 200, H + 40, 0),    // Acercándose a la boca
        new BABYLON.Vector3(20, H/2, 0),                   // Entrando al túnel
        new BABYLON.Vector3(0, 0, 0),                      // Centro exacto (Garganta)
        new BABYLON.Vector3(-20, -H/2, 0),                 // Saliendo del túnel
        new BABYLON.Vector3(-R_throat - 200, -H - 40, 0),  // Curvando hacia el universo inferior
        new BABYLON.Vector3(-R_max + 200, -H - 40, 0)      // Navegando por el universo inferior
    ];

    // Curva cúbica Bezier interpolada para movimiento suave
    const bezierCurve = BABYLON.Curve3.CreateCatmullRomSpline(pathPoints, 100);
    const flightPath = bezierCurve.getPoints();

    function startCinematic() {
        isAnimating = true;
        animationRatio = 0;
        
        // Configurar la cámara para que siga a la nave de cerca
        camera.lockedTarget = shipMesh;
        camera.radius = 150;
        camera.alpha = Math.PI / 4;
        camera.beta = Math.PI / 3;
    }

    // Animación en el bucle
    scene.onBeforeRenderObservable.add(() => {
        if (isAnimating && shipMesh) {
            // Avanzar en la trayectoria
            const speed = 0.002; // Velocidad del viaje
            animationRatio += speed;

            if (animationRatio >= 1.0) {
                isAnimating = false;
                // Soltar la cámara suavemente
                camera.lockedTarget = null;
                
                // Reiniciar todo para poder volver a viajar
                document.getElementById("startButton").classList.remove("hidden");
                // Volver la cámara a la posición de observación inicial
                camera.position = new BABYLON.Vector3(0, 800, 1500);
                camera.setTarget(new BABYLON.Vector3(0, 0, 0));
                
                return;
            }

            // --- CINEMATOGRAFÍA DE CÁMARA DINÁMICA ---
            // Para evitar que la cámara atraviese el plano (el "plano blanco"), hacemos que:
            // - Si la nave está arriba, la cámara la mira desde arriba (beta menor a PI/2)
            // - Si la nave está abajo, la cámara la mira desde abajo (beta mayor a PI/2)
            let targetBeta = Math.PI / 2; // Horizontal por defecto en el centro
            if (shipMesh.position.y > 50) {
                targetBeta = Math.PI / 2.5; // Ángulo en picado
            } else if (shipMesh.position.y < -50) {
                targetBeta = Math.PI - (Math.PI / 2.5); // Ángulo contrapicado
            }
            // Transición extremadamente suave de la cámara
            camera.beta += (targetBeta - camera.beta) * 0.02;

            // Calcular posición actual basada en el porcentaje (0 a 1)
            const index = Math.floor(animationRatio * (flightPath.length - 1));
            const nextIndex = Math.min(index + 1, flightPath.length - 1);
            
            // Interpolación entre los dos puntos más cercanos de la curva
            const remainder = (animationRatio * (flightPath.length - 1)) - index;
            const currentPos = BABYLON.Vector3.Lerp(flightPath[index], flightPath[nextIndex], remainder);
            
            // Actualizar posición
            shipMesh.position = currentPos;

            // Hacer que mire hacia el siguiente punto de la ruta
            if (index < flightPath.length - 2) {
                // Mirar ligeramente hacia el futuro para suavidad
                shipMesh.lookAt(flightPath[Math.min(index + 5, flightPath.length - 1)]);
                // El modelo original puede estar rotado 180º o 90º. Si viaja "de lado" o "hacia atrás", 
                // ajustamos. Por defecto probamos con +Math.PI para alinear el morro.
                shipMesh.rotation.y += Math.PI; 
            }
            
            // Animación de rotación icónica de la Endurance (Gravedad artificial)
            // Asumiendo que su eje Z local es el centro del anillo. 
            // Esto dependerá mucho de cómo esté construido el GLTF, podemos ajustarlo luego.
            shipMesh.rotate(BABYLON.Axis.Z, 0.02, BABYLON.Space.LOCAL);
        }
    });

    return scene;
};

scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
