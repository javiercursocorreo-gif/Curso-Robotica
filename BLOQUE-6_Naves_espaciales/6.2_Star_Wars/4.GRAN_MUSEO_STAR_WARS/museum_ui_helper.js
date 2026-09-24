// ==============================================================================
// GRAN MUSEO STAR WARS - SISTEMA UNIVERSAL DE CONTROLES, ZOOM TOTAL Y RESPONSIVIDAD
// Garantiza visibilidad 100%, z-index absoluto, zoom infinito y entrada al interior
// ==============================================================================

(function() {
    // 1. Corrección automática si se abre bajo file://
    if (window.location.protocol === "file:") {
        const match = window.location.pathname.match(/BLOQUE-6_Naves_espaciales.*$/);
        if (match) {
            window.location.replace("http://localhost:8888/" + match[0]);
            return;
        }
    }

    // 2. Inyección de Estilos de Alta Prioridad para Controles y Ficha Técnica
    const styleEl = document.createElement("style");
    styleEl.id = "museum-universal-controls-css";
    styleEl.textContent = `
        /* Panel de Controles Inferior Izquierdo: Siempre visible con Z-Index Máximo */
        .controls-panel {
            position: fixed !important;
            bottom: 24px !important;
            left: 24px !important;
            z-index: 9999 !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
            align-items: center !important;
            background: rgba(10, 15, 29, 0.92) !important;
            border: 1.5px solid rgba(56, 189, 248, 0.45) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.25) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-radius: 12px !important;
            padding: 7px 12px !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
            transition: all 0.25s ease !important;
        }

        /* Botones de Control Estilizados con Alto Contraste */
        .controls-panel .ctrl-btn,
        .controls-panel button,
        .controls-panel a.ctrl-btn {
            font-size: 13.5px !important;
            font-weight: 700 !important;
            color: #f8fafc !important;
            background: rgba(30, 41, 59, 0.95) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            border-radius: 8px !important;
            padding: 8px 14px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            text-decoration: none !important;
            white-space: nowrap !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
            user-select: none !important;
        }

        .controls-panel .ctrl-btn:hover,
        .controls-panel button:hover,
        .controls-panel a.ctrl-btn:hover {
            background: rgba(51, 65, 85, 1) !important;
            border-color: #38bdf8 !important;
            color: #38bdf8 !important;
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.45) !important;
            transform: translateY(-1.5px) !important;
        }

        .controls-panel .ctrl-btn:active,
        .controls-panel button:active {
            transform: scale(0.96) !important;
        }

        .controls-panel .ctrl-btn.active,
        .controls-panel button.active {
            background: #0284c7 !important;
            border-color: #38bdf8 !important;
            color: #ffffff !important;
            box-shadow: 0 0 16px rgba(56, 189, 248, 0.55) !important;
        }

        .controls-panel .anim-btn.active {
            background: #10b981 !important;
            border-color: #34d399 !important;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.55) !important;
        }

        /* Ficha Técnica (Specs Panel): Z-Index controlado y nunca invasivo */
        .specs-panel {
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            z-index: 50 !important;
            transition: max-height 0.3s ease, opacity 0.3s ease, transform 0.3s ease !important;
        }

        /* Botón Minimizar Ficha */
        .btn-toggle-specs {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 3px 9px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
        }
        .btn-toggle-specs:hover {
            background: rgba(56, 189, 248, 0.25) !important;
            border-color: #38bdf8 !important;
            color: #38bdf8 !important;
        }

        /* Reglas Responsivas y Prevención de Colisión */
        @media (max-width: 1080px) {
            .specs-panel {
                width: 360px !important;
            }
        }

        @media (max-width: 880px) {
            .controls-panel {
                bottom: 16px !important;
                left: 16px !important;
                padding: 6px 10px !important;
                gap: 6px !important;
            }
            .controls-panel .ctrl-btn,
            .controls-panel button,
            .controls-panel a.ctrl-btn {
                padding: 7px 11px !important;
                font-size: 12px !important;
            }
            .specs-panel {
                bottom: auto !important;
                top: 85px !important;
                right: 16px !important;
                width: 320px !important;
                max-height: 50vh !important;
                overflow-y: auto !important;
            }
        }
    `;
    document.head.appendChild(styleEl);

    // 3. Funciones de Búsqueda y Calibración de Cámara 3D
    function getActiveCamera() {
        try {
            if (window.camera && window.camera.radius !== undefined) return window.camera;
        } catch(e) {}
        try {
            if (typeof camera !== "undefined" && camera && camera.radius !== undefined) return camera;
        } catch(e) {}
        if (window.BABYLON) {
            if (BABYLON.Engine && BABYLON.Engine.LastCreatedScene && BABYLON.Engine.LastCreatedScene.activeCamera) {
                return BABYLON.Engine.LastCreatedScene.activeCamera;
            }
            const instances = BABYLON.Engine && BABYLON.Engine.Instances;
            if (instances && instances.length > 0) {
                for (let i = 0; i < instances.length; i++) {
                    const scenes = instances[i].scenes;
                    if (scenes) {
                        for (let j = 0; j < scenes.length; j++) {
                            if (scenes[j].activeCamera) return scenes[j].activeCamera;
                        }
                    }
                }
            }
        }
        return null;
    }

    function calibrateCamera(cam) {
        if (!cam || cam.radius === undefined) return;
        // Permite entrar dentro del modelo hasta 5 milímetros sin chocar ni bloquearse
        cam.lowerRadiusLimit = 0.005;
        // Evita el recorte de polígonos internos (minZ = 1mm) para ver interiores limpios
        cam.minZ = 0.001;
        // Zoom porcentual ultra fluido en trackpads y ratones de alta precisión
        cam.wheelDeltaPercentage = 0.08;
        cam.pinchDeltaPercentage = 0.08;
        cam.wheelPrecision = 4;
        cam.pinchPrecision = 4;
        // Desplazamiento panorámico suave (botón derecho o dos dedos) para explorar habitaciones y cabinas
        cam.panningSensibility = 250;
        cam.panningInertia = 0.8;
    }

    // Interceptar attachControl si Babylon ya está cargado
    if (window.BABYLON && BABYLON.ArcRotateCamera) {
        const origAttach = BABYLON.ArcRotateCamera.prototype.attachControl;
        BABYLON.ArcRotateCamera.prototype.attachControl = function() {
            calibrateCamera(this);
            const res = origAttach.apply(this, arguments);
            calibrateCamera(this);
            return res;
        };
    }

    // Acciones de Zoom Globales
    window.zoomIn = function() {
        const cam = getActiveCamera();
        if (!cam || cam.radius === undefined) return;
        cam.radius = Math.max(0.005, cam.radius * 0.72);
        highlightBtn("btn-zoom-in");
    };

    window.zoomOut = function() {
        const cam = getActiveCamera();
        if (!cam || cam.radius === undefined) return;
        cam.radius = Math.min(cam.maxZ || 2500, cam.radius * 1.38);
        highlightBtn("btn-zoom-out");
    };

    function highlightBtn(id) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.add("active");
            setTimeout(() => btn.classList.remove("active"), 160);
        }
    }

    // Vinculación del evento wheel para respuesta inmediata en trackpad y ratón
    function bindCanvasWheelZoom(canvas) {
        if (!canvas || canvas._zoomWheelBound) return;
        canvas._zoomWheelBound = true;

        canvas.addEventListener("wheel", function(e) {
            const cam = getActiveCamera();
            if (!cam || cam.radius === undefined) return;
            e.preventDefault();

            // Factor exponencial suave que permite entrar hasta el interior del modelo
            const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 80);
            const factor = Math.exp(delta * 0.0035);
            cam.radius = Math.max(0.005, Math.min(cam.maxZ || 2500, cam.radius * factor));
        }, { passive: false });
    }

    // Atajos de teclado para Zoom (+, -, 0/C)
    window.addEventListener("keydown", function(e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "+" || e.key === "=") {
            window.zoomIn();
        } else if (e.key === "-" || e.key === "_") {
            window.zoomOut();
        } else if (e.key === "0" || e.key === "c" || e.key === "C") {
            const centerBtn = document.getElementById("btn-center");
            if (centerBtn) centerBtn.click();
            else if (typeof resetCamera === "function") resetCamera();
        }
    });

    // 4. Inicialización cuando el DOM esté listo
    function initUI() {
        // A. Agregar Botón Minimizar a la Ficha Técnica (.specs-panel)
        const specsPanel = document.querySelector(".specs-panel");
        const specsTitle = document.querySelector(".specs-title");

        if (specsPanel && specsTitle && !document.getElementById("btn-toggle-specs")) {
            const toggleBtn = document.createElement("button");
            toggleBtn.id = "btn-toggle-specs";
            toggleBtn.className = "btn-toggle-specs";
            toggleBtn.innerHTML = "➖ Minimizar";
            toggleBtn.title = "Minimizar o desplegar la ficha técnica";

            let isCollapsed = false;
            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                isCollapsed = !isCollapsed;
                
                const grid = specsPanel.querySelector(".specs-grid");
                const desc = specsPanel.querySelector(".spec-desc");
                if (grid) grid.style.display = isCollapsed ? "none" : "grid";
                if (desc) desc.style.display = isCollapsed ? "none" : "block";

                toggleBtn.innerHTML = isCollapsed ? "➕ Ficha" : "➖ Minimizar";
                toggleBtn.style.background = isCollapsed ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.1)";
                toggleBtn.style.borderColor = isCollapsed ? "#38bdf8" : "rgba(255, 255, 255, 0.2)";
                toggleBtn.style.color = isCollapsed ? "#38bdf8" : "#cbd5e1";
            });

            specsTitle.appendChild(toggleBtn);
        }

        // B. Verificación y Mejora del Panel de Controles
        let ctrlPanel = document.querySelector(".controls-panel");
        if (!ctrlPanel) {
            ctrlPanel = document.createElement("div");
            ctrlPanel.className = "controls-panel";
            document.body.appendChild(ctrlPanel);
        }

        // C. Garantizar que los botones estándar tengan iconos claros
        const rotBtn = document.getElementById("btn-rot");
        if (rotBtn && !rotBtn.innerHTML.includes("⟳") && !rotBtn.innerHTML.includes("⏸") && !rotBtn.innerHTML.includes("▶")) {
            rotBtn.innerHTML = "⟳ Rotación";
        }
        const centerBtn = document.getElementById("btn-center") || ctrlPanel.querySelector("button[onclick*='resetCamera']");
        if (centerBtn && !centerBtn.innerHTML.includes("⊙")) {
            centerBtn.innerHTML = "⊙ Centrar";
        }
        const wireBtn = document.getElementById("btn-wire") || ctrlPanel.querySelector("button[onclick*='toggleWireframe']");
        if (wireBtn && !wireBtn.innerHTML.includes("▤")) {
            wireBtn.innerHTML = "▤ Malla";
        }

        // D. Agregar Botones de Zoom (➕ Acercar y ➖ Alejar) si no existen
        if (!document.getElementById("btn-zoom-in")) {
            const zoomInBtn = document.createElement("button");
            zoomInBtn.id = "btn-zoom-in";
            zoomInBtn.className = "ctrl-btn";
            zoomInBtn.innerHTML = "➕ Acercar";
            zoomInBtn.title = "Acercar cámara / Entrar en la nave (o tecla +)";
            zoomInBtn.onclick = () => window.zoomIn();

            const zoomOutBtn = document.createElement("button");
            zoomOutBtn.id = "btn-zoom-out";
            zoomOutBtn.className = "ctrl-btn";
            zoomOutBtn.innerHTML = "➖ Alejar";
            zoomOutBtn.title = "Alejar cámara (o tecla -)";
            zoomOutBtn.onclick = () => window.zoomOut();

            if (centerBtn && centerBtn.nextSibling) {
                ctrlPanel.insertBefore(zoomOutBtn, centerBtn.nextSibling);
                ctrlPanel.insertBefore(zoomInBtn, zoomOutBtn);
            } else {
                ctrlPanel.appendChild(zoomInBtn);
                ctrlPanel.appendChild(zoomOutBtn);
            }
        }

        // E. Enlace si no existían botones
        if (ctrlPanel.children.length === 0) {
            ctrlPanel.innerHTML = `
                <button class="ctrl-btn active" id="btn-rot" onclick="if(typeof toggleRotation==='function') toggleRotation();">⟳ Rotación</button>
                <button class="ctrl-btn" id="btn-center" onclick="if(typeof resetCamera==='function') resetCamera();">⊙ Centrar</button>
                <button class="ctrl-btn" id="btn-zoom-in" onclick="window.zoomIn()">➕ Acercar</button>
                <button class="ctrl-btn" id="btn-zoom-out" onclick="window.zoomOut()">➖ Alejar</button>
                <button class="ctrl-btn" id="btn-wire" onclick="if(typeof toggleWireframe==='function') toggleWireframe();">▤ Malla</button>
            `;
        }

        // F. Botón Sala 7 en la barra de navegación superior de visores de personajes
        if (window.location.pathname.includes("4.PERSONAJES_MIXAMO") && !window.location.pathname.includes("SALA_")) {
            const nav = document.querySelector(".nav-panel") || document.querySelector(".nav-bar");
            if (nav && !nav.querySelector('a[href*="SALA_7_RADIAL"]')) {
                const s7Btn = document.createElement("a");
                s7Btn.href = "SALA_7_RADIAL.html";
                s7Btn.className = "nav-btn";
                s7Btn.style.cssText = "background: rgba(245, 158, 11, 0.18) !important; border: 1.5px solid #f59e0b !important; color: #fbbf24 !important; font-weight: 800 !important;";
                s7Btn.innerHTML = "⭐ Sala 7";
                s7Btn.title = "Volver a Sala 7 (Galería Mixamo)";
                const homeBtn = nav.querySelector(".home-btn") || nav.querySelector('a[href*="../index.html"]');
                if (homeBtn) {
                    nav.insertBefore(s7Btn, homeBtn);
                } else {
                    nav.appendChild(s7Btn);
                }
            }
        }

        // G. Calibración continua y vinculación a Canvas
        const canvas = document.getElementById("renderCanvas") || document.querySelector("canvas");
        if (canvas) bindCanvasWheelZoom(canvas);

        const checkInterval = setInterval(() => {
            const cam = getActiveCamera();
            if (cam) calibrateCamera(cam);
            const c = document.getElementById("renderCanvas") || document.querySelector("canvas");
            if (c) bindCanvasWheelZoom(c);
        }, 200);

        // Limpiar intervalo tras 10 segundos para no consumir recursos
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initUI);
    } else {
        initUI();
    }
})();
