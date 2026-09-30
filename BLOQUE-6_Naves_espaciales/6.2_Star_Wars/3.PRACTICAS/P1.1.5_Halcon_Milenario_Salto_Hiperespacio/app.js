const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- CÁMARA ESTÁTICA ---
    // Volvemos a la cámara fija mirando hacia adelante
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, -50), scene);
    camera.setTarget(BABYLON.Vector3.Zero());

    // --- LUCES ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(1, -1, 1), scene);
    dirLight.intensity = 1.5;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE HALCÓN MILENARIO ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    
    // Lo posicionamos en el vértice izquierdo inferior
    shipRoot.position = new BABYLON.Vector3(-15, -8, 0);
    // Lo rotamos para verlo desde arriba (X), mostrando el culo y un poco de lado (Y)
    shipRoot.rotation = new BABYLON.Vector3(-Math.PI / 8, Math.PI / 10, Math.PI / 24);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_halcon_milenario/",
            "scene.gltf",
            scene
        );

        const model = result.meshes[0];

        // --- CENTRADO GEOMÉTRICO (Bugfix del origen del Halcón) ---
        const boundingInfo = model.getHierarchyBoundingVectors();
        const center = boundingInfo.max.add(boundingInfo.min).scale(0.5);
        model.position = center.scale(-1);

        model.setParent(shipRoot);
        
        // Escala del Halcón Milenario (muy reducida porque el modelo real es gigantesco)
        shipRoot.scaling = new BABYLON.Vector3(0.04, 0.04, 0.04); 

        // --- MEJORA DE CALIDAD VISUAL (Filtro Anisotrópico Avanzado) ---
        engine.setHardwareScalingLevel(0.5); 
        scene.textures.forEach(texture => {
            if (texture.updateSamplingMode) {
                texture.updateSamplingMode(3);
                texture.anisotropicFilteringLevel = 16;
            }
        });

    } catch (e) {
        console.error("Error cargando el Halcón Milenario:", e);
    }

    // --- SISTEMA DE ESTRELLAS (Solid Particle System) ---
    const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
    // TRUCO ÓPTICO: Hacemos los puntos mucho más GRANDES (0.5)
    // Así tu monitor es capaz de pintarlos aunque estén lejísimos, y el cielo parecerá lleno.
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {width: 0.5, height: 0.5, depth: 0.5});
    // Límite de seguridad ampliado a 2000 estrellas.
    SPS.addShape(starShape, 2000);
    starShape.dispose();
    const starsMesh = SPS.buildMesh();
    
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starMat.disableLighting = true;
    starsMesh.material = starMat;

    SPS.initParticles = function() {
        for (let p = 0; p < SPS.nbParticles; p++) {
            const particle = SPS.particles[p];
            // Generamos las estrellas evitando un "túnel" central para que ninguna atraviese la nave
            do {
                particle.position.x = (Math.random() - 0.5) * 500;
                particle.position.y = (Math.random() - 0.5) * 500;
            } while (particle.position.x > -40 && particle.position.x < 40 && particle.position.y > -30 && particle.position.y < 30);
            
            particle.position.z = Math.random() * 1200;
        }
    };
    SPS.initParticles();
    SPS.setParticles();

    // --- LÓGICA DE ESTADOS ---
    let isCharging = false;
    let isWarping = false;
    let warpProgress = 0;
    let baseStarSpeed = 0.5;
    let chargeTimeout = null;

    let chargeSign = document.getElementById("charge-sign");
    const btnWarp = document.getElementById("btn-warp");
    const telemetry = document.getElementById("telemetry");

    btnWarp.addEventListener("click", () => {
        if (!isWarping && !isCharging) {
            isCharging = true;
            chargeSign.style.display = "block"; // Mostrar cartel
            telemetry.innerText = "HYPERDRIVE: CALCULANDO RUTA...";
            btnWarp.innerText = "ABORTAR SALTO";
            btnWarp.classList.add("danger");

            // Acumula energía durante 2 segundos exactos
            chargeTimeout = setTimeout(() => {
                isCharging = false;
                isWarping = true;
                chargeSign.style.display = "none"; // Quitar cartel EXACTAMENTE al saltar
                telemetry.innerText = "HYPERDRIVE: EN EL HIPERESPACIO";
                btnWarp.innerText = "SALIDA DEL HIPERESPACIO";
                btnWarp.classList.remove("danger");
            }, 2000);
            
        } else if (isCharging) {
            // El usuario se arrepiente durante la carga
            isCharging = false;
            clearTimeout(chargeTimeout);
            chargeSign.style.display = "none";
            telemetry.innerText = "HYPERDRIVE: EN ESPERA";
            btnWarp.innerText = "SALTAR AL HIPERESPACIO";
            btnWarp.classList.remove("danger");

        } else if (isWarping) {
            // Salir del salto
            isWarping = false;
            telemetry.innerText = "HYPERDRIVE: DESACTIVANDO - FRENANDO";
            btnWarp.innerText = "SALTAR AL HIPERESPACIO";
            btnWarp.classList.remove("danger");
        }
    });

    // POSICIÓN BASE PARA VIBRACIÓN
    const baseX = shipRoot.position.x;
    const baseY = shipRoot.position.y;

    scene.onBeforeRenderObservable.add(() => {
        let oldWarpProgress = warpProgress;
        
        if (isWarping) {
            // Salto más rápido: Avanza un 5.5% cada frame, terminando el salto casi al instante.
            warpProgress += 0.055; 
            if (warpProgress > 1) warpProgress = 1;
        } else {
            // Frenada más suave para verla volver
            warpProgress -= 0.015; 
            if (warpProgress <= 0) {
                warpProgress = 0;
                if (telemetry.innerText.includes("FRENANDO")) telemetry.innerText = "HYPERDRIVE: EN ESPERA";
            }
        }

        // OPTIMIZACIÓN EXTREMA: Las estrellas son FIJAS. Solo se estiran durante el salto.
        if (Math.abs(warpProgress - oldWarpProgress) > 0.0001) {
            SPS.particles.forEach(p => {
                // Al aplastarlas un 80% (0.8), conseguimos el punto medio exacto:
                // Ni tan finas que desaparecen y se oscurece, ni tan gruesas que te ciegan de luz blanca.
                p.scale.x = 1 - (warpProgress * 0.8); 
                p.scale.y = 1 - (warpProgress * 0.8);
                p.scale.z = 1 + (warpProgress * 1200); // Se estiran (0.5 * 1200 = 600m de largo)
            });
            SPS.setParticles();
        }

        // --- ANIMACIÓN DE LA NAVE ---
        // Interpolamos la posición y escala
        let easing = Math.pow(warpProgress, 4); // Curva suavizada para no dar saltos bruscos
        let targetX = BABYLON.Scalar.Lerp(baseX, 0, easing);
        let targetY = BABYLON.Scalar.Lerp(baseY, 0, easing);
        // Distancia máxima reducida a 500 para evitar que viaje demasiada distancia en un solo fotograma (lo que causaba el tartamudeo)
        let targetZ = BABYLON.Scalar.Lerp(10, 500, easing); 
        let targetScale = BABYLON.Scalar.Lerp(0.04, 0.0001, easing);

        // NAVE FIJA (Sin vibración)
        shipRoot.position.x = targetX;
        shipRoot.position.y = targetY;
        shipRoot.position.z = targetZ;
        shipRoot.scaling = new BABYLON.Vector3(targetScale, targetScale, targetScale);
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
