const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro profundo

    // --- 1. Cámara y Luces ---
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 100));

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.5, 0.5, 0.5), scene);
    dirLight.intensity = 1.5;
    dirLight.position = new BABYLON.Vector3(-500, -500, -500);

    // --- 2. Fondo de Estrellas (Particle System) ---
    const starSystem = new BABYLON.ParticleSystem("stars", 10000, scene);
    const starTexture = new BABYLON.DynamicTexture("starTex", 16, scene, true);
    const ctx = starTexture.getContext();
    ctx.clearRect(0, 0, 16, 16);
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    starTexture.update();

    starSystem.particleTexture = starTexture;
    starSystem.createBoxEmitter(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(-2000, -2000, 0),
        new BABYLON.Vector3(2000, 2000, 5000)
    );
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
    starSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
    starSystem.minSize = 0.5;
    starSystem.maxSize = 2.0;
    starSystem.minLifeTime = 999999;
    starSystem.maxLifeTime = 999999;
    starSystem.emitRate = 10000;
    starSystem.renderingGroupId = 0;
    starSystem.start();

    // --- 3. Modelo de la Nave USS ENTERPRISE NCC-1701 ---
    let shipMesh = null;
    let sequenceStarted = false;
    let titleShown = false;

    const modelUrl = "model/";
    const modelFile = "scene.gltf";

    BABYLON.SceneLoader.ImportMeshAsync("", modelUrl, modelFile, scene).then((result) => {
        shipMesh = result.meshes[0];

        // Capa de renderizado 1 y forzado de opacidad
        result.meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
            if (mesh.material) {
                mesh.material.transparencyMode = 0;
                mesh.material.alphaMode = 0;
                mesh.material.needDepthPrePass = true;
            }
        });

        // Luces estroboscópicas de navegación fijadas al casco
        window.blinkLights = [];
        const createBlinkLight = (color, pos) => {
            const sphere = BABYLON.MeshBuilder.CreateSphere("blinkLight", { diameter: 1.8 }, scene);
            const mat = new BABYLON.StandardMaterial("blinkMat", scene);
            mat.emissiveColor = color;
            mat.diffuseColor = color;
            mat.disableLighting = true;
            sphere.material = mat;
            sphere.parent = shipMesh;
            sphere.position = pos;
            sphere.renderingGroupId = 1;
            window.blinkLights.push(sphere);
        };

        // Posiciones locales en el casco
        createBlinkLight(new BABYLON.Color3(1, 0, 0), new BABYLON.Vector3(-52.0, 10.0, 75.0)); // Babor (Rojo)
        createBlinkLight(new BABYLON.Color3(0, 1, 0), new BABYLON.Vector3(52.0, 10.0, 75.0));  // Estribor (Verde)
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, 35.0, 75.0));   // Cúpula Puente
        createBlinkLight(new BABYLON.Color3(1, 1, 1), new BABYLON.Vector3(0.0, -22.0, 20.0));  // Quilla Inferior

        // Escala del USS Enterprise NCC-1701
        shipMesh.scaling = new BABYLON.Vector3(2.2, 2.2, 2.2);

        // Posicionamiento idéntico al Intrepid: lejos, abajo y a la izquierda
        shipMesh.position = new BABYLON.Vector3(-1700, -550, 3000);

        // Vector de dirección del movimiento (Hacia la derecha, arriba y hacia la cámara)
        const moveDir = new BABYLON.Vector3(10, 4, -15);

        // Rotarla para que mire hacia su propia trayectoria
        shipMesh.rotationQuaternion = null;
        shipMesh.lookAt(shipMesh.position.add(moveDir), Math.PI, 0, 0);

        // Guardar la rotación inicial limpia para el alabeo progresivo
        window.initialShipRotation = shipMesh.rotation.clone();

    }).catch(err => {
        console.error("Error cargando el modelo USS Enterprise:", err);
    });

    // --- 4. Eventos de la Interfaz, Audio y Bitácora HUD ---
    const startBtn = document.getElementById("startButton");
    const titleDiv = document.getElementById("tng-title");
    const quoteHud = document.getElementById("quote-hud");
    const quoteText = document.getElementById("quote-text");
    const bgMusic = document.getElementById("bgMusic");
    if (bgMusic) {
        bgMusic.load(); // Precargar en memoria para disparo instantáneo al clic
    }

    const fullQuote = "«El espacio, la última frontera. Estos son los viajes de la nave estelar Enterprise, en una misión que durará cinco años, dedicada a la exploración de mundos desconocidos, al descubrimiento de nuevas vidas y de nuevas civilizaciones, hasta alcanzar lugares donde nadie ha podido llegar.»";

    // Escritura completa del texto y desvanecimiento 1.2s después de terminar de escribir
    function runTypewriter(text, element, speed = 22) {
        element.innerHTML = "";
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                // El texto se ha escrito por completo: dejar 1.2 segundos para lectura y ocultar
                setTimeout(() => {
                    if (quoteHud) {
                        quoteHud.classList.add("hidden");
                    }
                }, 1200);
            }
        }, speed);
    }

    startBtn.addEventListener("click", () => {
        if (!shipMesh) {
            startBtn.innerText = "CARGANDO MODELO...";
            return;
        }
        startBtn.style.display = "none";
        sequenceStarted = true;

        // Iniciar la música de fondo
        if (bgMusic) {
            bgMusic.volume = 0.85;
            bgMusic.currentTime = 0;
            bgMusic.play().catch(e => console.log("Audio play error:", e));
        }

        // Desplegar el HUD panorámico y escribir la frase completa
        if (quoteHud && quoteText) {
            quoteHud.classList.remove("hidden");
            runTypewriter(fullQuote, quoteText, 22);
        }
    });

    // --- 5. Bucle de Animación con Alabeo y Temporizaciones Optimizadas ---
    scene.onBeforeRenderObservable.add(() => {
        let dt = engine.getDeltaTime();

        if (sequenceStarted && shipMesh) {
            // Easing procedural idéntico a P1.4 Intrepid
            let zDist = Math.abs(shipMesh.position.z);
            let distanceFactor = Math.min(1.0, zDist / 1200);
            let speedMultiplier = 0.08 + 0.92 * distanceFactor;
            let speed = 0.22 * speedMultiplier * (dt / 16.66);

            // Movimiento diagonal
            shipMesh.position.z -= speed * 15; // Hacia la cámara
            shipMesh.position.x += speed * 10; // Hacia la derecha
            shipMesh.position.y += speed * 4;  // Hacia arriba

            // Alabeo suave hacia su izquierda al acercarse a la cámara para mostrar la panza
            if (window.initialShipRotation) {
                let bankFactor = Math.max(0, Math.min(1.0, 1.0 - (zDist - 100) / 1400));
                let smoothBank = bankFactor * bankFactor * (3 - 2 * bankFactor);
                shipMesh.rotation.z = window.initialShipRotation.z - smoothBank * 0.52;
            }

            // Animación de Luces Intermitentes (Strobes)
            if (window.blinkLights) {
                let time = Date.now();
                window.blinkLights.forEach((light, index) => {
                    let cycle = 2000;
                    let offset = index * 500;
                    if ((time + offset) % cycle < 100) {
                        light.isVisible = true;
                    } else {
                        light.isVisible = false;
                    }
                });
            }

            // Despliegue del título cinematográfico de Star Trek retrasado 1.5 segundos adicionales (3100ms)
            if (shipMesh.position.z < 550 && !titleShown) {
                titleShown = true;
                setTimeout(() => {
                    titleDiv.classList.remove("hidden");
                    titleDiv.style.display = "block";
                    void titleDiv.offsetWidth;
                    titleDiv.style.opacity = 1;

                    // Exactamente 2 segundos después de mostrar el título, desvanecer y detener la música
                    setTimeout(() => {
                        if (bgMusic) {
                            let fadeInterval = setInterval(() => {
                                if (bgMusic.volume > 0.06) {
                                    bgMusic.volume = Math.max(0, bgMusic.volume - 0.05);
                                } else {
                                    bgMusic.volume = 0;
                                    bgMusic.pause();
                                    clearInterval(fadeInterval);
                                }
                            }, 80);
                        }
                    }, 2000);
                }, 3100);
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
