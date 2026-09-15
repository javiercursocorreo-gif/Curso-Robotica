const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    
    // Physics
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(gravityVector, physicsPlugin);

    // Camera
    const camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    
    // Light
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.2;
    
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.8;

    // Drone Lights Setup
    let cyanLight = new BABYLON.SpotLight("cyanLight", new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1), Math.PI / 3, 2, scene);
    cyanLight.diffuse = new BABYLON.Color3(0, 1, 1);
    cyanLight.specular = new BABYLON.Color3(0, 1, 1);
    cyanLight.intensity = 0; 
    
    let cyanMat = new BABYLON.StandardMaterial("cyanMat", scene);
    cyanMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.2); // Apagado inicial
    cyanMat.disableLighting = true; 
    
    let redMat = new BABYLON.StandardMaterial("redMat", scene);
    redMat.emissiveColor = new BABYLON.Color3(0.2, 0, 0); // Apagado inicial
    redMat.disableLighting = true;

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, scene);
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 }, scene);
    
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    ground.material = groundMat;

    // Drone Hitbox
    let hitbox = BABYLON.MeshBuilder.CreateBox("hitbox", {size: 1.0}, scene);
    hitbox.position.y = 5;
    hitbox.isVisible = false;
    hitbox.physicsImpostor = new BABYLON.PhysicsImpostor(hitbox, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.1, friction: 0.5 }, scene);
    
    camera.target = hitbox;

    // Load Drone Model
    BABYLON.SceneLoader.ImportMeshAsync("", "", DRONE_B64, scene).then((result) => {
        let droneRoot = result.meshes[0];
        
        // Ocultar hélices duplicadas y aclarar el color negro
        result.meshes.forEach(m => {
            if (m.name === "propeller" || m.name === "propeller.001" || m.name === "propeller.002") {
                m.isVisible = false;
            }
            if (m.material && m.material.albedoColor) {
                // Si el color base es un negro muy fuerte (menor a 0.05), lo subimos a un gris oscuro
                if (m.material.albedoColor.r < 0.1 && m.material.albedoColor.g < 0.1) {
                    m.material.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1); // Gris muy oscuro casi negro
                }
            }
        });
        
        droneRoot.scaling = new BABYLON.Vector3(1, 1, 1);
        droneRoot.parent = hitbox;
        droneRoot.position = new BABYLON.Vector3(0, -0.5, 0);
        
        // Asignar luces a las esferas del modelo
        let spheres = result.meshes.filter(m => m.name.toLowerCase().includes("circle") || m.name.toLowerCase().includes("sphere"));
        let lightMesh = null;
        
        // Ejecutar un frame después para asegurar que las posiciones absolutas se han calculado
        scene.onBeforeRenderObservable.addOnce(() => {
            let invMatrix = hitbox.getWorldMatrix().clone().invert();
            spheres.forEach(m => {
                let localPos = BABYLON.Vector3.TransformCoordinates(m.getAbsolutePosition(), invMatrix);
                if (localPos.z > 0) { // Delante (o detrás según orientación, ajustamos visualmente)
                    m.material = cyanMat;
                    if (!lightMesh) lightMesh = m;
                } else { // Detrás
                    m.material = redMat;
                }
            });
            if (lightMesh) cyanLight.parent = lightMesh;
            else cyanLight.parent = hitbox;
        });
    });

    // Controls
    let keys = {w: false, s: false, a: false, d: false, up: false, down: false, left: false, right: false};
    window.addEventListener("keydown", (e) => {
        let key = e.key.toLowerCase();
        if (key === "w") keys.w = true;
        if (key === "s") keys.s = true;
        if (key === "a") keys.a = true;
        if (key === "d") keys.d = true;
        if (key === "arrowup") keys.up = true;
        if (key === "arrowdown") keys.down = true;
        if (key === "arrowleft") keys.left = true;
        if (key === "arrowright") keys.right = true;
    });
    window.addEventListener("keyup", (e) => {
        let key = e.key.toLowerCase();
        if (key === "w") keys.w = false;
        if (key === "s") keys.s = false;
        if (key === "a") keys.a = false;
        if (key === "d") keys.d = false;
        if (key === "arrowup") keys.up = false;
        if (key === "arrowdown") keys.down = false;
        if (key === "arrowleft") keys.left = false;
        if (key === "arrowright") keys.right = false;
    });

    let enginesOn = false;
    const btnEngine = document.getElementById("btnEngine");
    if (btnEngine) {
        btnEngine.addEventListener("click", () => {
            enginesOn = !enginesOn;
            btnEngine.style.backgroundColor = enginesOn ? "#44ff44" : "#ff4444";
            btnEngine.innerText = enginesOn ? "Apagar Motores" : "Arrancar Motores";
            
            // Encender / Apagar luces
            if (enginesOn) {
                cyanMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
                redMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
                cyanLight.intensity = 5;
            } else {
                cyanMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.2);
                redMat.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
                cyanLight.intensity = 0;
            }
            
            document.body.focus();
        });
    }

    // Physics Loop
    scene.onBeforeRenderObservable.add(() => {
        if (!hitbox) return;
        
        hitbox.physicsImpostor.physicsBody.linearDamping = enginesOn ? 0.85 : 0.01;
        
        const transformMatrix = hitbox.computeWorldMatrix(true);
        const localRight = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Right(), transformMatrix);
        const localForward = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Forward(), transformMatrix);
        
        if (enginesOn) {
            if (keys.up) hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(25), hitbox.getAbsolutePosition());
            if (keys.down) hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(-15), hitbox.getAbsolutePosition());
            
            let moveForward = new BABYLON.Vector3(localForward.x, 0, localForward.z).normalize();
            let moveRight = new BABYLON.Vector3(localRight.x, 0, localRight.z).normalize();
            
            if (keys.w) hitbox.physicsImpostor.applyForce(moveForward.scale(-15), hitbox.getAbsolutePosition());
            if (keys.s) hitbox.physicsImpostor.applyForce(moveForward.scale(15), hitbox.getAbsolutePosition());
            if (keys.a) hitbox.physicsImpostor.applyForce(moveRight.scale(15), hitbox.getAbsolutePosition());
            if (keys.d) hitbox.physicsImpostor.applyForce(moveRight.scale(-15), hitbox.getAbsolutePosition());
            
            let angVel = hitbox.physicsImpostor.getAngularVelocity();
            if (keys.left) angVel.y -= 0.3;
            if (keys.right) angVel.y += 0.3;
            angVel.scaleInPlace(0.85);
            hitbox.physicsImpostor.setAngularVelocity(angVel);
            
            // Auto hover
            hitbox.physicsImpostor.applyForce(BABYLON.Vector3.Up().scale(9.81), hitbox.getAbsolutePosition());
            
            // Animar hélices
            const propellers = scene.meshes.filter(m => m.name.toLowerCase().includes("propeller") && m.isVisible);
            propellers.forEach(p => {
                p.rotate(BABYLON.Axis.Z, 2.5, BABYLON.Space.LOCAL);
            });
        }
    });

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });
window.addEventListener("resize", () => { engine.resize(); });
