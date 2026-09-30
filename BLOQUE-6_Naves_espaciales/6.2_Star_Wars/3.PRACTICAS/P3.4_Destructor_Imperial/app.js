const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    
    // Fondo espacial (negro)
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // --- EFECTO DE PÉRDIDA EN EL INFINITO ---
    // Usamos una niebla negra exponencial. A medida que la nave se aleja,
    // se irá fundiendo con el fondo hasta desaparecer completamente.
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0003; // Niebla muy suave para que la nave pueda alejarse muchísimo y hacerse diminuta
    scene.fogColor = new BABYLON.Color3(0, 0, 0);

    // Cámara
    // La colocamos para mirar hacia adelante y algo hacia arriba para ver pasar el casco
    const camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 15, 100));
    // Cámara fija sin controles para la cinemática


    // Luces
    const hemisphericLight = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.3; // Luz base para la parte superior

    // Luz inferior para iluminar bien la "panza" de la nave
    const bottomLight = new BABYLON.HemisphericLight("bottomLight", new BABYLON.Vector3(0, -1, 0), scene);
    bottomLight.intensity = 0.8; 

    // Luz direccional simulando el sol/estrella local para resaltar relieves de la nave
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -1, -1), scene);
    dirLight.position = new BABYLON.Vector3(100, 100, 100);
    dirLight.intensity = 0.8;

    // Crear estrellas de fondo lejano (infinito)
    const stars = new BABYLON.ParticleSystem("stars", 30000, scene);
    // Usamos un píxel blanco puro en Base64 para garantizar al 100% que no haya tintes rojos ni cachés
    const whitePixelBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    stars.particleTexture = new BABYLON.Texture(whitePixelBase64, scene);
    stars.emitter = new BABYLON.Vector3(0, 0, 0); // Emitir desde el centro
    // Las empujamos muy al fondo (Z=8000 a 10000) para que la nave NUNCA las atraviese
    // Ampliamos enormemente la caja en X e Y para que cubra pantallas ultrapanorámicas sin dejar bordes negros
    stars.minEmitBox = new BABYLON.Vector3(-20000, -10000, 8000); 
    stars.maxEmitBox = new BABYLON.Vector3(20000, 10000, 10000); 
    stars.color1 = new BABYLON.Color4(1, 1, 1, 1); // Blanco puro
    stars.color2 = new BABYLON.Color4(1, 1, 1, 1); // Blanco puro
    stars.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    // Como están 10 veces más lejos, su tamaño real debe ser 10 veces mayor para verse iguales
    stars.minSize = 5.0;
    stars.maxSize = 20.0;
    stars.minLifeTime = 99999;
    stars.maxLifeTime = 99999;
    stars.emitRate = 30000;
    stars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    stars.gravity = new BABYLON.Vector3(0, 0, 0);
    stars.direction1 = new BABYLON.Vector3(0, 0, 0);
    stars.direction2 = new BABYLON.Vector3(0, 0, 0);
    stars.minAngularSpeed = 0;
    stars.maxAngularSpeed = 0;
    stars.minInitialRotation = 0;
    stars.maxInitialRotation = 0;
    stars.start();

    // Modelos y Sonido
    let starDestroyer = null;
    let rumbleSound = null;
    const allEngineSparks = []; // Para arrancar los motores en el momento exacto

    // Cargar el modelo del Destructor Estelar
    // Ruta relativa hasta llegar a la carpeta MODELOS: ../../../../MODELOS/...
    const modelPath = "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_Destructor_Imperial/";
    const modelFile = "destructor+imperial.obj";

    BABYLON.SceneLoader.LoadAssetContainer(
        modelPath, 
        modelFile, 
        scene, 
        function (container) {
            let newMeshes = container.meshes;
            console.log("Destructor cargado con éxito. Número de mallas:", newMeshes.length);
            
            // Agrupar mallas (el .obj puede venir en varias partes). 
            // LoadAssetContainer evita que las partes se dibujen en pantalla mientras se cargan.
            starDestroyer = BABYLON.Mesh.MergeMeshes(newMeshes, true, true, undefined, false, true);
            
            if (starDestroyer) {
                // Bajamos un poco la altura a 15 para que esté más cerca de la cámara
                starDestroyer.position = new BABYLON.Vector3(0, 15, 0);
                starDestroyer.rotation.y = 0;

                // Escalar (ajustar según el tamaño real del modelo)
                starDestroyer.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);

                // Material más oscuro para el gris imperial
                const material = new BABYLON.StandardMaterial("destroyerMat", scene);
                material.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15); // Gris mucho más oscuro
                material.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                
                // Añadir textura procedural tipo "Ladrillos" para simular placas cuadradas/lineales
                const platesTexture = new BABYLON.BrickProceduralTexture("plates", 512, scene);
                platesTexture.numberOfBricksHeight = 25;
                platesTexture.numberOfBricksWidth = 25;
                // Aclaramos mucho los colores para que las placas se vean bien con la luz
                platesTexture.brickColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gris claro medio
                platesTexture.jointColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Juntas un poco más oscuras
                
                material.diffuseTexture = platesTexture;
                // Escalamos para que las placas se vean más pequeñas en la nave inmensa
                material.diffuseTexture.uScale = 8;
                material.diffuseTexture.vScale = 8;

                starDestroyer.material = material;
                
                // Ocultar la nave hasta que llegue su momento
                starDestroyer.scaling = new BABYLON.Vector3(0, 0, 0); // Escalar a 0 evita fogonazos de 1 frame
                starDestroyer.setEnabled(false);

                // Calcular dimensiones reales del modelo
                starDestroyer.computeWorldMatrix(true);
                const bounds = starDestroyer.getBoundingInfo().boundingBox;
                const maxZ = bounds.maximum.z;
                
                // Mover la nave para que la proa (maxZ) ya esté un poco por delante de la cámara (Z=30)
                // Esto garantiza que la veamos asomar desde el primer fotograma en que se activa.
                starDestroyer.position.z = -maxZ + 30;

                // Motores echando chispas azules con las coordenadas EXACTAS calibradas por el usuario (y subidas un poquito)
                const enginePositions = [
                    new BABYLON.Vector3(0.00, -8.21, -437.44),     // Motor central (antes -10.21)
                    new BABYLON.Vector3(-108.12, -8.94, -437.44),  // Motor izquierdo (antes -10.94)
                    new BABYLON.Vector3(107.29, -7.44, -437.44)    // Motor derecho (antes -9.44)
                ];

                // CREAR TEXTURA DE DESTELLO PROCEDURAL (Sin red, sin fallos)
                const flareTexture = new BABYLON.DynamicTexture("flareTex", {width: 256, height: 256}, scene, false);
                const ctx = flareTexture.getContext();
                ctx.fillStyle = "black"; // Fondo negro para suma de luces
                ctx.fillRect(0, 0, 256, 256);
                const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
                gradient.addColorStop(0, "white"); // Centro candente
                gradient.addColorStop(0.2, "rgba(100, 200, 255, 0.8)"); // Halo interno
                gradient.addColorStop(0.6, "rgba(0, 50, 255, 0.2)"); // Halo externo
                gradient.addColorStop(1, "black"); // Borde difuminado
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(128, 128, 128, 0, Math.PI * 2);
                ctx.fill();
                flareTexture.update();
                // --- EL SONIDO SE CREA EN EL EVENTO CLICK COMO EN BB8 ---

                enginePositions.forEach((pos, idx) => {
                    // Luz azul para iluminar la cola de la nave
                    const engineLight = new BABYLON.PointLight("engineLight" + idx, pos, scene);
                    engineLight.parent = starDestroyer;
                    engineLight.diffuse = new BABYLON.Color3(0.1, 0.6, 1.0);
                    engineLight.intensity = 2;

                    // Chispas/fuego del motor
                    const engineSparks = new BABYLON.ParticleSystem("sparks" + idx, 2000, scene);
                    // Asignamos nuestra textura redonda e invencible
                    engineSparks.particleTexture = flareTexture;
                    
                    // Emisor anclado al destructor
                    const emitter = BABYLON.MeshBuilder.CreateBox("emitter"+idx, {size: 1}, scene);
                    emitter.parent = starDestroyer; 
                    emitter.position = pos;
                    emitter.isVisible = false; // Ocultamos las cajas rosas
                    
                    engineSparks.emitter = emitter;
                    
                    // Azul eléctrico resplandeciente
                    engineSparks.color1 = new BABYLON.Color4(0.5, 0.8, 1.0, 1.0);
                    engineSparks.color2 = new BABYLON.Color4(0.0, 0.4, 1.0, 1.0);
                    engineSparks.colorDead = new BABYLON.Color4(0.0, 0.0, 0.2, 0.0);
                    
                    // Más grandes, redondeados y con parpadeo (vidas más cortas e irregulares)
                    engineSparks.minSize = 15.0;
                    engineSparks.maxSize = 40.0;
                    engineSparks.minLifeTime = 0.1;
                    engineSparks.maxLifeTime = 0.4;
                    engineSparks.emitRate = 600; // Menos partículas pero gigantes da efecto parpadeo inestable
                    
                    // Emitir en dirección Z negativo (hacia atrás)
                    engineSparks.createDirectedCylinderEmitter(6, 2, 0, new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(0, 0, -1));
                    
                    engineSparks.minEmitPower = 20;
                    engineSparks.maxEmitPower = 60;
                    engineSparks.updateSpeed = 0.01;
                    
                    // No arrancamos los motores aquí para evitar un pantallazo blanco en la cámara (0,0,0)
                    allEngineSparks.push(engineSparks);
                });
            } else {
                console.warn("No se pudo agrupar el modelo.");
            }
        },
        function (evt) {
            // Progreso de carga
            if (evt.lengthComputable) {
                const percentage = (evt.loaded * 100 / evt.total).toFixed();
                console.log("Cargando modelo: " + percentage + "%");
            }
        },
        function (scene, message, exception) {
            console.error("Error cargando modelo:", message, exception);
        }
    );

    // Variables de control de tiempo
    let timeElapsed = 0;
    let shipStarted = false;
    // Entrar en escena exactamente en el segundo 29
    const startMovingShipTime = 29; 

    // Bucle de renderizado y animación
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = engine.getDeltaTime() / 1000; // a segundos
        timeElapsed += deltaTime;

        // Animar el Destructor Estelar
        if (starDestroyer && timeElapsed > startMovingShipTime) {
            if (!shipStarted) {
                // Restaurar el tamaño y mostrar la nave
                starDestroyer.scaling = new BABYLON.Vector3(1, 1, 1);
                starDestroyer.setEnabled(true); // Mostrar nave
                shipStarted = true;
                
                // Arrancamos el fuego de los motores AHORA, cuando la nave está lejos
                allEngineSparks.forEach(sparks => sparks.start());
            }
            
            // La nave avanza de forma incesante.
            // Para que no tarde 10 minutos en desaparecer, aceleramos gradualmente cuando ya ha pasado por encima nuestro
            const distanceZ = starDestroyer.position.z;
            const speed = 12 + Math.max(0, distanceZ - 200) * 0.1;
            starDestroyer.position.z += speed * deltaTime; 
            
            // Apagar lentamente el fuego al entrar en la niebla profunda lejana (infinito)
            if (distanceZ > 4000) {
                // fadeZ va de 1.0 (en z=4000) bajando hasta 0.0 (en z=6000)
                const fadeZ = Math.max(0, 6000 - distanceZ) / 2000;
                allEngineSparks.forEach(sparks => {
                    sparks.emitRate = 600 * fadeZ;
                });
            }
        } // Fin del if (starDestroyer && timeElapsed > ...)
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

// Ajustar tamaño si cambia la ventana
window.addEventListener("resize", function () {
    engine.resize();
});
