const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA ---
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -350), scene);
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
    shipRoot.position = new BABYLON.Vector3(0, 0, 0);

    BABYLON.SceneLoader.ImportMeshAsync("", "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_estrella_muerte/", "scene.gltf", scene).then((result) => {
        if (result.animationGroups) {
            result.animationGroups.forEach(ag => { ag.stop(); ag.reset(); });
        }
        const model = result.meshes[0];
        
        model.normalizeToUnitCube(); 
        
        let mainMesh = null;
        let maxVerts = 0;
        result.meshes.forEach(m => {
            let verts = m.getTotalVertices();
            if (verts > maxVerts) { maxVerts = verts; mainMesh = m; }
        });
        if (mainMesh) {
            mainMesh.computeWorldMatrix(true);
            model.position.subtractInPlace(mainMesh.getBoundingInfo().boundingBox.centerWorld);
        }
        
        model.setParent(shipRoot);
        
        shipRoot.scaling = new BABYLON.Vector3(50, 50, 50); // 4 veces más pequeña
        
        // Estabilizamos la Estrella de la Muerte sobre su eje horizontal (Pitch = 0)
        // Empezamos apuntando hacia la parte frontal-izquierda (-45 grados) para que sea perfectamente visible
        shipRoot.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0); 
        
        // Cuadrante superior izquierdo
        shipRoot.position = new BABYLON.Vector3(-120, 80, 0);
    });

    // --- PLANETA ALIENÍGENA ---
    let planet = null;
    const createPlanet = () => {
        if (planet) planet.dispose();
        // 3 veces más grande (diámetro 160)
        planet = BABYLON.MeshBuilder.CreateSphere("planet", {diameter: 160, segments: 32}, scene);
        // Cuadrante inferior derecho
        planet.position = new BABYLON.Vector3(120, -80, 0); 

        
        const planetMat = new BABYLON.StandardMaterial("planetMat", scene);
        planetMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/rock.png", scene);
        planetMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.6); 
        planetMat.emissiveColor = new BABYLON.Color3(0.02, 0.05, 0.1); 
        planet.material = planetMat;
        planet.rotation.z = Math.PI;
    };
    createPlanet();

    // --- SISTEMA DE ESTRELLAS ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.5, height: 0.5, depth: 0.5});
    SPS.addShape(starShape, 8000); // MÁS ESTRELLAS
    starShape.dispose();
    const starsMesh = SPS.buildMesh();
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starMat.disableLighting = true;
    starsMesh.material = starMat;

    SPS.initParticles = function() {
        for (let p = 0; p < SPS.nbParticles; p++) {
            SPS.particles[p].position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 6000,
                (Math.random() - 0.5) * 6000,
                (Math.random() - 0.5) * 4000 + 1000
            );
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    // --- EXPLOSIÓN ---
    const particleSystem = new BABYLON.ParticleSystem("explosion", 3000, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    
    particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0.1, 1.0); 
    particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0.0, 1.0); 
    particleSystem.colorDead = new BABYLON.Color4(0.2, 0, 0, 0.0);
    
    particleSystem.createDirectedSphereEmitter(2, new BABYLON.Vector3(-1, -1, -1), new BABYLON.Vector3(1, 1, 1));
    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 3.0;
    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 3.0;
    particleSystem.emitRate = 2000;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitPower = 15;
    particleSystem.maxEmitPower = 40;
    particleSystem.updateSpeed = 0.015;
    particleSystem.targetStopDuration = 1.0;

    // --- GEOMETRÍA DEL SUPERLÁSER ---
    const laserMat = new BABYLON.StandardMaterial("laserMat", scene);
    laserMat.emissiveColor = new BABYLON.Color3(0.2, 1.0, 0.2); 
    laserMat.disableLighting = true;

    const laserRoot = new BABYLON.TransformNode("laserRoot", scene);
    // Emparentamos el láser a la nave para que herede toda su rotación y escala automáticamente
    laserRoot.parent = shipRoot;
    laserRoot.position = BABYLON.Vector3.Zero();
    laserRoot.rotation = BABYLON.Vector3.Zero();

    // COORDENADAS LOCALES SIN ESCALAR DEL DISCO 
    // El punto focal (donde convergen los rayos) debe estar FLOTANDO EN EL ESPACIO fuera del arma, para formar el cono.
    // La superficie de la esfera está en X = -0.5. Ponemos el foco en X = -0.85.
    const focalPointLocal = new BABYLON.Vector3(-0.85, 0.022, 0);
    // Ajustamos el radio para que sea un poco más pequeño y encaje perfectamente en el anillo interior
    const radiusDish = 0.12; 
    
    const numSmallBeams = 8;
    const smallBeams = [];
    
    for (let i = 0; i < numSmallBeams; i++) {
        let angle = (i / numSmallBeams) * Math.PI * 2;
        let startP = new BABYLON.Vector3(
            -0.475, // Ajustamos levemente la profundidad para que coincida con el anillo interior
            0.022 + Math.cos(angle) * radiusDish,
            Math.sin(angle) * radiusDish
        );
        let initEnd = BABYLON.Vector3.Lerp(startP, focalPointLocal, 0.01);
        // Tubos gruesos adaptados a la escala
        let tube = BABYLON.MeshBuilder.CreateTube("smallBeam"+i, { path: [startP, initEnd], radius: 0.006, updatable: true }, scene);
        tube.material = laserMat;
        tube.isVisible = false;
        tube.setParent(laserRoot);
        
        smallBeams.push({ mesh: tube, start: startP });
    }

    // Inicializamos con un trayecto mínimo para evitar errores de longitud 0
    let initEndForMain = focalPointLocal.add(new BABYLON.Vector3(0.001, 0, 0));
    let mainLaser = BABYLON.MeshBuilder.CreateTube("mainLaser", { path: [focalPointLocal, initEndForMain], radius: 0.03, updatable: true }, scene);
    mainLaser.material = laserMat;
    mainLaser.isVisible = false;
    mainLaser.setParent(laserRoot);

    // Dirección oblicua del láser: 
    // El láser apunta localmente hacia -X, pero como la estrella está en Y=80 y el planeta en Y=-80
    // forzamos una caída en Y de -160 por cada 240 unidades en X.
    const dirOblicuaLocal = new BABYLON.Vector3(-1, -160/240, 0);
    dirOblicuaLocal.normalize();
    const beamEndLocal = focalPointLocal.add(dirOblicuaLocal.scale(1500));

    // --- INTERFAZ Y LÓGICA DE ESTADOS ---
    const btnWarp = document.getElementById("btn-warp");
    const btnReset = document.getElementById("btn-reset");
    const rotSlider = document.getElementById("rot-slider");
    const telemetry = document.getElementById("telemetry");
    const chargeSign = document.getElementById("charge-sign");
    if(chargeSign) chargeSign.style.display = "none";

    let state = "IDLE"; // IDLE, CHARGING, FIRING_HIT, FIRING_MISS, EXPLODING, DONE
    let animTimer = 0;
    let targetWorldPos = null;

    rotSlider.addEventListener("input", (e) => {
        // Permitimos mover el deslizador siempre, para que no parezca roto
        let grados = parseFloat(e.target.value);
        // Multiplicamos por negativo para que deslizar a la derecha apunte a la derecha
        shipRoot.rotation.y = -grados * (Math.PI / 180);
    });

    btnReset.addEventListener("click", () => {
        let planetWasDestroyed = (state === "DONE");
        
        state = "IDLE";
        createPlanet();
        animTimer = 0;
        
        // Solo volvemos el arma a su posición original si acabamos de destruir el planeta
        if (planetWasDestroyed) {
            shipRoot.rotation.y = -Math.PI / 4;
            rotSlider.value = 45;
        }

        mainLaser.isVisible = false;
        smallBeams.forEach(b => b.mesh.isVisible = false);
        btnReset.style.display = "none";
        btnWarp.style.display = "block";
        
        if (planetWasDestroyed) {
            btnWarp.innerText = "INICIAR SECUENCIA";
        } else {
            btnWarp.innerText = "¡DISPARAR!";
        }
        
        telemetry.innerText = "SISTEMAS REINICIADOS. LISTO.";
        particleSystem.stop();
    });

    btnWarp.addEventListener("click", () => {
        if (state === "IDLE" || state === "MISSED") {
            // RAYCASTING: Calcular si acertamos al planeta
            laserRoot.computeWorldMatrix(true);
            let focalWorld = BABYLON.Vector3.TransformCoordinates(focalPointLocal, laserRoot.getWorldMatrix());
            // Usamos la dirección oblicua precalculada
            let dirWorld = BABYLON.Vector3.TransformNormal(dirOblicuaLocal, laserRoot.getWorldMatrix());
            dirWorld.normalize();

            let ray = new BABYLON.Ray(focalWorld, dirWorld, 1500);
            let hitInfo = ray.intersectsMesh(planet);

            if (hitInfo.hit) {
                targetWorldPos = hitInfo.pickedPoint;
                state = "CHARGING_HIT";
            } else {
                targetWorldPos = focalWorld.add(dirWorld.scale(1000)); // Disparo al infinito
                state = "CHARGING_MISS";
            }

            animTimer = 0;
            // No mostramos ningún texto de "cargando", solo el efecto visual
            telemetry.innerText = "";
            btnWarp.style.display = "none";
            if(chargeSign) {
                chargeSign.style.display = "none";
            }
        }
    });

    // --- BUCLE DE ANIMACIÓN ---
    scene.onBeforeRenderObservable.add(() => {
        // La rotación ya se sincroniza sola al ser hijo de shipRoot

        if (planet && planet.isVisible) planet.rotation.y += 0.002;
        
        let dt = engine.getDeltaTime() / 1000.0;

        if (state.startsWith("CHARGING")) {
            animTimer += dt;
            // Sube muy despacio hasta 2.8 segundos de los 3.0 totales
            let tCharge = Math.max(0.01, Math.min(animTimer / 2.8, 1.0));
            
            smallBeams.forEach(b => {
                b.mesh.isVisible = true;
                let currentEnd = BABYLON.Vector3.Lerp(b.start, focalPointLocal, tCharge);
                BABYLON.MeshBuilder.CreateTube(b.mesh.name, {
                    path: [b.start, currentEnd],
                    instance: b.mesh
                });
            });

            if (animTimer > 3.0) { 
                if (state === "CHARGING_HIT") state = "FIRING_HIT";
                else state = "FIRING_MISS";
                
                animTimer = 0;
                telemetry.innerText = "SUPERLÁSER: FUEGO";
                if(chargeSign) chargeSign.style.display = "none";
                mainLaser.isVisible = true;
            }
        } 
        else if (state.startsWith("FIRING")) {
            animTimer += dt;
            
            // Calculamos el Target en coordenadas LOCALES para el tubo
            laserRoot.computeWorldMatrix(true);
            let invMat = laserRoot.getWorldMatrix().clone().invert();
            let fireProgress = Math.min(animTimer / 0.15, 1.0);
            if (fireProgress < 1) {
                // Rayo principal disparándose de forma oblicua
                let currentEndLocal = BABYLON.Vector3.Lerp(focalPointLocal, beamEndLocal, fireProgress);
                mainLaser = BABYLON.MeshBuilder.CreateTube("mainLaser", { path: [focalPointLocal, currentEndLocal], radius: 0.03, instance: mainLaser });
            } else {
                animTimer = 0;
                if (state === "FIRING_HIT") {
                    state = "EXPLODING";
                    telemetry.innerText = "IMPACTO CRÍTICO. ALDERAAN DESTRUIDO.";
                    planet.isVisible = false; 
                    particleSystem.emitter = targetWorldPos;
                    particleSystem.start();
                } else {
                    state = "MISSED";
                    telemetry.innerText = "FALLO: EL RAYO SE PIERDE EN EL ESPACIO.";
                    btnReset.style.display = "block";
                    btnReset.innerText = "RECARGAR Y VOLVER A DISPARAR"; // Texto más claro
                    btnWarp.style.display = "none";
                    mainLaser.isVisible = false;
                    smallBeams.forEach(b => b.mesh.isVisible = false);
                }
            }
        }
        else if (state === "EXPLODING") {
            animTimer += dt;
            if (animTimer > 2.0) {
                state = "DONE";
                btnReset.style.display = "block";
                btnReset.innerText = "REINICIAR SIMULACIÓN"; // Texto final
                btnWarp.style.display = "none";
                mainLaser.isVisible = false;
                smallBeams.forEach(b => b.mesh.isVisible = false);
            }
        }
    });

    window.scene = scene;
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
