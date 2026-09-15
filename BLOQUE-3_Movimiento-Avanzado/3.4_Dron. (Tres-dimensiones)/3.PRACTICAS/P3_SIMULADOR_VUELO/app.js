const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.4, 0.6, 0.9, 1.0); // Cielo azul claro

    // Habilitar físicas
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(gravityVector, physicsPlugin);

    // Cámara ajustada para ver el horizonte y el cielo
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.2, 12, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, false); // Falso para evitar conflictos con el teclado
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput"); // Desactivar el teclado de la cámara por completo
    
    // Luces
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;
    
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.5;
    
    // Controles Virtuales Variables Globales
    let joyX = 0, joyY = 0;
    let throttleVal = 0.5;

    // ======================================
    // CONTROL VIRTUAL (JOYSTICK Y SLIDER)
    // ======================================
    function initVirtualControls() {
        const jBg = document.getElementById('joystick-bg');
        const jKnob = document.getElementById('joystick-knob');
        const tBg = document.getElementById('throttle-bg');
        const tKnob = document.getElementById('throttle-knob');
        
        let isDraggingJoy = false;
        let isDraggingThr = false;

        // --- Joystick de Cabeceo y Alabeo ---
        const updateJoy = (e) => {
            if(!isDraggingJoy) return;
            const rect = jBg.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let x = clientX - (rect.left + rect.width/2);
            let y = clientY - (rect.top + rect.height/2);
            
            const radius = (rect.width/2) - 40; 
            const dist = Math.sqrt(x*x + y*y);
            if (dist > radius) { x = (x/dist)*radius; y = (y/dist)*radius; }
            
            jKnob.style.transform = `translate(${x}px, ${y}px)`;
            joyX = x / radius; 
            joyY = y / radius; 
        };

        const resetJoy = () => {
            isDraggingJoy = false;
            jKnob.style.transform = `translate(0px, 0px)`;
            joyX = 0; joyY = 0;
        };

        jBg.addEventListener('mousedown', (e) => { isDraggingJoy = true; jKnob.style.transition = 'none'; updateJoy(e); });
        jBg.addEventListener('touchstart', (e) => { isDraggingJoy = true; jKnob.style.transition = 'none'; updateJoy(e); }, {passive:false});
        window.addEventListener('mousemove', updateJoy);
        window.addEventListener('touchmove', (e)=>{if(isDraggingJoy)e.preventDefault(); updateJoy(e);}, {passive: false});
        window.addEventListener('mouseup', () => { if(isDraggingJoy) { jKnob.style.transition = 'transform 0.2s ease-out'; resetJoy(); }});
        window.addEventListener('touchend', () => { if(isDraggingJoy) { jKnob.style.transition = 'transform 0.2s ease-out'; resetJoy(); }});

        // Solo mantenemos el Joystick derecho para guiñada (yaw) si estuviera en móvil
        // (Aunque el usuario usa teclado y ratón)
    }

    initVirtualControls();

    // ======================================
    // ENTORNO Y PAISAJE (Estilo Clase 3.6)
    // ======================================
    scene.clearColor = new BABYLON.Color4(0.4, 0.7, 0.9, 1); // Cielo azul
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.002;
    scene.fogColor = scene.clearColor;

    // Suelo principal. Lo hacemos circular (Cylinder) en lugar de cuadrado.
    const ground = BABYLON.MeshBuilder.CreateCylinder("ground", {diameter: 2000, height: 100}, scene);
    ground.position.y = -50; // Superficie en 0, pero 100 metros de grosor para evitar atravesarlo a gran velocidad
    
    // Textura de tablero de ajedrez procedural para percibir la velocidad
    const gridTexture = new BABYLON.DynamicTexture("grid", 512, scene, false);
    const ctx = gridTexture.getContext();
    ctx.fillStyle = "#228B22"; // Verde césped
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#ffffff"; // Blanco
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillRect(256, 256, 256, 256);
    gridTexture.update();
    gridTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    gridTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    gridTexture.uScale = 200; 
    gridTexture.vScale = 200; 

    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = gridTexture;
    ground.material = groundMat;
    
    // Asignar físicas estáticas al suelo (restitution 0 para que no rebote)
    // Aunque sea un cilindro, BoxImpostor asegura unas colisiones planas perfectas en Cannon
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.0, friction: 0.8 }, scene);

    // Base de aterrizaje central (Helipuerto circular)
    const launchPad = BABYLON.MeshBuilder.CreateCylinder("launchPad", {diameter: 8, height: 4.02}, scene);
    launchPad.position.y = -2; // Asoma 2 centímetros por encima del césped para que destaque
    const padMat = new BABYLON.StandardMaterial("padMat", scene);
    padMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0); // Naranja chillón
    padMat.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0);
    launchPad.material = padMat;

    // Nubes en el cielo
    const cloudMat = new BABYLON.StandardMaterial("cloudMat", scene);
    cloudMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    cloudMat.disableLighting = true;
    cloudMat.alpha = 0.85;
    for(let i = 0; i < 40; i++) {
        const cloud = BABYLON.MeshBuilder.CreateSphere("cloud" + i, {diameter: 100 + Math.random() * 150, segments: 12}, scene);
        cloud.position = new BABYLON.Vector3((Math.random() - 0.5) * 1800, 150 + Math.random() * 80, (Math.random() - 0.5) * 1800);
        cloud.scaling.y = 0.25; // Aplastar la esfera para que parezca una nube
        cloud.material = cloudMat;
    }
    
    // Circuito de Aros de Neón
    const neonPink = new BABYLON.StandardMaterial("neonPink", scene);
    neonPink.emissiveColor = new BABYLON.Color3(1, 0.2, 0.8);
    neonPink.disableLighting = true;
    neonPink.alpha = 0.9;
    
    const neonGreen = new BABYLON.StandardMaterial("neonGreen", scene);
    neonGreen.emissiveColor = new BABYLON.Color3(0.2, 1, 0.2);
    neonGreen.disableLighting = true;
    neonGreen.alpha = 0.9;

    const hoops = [
        { pos: new BABYLON.Vector3(0, 10, 60), rot: new BABYLON.Vector3(Math.PI/2, 0, 0), mat: neonPink }, // 1. Tangente Norte
        { pos: new BABYLON.Vector3(60, 15, 120), rot: new BABYLON.Vector3(Math.PI/2, Math.PI/2, 0), mat: neonPink }, // 2. Tangente Este
        { pos: new BABYLON.Vector3(120, 20, 60), rot: new BABYLON.Vector3(Math.PI/2, Math.PI, 0), mat: neonPink }, // 3. Tangente Sur
        { pos: new BABYLON.Vector3(60, 10, 0), rot: new BABYLON.Vector3(Math.PI/2, -Math.PI/2, 0), mat: neonPink } // 4. Tangente Oeste
    ];

    hoops.forEach((h, i) => {
        let torus = BABYLON.MeshBuilder.CreateTorus("hoop" + i, {diameter: 25, thickness: 1.2, tessellation: 32}, scene);
        torus.position = h.pos;
        torus.rotation = h.rot;
        torus.material = h.mat;
    });
    
    // Montañas (Fondo verde para orientación)
    const mountainMat = new BABYLON.StandardMaterial("mountainMat", scene);
    mountainMat.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.1); // Verde oscuro
    mountainMat.specularColor = new BABYLON.Color3(0, 0, 0); // Sin brillo
    
    const snowMat = new BABYLON.StandardMaterial("snowMat", scene);
    snowMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Nieve blanca
    snowMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    
    for(let i = 0; i < 40; i++) {
        let h = 50 + Math.random() * 200; // Altura entre 50 y 250m
        let d = 150 + Math.random() * 300; // Base entre 150 y 450m
        const mountain = BABYLON.MeshBuilder.CreateCylinder("mountain" + i, {diameterTop: 0, diameterBottom: d, height: h, tessellation: 5}, scene);
        
        // Posicionarlas en un anillo lejano alrededor del centro
        let angle = Math.random() * Math.PI * 2;
        let radius = 300 + Math.random() * 700; // Entre 300 y 1000m del centro
        
        mountain.position.x = Math.cos(angle) * radius;
        mountain.position.z = Math.sin(angle) * radius;
        mountain.position.y = h / 2 - 2; // -2 para que nazcan a la altura del suelo
        mountain.material = mountainMat;
        // No añadimos físicas a las montañas lejanas para no sobrecargar el motor
        
        // Nieve en los picos altos
        if (h > 150) {
            let snowHeight = h * 0.25; 
            let snowBase = d * 0.26; // Un poco más ancho para evitar Z-fighting
            const snow = BABYLON.MeshBuilder.CreateCylinder("snow" + i, {diameterTop: 0, diameterBottom: snowBase, height: snowHeight, tessellation: 5}, scene);
            snow.position.x = mountain.position.x;
            snow.position.z = mountain.position.z;
            // Alinear la punta de la nieve con la punta de la montaña
            snow.position.y = mountain.position.y + (h / 2) - (snowHeight / 2) + 0.2; 
            snow.material = snowMat;
        }
    }
    // ======================================    // Variables de estado
    let enginesOn = false;
    let soundEnabled = true;
    let isLooping = false;
    let isRTH = false;
    let isDestroyed = false; // Estado de accidente fatal
    let cameraMode = 0; // 0: 3a Persona, 1: FPV, 2: Piloto
    let hoopStates = [false, false, false, false]; // Estado de los aros
    let isSmokeOn = false; // Estela acrobática
    let battery = 100.0; // Batería al 100%
    let totalDistance = 0.0; // Distancia total recorrida
    let lastPos = null; // Última posición registrada
    let isAutoPilot = false; // Modo Piloto Automático
    let autoPilotTarget = 0; // Siguiente aro
    let hitbox = null; // Declarado aquí para que todas las funciones tengan acceso
    let fpvCamera = null;
    let pilotCamera = null;
    let smokeSystem = null;
    let cyanMat = null;
    let cyanLight = null;
    let charredMat = null;
    let particleTexture = null;
    let cameraFlash = null;
    // Cargar sonido del dron usando Web Audio API (Bucle perfecto sin cortes)
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let droneBuffer = null;
    let droneSource = null;
    let droneGain = audioCtx.createGain();
    droneGain.connect(audioCtx.destination);
    droneGain.gain.value = 0; // Empieza silenciado

    // Convertir el Base64 de vuelta a ArrayBuffer y cargarlo
    fetch(typeof DRONE_AUDIO_B64 !== 'undefined' ? DRONE_AUDIO_B64 : "trimmed_drone.mp3")
        .then(response => response.arrayBuffer())
        .then(buffer => audioCtx.decodeAudioData(buffer))
        .then(decoded => {
            droneBuffer = decoded;
            // Arrancar el nodo en silencio continuo
            droneSource = audioCtx.createBufferSource();
            droneSource.buffer = droneBuffer;
            droneSource.loop = true;
            droneSource.connect(droneGain);
            droneSource.start();
        }).catch(e => console.error("Error cargando sonido del dron:", e));

    // Conectar el botón de sonido
    const btnSound = document.getElementById("btnSound");
    if (btnSound) {
        btnSound.addEventListener("click", () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                btnSound.style.backgroundColor = "#4444ff"; // Azul
                btnSound.style.color = "white";
                btnSound.innerText = "Desactivar Sonido (Mute)";
                if (enginesOn) fadeAudio(1.0, 500);
            } else {
                btnSound.style.backgroundColor = "#888888"; // Gris
                btnSound.style.color = "white";
                btnSound.innerText = "Activar Sonido";
                fadeAudio(0.0, 500);
            }
            document.body.focus();
        });
    }
    
    // Conectar el botón de reinicio
    const btnReset = document.getElementById("btnReset");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            location.reload();
        });
    }

    // Lógica para hacer Fade In (crescendo) y Fade Out (desvanecimiento) usando Web Audio API
    function fadeAudio(targetVolume, durationMs) {
        if (!soundEnabled && targetVolume > 0) return; // No subir si está muteado
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        let now = audioCtx.currentTime;
        droneGain.gain.cancelScheduledValues(now); // Cancelar fades anteriores
        droneGain.gain.setValueAtTime(droneGain.gain.value, now);
        droneGain.gain.linearRampToValueAtTime(targetVolume, now + (durationMs / 1000));
    }

    // Conectar el botón de la UI del motor
    const btnEngine = document.getElementById("btnEngine");
    function toggleEngine() {
        if (isDestroyed) return; // Si está estrellado, los motores no pueden arrancar
        
        enginesOn = !enginesOn;
        if (enginesOn) {
            btnEngine.style.backgroundColor = "#44ff44"; // Verde
            btnEngine.style.color = "black";
            btnEngine.innerText = "Apagar Motores (ESPACIO)";
            
            if (soundEnabled) {
                fadeAudio(1.0, 1000); // Crescendo en 1 segundo
            }
        } else {
            btnEngine.style.backgroundColor = "#ff4444"; // Rojo
            btnEngine.style.color = "white";
            btnEngine.innerText = "Arrancar Motores (ESPACIO)";
            
            fadeAudio(0.0, 1500); // Apagar bajando volumen en 1.5s
            
            // Cancelar RTH si se apaga en vuelo
            isRTH = false;
            const btnRTH = document.getElementById("btnRTH");
            if (btnRTH) {
                btnRTH.innerText = "Volver a Base (RTH - Tecla H)";
                btnRTH.style.backgroundColor = "#aa00ff";
            }
        }
        // Devolver el foco al cuerpo para que sigan funcionando las teclas
        document.body.focus();
    }
    if (btnEngine) {
        btnEngine.addEventListener("click", toggleEngine);
    }
    
    // Conectar botón de Loop (Acrobacia)
    const btnLoop = document.getElementById("btnLoop");
    function triggerLoop() {
        if (!enginesOn || isLooping || !hitbox || !hitbox.physicsImpostor) return; // Solo funciona en vuelo normal
        isLooping = true;
        
        // Salto vertical para tener espacio de maniobra
        hitbox.physicsImpostor.applyImpulse(BABYLON.Vector3.Up().scale(15), hitbox.getAbsolutePosition());
        
        // Mantener la rotación extrema durante medio segundo (suficiente para un 360)
        setTimeout(() => {
            isLooping = false;
        }, 500);
        document.body.focus();
    }
    if (btnLoop) {
        btnLoop.addEventListener("click", triggerLoop);
    }
    const btnRTH = document.getElementById("btnRTH");
    function triggerRTH() {
        if (!enginesOn || isDestroyed) return;
        isRTH = !isRTH;
        if (isRTH) {
            isAutoPilot = false;
            if (btnAutoPilot) {
                btnAutoPilot.style.backgroundColor = "#ffd700";
                btnAutoPilot.style.color = "black";
                btnAutoPilot.innerText = "Demo Automática Aros";
            }
            btnRTH.style.backgroundColor = "#ff0000";
            btnRTH.innerText = "Cancelar RTH";
        } else {
            btnRTH.style.backgroundColor = "#aa00ff";
            btnRTH.innerText = "Volver a Base (RTH - Tecla H)";
        }
    }
    if (btnRTH) btnRTH.addEventListener("click", triggerRTH);

    // Conectar botón Piloto Automático
    const btnAutoPilot = document.getElementById("btnAutoPilot");
    if (btnAutoPilot) {
        btnAutoPilot.addEventListener("click", () => {
            if (isDestroyed) return;
            
            // Si el motor está apagado, lo arrancamos automáticamente para la demo
            if (!enginesOn) {
                toggleEngine();
            }
            
            isAutoPilot = !isAutoPilot;
            if (isAutoPilot) {
                if (isRTH) triggerRTH(); // Cancelar RTH si estaba activo
                isAutoPilot = true; // Restaurar a true porque triggerRTH lo pone a false
                autoPilotTarget = 0; // Reiniciar ruta
                btnAutoPilot.style.backgroundColor = "#ff0000";
                btnAutoPilot.style.color = "white";
                btnAutoPilot.innerText = "CANCELAR DEMO AROS";
            } else {
                btnAutoPilot.style.backgroundColor = "#ffd700";
                btnAutoPilot.style.color = "black";
                btnAutoPilot.innerText = "Demo Automática Aros";
            }
        });
    }

    // Conectar botón FPV (ahora Selector de Cámara)
    const btnFPV = document.getElementById("btnFPV");
    function toggleCamera() {
        if (isDestroyed) return;
        cameraMode = (cameraMode + 1) % 3; // Ciclamos entre 0, 1 y 2
        
        // Centrar la cámara FPV siempre que cambiemos de modo por si el usuario estaba mirando a otro lado
        if (fpvCamera) {
            fpvCamera.rotation = BABYLON.Vector3.Zero();
        }
        
        if (cameraMode === 0) {
            scene.activeCamera = camera;
            if (btnFPV) btnFPV.innerText = "Cámara T. Persona (Tecla V)";
        } else if (cameraMode === 1) {
            scene.activeCamera = fpvCamera;
            if (btnFPV) btnFPV.innerText = "Cámara FPV (Tecla V)";
        } else if (cameraMode === 2) {
            scene.activeCamera = pilotCamera;
            if (btnFPV) btnFPV.innerText = "Cámara Piloto (Tecla V)";
        }
        document.body.focus();
    }
    if (btnFPV) {
        btnFPV.addEventListener("click", toggleCamera);
    }
    
    // Conectar botón Humo
    const btnSmoke = document.getElementById("btnSmoke");
    function toggleSmoke() {
        if (isDestroyed) return;
        isSmokeOn = !isSmokeOn;
        if (isSmokeOn) {
            if (smokeSystem) smokeSystem.start();
            if (btnSmoke) {
                btnSmoke.style.backgroundColor = "#ff00ff";
                btnSmoke.innerText = "Apagar Humo (Tecla T)";
            }
        } else {
            if (smokeSystem) smokeSystem.stop();
            if (btnSmoke) {
                btnSmoke.style.backgroundColor = "#555555";
                btnSmoke.innerText = "Estela de Humo (Tecla T)";
            }
        }
        document.body.focus();
    }
    if (btnSmoke) {
        btnSmoke.addEventListener("click", toggleSmoke);
    }
    
    // Conectar botón Foto
    const btnPhoto = document.getElementById("btnPhoto");
    function takePhoto() {
        if (isDestroyed || !cameraFlash) return;
        
        // Sonido sintético de cámara
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch(e) {}
        
        // Fogonazo de luz
        cameraFlash.intensity = 15;
        setTimeout(() => {
            if (cameraFlash) cameraFlash.intensity = 0;
        }, 150);
        document.body.focus();
    }
