// ==============================================================================
// SISTEMA DE NAVEGACIÓN MODULAR E INDEPENDIENTE DEL HANGAR (31 NAVES)
// ==============================================================================

// Detección y auto-corrección inmediata si se abre bajo protocolo local file://
// (Los navegadores modernos bloquean la carga de modelos 3D vía file:// por política de seguridad CORS)
if (window.location.protocol === "file:") {
    const fullPath = window.location.pathname;
    const match = fullPath.match(/BLOQUE-6_Naves_espaciales.*$/);
    if (match) {
        window.location.replace("http://localhost:8888/" + match[0]);
    }
}

const HANGAR_SHIPS = [
  {
    "num": 1,
    "title": "Halc\u00f3n Milenario",
    "file": "VISOR_NAVE_1_HALCON.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 2,
    "title": "Caza Estelar Ala-X (X-Wing)",
    "file": "VISOR_NAVE_2_X_WING.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 3,
    "title": "Caza de Asalto Ala-B (B-Wing)",
    "file": "VISOR_NAVE_3_B_WING.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 4,
    "title": "Bombardero Ala-Y BTL (Y-Wing)",
    "file": "VISOR_NAVE_4_Y_WING.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 5,
    "title": "Interceptor Ala-A RZ-1 (A-Wing)",
    "file": "VISOR_NAVE_5_A_WING.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 6,
    "title": "Ca\u00f1onera de Apoyo Ala-U UT-60D",
    "file": "VISOR_NAVE_6_U_WING.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 7,
    "title": "Corbeta Corelliana CR90 (Tantive IV)",
    "file": "VISOR_NAVE_7_CR90_CORVETTE.html",
    "badge": "\ud83d\udd34 Alianza Rebelde",
    "badgeColor": "#ef4444",
    "faction": "rebel"
  },
  {
    "num": 8,
    "title": "Primera Estrella de la Muerte (DS-1)",
    "file": "VISOR_NAVE_8_ESTRELLA_MUERTE.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 9,
    "title": "Destructor Estelar Clase Imperial I",
    "file": "VISOR_NAVE_9_DESTRUCTOR.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 10,
    "title": "Caza TIE Avanzado x1",
    "file": "VISOR_NAVE_10_TIE_VADER.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 11,
    "title": "TIE Interceptor Guardia Real",
    "file": "VISOR_NAVE_11_TIE_INTERCEPTOR.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 12,
    "title": "TIE Interceptor Est\u00e1ndar",
    "file": "VISOR_NAVE_12_TIE_INTERCEPTOR_GRIS.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 13,
    "title": "Caza TIE Lightning",
    "file": "VISOR_NAVE_13_TIE_LIGHTNING.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 14,
    "title": "Lanzadera Imperial Clase Lambda",
    "file": "VISOR_NAVE_14_LANZADERA_LAMBDA.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 15,
    "title": "Crucero Ligero Imperial Arquitens",
    "file": "VISOR_NAVE_15_CRUCERO_ARQUITENS.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 16,
    "title": "Nave de Asalto VT-49 Decimator",
    "file": "VISOR_NAVE_16_DECIMATOR.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 17,
    "title": "Ca\u00f1onera Alpha-class Xg-1 Star Wing",
    "file": "VISOR_NAVE_17_STAR_WING.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 18,
    "title": "Crucero Ligero Clase Gozanti",
    "file": "VISOR_NAVE_18_GOZANTI_CRUISER.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 19,
    "title": "Bombardero TIE Pesado",
    "file": "VISOR_NAVE_19_TIE_HEAVY_BOMBER.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 20,
    "title": "Caza Furtivo TIE Phantom (V-38)",
    "file": "VISOR_NAVE_20_TIE_PHANTOM.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 21,
    "title": "Caza Estelar TIE/ln Imperial",
    "file": "VISOR_NAVE_21_TIE_LN.html",
    "badge": "\ud83d\udd35 Imperio Gal\u00e1ctico",
    "badgeColor": "#38bdf8",
    "faction": "imperio"
  },
  {
    "num": 22,
    "title": "Caza Estelar Jedi ETA-2 Actis",
    "file": "VISOR_NAVE_22_JEDI_STARFIGHTER.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 23,
    "title": "Caza Estelar ARC-170",
    "file": "VISOR_NAVE_23_ARC_170.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 24,
    "title": "Caza Estelar Naboo N-1",
    "file": "VISOR_NAVE_24_NABOO_N1.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 25,
    "title": "Yate Real Naboo Nubian 327 (J-Type)",
    "file": "VISOR_NAVE_25_NUBIAN_327.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 26,
    "title": "Caza de Asalto V-19 Torrent",
    "file": "VISOR_NAVE_26_V19_TORRENT.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 27,
    "title": "Ca\u00f1onera LAAT/i (Guardia de Coruscant)",
    "file": "VISOR_NAVE_27_LAAT_CORUSCANT.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 28,
    "title": "Interceptor Jedi ETA-2 (Anakin)",
    "file": "VISOR_NAVE_28_ANAKIN_ETA2.html",
    "badge": "\ud83d\udfe2 Rep\u00fablica Gal\u00e1ctica",
    "badgeColor": "#10b981",
    "faction": "republica"
  },
  {
    "num": 29,
    "title": "Nave de Asalto Esclavo I",
    "file": "VISOR_NAVE_29_SLAVE_1.html",
    "badge": "\ud83d\udfe1 Cazarrecompensas",
    "badgeColor": "#eab308",
    "faction": "borde_exterior"
  },
  {
    "num": 30,
    "title": "Ca\u00f1onera Espacial Razor Crest",
    "file": "VISOR_NAVE_30_RAZOR_CREST.html",
    "badge": "\ud83d\udfe1 Cazarrecompensas",
    "badgeColor": "#eab308",
    "faction": "borde_exterior"
  },
  {
    "num": 31,
    "title": "Carguero Ligero Clase Ghtroc 720",
    "file": "VISOR_NAVE_31_GHTROC_720.html",
    "badge": "\ud83d\udfe1 Cazarrecompensas",
    "badgeColor": "#eab308",
    "faction": "borde_exterior"
  }
];

