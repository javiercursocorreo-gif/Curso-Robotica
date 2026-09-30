const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    
    // Fondo espacial (negro)
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.00002; // Niebla espacial muy suave para que las estrellas lejanas sigan brillando
    scene.fogColor = new BABYLON.Color3(0, 0, 0);

    // Cámara fija cinematográfica, situada muy atrás y mirando hacia el fondo donde nacen las naves
    const camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 300, -2000), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 2000));
    camera.maxZ = 100000; // Ver hasta el fondo del universo para que no se recorten las estrellas

    // Luces
    const hemisphericLight = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.0; 
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -1, -1), scene);
    dirLight.position = new BABYLON.Vector3(100, 100, 100);
    dirLight.intensity = 0.8;

    // Textura autogenerada para partículas (estrellas y explosiones) para evitar fallos de red
    const whiteFlare = new BABYLON.DynamicTexture("whiteFlareTex", {width: 128, height: 128}, scene, false);
    const ctxWhite = whiteFlare.getContext();
    ctxWhite.fillStyle = "black";
    ctxWhite.fillRect(0, 0, 128, 128);
    const gradWhite = ctxWhite.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradWhite.addColorStop(0, "white");
    gradWhite.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
    gradWhite.addColorStop(1, "black");
    ctxWhite.fillStyle = gradWhite;
    ctxWhite.beginPath();
    ctxWhite.arc(64, 64, 64, 0, Math.PI * 2);
    ctxWhite.fill();
    whiteFlare.update();

    // Estrellas
    const stars = new BABYLON.ParticleSystem("stars", 60000, scene);
    stars.particleTexture = whiteFlare;
    stars.emitter = new BABYLON.Vector3(0, 0, 0); 
    // Crear una cúpula estelar (radio 12000, grosor 0). Más allá de las naves, pero visible en la niebla.
    stars.createSphereEmitter(12000, 0);
    stars.color1 = new BABYLON.Color4(1, 1, 1, 1); 
    stars.color2 = new BABYLON.Color4(1, 1, 1, 1); 
    stars.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    stars.minSize = 5.0;
    stars.maxSize = 20.0;
    stars.minLifeTime = 99999;
    stars.maxLifeTime = 99999;
    stars.emitRate = 60000;
    stars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    stars.start();

    // Textura de llamarada
    const flareTexture = new BABYLON.DynamicTexture("flareTex", {width: 256, height: 256}, scene, false);
    const ctx = flareTexture.getContext();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 256, 256);
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.2, "rgba(255, 150, 50, 0.8)");
    gradient.addColorStop(0.6, "rgba(255, 50, 0, 0.2)");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    flareTexture.update();

    let starDestroyer = null;
    let xWing = null;

    // Textura para partículas
    const particleTexture = whiteFlare;

    // Sistema de partículas para explosiones (POOL REUTILIZABLE)
    // Creamos un pequeño arsenal de 5 sistemas de explosiones que se reciclan continuamente
    // Esto evita fugas de memoria y bloqueos de la tarjeta gráfica (WebGL).
    const explosionPool = [];
    for(let i = 0; i < 5; i++) {
        const sys = new BABYLON.ParticleSystem("explPool" + i, 200, scene);
        sys.particleTexture = flareTexture;
        sys.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        sys.color2 = new BABYLON.Color4(1, 0.1, 0, 1.0);
        sys.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        sys.minSize = 300.0;
        sys.maxSize = 600.0;
        sys.minLifeTime = 0.1;
        sys.maxLifeTime = 0.3;
        sys.createSphereEmitter(10);
        sys.minEmitPower = 100;
        sys.maxEmitPower = 300;
        sys.updateSpeed = 0.02;
        explosionPool.push(sys);
    }
    let poolIndex = 0;

    const createExplosion = (position) => {
        // Tomamos un sistema del pool, lo colocamos en el impacto y lo detonamos
        const sys = explosionPool[poolIndex];
        sys.emitter = position;
        sys.manualEmitCount = 50;
        sys.start();
        
        // Pasamos al siguiente sistema para la próxima explosión
        poolIndex = (poolIndex + 1) % explosionPool.length;
    };

    // Cargar Destructor
    const modelPath = "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_Destructor_Imperial/";
    const modelFile = "destructor+imperial.obj";

    BABYLON.SceneLoader.LoadAssetContainer(modelPath, modelFile, scene, function (container) {
        starDestroyer = BABYLON.Mesh.MergeMeshes(container.meshes, true, true, undefined, false, true);
        if (starDestroyer) {
            starDestroyer.position = new BABYLON.Vector3(800, 400, 1500);
            starDestroyer.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);

            const material = new BABYLON.StandardMaterial("destroyerMat", scene);
            material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); 
            material.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            
            const platesTexture = new BABYLON.BrickProceduralTexture("plates", 512, scene);
            platesTexture.numberOfBricksHeight = 25;
            platesTexture.numberOfBricksWidth = 25;
            platesTexture.brickColor = new BABYLON.Color3(0.7, 0.7, 0.7); 
            platesTexture.jointColor = new BABYLON.Color3(0.5, 0.5, 0.5); 
            material.diffuseTexture = platesTexture;
            material.diffuseTexture.uScale = 8;
            material.diffuseTexture.vScale = 8;
            // Colocar el Destructor en el centro vertical de la escena (Y=0)
            starDestroyer.position = new BABYLON.Vector3(2500, 0, 5000);
            
            // Pista de persecución plana y horizontal
            const trackDir = new BABYLON.Vector3(-2600, 0, -5000).normalize();
            starDestroyer.lookAt(starDestroyer.position.add(trackDir));
            
            // Corrección manual: El modelo 3D (.obj) fue modelado con un ligero desvío hacia su izquierda.
            // Lo rotamos localmente 4 grados hacia la derecha para que la proa física se alinee perfectamente.
            starDestroyer.rotate(BABYLON.Axis.Y, Math.PI / 180 * 4, BABYLON.Space.LOCAL);
            starDestroyer.material = material;
            
            // Hacemos el Destructor TITÁNICO (escala 3.0)
            starDestroyer.scaling = new BABYLON.Vector3(3.0, 3.0, 3.0);

            // Motores (recuperado de la versión inicial)
            const enginePositions = [
                new BABYLON.Vector3(0.00, -8.21, -437.44),     
                new BABYLON.Vector3(-108.12, -8.94, -437.44),  
                new BABYLON.Vector3(107.29, -7.44, -437.44)    
            ];

            // Textura azul para motores
            const blueFlare = new BABYLON.DynamicTexture("blueFlareTex", {width: 256, height: 256}, scene, false);
            const ctxBlue = blueFlare.getContext();
            ctxBlue.fillStyle = "black";
            ctxBlue.fillRect(0, 0, 256, 256);
            const gradBlue = ctxBlue.createRadialGradient(128, 128, 0, 128, 128, 128);
            gradBlue.addColorStop(0, "white");
            gradBlue.addColorStop(0.2, "rgba(100, 200, 255, 0.8)");
            gradBlue.addColorStop(0.6, "rgba(0, 50, 255, 0.2)");
            gradBlue.addColorStop(1, "black");
            ctxBlue.fillStyle = gradBlue;
            ctxBlue.beginPath();
            ctxBlue.arc(128, 128, 128, 0, Math.PI * 2);
            ctxBlue.fill();
            blueFlare.update();

            enginePositions.forEach((pos, idx) => {
                const engineSparks = new BABYLON.ParticleSystem("sparks" + idx, 2000, scene);
                engineSparks.particleTexture = blueFlare;
                const emitter = BABYLON.MeshBuilder.CreateBox("emitter"+idx, {size: 1}, scene);
                emitter.parent = starDestroyer; 
                emitter.position = pos;
                emitter.isVisible = false;
                engineSparks.emitter = emitter;
                engineSparks.color1 = new BABYLON.Color4(0.5, 0.8, 1.0, 1.0);
                engineSparks.color2 = new BABYLON.Color4(0.0, 0.4, 1.0, 1.0);
                engineSparks.colorDead = new BABYLON.Color4(0.0, 0.0, 0.2, 0.0);
                engineSparks.minSize = 15.0;
                engineSparks.maxSize = 40.0;
                engineSparks.minLifeTime = 0.1;
                engineSparks.maxLifeTime = 0.4;
                engineSparks.emitRate = 600;
                engineSparks.createDirectedCylinderEmitter(6, 2, 0, new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(0, 0, -1));
                engineSparks.minEmitPower = 20;
                engineSparks.maxEmitPower = 60;
                engineSparks.updateSpeed = 0.01;
                engineSparks.start();
            });
        }
    });

    // Cargar X-Wing
    let xWingPivot;
    let xWingRollPivot;
    BABYLON.SceneLoader.ImportMeshAsync("", "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_x_wing_fighter/", "scene.gltf", scene).then((result) => {
        xWing = result.meshes[0];
        // Reducimos drásticamente el tamaño del X-Wing para que sea enano comparado con el Destructor
        xWing.scaling = new BABYLON.Vector3(2, 2, 2); 
        
        // Crear un pivote invisible que actuará como centro físico real (movimiento y apuntado global)
        xWingPivot = new BABYLON.TransformNode("xWingPivot", scene);
        
        // Crear pivote secundario para el alabeo (roll local)
        xWingRollPivot = new BABYLON.TransformNode("xWingRollPivot", scene);
        xWingRollPivot.setParent(xWingPivot);
        
        // Colocar la malla directamente en el pivote de alabeo sin offsets engañosos
        xWing.setParent(xWingRollPivot);
        xWing.position = BABYLON.Vector3.Zero();
        
        // En los modelos .gltf, la rotación normal se ignora por el rotationQuaternion.
        // Rotamos localmente +90 grados para que su morro apunte hacia adelante. Al mantener intacto su quaternion original, no volará de lado.
        xWing.rotate(BABYLON.Axis.Y, Math.PI / 2, BABYLON.Space.LOCAL);
        
        resetXWing(); // Inicializa su posición y rumbo
    });

    // Función para resetear el vuelo del X-Wing
    let xWingDirection = new BABYLON.Vector3(0,0,0);
    let xWingProgress = 0; // De 0 a 1 para recorrer la curva
    
    function resetXWing() {
        if(!xWingPivot) return;
        xWingProgress = 0;
    }

    function fireXWingLaser() {
        if(!xWingPivot || !starDestroyer) return;
        
        // Calcular el centro visual real del X-Wing en este momento
        const bounds = xWing.getHierarchyBoundingVectors();
        const visualCenter = bounds.min.add(bounds.max).scale(0.5);
        
        // Disparamos 4 cañones simultáneamente (las alas)
        for (let i = 0; i < 4; i++) {
            const laser = BABYLON.MeshBuilder.CreateCylinder("laser" + i, {height: 100, diameter: 8}, scene);
            laser.rotation.x = Math.PI / 2;
            laser.bakeCurrentTransformIntoVertices();
            
            const mat = new BABYLON.StandardMaterial("greenMat" + i, scene);
            mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
            mat.disableLighting = true;
            laser.material = mat;
            
            // Offsets visuales para que salgan de las 4 alas en lugar del centro
            const offsetX = (i % 2 === 0 ? 50 : -50);
            const offsetY = (i < 2 ? 30 : -30);
            laser.position = visualCenter.add(new BABYLON.Vector3(offsetX, offsetY, 0));
            
            // Apuntar aleatoriamente a distintas partes de la cubierta del Destructor
            const sdCenter = starDestroyer.getBoundingInfo().boundingBox.centerWorld;
            const sdForward = starDestroyer.getDirection(BABYLON.Axis.Z).normalize();
            const sdRight = starDestroyer.getDirection(BABYLON.Axis.X).normalize();
            const sdUp = starDestroyer.getDirection(BABYLON.Axis.Y).normalize();
            
            // Cubrir toda la longitud de la nave (-1300 a +1300)
            const randomZ = (Math.random() * 2600) - 1300;
            
            // ¡CRUCIAL! El Destructor es triangular. Si apuntamos a los lados en la proa, ¡el láser explota en el aire vacío!
            // Calculamos la anchura real de la nave en este punto Z exacto:
            const widthRatio = (1300 - randomZ) / 2600; // 1.0 en la cola, 0.0 en la punta
            const maxW = 400 * widthRatio; // Ancho máximo permitido en este punto
            const randomX = (Math.random() * (maxW * 2)) - maxW; // Siempre dentro del casco de metal
            
            // Altura muy rasante (20 en vez de 200) para que no exploten flotando en el aire
            const deckTarget = sdCenter.add(sdForward.scale(randomZ)).add(sdRight.scale(randomX)).add(sdUp.scale(20));
            laser.lookAt(deckTarget);
            
            lasers.push({
                mesh: laser,
                speed: 1500 + Math.random() * 500, // Velocidad con ligeras variaciones
                isGreen: true,
                targetZ: randomZ, // Guardar coordenada local Z de impacto
                targetX: randomX  // Guardar coordenada local X de impacto
            });
        }
    }

    // Láseres del Destructor Imperial (Rojos, arco de 180º)
    function shootDestroyerLaser() {
        if (!starDestroyer) return;
        const laser = BABYLON.MeshBuilder.CreateCylinder("laserD", {height: 80, diameter: 2.5}, scene);
        laser.rotation.x = Math.PI / 2;
        laser.bakeCurrentTransformIntoVertices(); 
        const mat = new BABYLON.StandardMaterial("laserMatD", scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Rojo
        mat.disableLighting = true;
        laser.material = mat;
        
        // El Destructor mira hacia adelante usando su rotación actual dinámica
        const forwardDir = starDestroyer.getDirection(BABYLON.Axis.Z).normalize();
        
        // Origen del láser en el cuerpo del Destructor, muy desplazado hacia adelante por su tamaño titánico
        laser.position = starDestroyer.position.add(forwardDir.scale(1000)); 
        
        // Generar una dirección hacia el X-Wing con una dispersión tipo batería antiaérea
        let targetDir = forwardDir;
        if (xWingPivot) {
             targetDir = xWingPivot.position.subtract(laser.position).normalize();
        }
        
        let randomDeviation = new BABYLON.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05, 
            (Math.random() - 0.5) * 0.05
        );
        
        let randomDir = targetDir.add(randomDeviation).normalize();
        
        const randomTarget = laser.position.add(randomDir.scale(1000));
        laser.lookAt(randomTarget);
        
        lasers.push({
            mesh: laser,
            speed: 2000,
            isGreen: false
        });
    }

    // Variables de control
    let timeElapsed = 0;
    let nextRedLaser = 1;
    let nextGreenLaser = 1;
    let lasers = [];
    let targetRoll = 0;
    let currentRoll = 0;

    // Escuchar clics del ratón para disparar también
    window.addEventListener("pointerdown", () => {
        fireXWingLaser();
    });

    // Escuchar controles de usuario (Flecha Izquierda: Rojo, Flecha Derecha: Verde, Arriba/Abajo: Esquivar)
    window.addEventListener("keydown", (evt) => {
        if (evt.code === "ArrowLeft") {
            evt.preventDefault();
            shootDestroyerLaser();
        } else if (evt.code === "ArrowRight") {
            evt.preventDefault();
            fireXWingLaser();
        } else if (evt.code === "ArrowUp") {
            evt.preventDefault();
            targetRoll = Math.PI / 3; // Alabear a un lado (60 grados)
        } else if (evt.code === "ArrowDown") {
            evt.preventDefault();
            targetRoll = -Math.PI / 3; // Alabear al otro lado
        }
    });

    window.addEventListener("keyup", (evt) => {
        if (evt.code === "ArrowUp" || evt.code === "ArrowDown") {
            targetRoll = 0; // Volver a estabilizarse
        }
    });

    // Bucle de renderizado
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = engine.getDeltaTime() / 1000;
        timeElapsed += deltaTime;

        // Mover Destructor
        if (starDestroyer) {
            // El Destructor avanza por el nuevo raíl plano
            const trackDir = new BABYLON.Vector3(-2600, 0, -5000).normalize();
            starDestroyer.position.addInPlace(trackDir.scale(150 * deltaTime)); 
        }

        // Mover el X-Wing (Escena de persecución en la misma línea)
        if (xWingPivot && starDestroyer) {
            
            // La misma línea exacta
            const chaseDir = new BABYLON.Vector3(-2600, 0, -5000).normalize();
            
            // El X-Wing mantiene exactamente la misma velocidad para no desaparecer de escena
            xWingProgress += 0 * deltaTime; 
            
            // Utilizamos el CENTRO VISUAL REAL del Destructor en lugar de su pivote de malla (que suele estar desfasado)
            // para garantizar que ambas naves vuelan exactamente por el mismo riel invisible.
            const sdCenter = starDestroyer.getBoundingInfo().boundingBox.centerWorld;
            
            // Arranca 2000 metros por delante (a unos 500m del morro del Destructor)
            xWingPivot.position = sdCenter.add(chaseDir.scale(2000 + xWingProgress));
            
            // Orientamos el X-Wing hacia adelante (huyendo hacia la cámara)
            xWingDirection = chaseDir;
            xWingPivot.lookAt(xWingPivot.position.add(chaseDir));
            
            // Aplicar el alabeo (esquiva visual) si pulsamos las flechas Arriba/Abajo
            if (xWingRollPivot) {
                // Rotamos el pivote de alabeo, manteniendo intacta la malla xWing original y su Cuaternión
                currentRoll = BABYLON.Scalar.Lerp(currentRoll, targetRoll, 5 * deltaTime);
                xWingRollPivot.rotation.z = currentRoll;
            }
        }
        
        // Mover láseres
        for (let i = lasers.length - 1; i >= 0; i--) {
            let laserObj = lasers[i];
            let mesh = laserObj.mesh;
            
            // Si es un láser verde del X-Wing, actualizamos su puntería en tiempo real (misil de seguimiento ligero)
            // porque el Destructor se mueve muy rápido y si disparamos a coordenadas fijas, el láser falla.
            if (laserObj.isGreen && laserObj.targetZ !== undefined && starDestroyer) {
                const sdCenter = starDestroyer.getBoundingInfo().boundingBox.centerWorld;
                const sdForward = starDestroyer.getDirection(BABYLON.Axis.Z).normalize();
                const sdRight = starDestroyer.getDirection(BABYLON.Axis.X).normalize();
                const sdUp = starDestroyer.getDirection(BABYLON.Axis.Y).normalize();
                
                // Coordenadas dinámicas de impacto en la cubierta (rasante a 20)
                laserObj.currentTarget = sdCenter.add(sdForward.scale(laserObj.targetZ)).add(sdRight.scale(laserObj.targetX)).add(sdUp.scale(20));
                mesh.lookAt(laserObj.currentTarget);
            }
            
            // Avanzar en la dirección de 'forward'
            mesh.position.addInPlace(mesh.forward.scale(laserObj.speed * deltaTime));
            
            // Colisiones de láseres verdes contra el Destructor
            if (laserObj.isGreen && laserObj.currentTarget) {
                // El láser comprueba la distancia hasta su objetivo real y actualizado
                const dist = BABYLON.Vector3.Distance(mesh.position, laserObj.currentTarget);
                
                // Si el láser entra en un radio muy pequeño de su objetivo final
                if (dist < 200) {
                    createExplosion(mesh.position.clone()); 
                    mesh.dispose();
                    lasers.splice(i, 1);
                    continue; // Saltar a la siguiente iteración
                }
            }
            
            // Destruir si se alejan mucho del origen
            if (mesh.position.length() > 20000) {
                mesh.dispose();
                lasers.splice(i, 1);
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
