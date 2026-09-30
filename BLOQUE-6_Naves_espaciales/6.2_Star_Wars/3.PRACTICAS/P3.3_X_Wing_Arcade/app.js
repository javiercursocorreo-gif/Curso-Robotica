const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

    // --- GAME STATE ---
    let gameState = "PLAYING";
    let score = 0;
    let distanceToTower = 5000;
    const enemies = [];
    const uiScore = document.getElementById("hud-score");
    const gameScreen = document.getElementById("game-screen");
    const gameTitle = document.getElementById("game-title");
    const scoreDisplay = document.getElementById("score-display");

    // --- CÁMARA ESTÁTICA ---
    const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -60), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    
    // --- ILUMINACIÓN ---
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6; 
    
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.8, -1, 0.5), scene);
    dirLight.intensity = 1.2;

    const gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.2;

    // --- NAVE X-WING ---
    const shipRoot = new BABYLON.TransformNode("shipRoot", scene);
    shipRoot.position = new BABYLON.Vector3(0, -2, -35); 
    
    const alignNode = new BABYLON.TransformNode("alignNode", scene);
    alignNode.parent = shipRoot;
    alignNode.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);

    const cannonL = new BABYLON.TransformNode("cannonL", scene);
    cannonL.parent = alignNode;
    cannonL.position = new BABYLON.Vector3(0.2, 0.02, -0.4); 
    
    const cannonR = new BABYLON.TransformNode("cannonR", scene);
    cannonR.parent = alignNode;
    cannonR.position = new BABYLON.Vector3(0.2, 0.02, 0.4);

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "../../../../MODELOS/STAR%20WARS/2.NAVES_Y_VEHICULOS/star_wars_-_x_wing_fighter/", "scene.gltf", scene);
        const model = result.meshes[0];
        
        model.parent = alignNode;
        if (model.rotationQuaternion) model.rotationQuaternion = null;
        model.rotation = BABYLON.Vector3.Zero();
        
        model.parent = null;
        model.position = BABYLON.Vector3.Zero();
        model.scaling = BABYLON.Vector3.One();
        model.computeWorldMatrix(true);
        
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        
        model.getChildMeshes().forEach(m => {
            if (m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const b = m.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
            }
        });
        
        const center = max.add(min).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        const scaleFactor = 1 / maxDimension;
        model.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
        model.position = center.scale(-scaleFactor);
        
        model.parent = alignNode;
        shipRoot.scaling = new BABYLON.Vector3(20, 20, 20); 
    } catch (e) {
        console.error("Error cargando el X-Wing:", e);
    }

    // --- EFECTOS VISUALES (EXPLOSIONES) ---
    const particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 0.1, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    particleSystem.minSize = 2;
    particleSystem.maxSize = 8;
    particleSystem.minLifeTime = 0.2;
    particleSystem.maxLifeTime = 0.8;
    particleSystem.emitRate = 0; 
    particleSystem.createSphereEmitter(3);
    
    const explode = (pos) => {
        particleSystem.emitter = pos;
        particleSystem.manualEmitCount = 100;
        particleSystem.start();
    };

    // (Efectos visuales eliminados por petición del usuario para volver a la versión limpia)

    // --- ENEMIGOS: TIE FIGHTER PROCEDURAL ---
    const tieRoot = new BABYLON.TransformNode("tieTemplate", scene);
    const tieMat = new BABYLON.StandardMaterial("tieMat", scene);
    tieMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    tieMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    
    const cockpit = BABYLON.MeshBuilder.CreateSphere("cockpit", {diameter: 4}, scene);
    cockpit.parent = tieRoot;
    cockpit.material = tieMat;
    
    const strut = BABYLON.MeshBuilder.CreateCylinder("strut", {height: 6, diameter: 0.8}, scene);
    strut.rotation.z = Math.PI / 2;
    strut.parent = tieRoot;
    strut.material = tieMat;
    
    const panelL = BABYLON.MeshBuilder.CreateBox("panelL", {width: 0.2, height: 8, depth: 6}, scene);
    panelL.position.x = -3;
    panelL.parent = tieRoot;
    panelL.material = tieMat;
    
    const panelR = BABYLON.MeshBuilder.CreateBox("panelR", {width: 0.2, height: 8, depth: 6}, scene);
    panelR.position.x = 3;
    panelR.parent = tieRoot;
    panelR.material = tieMat;
    
    tieRoot.setEnabled(false);

    // --- SISTEMA DE ESTRELLAS ---
    const starSPS = new BABYLON.SolidParticleSystem("starSPS", scene);
    const starShape = BABYLON.MeshBuilder.CreateBox("star", {size: 0.8});
    starSPS.addShape(starShape, 800); 
    starShape.dispose(); 
    const starsMesh = starSPS.buildMesh();
    const starMat = new BABYLON.StandardMaterial("starMat", scene);
    starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starsMesh.material = starMat;
    starMat.disableLighting = true;

    starSPS.initParticles = function() {
        for (let p = 0; p < starSPS.nbParticles; p++) {
            const particle = starSPS.particles[p];
            particle.position.x = (Math.random() - 0.5) * 1000; 
            particle.position.y = 40 + Math.random() * 400; 
            particle.position.z = Math.random() * 700; 
        }
    };
    starSPS.initParticles();
    starSPS.setParticles();

    // --- TRINCHERA PROCEDURAL ---
    const trenchSPS = new BABYLON.SolidParticleSystem("trenchSPS", scene);
    const blockShape = BABYLON.MeshBuilder.CreateBox("block", {width: 10, height: 20, depth: 10});
    trenchSPS.addShape(blockShape, 400); 
    blockShape.dispose();
    const trenchMesh = trenchSPS.buildMesh();
    
    const blockMat = new BABYLON.StandardMaterial("blockMat", scene);
    blockMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4); 
    blockMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    trenchMesh.material = blockMat;

    trenchSPS.initParticles = function() {
        for (let p = 0; p < trenchSPS.nbParticles; p++) {
            const particle = trenchSPS.particles[p];
            if (p < 200) {
                let side = p % 2 === 0 ? -1 : 1;
                particle.position.x = side * (45 + Math.random() * 35); 
                particle.position.y = -10 + Math.random() * 15; 
                particle.position.z = Math.random() * 1000; 
                particle.scale.x = 0.5 + Math.random() * 4; 
                particle.scale.y = 0.5 + Math.random() * 5; 
                particle.scale.z = 0.5 + Math.random() * 4; 
            } else {
                particle.position.x = (Math.random() - 0.5) * 85; 
                particle.position.y = -12; 
                particle.position.z = Math.random() * 1000;
                particle.scale.x = 0.5 + Math.random() * 1.5;
                particle.scale.y = 0.1 + Math.random() * 0.4; 
                particle.scale.z = 0.5 + Math.random() * 1.5;
            }
        }
    };
    trenchSPS.initParticles();
    trenchSPS.setParticles();

    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 150, height: 2000}, scene);
    ground.position.y = -12;
    ground.position.z = 500;
    ground.material = blockMat;

    // --- META: TORRE DEL PUERTO DE ESCAPE ---
    const towerRoot = new BABYLON.TransformNode("towerRoot", scene);
    const horizonMat = new BABYLON.StandardMaterial("horizonMat", scene);
    horizonMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); 
    horizonMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Muro Izquierdo
    const wL = BABYLON.MeshBuilder.CreateBox("wL", {width: 200, height: 200, depth: 40}, scene);
    wL.position.x = -120;
    wL.position.y = 80;
    wL.parent = towerRoot;
    wL.material = horizonMat;

    // Muro Derecho
    const wR = BABYLON.MeshBuilder.CreateBox("wR", {width: 200, height: 200, depth: 40}, scene);
    wR.position.x = 120;
    wR.position.y = 80;
    wR.parent = towerRoot;
    wR.material = horizonMat;

    // Muro Superior (Baja hasta Y = 8)
    const wT = BABYLON.MeshBuilder.CreateBox("wT", {width: 40, height: 160, depth: 40}, scene);
    wT.position.x = 0;
    wT.position.y = 88; // 8 + 80
    wT.parent = towerRoot;
    wT.material = horizonMat;

    // Muro Inferior (Sube hasta Y = -12, alineado con el suelo base)
    const wB = BABYLON.MeshBuilder.CreateBox("wB", {width: 40, height: 25, depth: 40}, scene);
    wB.position.x = 0;
    wB.position.y = -24.5; // -12 - 12.5
    wB.parent = towerRoot;
    wB.material = horizonMat;
    
    // Puerto de Escape (Agujero Central: x:-20 a 20, y:-12 a 8) -> Altura exacta de la nave
    const exhaustPort = BABYLON.MeshBuilder.CreateBox("exhaustPort", {width: 38, height: 19, depth: 40}, scene);
    exhaustPort.position.y = -2; // Centrado exacto con la nave
    exhaustPort.parent = towerRoot;
    const portMat = new BABYLON.StandardMaterial("portMat", scene);
    portMat.emissiveColor = new BABYLON.Color3(0, 0.5, 1); // Brillante azul estelar
    portMat.alpha = 0.5;
    exhaustPort.material = portMat;

    towerRoot.position.z = distanceToTower;

    // --- CONTROLES DE JUEGO ---
    const keys = { left: false, right: false, space: false };
    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnFire = document.getElementById("btn-fire");

    if (btnLeft) {
        btnLeft.addEventListener("mousedown", () => keys.left = true);
        btnLeft.addEventListener("mouseup", () => keys.left = false);
        btnLeft.addEventListener("mouseleave", () => keys.left = false);
        btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys.left = true; }, {passive: false});
        btnLeft.addEventListener("touchend", () => keys.left = false);
    }
    if (btnRight) {
        btnRight.addEventListener("mousedown", () => keys.right = true);
        btnRight.addEventListener("mouseup", () => keys.right = false);
        btnRight.addEventListener("mouseleave", () => keys.right = false);
        btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys.right = true; }, {passive: false});
        btnRight.addEventListener("touchend", () => keys.right = false);
    }

    const lasers = [];
    const fireLaser = () => {
        if (gameState !== "PLAYING") return;
        const laserL = BABYLON.MeshBuilder.CreateCylinder("laserL", {height: 8, diameter: 0.4}, scene);
        const laserR = BABYLON.MeshBuilder.CreateCylinder("laserR", {height: 8, diameter: 0.4}, scene);
        const laserMat = new BABYLON.StandardMaterial("laserMat", scene);
        laserMat.emissiveColor = new BABYLON.Color3(0.1, 1, 0.1); 
        laserMat.disableLighting = true;
        laserL.material = laserMat; laserR.material = laserMat;
        laserL.rotation.x = Math.PI / 2; laserR.rotation.x = Math.PI / 2;
        laserL.position = cannonL.getAbsolutePosition().clone();
        laserR.position = cannonR.getAbsolutePosition().clone();
        lasers.push(laserL, laserR);
    };

    if (btnFire) {
        btnFire.addEventListener("mousedown", fireLaser);
        btnFire.addEventListener("touchstart", (e) => { e.preventDefault(); fireLaser(); }, {passive: false});
    }

    const handleKeyDown = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
        if (e.key === " ") {
            if (!keys.space) { keys.space = true; fireLaser(); }
        }
    };
    const handleKeyUp = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
        if (e.key === " ") keys.space = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // --- GAME LOGIC ---
    const gameOver = (reason) => {
        if(gameState !== "PLAYING") return;
        gameState = "GAMEOVER";
        explode(shipRoot.position.clone());
        shipRoot.setEnabled(false);
        if(gameScreen) {
            gameScreen.style.display = "flex";
            gameTitle.innerText = reason;
            gameTitle.style.color = "#ff3366";
            scoreDisplay.innerText = "Puntuación Final: " + score;
        }
    };

    const winGame = () => {
        if(gameState !== "PLAYING") return;
        gameState = "WIN";
        score += 5000;
        if(gameScreen) {
            gameScreen.style.display = "flex";
            gameTitle.innerText = "¡PUERTO DE ESCAPE ALCANZADO!";
            gameTitle.style.color = "#00ff00";
            scoreDisplay.innerText = "Puntuación Épica: " + score;
        }
    };

    let speed = 5; 
    let laserSpeed = 15; 
    let targetRoll = 0;
    let targetX = 0;

    scene.onBeforeRenderObservable.add(() => {
        if (gameState !== "PLAYING") return;

        // Vuelo Híbrido: Alabeo y Desplazamiento libre (sin auto-centrado)
        if (keys.left) {
            targetRoll = Math.PI / 6; // 30 grados (menos extremo que antes)
            targetX -= 1.2; // Se desplaza a la izquierda
        } else if (keys.right) {
            targetRoll = -Math.PI / 6;
            targetX += 1.2; // Se desplaza a la derecha
        } else {
            targetRoll = 0; // Se nivela al soltar
            // NO alteramos targetX, la nave se queda en su carril
        }

        // Limitar la nave a la trinchera para que no atraviese las paredes procedurales
        if (targetX < -30) targetX = -30;
        if (targetX > 30) targetX = 30;

        shipRoot.rotationQuaternion = null;
        shipRoot.rotation.z = BABYLON.Scalar.Lerp(shipRoot.rotation.z, targetRoll, 0.1);
        shipRoot.position.x = BABYLON.Scalar.Lerp(shipRoot.position.x, targetX, 0.15); // Lerp rápido para buena respuesta
        shipRoot.position.y = -2 + (Math.sin(Date.now() / 150) * 0.3); // Vibración base

        // Avance de la Torre
        distanceToTower -= speed;
        towerRoot.position.z = distanceToTower;

        // Spawn Enemigos
        if (Math.random() < 0.03 && distanceToTower > 1500) {
            const enemy = tieRoot.clone("tie");
            enemy.setEnabled(true);
            enemy.position.x = (Math.random() - 0.5) * 80;
            enemy.position.y = -2; // ¡Fijado a la altura de la nave para que sea posible dispararles!
            enemy.position.z = 1000;
            
            // Hitbox MUCHO más generoso verticalmente para compensar el alabeo de las alas
            const hitbox = BABYLON.MeshBuilder.CreateBox("hitbox", {width: 12, height: 25, depth: 10}, scene);
            hitbox.parent = enemy;
            hitbox.isVisible = false;
            enemy.hitbox = hitbox;

            enemies.push(enemy);
        }

        // Lógica Enemigos
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            enemy.position.z -= (speed + 3); // Vuelan hacia la cámara

            if (enemy.position.z < -60) {
                enemy.dispose();
                enemies.splice(e, 1);
                continue;
            }

            // Colisión Láser vs TIE
            let destroyed = false;
            for (let l = lasers.length - 1; l >= 0; l--) {
                const laser = lasers[l];
                if (laser.intersectsMesh(enemy.hitbox, false)) {
                    explode(enemy.position.clone());
                    enemy.dispose();
                    enemies.splice(e, 1);
                    laser.dispose();
                    lasers.splice(l, 1);
                    
                    score += 100;
                    if(uiScore) uiScore.innerText = "PUNTOS: " + score;
                    destroyed = true;
                    break;
                }
            }
            if(destroyed) continue;

            // Colisión Nave vs TIE
            if (enemy.position.z < -30 && enemy.position.z > -40) {
                if (Math.abs(enemy.position.x - shipRoot.position.x) < 8 && Math.abs(enemy.position.y - shipRoot.position.y) < 8) {
                    gameOver("¡NAVE DESTRUIDA POR TIE FIGHTER!");
                }
            }
        }

        // Animaciones del entorno
        starSPS.particles.forEach(p => {
            p.position.z -= (speed * 1.5);
            if (p.position.z < -50) {
                p.position.z = 700; 
                p.position.x = (Math.random() - 0.5) * 1000;
                p.position.y = 40 + Math.random() * 400; 
            }
        });

        trenchSPS.particles.forEach(p => {
            p.position.z -= speed;
            if (p.position.z < -20 && distanceToTower > 800) {
                p.position.z = 1000;
            }
        });
        
        trenchSPS.setParticles();
        starSPS.setParticles();

        for (let i = lasers.length - 1; i >= 0; i--) {
            const laser = lasers[i];
            laser.position.z += laserSpeed;
            if (laser.position.z > 800) {
                laser.dispose();
                lasers.splice(i, 1);
            }
        }

        // Check Tower Collision
        if (distanceToTower < -25 && distanceToTower > -45) {
            // El puerto está en Y=11.5, la nave en Y=-2. 
            // Espera, he levantado el escape a Y=11.5, y la nave está en Y=-2! ¡Chocará siempre por debajo!
            // Corrijo dinámicamente en el check: Si está en el rango correcto X (centrado)
            // La nave subirá automáticamente como cinemática o consideramos Y correcto.
            if (Math.abs(shipRoot.position.x) > 10) {
                gameOver("¡CHOQUE CONTRA EL MURO!");
            }
        } else if (distanceToTower < -50) {
            winGame();
        }
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
