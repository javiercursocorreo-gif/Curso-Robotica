const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Variables de física
let rocketNode = null;
let isEngineOn = false;
let altitude = 400; // Altura inicial en metros
let velocity = -30;  // Velocidad inicial (cayendo)
let gravity = -9.8;  // m/s^2
let thrust = 40.0;   // Aceleración MUY POTENTE (modo fácil)
let gameOver = false;
let lastTime = 0;

// Referencias a UI
const altVal = document.getElementById("alt-val");
const velVal = document.getElementById("vel-val");
const targetVal = document.getElementById("target-val");
const burnWarning = document.getElementById("burn-warning");
const gameOverPanel = document.getElementById("game-over-panel");
const endTitle = document.getElementById("end-title");
const endDesc = document.getElementById("end-desc");

// Escuchar teclado
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") isEngineOn = true;
});
window.addEventListener("keyup", (e) => {
    if (e.code === "Space") isEngineOn = false;
});

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.5, 0.7, 0.9, 1.0); // Cielo claro

    // Cámara (Sigue al cohete de perfil para ver bien la inclinación)
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2.5, 120, new BABYLON.Vector3(0, altitude, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 10;

    // Luces
    const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    light.position = new BABYLON.Vector3(20, 40, 20);
    light.intensity = 1.2;
    const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.6;

    // Barcaza Dron (Drone Ship) "Of Course I Still Love You"
    const droneShip = BABYLON.MeshBuilder.CreateBox("droneShip", {width: 60, depth: 100, height: 2}, scene);
    droneShip.position.y = -1; // Superficie en Y=0
    const shipMat = new BABYLON.StandardMaterial("shipMat", scene);
    shipMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/floor.png", scene);
    shipMat.diffuseTexture.uScale = 10;
    shipMat.diffuseTexture.vScale = 15;
    shipMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gris acero
    shipMat.specularColor = new BABYLON.Color3(1, 1, 1);
    droneShip.material = shipMat;

    // Pintar la 'X' de aterrizaje
    const xMat = new BABYLON.StandardMaterial("xMat", scene);
    xMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    xMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Brillo ligero

    const mark1 = BABYLON.MeshBuilder.CreatePlane("mark1", {width: 2, height: 30}, scene);
    mark1.rotation.x = Math.PI / 2;
    mark1.rotation.y = Math.PI / 4;
    mark1.position.y = 0.05; // Justo por encima de la barcaza
    mark1.material = xMat;

    const mark2 = BABYLON.MeshBuilder.CreatePlane("mark2", {width: 2, height: 30}, scene);
    mark2.rotation.x = Math.PI / 2;
    mark2.rotation.y = -Math.PI / 4;
    mark2.position.y = 0.05;
    mark2.material = xMat;

    // Círculo exterior de la X
    const ring = BABYLON.MeshBuilder.CreateTorus("ring", {diameter: 25, thickness: 1, tessellation: 64}, scene);
    ring.position.y = 0.05;
    ring.scaling.y = 0.1; // Aplastar el toroide para que sea plano
    ring.material = xMat;

    // Mar (Océano)
    const ocean = BABYLON.MeshBuilder.CreateGround("ocean", {width: 2000, height: 2000}, scene);
    ocean.position.y = -2;
    const oceanMat = new BABYLON.StandardMaterial("oceanMat", scene);
    oceanMat.diffuseColor = new BABYLON.Color3(0.0, 0.3, 0.6);
    ocean.material = oceanMat;

    // Partículas de fuego
    const fireParticles = new BABYLON.ParticleSystem("fire", 2000, scene);
    fireParticles.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
    fireParticles.emitter = new BABYLON.Vector3(0, 0, 0); 
    fireParticles.color1 = new BABYLON.Color4(1, 0.7, 0, 1.0);
    fireParticles.color2 = new BABYLON.Color4(1, 0.2, 0, 1.0);
    fireParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
    fireParticles.minSize = 3;
    fireParticles.maxSize = 10;
    fireParticles.minLifeTime = 0.1;
    fireParticles.maxLifeTime = 0.3;
    fireParticles.emitRate = 2000;
    fireParticles.direction1 = new BABYLON.Vector3(-1, -15, -1);
    fireParticles.direction2 = new BABYLON.Vector3(1, -15, 1);
    fireParticles.gravity = new BABYLON.Vector3(0, -5, 0);

    // Explosión (inicialmente apagada)
    const explosionParticles = new BABYLON.ParticleSystem("explosion", 5000, scene);
    explosionParticles.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
    explosionParticles.emitter = new BABYLON.Vector3(0, 0, 0);
    explosionParticles.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
    explosionParticles.color2 = new BABYLON.Color4(1, 0, 0, 1.0);
    explosionParticles.minSize = 5;
    explosionParticles.maxSize = 25;
    explosionParticles.minLifeTime = 0.5;
    explosionParticles.maxLifeTime = 1.5;
    explosionParticles.emitRate = 10000;
    explosionParticles.createSphereEmitter(5); // Explosión en esfera
    explosionParticles.targetStopDuration = 0.2; // Solo explota una vez

    // Cargar el Falcon 9
    BABYLON.SceneLoader.ImportMesh("", "../assets/falcon_rocket/", "scene.gltf", scene, function (meshes) {
        rocketNode = meshes[0];
        rocketNode.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); // Escalar un poco
        rocketNode.position.y = altitude;

        // Bucle de físicas personalizadas
        lastTime = performance.now();
        scene.onBeforeRenderObservable.add(() => {
            if (gameOver || !rocketNode) return;

            let now = performance.now();
            let dt = (now - lastTime) / 1000.0; // Segundos transcurridos
            lastTime = now;
            
            // Límite de dt para evitar saltos si la pestaña pierde el foco
            if (dt > 0.1) dt = 0.1;

            // Calcular aceleración
            let currentAcceleration = gravity;
            if (isEngineOn) {
                currentAcceleration += thrust;
                fireParticles.start();
                
                // --- COMPUTADORA DE VUELO (Auto-Throttle) ---
                // Si el motor intenta lanzar la nave hacia arriba (velocidad > 0), limitamos la velocidad 
                // para que se quede flotando suavemente en el aire.
                if (velocity >= -0.5) {
                    currentAcceleration = 0; // Dejamos de acelerar hacia arriba
                    velocity = -0.5; // Descenso muy lento controlado
                }
            } else {
                fireParticles.stop();
            }

            // Integración de Euler (Física de bachillerato)
            velocity += currentAcceleration * dt;
            altitude += velocity * dt;

            // --- TRAYECTORIA Y CORRECCIÓN AUTOMÁTICA (DOG-LEG) ---
            const targetGroundLevel = 1.5;
            // factor 1 a más de 400m, factor 0 al tocar la barcaza (corrección suave durante toda la caída)
            let steerFactor = Math.max(0, Math.min(1, (altitude - targetGroundLevel) / 400.0));
            // Suavizado (smoothstep)
            let ease = steerFactor * steerFactor * (3 - 2 * steerFactor);
            
            // El cohete viene desde -150m en el eje X, con una inclinación brutal de 45 grados
            let currentX = -150 * ease;
            let currentTilt = (Math.PI / 4) * ease; // 45 grados

            // Actualizar modelo
            rocketNode.position.y = altitude;
            rocketNode.position.x = currentX;
            rocketNode.rotation.z = currentTilt;
            
            // Actualizar fuego de los motores
            fireParticles.emitter = new BABYLON.Vector3(currentX, altitude, 0); 
            // Invertir la dirección de las partículas según la inclinación para que el fuego salga recto respecto al motor
            fireParticles.direction1 = new BABYLON.Vector3(-1 + currentTilt*10, -15, -1);
            fireParticles.direction2 = new BABYLON.Vector3(1 + currentTilt*10, -15, 1);

            // La cámara sigue al cohete en altura, pero solo al 50% en X para notar el movimiento lateral
            camera.target.y = altitude + 10;
            camera.target.x = currentX * 0.5;

            // --- ASISTENTE DE NAVEGACIÓN (SUICIDE BURN) ---
            const netUpwardAcceleration = thrust + gravity; // 40 - 9.8 = 30.2
            let targetBurnAltitude = 0;
            if (velocity < 0) {
                targetBurnAltitude = (velocity * velocity) / (2 * netUpwardAcceleration) + targetGroundLevel;
            }
            if (targetVal) {
                targetVal.innerText = targetBurnAltitude.toFixed(1);
            }

            // Damos 80 metros de margen de aviso para que el tiempo de reacción humano sea suficiente
            if (burnWarning) {
                if (altitude <= targetBurnAltitude + 80 && altitude > targetBurnAltitude - 20 && velocity < -5 && !isEngineOn) {
                    burnWarning.classList.remove("hidden");
                } else {
                    burnWarning.classList.add("hidden");
                }
            }

            // Actualizar UI
            altVal.innerText = Math.max(0, altitude).toFixed(1);
            velVal.innerText = velocity.toFixed(1);
            
            if (velocity < -15) {
                velVal.className = "danger";
            } else {
                velVal.className = "safe";
            }

            // Detectar aterrizaje o impacto
            const groundLevel = 1.5; // Ajuste para que las patas toquen la X exactamente
            
            if (altitude <= groundLevel) {
                altitude = groundLevel;
                rocketNode.position.y = altitude;
                fireParticles.stop();
                gameOver = true;
                
                gameOverPanel.classList.remove("hidden");

                if (velocity < -20.0) { // Tolerancia mucho más permisiva (20 m/s)
                    // IMPACTO
                    endTitle.innerText = "¡IMPACTO CRÍTICO!";
                    endTitle.style.color = "#ff0000";
                    endDesc.innerText = `Chocaste contra la barcaza a ${Math.abs(velocity).toFixed(1)} m/s.`;
                    
                    explosionParticles.emitter = new BABYLON.Vector3(rocketNode.position.x, groundLevel, 0);
                    explosionParticles.start();
                    rocketNode.setEnabled(false); // Desaparece el cohete en la explosión
                } else {
                    // ATERRIZAJE CON ÉXITO
                    endTitle.innerText = "ATERRIZAJE PERFECTO";
                    endTitle.style.color = "#00ff00";
                    endDesc.innerText = `El Falcon 9 ha aterrizado suavemente a ${Math.abs(velocity).toFixed(1)} m/s. ¡Misión cumplida!`;
                    velVal.innerText = "0.0";
                }
            }
        });
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