if (btnPhoto) {
        btnPhoto.addEventListener("click", takePhoto);
    }

    // Activar Controles por Teclado a nivel de Documento (prioridad absoluta)
    const keys = { w: false, s: false, a: false, d: false, up: false, down: false, left: false, right: false, q: false, e: false };

    document.addEventListener("keydown", (e) => {
        if (e.repeat) return; // IMPORTANTE: Evitar que mantener pulsada la tecla dispare eventos múltiples rápidamente (ej: ESPACIO)
        
        switch(e.key.toLowerCase()) {
            case "w": keys.w = true; break;
            case "s": keys.s = true; break;
            case "a": keys.a = true; break;
            case "d": keys.d = true; break;
            case "q": keys.q = true; break;
            case "e": keys.e = true; break;
            case "h": triggerRTH(); break;
            case "v": toggleCamera(); break;
            case "t": toggleSmoke(); break;
            case "arrowup": keys.up = true; break;
            case "arrowdown": keys.down = true; break;
            case "arrowleft": keys.left = true; break;
            case "arrowright": keys.right = true; break;
            case "+": 
            case "add":
                if (cameraMode === 0) camera.radius = Math.max(4, camera.radius - 1);
                break;
            case "-":
            case "subtract":
                if (cameraMode === 0) camera.radius = Math.min(30, camera.radius + 1);
                break;
            case " ": // ESPACIO
                e.preventDefault(); // Evitar que la página baje
                toggleEngine();
                break;
            case "l": // Tecla L para el Loop
                triggerLoop();
                break;
            case "c": // Tecla C para Foto
                takePhoto();
                break;
        }
    }, { capture: true });

    document.addEventListener("keyup", (e) => {
        switch(e.key.toLowerCase()) {
            case "w": keys.w = false; break;
            case "s": keys.s = false; break;
            case "a": keys.a = false; break;
            case "d": keys.d = false; break;
            case "q": keys.q = false; break;
            case "e": keys.e = false; break;
            case "arrowup": keys.up = false; break;
            case "arrowdown": keys.down = false; break;
            case "arrowleft": keys.left = false; break;
            case "arrowright": keys.right = false; break;
        }
    }, { capture: true });

    // Cargar el modelo GLB desde el String Base64 integrado (DRONE_B64)
    BABYLON.SceneLoader.ImportMesh("", "", DRONE_B64, scene, function (newMeshes) {
        const drone = newMeshes[0];

        // Ocultar las hélices base originales que causan solapamiento (Blender export bug) y aclarar chasis
        newMeshes.forEach(m => {
            if (m.name === "propeller" || m.name === "propeller.001" || m.name === "propeller.002") {
                m.isVisible = false; // Solo las ocultamos. Si las destruimos (dispose), desaparecen también las copias válidas.
            }
            if (m.material && m.material.albedoColor) {
                // Si el color base es un negro muy fuerte, lo subimos a un gris muy oscuro
                if (m.material.albedoColor.r < 0.1 && m.material.albedoColor.g < 0.1) {
                    m.material.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1); // Gris muy oscuro casi negro
                }
            }
        });
        
        // Ajustar escala (0.2 era pequeño, probamos 0.5)
        drone.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        
        // Crear un hitbox invisible para las físicas para que sea más estable
        hitbox = BABYLON.MeshBuilder.CreateBox("hitbox", {width: 2, height: 0.5, depth: 2}, scene);
        hitbox.position = new BABYLON.Vector3(0, 0.5, 0); // Empezar aparcado en el suelo
        hitbox.isVisible = false; // Ocultar hitbox completamente (sin ocultar a sus hijos)
        
        // Crear luz cian intermitente en la cabecera
        cyanLight = new BABYLON.PointLight("cyanLight", new BABYLON.Vector3(0, 0, 0), scene);
        cyanLight.diffuse = new BABYLON.Color3(0, 1, 1); // Cian
        cyanLight.specular = new BABYLON.Color3(0, 1, 1);
        cyanLight.intensity = 0; 
        
        // Material emisivo para el círculo/esfera de la cabecera
        cyanMat = new BABYLON.StandardMaterial("cyanMat", scene);
        cyanMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
        cyanMat.disableLighting = true; // Brilla con luz propia
        
        // Material emisivo rojo para la trasera
        let redMat = new BABYLON.StandardMaterial("redMat", scene);
        redMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        redMat.disableLighting = true; 
        
        let lightMesh = null;
        
        // Evaluar posiciones absolutas en el primer frame para asignar colores
        scene.onBeforeRenderObservable.addOnce(() => {
            let spheres = newMeshes.filter(m => m.name.toLowerCase().includes("circle") || m.name.toLowerCase().includes("sphere"));
            let invMatrix = hitbox.getWorldMatrix().clone().invert();
            spheres.forEach(m => {
                let localPos = BABYLON.Vector3.TransformCoordinates(m.getAbsolutePosition(), invMatrix);
                if (localPos.z > 0) { // Delante
                    m.material = cyanMat;
                    if (!lightMesh) lightMesh = m;
                } else { // Detrás
                    m.material = redMat;
                }
            });
            
            if (lightMesh) cyanLight.parent = lightMesh;
            else cyanLight.parent = hitbox;
        });
        
        // ==============================
        // SISTEMA DE EXPLOSIÓN Y FUEGO
        // ==============================
        charredMat = new BABYLON.StandardMaterial("charredMat", scene);
        charredMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Muy negro
        charredMat.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // Textura procedural para partículas (un círculo blanco)
        particleTexture = new BABYLON.DynamicTexture("pt", 64, scene);
        const pctx = particleTexture.getContext();
        pctx.beginPath();
        pctx.arc(32, 32, 30, 0, Math.PI * 2);
        pctx.fillStyle = "white";
        pctx.fill();
        particleTexture.update();
        
        // Estela de humo acrobático
        smokeSystem = new BABYLON.ParticleSystem("smoke", 2000, scene);
        smokeSystem.particleTexture = particleTexture;
        smokeSystem.emitter = hitbox; 
        smokeSystem.color1 = new BABYLON.Color4(1, 0.2, 1, 0.5); // Rosa/Magenta
        smokeSystem.color2 = new BABYLON.Color4(0.2, 1, 1, 0.5); // Cian
        smokeSystem.colorDead = new BABYLON.Color4(1, 1, 1, 0); // Desvanece a transparente
        smokeSystem.minSize = 0.5;
        smokeSystem.maxSize = 2.0;
        smokeSystem.minLifeTime = 1.0;
        smokeSystem.maxLifeTime = 3.0;
        smokeSystem.emitRate = 100;
        smokeSystem.createSphereEmitter(0.5);
        smokeSystem.minEmitPower = 0.5;
        smokeSystem.maxEmitPower = 1.0;
        smokeSystem.updateSpeed = 0.01;
        smokeSystem.gravity = new BABYLON.Vector3(0, -0.5, 0); // Cae un poco
        
        // Flash de cámara fotográfica
        cameraFlash = new BABYLON.PointLight("cameraFlash", new BABYLON.Vector3(0, -0.5, 0), scene);
        cameraFlash.diffuse = new BABYLON.Color3(1, 1, 1); // Blanco puro
        cameraFlash.specular = new BABYLON.Color3(1, 1, 1);
        cameraFlash.intensity = 0;
        cameraFlash.parent = hitbox; // Pegado al dron
        
        // Meter el modelo 3D dentro del hitbox
        drone.setParent(hitbox);
        drone.position = BABYLON.Vector3.Zero(); // Centrar en el hitbox
        drone.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL); // Rotar 180 grados de forma segura para que mire hacia adelante (alejándose de la cámara)
        
        // Asignar masa e inercia al hitbox (restitution 0 para aterrizajes secos)
        hitbox.physicsImpostor = new BABYLON.PhysicsImpostor(hitbox, BABYLON.PhysicsImpostor.BoxImpostor, { 
            mass: 1, 
            restitution: 0.0,
            friction: 0.8
        }, scene);
        
        // Hacer que sea estable al rotar
        hitbox.physicsImpostor.physicsBody.angularDamping = 0.95;
        // El Linear Damping se ajusta en el bucle de render (para caer a plomo si se apagan) 
        
        // La cámara principal sigue al dron
        camera.lockedTarget = hitbox;
        
        // Configurar Cámara FPV en el morro del dron
        fpvCamera = new BABYLON.FreeCamera("fpvCamera", new BABYLON.Vector3(0, 0.5, 1.2), scene);
        fpvCamera.fov = 1.2; // Gran angular para sensación de velocidad y mareo
        fpvCamera.parent = hitbox; // Anclada rígidamente al dron
        
        // Permitir que el usuario mire a su alrededor 360 grados usando el ratón en la pantalla
        fpvCamera.attachControl(canvas, true);
        fpvCamera.inputs.removeByType("FreeCameraKeyboardMoveInput"); // Eliminar movimiento WASD de la cámara, solo permitir ratón
        
        // Configurar Cámara Piloto desde tierra (mirando hacia arriba al dron)
        pilotCamera = new BABYLON.TargetCamera("pilotCamera", new BABYLON.Vector3(0, 2, 10), scene);
        pilotCamera.lockedTarget = hitbox; // Siempre enfocará al dron

        // Bucle de Física: Se ejecuta 60 veces por segundo
        scene.onBeforeRenderObservable.add(() => {
            
            // LUZ CIAN INTERMITENTE LENTA
            if (cyanMat && cyanLight) {
                // Función seno lenta: el divisor controla la lentitud (más grande = más lento)
                let blink = (Math.sin(Date.now() / 400) + 1) / 2; 
                cyanMat.alpha = blink; // Difumina el material
                if (!isDestroyed) cyanLight.intensity = blink * 1.5; // Aumenta/disminuye el brillo real en el suelo
            }
            
            // CONSUMO Y RECARGA DE BATERÍA
            if (enginesOn && !isDestroyed) {
                battery -= 0.015; // Consume batería (Aprox 1 minuto de autonomía)
                if (battery <= 0) battery = 0;
            } else if (!enginesOn && !isDestroyed && battery < 100) {
                battery += 0.2; // Recarga rápida cuando está apagado y a salvo
                if (battery > 100) battery = 100;
            }

            // Actualizar Interfaz de Batería
            const batBar = document.getElementById("batteryBar");
            const batText = document.getElementById("batteryText");
            const lowBatteryAlarm = document.getElementById("lowBatteryAlarm");
            if (batBar && batText) {
                batBar.style.width = battery + "%";
                
                if (battery > 50) batBar.style.backgroundColor = "#44ff44"; // Verde
                else if (battery > 25) batBar.style.backgroundColor = "#ffff44"; // Amarillo
                else batBar.style.backgroundColor = "#ff4444"; // Rojo
                
                if (!enginesOn && !isDestroyed && battery < 100) {
                    batText.innerText = "RECARGANDO... " + Math.floor(battery) + "%";
                    batText.style.color = "#00f2ff"; // Cian
                } else {
                    batText.innerText = Math.max(0, Math.floor(battery)) + "% BATERÍA";
                    // Parpadeo de emergencia si queda menos del 10%
                    if (battery <= 10 && Math.floor(Date.now() / 250) % 2 === 0 && enginesOn) {
                        batText.style.color = "red";
                    } else {
                        batText.style.color = "white";
                    }
                }
                
                // Mostrar alarma de retorno a base
                if (lowBatteryAlarm) {
                    if (battery <= 25 && enginesOn && !isRTH && !isDestroyed) {
                        lowBatteryAlarm.style.display = "block";
                    } else {
                        lowBatteryAlarm.style.display = "none";
                    }
                }
            }
            
            // Actualizar Altímetro y Odómetro
            const altText = document.getElementById("altimeterText");
            const distText = document.getElementById("distanceText");
            if (hitbox) {
                let currentPos = hitbox.getAbsolutePosition();
                
                if (altText) {
                    let alt = currentPos.y;
                    if (alt < 0) alt = 0; // Evitar mostrar números negativos si el anclaje baja de 0
                    altText.innerText = "ALT: " + alt.toFixed(1) + "m";
                }
                
                if (distText) {
                    if (lastPos && !isDestroyed && enginesOn) {
                        let stepDist = BABYLON.Vector3.Distance(currentPos, lastPos);
                        // Filtrar saltos gigantes por resets
                        if (stepDist < 10) totalDistance += stepDist; 
                    }
                    lastPos = currentPos.clone();
                    distText.innerText = "DIST: " + totalDistance.toFixed(1) + "m";
                }
            }
            
            // Apagado forzoso si la batería llega a 0
            if (battery === 0 && enginesOn) {
                toggleEngine();
            }
            
            // ROTAR HÉLICES SOLO SI EL MOTOR ESTÁ ENCENDIDO
            if (enginesOn && !isDestroyed) {
                // Hacer que el dron ascienda según las flechas
                if (!isRTH && !isAutoPilot) {
                    if (keys.up) {
                        hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(25), hitbox.getAbsolutePosition());
                    } else if (keys.down) {
                        // Descenso controlado constante (aterrizaje manual seguro)
                        let currentYVel = hitbox.physicsImpostor.getLinearVelocity().y;
                        
                        if (currentYVel < -2.5) {
                            // Freno potente para no exceder el límite de impacto fatal (-3.0)
                            hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(30), hitbox.getAbsolutePosition());
                        } else {
                            // Empuje hacia abajo para un descenso ágil y sin esperas
                            hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(-5), hitbox.getAbsolutePosition());
                        }
                    } else {
                        // Hover force (Contrarrestar gravedad 9.81 exactamente para que no suba solo)
                        hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(9.81), hitbox.getAbsolutePosition());
                    }
                }

                let pos = hitbox.getAbsolutePosition();
                
                // FÍSICAS DEL VIENTO (Desactivadas para mayor precisión al pasar por aros)
                // if (pos.y > 2.0 && !isRTH) {
                //     if (Math.random() < 0.02) { 
                //         targetWind.x = (Math.random() - 0.5) * 20;
                //         targetWind.z = (Math.random() - 0.5) * 20;
                //     }
                //     currentWind = BABYLON.Vector3.Lerp(currentWind, targetWind, 0.05);
                //     hitbox.physicsImpostor.applyForce(currentWind, pos);
                // }
                
                const propellers = scene.meshes.filter(m => m.name.toLowerCase().includes("propeller"));
                propellers.forEach(p => {
                    p.rotate(BABYLON.Axis.Z, 2.5, BABYLON.Space.LOCAL); // Rotación visual altísima para simular alta velocidad
                });
            }

            if (hitbox.physicsImpostor) {
                
                // Si el motor se apaga en pleno vuelo, quitamos la resistencia del aire (linearDamping a 0.01)
                // para que caiga a plomo como una piedra y se estrelle de verdad.
                // Si está encendido, un linearDamping alto (0.85) hace que frene rápido al soltar los mandos (como un dron real).
                // En modo RTH reducimos el rozamiento a 0.5 para que pueda coger mucha velocidad.
                hitbox.physicsImpostor.physicsBody.linearDamping = enginesOn ? (isRTH || isAutoPilot ? 0.5 : 0.85) : 0.01;
                
                // OBTENER DIRECCIONES LOCALES DEL DRON
                const transformMatrix = hitbox.computeWorldMatrix(true);
                const localUp = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Up(), transformMatrix);
                const localRight = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Right(), transformMatrix);
                const localForward = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Forward(), transformMatrix);

                // Silenciar teclado si está en modo RTH
                let currentKeys = (isRTH || isAutoPilot) ? { w: false, s: false, a: false, d: false, up: false, down: false, left: false, right: false } : keys;

                // ==============================
                // AUTO-HOVER Y ALTURA (FLECHAS)
                // ==============================
                hitbox.physicsImpostor.physicsBody.wakeUp(); // Forzar despertar a nivel interno de Cannon
                hitbox.physicsImpostor.wakeUp(); // Despertar a nivel de Babylon
                
                let rthPitch = 0; // Para inclinar el morro de forma autónoma
                let pos = hitbox.getAbsolutePosition();
                
                // Si el dron está destruido, no aplicamos estabilizador, se queda tirado
                if (isDestroyed) return;
                
                // ==============================
                // DETECCIÓN DE ACCIDENTE FATAL
                // ==============================
                // Se estrella si está volcado o retorcido (localUp.y < 0.5) O si cae violentamente (linVelCrash.y < -3.0)
                let linVelCrash = hitbox.physicsImpostor.getLinearVelocity();
                if (!isRTH && !isAutoPilot && pos.y < 1.0 && (localUp.y < 0.5 || linVelCrash.y < -3.0)) {
                    isDestroyed = true;
                    enginesOn = false;
                    fadeAudio(0.0, 100);
                    
                    // Detener físicas en seco para evitar rebotes erráticos o atravesar el suelo
                    hitbox.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
                    hitbox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
                    hitbox.position.y = 0.5; // Asegurar que se quede a ras de suelo
                    
                    // Volver a cámara en tercera persona si estaba en otra para ver la explosión
                    if (cameraMode !== 0) {
                        cameraMode = 0;
                        scene.activeCamera = camera;
                        if (btnFPV) btnFPV.innerText = "Cámara T. Persona (Tecla V)";
                    }
                    if (isSmokeOn) toggleSmoke(); // Apagar estela si estaba encendida
                    
                    // Efectos visuales de destrucción en la UI
                    if (btnEngine) {
                        btnEngine.style.backgroundColor = "#000000";
                        btnEngine.style.color = "#ff0000";
                        btnEngine.innerText = "DRON DESTRUIDO (F5 para reiniciar)";
                    }
                    if (btnRTH) btnRTH.style.display = "none";
                    if (btnLoop) btnLoop.style.display = "none";
                    if (btnFPV) btnFPV.style.display = "none";
                    if (btnSmoke) btnSmoke.style.display = "none";
                    if (btnPhoto) btnPhoto.style.display = "none";
                    if (btnSound) btnSound.style.display = "none";
                    
                    // Apagar la luz cian para simular pérdida de batería
                    if (cyanMat) cyanMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    if (cyanLight) cyanLight.intensity = 0;
                    
                    // Efecto de Dron Calcinado
                    if (drone) {
                        drone.getChildMeshes().forEach(m => {
                            m.material = charredMat;
                        });
                    }
                    
                    // EXPLOSIÓN FATAL DE SANGRE Y FUEGO
                    if (particleTexture) {
                        // 1. Explosión violenta de una vez ("Sangre" y chatarra)
                        const explosion = new BABYLON.ParticleSystem("explosion", 2000, scene);
                        explosion.particleTexture = particleTexture;
                        explosion.emitter = hitbox;
                        explosion.color1 = new BABYLON.Color4(1, 0, 0, 1); // Rojo sangre
                        explosion.color2 = new BABYLON.Color4(1, 0.3, 0, 1); // Fuego
                        explosion.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
                        explosion.minSize = 0.2;
                        explosion.maxSize = 0.8;
                        explosion.minLifeTime = 0.3;
                        explosion.maxLifeTime = 1.0;
                        explosion.emitRate = 2000;
                        explosion.createSphereEmitter(1.5);
                        explosion.minEmitPower = 5;
                        explosion.maxEmitPower = 20; // Sale disparado
                        explosion.gravity = new BABYLON.Vector3(0, -9.81, 0);
                        explosion.targetStopDuration = 0.3; // Dura poco
                        explosion.disposeOnStop = true;
                        explosion.start();
                        
                        // 2. Fuego residual continuo
                        const fire = new BABYLON.ParticleSystem("fire", 500, scene);
                        fire.particleTexture = particleTexture;
                        fire.emitter = hitbox;
                        fire.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
                        fire.color2 = new BABYLON.Color4(1, 0.1, 0, 1);
                        fire.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                        fire.minSize = 0.2;
                        fire.maxSize = 1.5;
                        fire.minLifeTime = 0.5;
                        fire.maxLifeTime = 1.5;
                        fire.emitRate = 80;
                        fire.createSphereEmitter(0.5);
                        fire.minEmitPower = 1;
                        fire.maxEmitPower = 4;
                        fire.gravity = new BABYLON.Vector3(0, 2, 0); // Fuego sube
                        fire.start();
                        
                        // 3. Masacre de Sangre (A petición del usuario)
                        const blood = new BABYLON.ParticleSystem("blood", 3000, scene);
                        blood.particleTexture = particleTexture;
                        blood.emitter = hitbox;
                        blood.color1 = new BABYLON.Color4(0.8, 0, 0, 1); // Rojo oscuro
                        blood.color2 = new BABYLON.Color4(1, 0, 0, 1); // Rojo brillante
                        blood.colorDead = new BABYLON.Color4(0.3, 0, 0, 0); // Seca y desaparece
                        blood.minSize = 0.5;
                        blood.maxSize = 2.0;
                        blood.minLifeTime = 1.0;
                        blood.maxLifeTime = 3.0;
                        blood.emitRate = 3000;
                        blood.createSphereEmitter(2.0); // Rango enorme
                        blood.minEmitPower = 10;
                        blood.maxEmitPower = 35; // Expulsada con violencia
                        blood.gravity = new BABYLON.Vector3(0, -20, 0); // Gravedad extrema para que caiga y manche el suelo
                        blood.targetStopDuration = 0.5; // Corto pero intenso
                        blood.disposeOnStop = true;
                        blood.start();
                    }
                    
                    return; // Fin de físicas activas
                }
                
                if (enginesOn) {
                    
                    // RTH (Return To Home) Automático
                    if (isRTH) {
                        let distanceToHome = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                        
                        if (distanceToHome > 1.0) { 
                            // 1. Encarar la cabeza hacia el origen (0,0)
                            // En Babylon, Math.atan2 con (X, Z) da el ángulo de Yaw
                            let targetAngle = Math.atan2(-pos.x, -pos.z);
                            let currentRotation = hitbox.rotationQuaternion ? hitbox.rotationQuaternion.toEulerAngles().y : hitbox.rotation.y;
                            
                            let angleDiff = targetAngle - currentRotation;
                            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            
                            // Aplicar rotación directamente al AngularVelocity
                            let currentAngVel = hitbox.physicsImpostor.getAngularVelocity();
                            currentAngVel.y = angleDiff * 6.0; // Fuerza de giro para orientarse rápido
                            hitbox.physicsImpostor.setAngularVelocity(currentAngVel);
                            
                            // Si ya está casi encarado (ángulo < 45 grados aprox), bajamos el morro por estética
                            if (Math.abs(angleDiff) < 0.8) {
                                rthPitch = 0.6; 
                            }
                            
                            // 2. Volar hacia el centro (base) solo si estamos a una altura segura
                            if (pos.y > 3.0) {
                                let dirToHome = new BABYLON.Vector3(-pos.x, 0, -pos.z).normalize();
                                let speedForce = Math.min(50, distanceToHome * 3); // Fuerza moderada
                                hitbox.physicsImpostor.applyForce(dirToHome.scale(speedForce), pos);
                                
                                // Zona de frenado aerodinámico: al acercarse (menos de 5m), disipar inercia para no pasarse
                                if (distanceToHome < 5.0) {
                                    let linVel = hitbox.physicsImpostor.getLinearVelocity();
                                    linVel.x *= 0.85; 
                                    linVel.z *= 0.85;
                                    hitbox.physicsImpostor.setLinearVelocity(linVel);
                                }
                            } else {
                                // Frenar inercia horizontal para subir en ascensor
                                let linVel = hitbox.physicsImpostor.getLinearVelocity();
                                linVel.x *= 0.8;
                                linVel.z *= 0.8;
                                hitbox.physicsImpostor.setLinearVelocity(linVel);
                            }
                            
                            // Mantener altura de crucero RTH (5 metros)
                            if (pos.y < 5.0) {
                                hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(15), pos);
                            } else if (pos.y > 6.0) {
                                // Si vuela hacia la base estando muy alto, forzar un descenso moderado
                                hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(-12), pos);
                            }
                        } else { 
                            // Sobre la base, descender
                            let linVel = hitbox.physicsImpostor.getLinearVelocity();
                            linVel.x *= 0.70; // Frenar inercias laterales fuertemente
                            linVel.z *= 0.70;
                            
                            // Paracaídas inteligente: Cae rápido si está alto, frena al acercarse al suelo
                            let maxFallSpeed = (pos.y > 10.0) ? -15.0 : -4.0;
                            if (linVel.y < maxFallSpeed) linVel.y *= 0.85; 
                            hitbox.physicsImpostor.setLinearVelocity(linVel);
                            
                            // Bajar con fuerza para no eternizarse
                            hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(-10), pos);
                            
                            // Durante el descenso, girar suavemente hacia el Norte (ángulo 0) para aparcar de espaldas a la cámara
                            let currentRotation = hitbox.rotationQuaternion ? hitbox.rotationQuaternion.toEulerAngles().y : hitbox.rotation.y;
                            let angleDiff = 0 - currentRotation;
                            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            
                            let currentAngVel = hitbox.physicsImpostor.getAngularVelocity();
                            currentAngVel.y = angleDiff * 3.0; // Giro suave
                            hitbox.physicsImpostor.setAngularVelocity(currentAngVel);
                            
                            // Una vez tocando el suelo (altura del dron sobre la plataforma es ~0.3)
                            if (pos.y <= 0.3) {
                                hitbox.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
                                hitbox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
                                // Alinear el dron plano con el suelo, pero mantener su giro (yaw) actual
                                let finalYaw = hitbox.rotationQuaternion ? hitbox.rotationQuaternion.toEulerAngles().y : hitbox.rotation.y;
                                if (hitbox.rotationQuaternion) {
                                    hitbox.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(finalYaw, 0, 0);
                                } else {
                                    hitbox.rotation = new BABYLON.Vector3(0, finalYaw, 0);
                                }
                                
                                // Finalizar RTH y apagar motores definitivamente
                                isRTH = false;
                                if (enginesOn) toggleEngine();
                            }
                        }
                    } else if (isAutoPilot && typeof hoops !== 'undefined') {
                        // Navegación de Piloto Automático por los aros
                        if (autoPilotTarget < hoops.length) {
                            let target = hoops[autoPilotTarget].pos;
                            let dx = target.x - pos.x;
                            let dz = target.z - pos.z;
                            let distance = Math.sqrt(dx*dx + dz*dz);
                            
                            // 1. Encarar al aro objetivo
                            let targetAngle = Math.atan2(dx, dz);
                            let currentRotation = hitbox.rotationQuaternion ? hitbox.rotationQuaternion.toEulerAngles().y : hitbox.rotation.y;
                            let angleDiff = targetAngle - currentRotation;
                            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            
                            let currentAngVel = hitbox.physicsImpostor.getAngularVelocity();
                            currentAngVel.y = angleDiff * 4.0; // Giro rápido para apuntar al aro
                            hitbox.physicsImpostor.setAngularVelocity(currentAngVel);
                            
                            // 2. Volar hacia el aro (Comportamiento de Steering para evitar derrape extremo)
                            let dirToTarget = new BABYLON.Vector3(dx, 0, dz).normalize();
                            let currentVel = hitbox.physicsImpostor.getLinearVelocity();
                            let maxSpeed = 25;
                            const speedSlider = document.getElementById("autoPilotSpeed");
                            if (speedSlider) {
                                maxSpeed = parseInt(speedSlider.value);
                            }
                            let desiredVel = dirToTarget.scale(maxSpeed); // Volar estrictamente a la velocidad elegida
                            // Usar setLinearVelocity con un vector completamente nuevo para anular el motor de físicas
                            let dy = target.y - pos.y;
                            let desiredVelY = dy * 2.0; 
                            if (desiredVelY > 10) desiredVelY = 10;
                            if (desiredVelY < -10) desiredVelY = -10;
                            
                            // Vuelo 100% nativo usando setLinearVelocity (sobrescribe cualquier inercia de CannonJS)
                            let newVel = new BABYLON.Vector3(desiredVel.x, desiredVelY, desiredVel.z);
                            hitbox.physicsImpostor.setLinearVelocity(newVel);
                            
                            // 4. Comprobar si ha pasado por el aro (radio de tolerancia ajustado a 8m para obligar a cruzarlo)
                            if (BABYLON.Vector3.Distance(pos, target) < 8.0) {
                                // Freno dinámico al pasar el aro para encarar bien el siguiente
                                let brakeVel = hitbox.physicsImpostor.getLinearVelocity();
                                brakeVel.x *= 0.5;
                                brakeVel.z *= 0.5;
                                hitbox.physicsImpostor.setLinearVelocity(brakeVel);
                                
                                if (!hoopStates[autoPilotTarget]) {
                                    hoopStates[autoPilotTarget] = true;
                                    let hoopMesh = scene.getMeshByName("hoop" + autoPilotTarget);
                                    if (hoopMesh && hoopMesh.material) {
                                        hoopMesh.material.emissiveColor = new BABYLON.Color3(1.0, 0.8, 0.0); // Dorado
                                    }
                                }
                                autoPilotTarget++;
                                if (autoPilotTarget >= hoops.length) {
                                    // Circuito completado
                                    isAutoPilot = false;
                                    if (btnAutoPilot) {
                                        btnAutoPilot.style.backgroundColor = "#ffd700";
                                        btnAutoPilot.style.color = "black";
                                        btnAutoPilot.innerText = "Demo Automática Aros";
                                    }
                                    triggerRTH(); // Volver a base
                                }
                            }
                        }
                    }
                    
                    // Actualizar velocímetro en la UI si existe
                    const realSpeedUI = document.getElementById("realSpeed");
                    if (realSpeedUI) {
                        let actualSpeed = hitbox.physicsImpostor.getLinearVelocity().length();
                        let targetText = isAutoPilot ? (" | Target: " + (typeof maxSpeed !== 'undefined' ? maxSpeed : 0)) : "";
                        realSpeedUI.innerText = "Vel. Real: " + Math.round(actualSpeed) + " m/s" + targetText;
                    }
                    
                    // Comprobación manual de paso por los aros (si no está en piloto automático)
                    if (!isAutoPilot && typeof hoops !== 'undefined') {
                        for (let i = 0; i < hoops.length; i++) {
                            if (!hoopStates[i] && BABYLON.Vector3.Distance(pos, hoops[i].pos) < 12.0) {
                                hoopStates[i] = true;
                                let hoopMesh = scene.getMeshByName("hoop" + i);
                                if (hoopMesh && hoopMesh.material) {
                                    hoopMesh.material.emissiveColor = new BABYLON.Color3(1.0, 0.8, 0.0); // Dorado
                                }
                            }
                        }
                    }
                }
                
                // Proyectar direcciones locales en el plano horizontal (anular Y) para no estrellarse contra el suelo
                let moveForward = new BABYLON.Vector3(localForward.x, 0, localForward.z).normalize();
                let moveRight = new BABYLON.Vector3(localRight.x, 0, localRight.z).normalize();

                // Fuerza de desplazamiento horizontal (Arcade) pura para Teclado y Joystick (solo si no es RTH ni PA)
                if (enginesOn && !isRTH && !isAutoPilot && !isLooping) {
                    
                    // 1. Leer el deslizador de velocidad máxima (el mismo que usa el AutoPilot)
                    let maxSpeed = 25;
                    if (document.getElementById("autoPilotSpeed")) {
                        maxSpeed = parseInt(document.getElementById("autoPilotSpeed").value);
                    }
                    
                    // 2. Combinar entradas de teclado y joystick
                    let inputX = joyX;
                    let inputY = joyY;
                    
                    if (currentKeys.w) inputY = -1;
                    if (currentKeys.s) inputY = 1;
                    if (currentKeys.a) inputX = -1;
                    if (currentKeys.d) inputX = 1;
                    
                    // 3. Aplicar velocidad si hay entrada
                    if (inputX !== 0 || inputY !== 0) {
                        let desiredForward = moveForward.scale(-inputY * maxSpeed);
                        let desiredSide = moveRight.scale(inputX * maxSpeed);
                        let desiredVel = desiredForward.add(desiredSide);
                        
                        let currentVel = hitbox.physicsImpostor.getLinearVelocity();
                        // Lerp para que la aceleración sea suave pero alcance el máximo
                        let newVel = BABYLON.Vector3.Lerp(currentVel, new BABYLON.Vector3(desiredVel.x, currentVel.y, desiredVel.z), 0.05);
                        hitbox.physicsImpostor.setLinearVelocity(newVel);
                    }
                }
                
                // ==============================
                // INCLINACIÓN (W, A, S, D) Y YAW (IZQ/DER)
                // ==============================
                // 1. Obtener velocidad angular actual y aplicar frenado rotacional
                let angVel = hitbox.physicsImpostor.getAngularVelocity();
                
                // Efecto de pérdida de control: Si se apaga en el aire, da vueltas caóticamente
                if (!enginesOn && pos.y > 2.0) {
                    angVel.x += (Math.random() - 0.5) * 0.5;
                    angVel.z += (Math.random() - 0.5) * 0.5;
                }
                
                // Si estamos en medio de un Loop, forzamos un Tonel (Barrel Roll) lateral violento y saltamos todo lo demás
                if (isLooping) {
                    // Rotación sobre el eje frontal (localForward) para hacer un loop de costado
                    angVel = localForward.scale(12.5); // Rotación de 12.5 rad/s durante 0.5s = ~360 grados
                    hitbox.physicsImpostor.setAngularVelocity(angVel);
                    return; // Saltarse el estabilizador y los controles manuales durante este fotograma
                }
                
                angVel.scaleInPlace(0.85); // Frenado general para estabilizar
                
                // 2. Auto-Estabilizador (Fuerza para mantener el dron perfectamente plano)
                if (enginesOn) {
                    let levelTorque = BABYLON.Vector3.Cross(localUp, BABYLON.Vector3.Up());
                    angVel.addInPlace(levelTorque.scale(0.8)); // 0.8 es la fuerza con la que intenta enderezarse
                }
                
                // 3. Aplicar Inclinación (Pitch y Roll) cuando se pulsan las teclas
                let pitchInput = 0; // Rotación sobre el eje lateral (localRight)
                let rollInput = 0;  // Rotación sobre el eje frontal (localForward)
                
                if (enginesOn && !isRTH) {
                    if (currentKeys.w) pitchInput = 0.3;  // Morro hacia abajo (Pitch forward)
                    if (currentKeys.s) pitchInput = -0.3; // Morro hacia arriba (Pitch backward)
                    if (currentKeys.a) rollInput = 0.3;   // Ladear a la izquierda (Roll left)
                    if (currentKeys.d) rollInput = -0.3;  // Ladear a la derecha (Roll right)
                    
                    // Giro sobre sí mismo (Yaw) usando el eje vertical global (Flechas Izq/Der o Q/E)
                    if (currentKeys.left || currentKeys.q) angVel.y -= 0.3;
                    if (currentKeys.right || currentKeys.e) angVel.y += 0.3;
                }
                
                // Sumar input del joystick virtual (Acrobacias analógicas)
                if (enginesOn && !isRTH) {
                    // joyY (Arriba es negativo). Arriba debe bajar morro (pitch positivo).
                    pitchInput += joyY * -0.3; 
                    // joyX (Derecha es positivo). Derecha debe ladear a la derecha (roll negativo).
                    rollInput += joyX * -0.3;
                }
                
                // Sumar inclinaciones artificiales (como la del RTH)
                pitchInput += rthPitch;
                
                if (pitchInput !== 0) {
                    angVel.addInPlace(localRight.scale(pitchInput));
                }
                if (rollInput !== 0) {
                    angVel.addInPlace(localForward.scale(rollInput));
                }
                
                hitbox.physicsImpostor.setAngularVelocity(angVel);
            }
        });
    }, null, null, ".glb");

    return scene;
};

window.scene = createScene();

engine.runRenderLoop(function () {
    window.scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});
