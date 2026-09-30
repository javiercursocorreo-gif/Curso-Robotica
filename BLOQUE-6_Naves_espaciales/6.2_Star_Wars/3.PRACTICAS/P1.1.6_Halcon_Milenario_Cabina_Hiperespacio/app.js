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

    // --- CABINA 3D ---
    const cockpitMaterial = new BABYLON.StandardMaterial("cockpitMat", scene);
    cockpitMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); 
    cockpitMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // Negro puro (Silueta contra las estrellas)
    
    // --- MARCO DE LA VENTANA (Diseño simple: 2 semicírculos y 2 radios) ---
    
    let hubCenter = new BABYLON.Vector3(0, -1.5, -45); // Centro bajado al borde del salpicadero para que se vean solo como semicírculos

    let rInner = 3.0;   // Semicircunferencia interior
    let rOuter = 8.0;   // Semicircunferencia exterior (llega a los extremos de la ventana)

    // 1. Semicircunferencia interior
    let innerRing = BABYLON.MeshBuilder.CreateTorus("innerRing", {diameter: rInner*2, thickness: 0.2, tessellation: 64}, scene);
    innerRing.position = hubCenter;
    innerRing.rotation.x = Math.PI / 2;
    innerRing.material = cockpitMaterial;
    
    // 2. Semicircunferencia exterior
    let outerRing = BABYLON.MeshBuilder.CreateTorus("outerRing", {diameter: rOuter*2, thickness: 0.3, tessellation: 64}, scene);
    outerRing.position = hubCenter;
    outerRing.rotation.x = Math.PI / 2;
    outerRing.material = cockpitMaterial;

    // 3. Dos radios que las unen (En diagonal a izquierda y derecha: 45 y 135 grados)
    let angles = [Math.PI / 4, Math.PI * 3 / 4]; 
    for (let i = 0; i < 2; i++) {
        let angle = angles[i];
        let pStart = new BABYLON.Vector3(hubCenter.x + Math.cos(angle)*rInner, hubCenter.y + Math.sin(angle)*rInner, hubCenter.z);
        let pEnd = new BABYLON.Vector3(hubCenter.x + Math.cos(angle)*rOuter, hubCenter.y + Math.sin(angle)*rOuter, hubCenter.z);
        
        let strut = BABYLON.MeshBuilder.CreateTube("strut"+i, {path: [pStart, pEnd], radius: 0.15}, scene);
        strut.material = cockpitMaterial;
    }

    // --- SALPICADERO ---
    const dash = BABYLON.MeshBuilder.CreateBox("dash", {width: 7, height: 1.5, depth: 1.5}, scene);
    dash.position = new BABYLON.Vector3(0, -2.5, -45.5);
    dash.rotation.x = -Math.PI / 8; // Inclinado hacia la cámara
    dash.material = cockpitMaterial;
    
    // --- PANELES DE LUCES (Izquierdo y Derecho) ---
    const createPanel = (name, xPos, colorsList) => {
        const panel = BABYLON.MeshBuilder.CreateBox(name, {width: 2, height: 0.05, depth: 1.2}, scene);
        panel.parent = dash;
        panel.position = new BABYLON.Vector3(xPos, 0.77, 0);
        panel.material = cockpitMaterial;
        
        // Cuadrícula de 3x3 botones luminosos
        for(let r=0; r<3; r++) {
            for(let c=0; c<3; c++) {
                let btn = BABYLON.MeshBuilder.CreateBox("btn"+name+r+c, {width: 0.25, height: 0.1, depth: 0.25}, scene);
                btn.parent = panel;
                btn.position = new BABYLON.Vector3(-0.6 + c*0.6, 0.025, -0.4 + r*0.4);
                let mat = new BABYLON.StandardMaterial("btnMat"+name+r+c, scene);
                mat.emissiveColor = colorsList[Math.floor(Math.random()*colorsList.length)];
                mat.disableLighting = true; // Hacemos que brillen puros sin importar las sombras
                btn.material = mat;
            }
        }
    };
    
    // Panel Izquierdo: Tonos azules y blancos
    createPanel("leftPanel", -2.2, [new BABYLON.Color3(0.2, 0.8, 1), new BABYLON.Color3(1, 1, 1)]);
    // Panel Derecho: Tonos rojos y amarillos
    createPanel("rightPanel", 2.2, [new BABYLON.Color3(1, 0.2, 0.2), new BABYLON.Color3(1, 0.8, 0.2)]);

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

    scene.onBeforeRenderObservable.add(() => {
        if (isWarping) {
            warpProgress += 0.055; 
            if (warpProgress > 1) warpProgress = 1;
        } else {
            warpProgress -= 0.015; 
            if (warpProgress <= 0) {
                warpProgress = 0;
                if (telemetry.innerText.includes("FRENANDO")) telemetry.innerText = "HYPERDRIVE: EN ESPERA";
            }
        }

        // Velocidad de movimiento hacia el foco (la cámara)
        let currentSpeed = baseStarSpeed + (warpProgress * 80); 

        SPS.particles.forEach(p => {
            // Avanzar hacia la cámara (Z negativo)
            p.position.z -= currentSpeed;
            
            // Si la estrella se queda atrás de la cámara, reaparece en el fondo
            if (p.position.z < -100) {
                p.position.z = 1200 + Math.random() * 200;
            }

            // Escala (estiramiento del salto)
            p.scale.x = 1 - (warpProgress * 0.8); 
            p.scale.y = 1 - (warpProgress * 0.8);
            p.scale.z = 1 + (warpProgress * 800); 
        });
        
        SPS.setParticles();
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