function initHangarNavigation() {
    const currentFile = window.location.pathname.split("/").pop() || "";
    const index = HANGAR_SHIPS.findIndex(s => s.file === currentFile);
    if (index === -1) return;

    const current = HANGAR_SHIPS[index];
    const total = HANGAR_SHIPS.length;
    const prev = HANGAR_SHIPS[(index - 1 + total) % total];
    const next = HANGAR_SHIPS[(index + 1) % total];

    // 1. Barra de navegación superior
    const navBar = document.querySelector(".nav-bar");
    if (navBar) {
        navBar.innerHTML = `
            <a href="${prev.file}" class="nav-btn" title="${prev.num}. ${prev.title}">◀ Anterior</a>
            <a href="index_radial.html" class="nav-btn" title="Volver al Hangar de Naves">🛸 Hangar (${total})</a>
            <a href="${next.file}" class="nav-btn" title="${next.num}. ${next.title}">Siguiente ▶</a>
            <a href="../index_radial.html" class="nav-btn home-btn">🏛️ Gran Museo</a>
        `;
    }

    // 2. Unificación visual de badge de facción
    const badgeEl = document.querySelector(".header .badge");
    if (badgeEl) {
        badgeEl.textContent = current.badge;
        badgeEl.style.color = current.badgeColor;
        badgeEl.style.borderColor = current.badgeColor;
        badgeEl.style.background = "rgba(0, 0, 0, 0.65)";
    }

    // 3. Atajos de teclado para navegación fluida
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "ArrowLeft") {
            window.location.href = prev.file;
        } else if (e.key === "ArrowRight") {
            window.location.href = next.file;
        }
    });
}

document.addEventListener("DOMContentLoaded", initHangarNavigation);
