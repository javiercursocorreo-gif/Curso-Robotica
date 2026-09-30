const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100)); // Mirando hacia el fondo
    // Desactivar controles de cámara para que sea una cinemática fija
    // camera.attachControl(canvas, true);

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5; // Un poco más de luz ambiente para ver los detalles del casco

    // Luz principal imitando un sol lejano, iluminando desde abajo y un lado
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    dirLight.intensity = 1.5;
    dirLight.position = new BABYLON.Vector3(-500, -500, -500);

    // --- 2. Fondo de Estrellas (Particle System) ---
    const starSystem = new BABYLON.ParticleSystem("stars", 10000, scene);
    
    // Crear una textura blanca simple para las estrellas
    const starTexture = new BABYLON.DynamicTexture("starTex", 16, scene, true);
    const ctx = starTexture.getContext();
    ctx.clearRect(0, 0, 16, 16);
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    starTexture.update();
    
    starSystem.particleTexture = starTexture;
    
    // Emitir en una caja gigante alrededor de la cámara
    starSystem.createBoxEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(-2000, -2000, 0), new BABYLON.Vector3(2000, 2000, 5000));
    
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1); // Estrellas algo azuladas
    starSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
    
    starSystem.minSize = 0.5;
    starSystem.maxSize = 2.0;
    starSystem.minLifeTime = 999999; // Estrellas estáticas
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 10000;
    
    // ESTRELLAS AL FONDO: Las ponemos en la capa de renderizado 0
    starSystem.renderingGroupId = 0;
    
    // Iniciar y pre-calentar el sistema para que las estrellas ya estén ahí
    starSystem.start();
    
    // --- 3. Modelo de la Nave ---
    let shipMesh = null;
    let sequenceStarted = false;
    let titleShown = false;
    
    BABYLON.SceneLoader.ImportMeshAsync("", "uss_intrepid_ncc_79520/", "scene.gltf", scene).then((result) => {
        shipMesh = result.meshes[0];
        window.shipMesh = shipMesh; // Por si queremos debugearlo
        
        window.deflectorMaterials = [];
        // CORRECCIÓN DEFINITIVA DE PROFUNDIDAD: 
        // 1. Forzamos que la nave se dibuje en la capa 1 (por encima de las estrellas que están en la capa 0).
        // 2. Desactivamos cualquier transparencia oculta del material GLTF.
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1; // Capa superior
            if(mesh.material) {
                // Si el modelo tiene PBRMaterial, forzamos a OPAQUE (0)
                mesh.material.transparencyMode = 0;
                // Desactivar el alfa en caso de que sea StandardMaterial
                mesh.material.alphaMode = 0; 
                mesh.material.needDepthPrePass = true;
                
                // Buscar el material del deflector frontal ("frontMaterial")
                if (mesh.material.name && mesh.material.name.toLowerCase().includes("front")) {
                    window.deflectorMaterials.push(mesh.material);
                }
            }
        });
        
        // Luces intermitentes (Navigation strobes)
        window.blinkLights = []; // Global para usarlo en el render loop
        const createBlinkLight = (color, pos) => {
            // El diámetro es pequeño porque el shipMesh se escala x300
            let sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", {diameter: 0.05}, scene);
            let mat = new BABYLON.StandardMaterial("blinkMat", scene);
            mat.emissiveColor = color;
            mat.diffuseColor = color;
            mat.disableLighting = true; // Que brille en la oscuridad
            sphere.material = mat;
            sphere.parent = shipMesh;
            sphere.position = pos;
            sphere.renderingGroupId = 1; // También en la capa de la nave
            window.blinkLights.push(sphere);
        };
        
        // Posiciones locales aproximadas para una nave (Babor rojo, Estribor verde, Blancas arriba/abajo)
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-0.5, 0.05, 0)); // Izquierda
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(0.5, 0.05, 0));  // Derecha
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, -0.15, -0.2)); // Abajo
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0, 0.2, 0.3));   // Arriba
        
        const createEngineFire = (pos) => {
            const emitterMesh = BABYLON.MeshBuilder.CreateBox("engineAnchor", {size: 0.05}, scene);
            emitterMesh.parent = shipMesh;
            emitterMesh.position = pos;
            emitterMesh.isVisible = false;
            
            const fire = new BABYLON.ParticleSystem("warpFire", 1000, scene);
            // Usamos flare.png para que parezca energía pura
            fire.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/flare.png", scene);
            fire.emitter = emitterMesh;
            
            // IMPORTANTE: isLocal = true hace que el chorro de fuego apunte siempre hacia 
            // la "parte de atrás" de la nave, sin importar cómo esté rotada volando en diagonal.
            fire.isLocal = true; 
            
            // Fuego azul de Star Trek
            fire.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 1.0); // Cyan
            fire.color2 = new BABYLON.Color4(0.1, 0.2, 1.0, 1.0); // Azul oscuro
            fire.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
            
            fire.minSize = 0.5;
            fire.maxSize = 1.0;
            fire.minLifeTime = 0.1;
            fire.maxLifeTime = 0.3;
            fire.emitRate = 500;
            
            // Disparar las partículas hacia atrás (-Z en local)
            fire.direction1 = new BABYLON.Vector3(-0.05, -0.05, -8);
            fire.direction2 = new BABYLON.Vector3(0.05, 0.05, -10);
            
            fire.minEmitPower = 5;
            fire.maxEmitPower = 10;
            fire.updateSpeed = 0.01;
            
            // Para que se dibuje bien con la nave
            fire.renderingGroupId = 1;
            
            fire.start();
        };
        
        // Colocar anclas de fuego en la parte trasera (-Z) y alta (+Y) de los tubos laterales
        createEngineFire(new BABYLON.Vector3(-0.6, 0.3, -0.8)); // Tubo Izquierdo
        createEngineFire(new BABYLON.Vector3(0.6, 0.3, -0.8));  // Tubo Derecho
        
        // Escalar la nave muchísimo más grande (antes 10, ahora 300) para que no parezca una hormiga
        shipMesh.scaling = new BABYLON.Vector3(300, 300, 300);
        
        // Posicionarla lejos, bastante abajo y a la izquierda. 
        // Calculado matemáticamente para que al llegar a Z=0, pase a X=300, Y=250 (rozando la cámara)
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);
        
        // Vector de dirección del movimiento (Hacia la derecha, arriba y hacia la cámara)
        const moveDir = new BABYLON.Vector3(10, 4, -15);
        
        // Rotarla para que mire hacia su propia trayectoria. 
        // Como venía "de espaldas", le sumamos Math.PI (180 grados) de corrección (yaw)
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), Math.PI, 0, 0); 
        
        // Iniciar animaciones de la nave si tiene
        if(result.animationGroups && result.animationGroups.length > 0) {
            result.animationGroups[0].play(true);
        }
    });

    // --- 4. Eventos de la Interfaz ---
    const startBtn = document.getElementById("startButton");
    const titleDiv = document.getElementById("tng-title");

    startBtn.addEventListener("click", () => {
        if (!shipMesh) {
            startBtn.innerText = "CARGANDO MODELO...";
            return; // Esperar a que cargue
        }
        
        startBtn.style.display = "none";
        sequenceStarted = true;
    });

    // --- 5. Bucle de Animación ---
    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();
        
        if (sequenceStarted && shipMesh) {
            // Easing procedural: calcular la distancia en Z a la cámara
            let zDist = Math.abs(shipMesh.position.z);
            
            // Factor que va de 0 (está justo en la cámara) a 1 (está a 800 o más unidades)
            let distanceFactor = Math.min(1.0, zDist / 1200);
            
            // Multiplicador: 10% de velocidad mínima en la cámara, 100% de velocidad en la lejanía
            let speedMultiplier = 0.08 + 0.92 * distanceFactor;
            
            // Velocidad dinámica (reducida a una cuarta parte de la original)
            let speed = 0.25 * speedMultiplier * (dt / 16.66);
            
            // Movimiento diagonal muy pronunciado
            shipMesh.position.z -= speed * 15; // Hacia la cámara
            shipMesh.position.x += speed * 10; // Hacia la derecha
            shipMesh.position.y += speed * 4;  // Hacia arriba
            
            // Animación de Luces Intermitentes (Strobes) y Motor
            if (window.blinkLights) {
                let time = Date.now();
                window.blinkLights.forEach((light, index) => {
                    // Ciclo de 2 segundos, parpadeo rápido de 100ms
                    // Cada luz tiene un desfase (offset) para no parpadear todas a la vez
                    let cycle = 2000;
                    let offset = index * 500; 
                    if ((time + offset) % cycle < 100) {
                        light.isVisible = true;
                    } else {
                        light.isVisible = false;
                    }
                });
                
                // Pulsación del motor azul (onda sinusoidal sobre la textura emisiva del material)
                if (window.deflectorMaterials && window.deflectorMaterials.length > 0) {
                    // Genera una intensidad entre 0.2 y 2.0
                    let pulse = 1.1 + Math.sin(time / 150) * 0.9;
                    window.deflectorMaterials.forEach(mat => {
                        if (mat.emissiveIntensity !== undefined) {
                            mat.emissiveIntensity = pulse;
                        } else if (mat.emissiveColor) {
                            mat.emissiveColor = new BABYLON.Color3(0.2 * pulse, 0.6 * pulse, 1.0 * pulse);
                        }
                    });
                }
            }
            
            // Detectar cuando ha pasado la cámara (Ajustado al punto dulce Z < 150)
            if (shipMesh.position.z < 150 && !titleShown) {
                titleShown = true;
                
                // Retraso cinematográfico de 2 segundos antes de que aparezca el título
                setTimeout(() => {
                    // Mostrar el título en HTML
                    titleDiv.classList.remove("hidden");
                    titleDiv.style.display = "block";
                    
                    // Forzar reflow para la transición CSS
                    void titleDiv.offsetWidth;
                    titleDiv.style.opacity = 1;
                }, 2000);
            }
        }
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});
