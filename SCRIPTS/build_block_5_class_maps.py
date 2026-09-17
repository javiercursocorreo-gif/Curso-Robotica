#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_block_5_class_maps.py
Genera los 6 mapas interactivos para cada una de las clases del Bloque 5 (Androides):
- 5.1_Perro_Unitree Go2 AIR/MAPA_CLASE_5.1_PERRO_UNITREE.html
- 5.2_Robot-Bipedo. (Comunicacion-visual)/MAPA_CLASE_5.2_ROBOT_BIPEDO.html
- 5.3_Androide_MIXAMO/MAPA_CLASE_5.3_ANDROIDE_MIXAMO.html
- 5.4_Transformer. (POO-y-Enjambres)/MAPA_CLASE_5.4_TRANSFORMER.html
- 5.5_Trio_Dinamico_StarWars/MAPA_CLASE_5.5_TRIO_STAR_WARS.html
- 5.6_Robot-combate/MAPA_CLASE_5.6_ROBOT_COMBATE.html

Y actualiza PANELES_CSV/5.PANEL_B5.csv con 6 filas (una por clase) para Google Classroom,
guardando previamente un backup del desglosado.
"""

import os
import csv
import urllib.parse
import unicodedata

ROOT_DIR = "/Users/externo/Library/Mobile Documents/com~apple~CloudDocs/PERSONAL/CLASES DE TECNOLOGÍA/CURSO-ROBOTICA-V2"
BASE_URL = "https://javiercursocorreo-gif.github.io/Curso-Robotica/"

CLASSES_DEF_B5 = [
    {
        "id": "5.1",
        "folder": "5.1_Perro_Unitree Go2 AIR",
        "html_file": "MAPA_CLASE_5.1_PERRO_UNITREE.html",
        "theme_classroom": "5.1 Perro Unitree Go2 AIR",
        "title_classroom": "Cuaderno Interactivo: 5.1 Perro Robot Unitree Go2 (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), presentación teórica (PDF), vídeo demostrativo (MP4), simulador 3D de anatomía y montaje, gemelo digital en entorno real, misiones acrobáticas y juego interactivo.",
        "icon": "🐕",
        "color": "#38bdf8",
        "color_glow": "rgba(56, 189, 248, 0.45)",
        "headline": "Perro Robot Cuadrúpedo: Unitree Go2 AIR",
        "subhead": "Locomoción Cuadrúpeda • 12 Servomotores de Torque • Cinemática Inversa • Misiones y Acrobacias",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Por qué los robots con patas superan a las ruedas en terrenos difíciles?", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA.pdf", "desc": "Diapositivas oficiales: anatomía, grados de libertad y equilibrio dinámico.", "rel": "2.TEORIA/T1.TEORIA.pdf" },
            { "code": "T2", "ext": "MP4", "name": "T2.VIDEO.mp4", "desc": "Vídeo demostrativo del robot Unitree Go2 en acción real.", "rel": "2.TEORIA/T2.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1", "ext": "HTML", "name": "P1.CONSTRUCCION.html", "desc": "Simulador 3D: Anatomía interna, motores en cadera, rodilla y chasis.", "rel": "3.PRACTICAS/P1.CONSTRUCCION.html" },
            { "code": "P2", "ext": "HTML", "name": "P2.EJEMPLO-REAL.html", "desc": "Gemelo digital: Control de marcha, trote y orientación en terreno real.", "rel": "3.PRACTICAS/P2.EJEMPLO-REAL.html" }
        ],
        "practices_phase3": [
            { "code": "P3", "ext": "HTML", "name": "P3.MISIONES-ACROBATICAS.html", "desc": "Simulador: Programación de acrobacias, saltos y posturas dinámicas.", "rel": "3.PRACTICAS/P3.MISIONES-ACROBATICAS.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.JUEGO.html", "desc": "Reto gamificado: Circuito de obstáculos y rescate con el cuadrúpedo.", "rel": "3.PRACTICAS/P4.JUEGO.html" }
        ]
    },
    {
        "id": "5.2",
        "folder": "5.2_Robot-Bipedo. (Comunicacion-visual)",
        "html_file": "MAPA_CLASE_5.2_ROBOT_BIPEDO.html",
        "theme_classroom": "5.2 Robot Bipedo. (Comunicacion visual)",
        "title_classroom": "Cuaderno Interactivo: 5.2 Robot Bípedo y Comunicación Visual (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), presentación teórica (PDF), vídeo demostrativo (MP4), simulador 3D de montaje, cinemática de marcha bípeda, programación de estados visuales y juego interactivo.",
        "icon": "🤖",
        "color": "#818cf8",
        "color_glow": "rgba(129, 140, 248, 0.45)",
        "headline": "Robot Humanoide Bípedo: Marcha y Comunicación Visual",
        "subhead": "Equilibrio en 2 Piernas • Centro de Masas • Expresión Facial por Matrices LED • Tesla Optimus",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Por qué es tan difícil caminar sobre dos piernas sin caerse?", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA.pdf", "desc": "Diapositivas oficiales: bípedos, centro de gravedad y comunicación humano-robot.", "rel": "2.TEORIA/T1.TEORIA.pdf" },
            { "code": "T2", "ext": "MP4", "name": "T2.VIDEO.mp4", "desc": "Vídeo explicativo de robots bípedos avanzados y Tesla Optimus.", "rel": "2.TEORIA/T2.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1", "ext": "HTML", "name": "P1.CONSTRUCCION.html", "desc": "Simulador 3D: Estructura de cadera, rodillas, tobillos y panel facial.", "rel": "3.PRACTICAS/P1.CONSTRUCCION.html" },
            { "code": "P2", "ext": "HTML", "name": "P2.CINEMATICA.html", "desc": "Simulación 3D: Cinemática de marcha, zancada y oscilación de masa.", "rel": "3.PRACTICAS/P2.CINEMATICA.html" }
        ],
        "practices_phase3": [
            { "code": "P3", "ext": "HTML", "name": "P3.PROGRAMACION.html", "desc": "Programación visual: Diseño de emociones y mensajes en la matriz LED.", "rel": "3.PRACTICAS/P3.PROGRAMACION.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.JUEGO.html", "desc": "Reto gamificado: Mantén el equilibrio del bípedo sorteando desniveles.", "rel": "3.PRACTICAS/P4.JUEGO.html" }
        ]
    },
    {
        "id": "5.3",
        "folder": "5.3_Androide_MIXAMO",
        "html_file": "MAPA_CLASE_5.3_ANDROIDE_MIXAMO.html",
        "theme_classroom": "5.3 Androide MIXAMO",
        "title_classroom": "Cuaderno Interactivo: 5.3 Androides y Animación Mixamo (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), teoría general (PDF), guías de uso y fichas de taller (PDF), masterclass de simulación a Tesla (PDF), vídeo (MP4), simuladores 3D de montaje, intercambio de pieles, baile salsa y juego.",
        "icon": "🕺",
        "color": "#a855f7",
        "color_glow": "rgba(168, 85, 247, 0.45)",
        "headline": "Androides Digitales: Esqueletos, MOCAP y Adobe Mixamo",
        "subhead": "Auto-Rigging de 5 Puntos • Captura de Movimiento (MOCAP) • Retargeting • De la Simulación a Tesla Optimus",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Cómo cobran vida los personajes 3D y robots mediante captura de movimiento?", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA_GENERAL.pdf", "desc": "Teoría general: rigging, esqueletos digitales, huesos virtuales y cinemática.", "rel": "2.TEORIA/T1.TEORIA_GENERAL.pdf" },
            { "code": "T2-F", "ext": "PDF", "name": "T2.FICHA_GUIA_DE_USO_MIXAMO_NATIVO.pdf", "desc": "Ficha directa: elegir personaje nativo y aplicar animación en 2 minutos.", "rel": "2.TEORIA/T2.FICHA_GUIA_DE_USO_MIXAMO_NATIVO.pdf" },
            { "code": "T2-P", "ext": "PDF", "name": "T2.GUIA_DE_USO_MIXAMO_NATIVO.pdf", "desc": "Presentación paso a paso: catálogo de personajes y calibración motora.", "rel": "2.TEORIA/T2.GUIA_DE_USO_MIXAMO_NATIVO.pdf" },
            { "code": "T3-F", "ext": "PDF", "name": "T3.FICHA_GUIA_DE_USO_MIXAMO_UPLOAD.pdf", "desc": "Ficha directa: cazar en Sketchfab y auto-rigging en Mixamo.", "rel": "2.TEORIA/T3.FICHA_GUIA_DE_USO_MIXAMO_UPLOAD.pdf" },
            { "code": "T3-P", "ext": "PDF", "name": "T3.GUIA_DE_USO_MIXAMO_UPLOAD.pdf", "desc": "Presentación paso a paso: rigging completo desde modelos externos.", "rel": "2.TEORIA/T3.GUIA_DE_USO_MIXAMO_UPLOAD.pdf" },
            { "code": "T4", "ext": "PDF", "name": "T4.DEL SIMULADOR_AL_ROBOT.pdf", "desc": "Masterclass: cómo los ingenieros de Tesla transfieren del simulador al robot Optimus.", "rel": "2.TEORIA/T4.DEL SIMULADOR_AL_ROBOT.pdf" },
            { "code": "T5", "ext": "MP4", "name": "T5.VIDEO.mp4", "desc": "Vídeo demostrativo del flujo de animación y retargeting en androides.", "rel": "2.TEORIA/T5.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1", "ext": "HTML", "name": "P1.CONSTRUCCION.html", "desc": "Simulador 3D: Anatomía ósea en rayos X y estructura del rig.", "rel": "3.PRACTICAS/P1.CONSTRUCCION.html" },
            { "code": "P2", "ext": "HTML", "name": "P2.MIX_SKINS.html", "desc": "Simulador 3D: Retargeting y combinación de avatares (Salsa, Capoeira, Combate).", "rel": "3.PRACTICAS/P2.MIX_SKINS.html" }
        ],
        "practices_phase3": [
            { "code": "P3", "ext": "HTML", "name": "P3.SALSA_V2.html", "desc": "Simulador 3D: Coreografía interactiva sincronizada con ritmo musical.", "rel": "3.PRACTICAS/P3.SALSA_V2.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.JUEGO.html", "desc": "Reto gamificado: Controla las secuencias motoras del androide en la pista.", "rel": "3.PRACTICAS/P4.JUEGO.html" }
        ]
    },
    {
        "id": "5.4",
        "folder": "5.4_Transformer. (POO-y-Enjambres)",
        "html_file": "MAPA_CLASE_5.4_TRANSFORMER.html",
        "theme_classroom": "5.4 Transformer. (POO y Enjambres)",
        "title_classroom": "Cuaderno Interactivo: 5.4 Robots Transformers y Enjambres (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), presentación teórica (PDF), vídeo demostrativo (MP4), simulador de clase base, simulador de IA y movimiento, simulador de enjambres coordinados y juego de defensa.",
        "icon": "🚗",
        "color": "#f59e0b",
        "color_glow": "rgba(245, 158, 11, 0.45)",
        "headline": "Robots Transformers: Programación Orientada a Objetos y Enjambres",
        "subhead": "Reconfiguración Mecánica • Clases y Herencia en Robótica • Inteligencia de Enjambre • Comportamiento Colectivo",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Puede un robot cambiar de forma física según la misión a realizar?", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA.pdf", "desc": "Diapositivas oficiales: modularidad, clases en POO y coordinación de enjambres.", "rel": "2.TEORIA/T1.TEORIA.pdf" },
            { "code": "T2", "ext": "MP4", "name": "T2.VIDEO.mp4", "desc": "Vídeo explicativo de robots metamórficos y microrobots en enjambre.", "rel": "2.TEORIA/T2.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1", "ext": "HTML", "name": "P1.CLASE_BASE", "desc": "Simulador 3D: Definición de la clase robot base y estados de transformación.", "rel": "3.PRACTICAS/P1.CLASE_BASE/app.html" },
            { "code": "P2", "ext": "HTML", "name": "P2.IA_Y_MOVIMIENTO", "desc": "Simulador 3D: Cinemática de vehículo y androide bípedo transformable.", "rel": "3.PRACTICAS/P2.IA_Y_MOVIMIENTO/app.html" }
        ],
        "practices_phase3": [
            { "code": "P3", "ext": "HTML", "name": "P3.ENJAMBRES", "desc": "Simulador 3D: Algoritmos de bandada (Boids) y alineación de enjambres.", "rel": "3.PRACTICAS/P3.ENJAMBRES/app.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.JUEGO_DEFENSA", "desc": "Reto gamificado: Defiende la base coordinando escuadrones de robots transformables.", "rel": "3.PRACTICAS/P4.JUEGO_DEFENSA/app.html" }
        ]
    },
    {
        "id": "5.5",
        "folder": "5.5_Trio_Dinamico_StarWars",
        "html_file": "MAPA_CLASE_5.5_TRIO_STAR_WARS.html",
        "theme_classroom": "5.5 Trio Dinamico StarWars",
        "title_classroom": "Cuaderno Interactivo: 5.5 Trío Dinámico de Droides Star Wars (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), presentación teórica (PDF), vídeo demostrativo (MP4), simulador R2-D2, simulador BB-8 esférico, simulador C-3PO bípedo y simulador conjunto del Trío Dinámico.",
        "icon": "⭐",
        "color": "#eab308",
        "color_glow": "rgba(234, 179, 8, 0.45)",
        "headline": "Trío Dinámico Star Wars: R2-D2, BB-8 y C-3PO",
        "subhead": "Tracción Triciclo (R2) • Locomoción Esférica Holonómica (BB-8) • Droide de Protocolo Bípedo (C-3PO)",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Ruedas, esferas o piernas? Ventajas y desventajas biomecánicas.", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA.pdf", "desc": "Diapositivas oficiales: morfologías robóticas y cinemáticas comparadas en el cine.", "rel": "2.TEORIA/T1.TEORIA.pdf" },
            { "code": "T2", "ext": "MP4", "name": "T2.VIDEO.mp4", "desc": "Vídeo demostrativo del funcionamiento mecánico de los droides de Star Wars.", "rel": "2.TEORIA/T2.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1.1", "ext": "HTML", "name": "P1.1.R2D2_Presentacion.html", "desc": "Simulador 3D: Presentación y cinemática diferencial de R2-D2.", "rel": "3.PRACTICAS/P1.1_R2D2_Presentacion.html" },
            { "code": "P1.2", "ext": "HTML", "name": "P1.2.R2D2_Simulador.html", "desc": "Simulador 3D: Navegación y herramientas retráctiles de R2-D2.", "rel": "3.PRACTICAS/P1.2_R2D2_Simulador.html" },
            { "code": "P2.1", "ext": "HTML", "name": "P2.1.BB8_Construccion.html", "desc": "Simulador 3D: Mecanismo de péndulo interno magnético de BB-8.", "rel": "3.PRACTICAS/P2.1_BB8_Construccion.html" },
            { "code": "P2.2", "ext": "HTML", "name": "P2.2.BB8_Simulador.html", "desc": "Simulador 3D: Conducción de la esfera rodante con estabilización de cabeza.", "rel": "3.PRACTICAS/P2.2_BB8_Simulador.html" }
        ],
        "practices_phase3": [
            { "code": "P3.1", "ext": "HTML", "name": "P3.1.C3PO_Simulador.html", "desc": "Simulador 3D: Marcha bípeda de protocolo y servomotores de C-3PO.", "rel": "3.PRACTICAS/P3.1_C3PO_Simulador.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.TRIO_DINAMICO.html", "desc": "Simulador 3D: Misión interactiva coordinando a R2-D2, BB-8 y C-3PO en el hangar.", "rel": "3.PRACTICAS/P4_TRIO_DINAMICO.html" }
        ]
    },
    {
        "id": "5.6",
        "folder": "5.6_Robot-combate",
        "html_file": "MAPA_CLASE_5.6_ROBOT_COMBATE.html",
        "theme_classroom": "5.6 Robot combate",
        "title_classroom": "Cuaderno Interactivo: 5.6 Robot Mecha de Combate (Mapa de Recursos y Simuladores)",
        "desc_classroom": "Acceso interactivo a todos los recursos de la clase: debate inicial (PDF), presentación teórica (PDF), vídeo demostrativo (MP4), simulador de anatomía mecha, visor de animaciones de combate, arena de lucha y juego interactivo.",
        "icon": "⚔️",
        "color": "#ef4444",
        "color_glow": "rgba(239, 68, 68, 0.45)",
        "headline": "Robots Mecha de Combate y Exoesqueletos",
        "subhead": "Blindaje Pesado • Cinemática de Alta Energía • Máquinas de Estado de Animación • Arena de Combate",
        "theory": [
            { "code": "T0", "ext": "PDF", "name": "T0.DEBATE.pdf", "desc": "Debate: ¿Cómo absorben impactos y distribuyen energía los robots pesados?", "rel": "2.TEORIA/T0.DEBATE.pdf" },
            { "code": "T1", "ext": "PDF", "name": "T1.TEORIA.pdf", "desc": "Diapositivas oficiales: exoesqueletos, mechas, servomotores industriales y fatiga mecánica.", "rel": "2.TEORIA/T1.TEORIA.pdf" },
            { "code": "T2", "ext": "MP4", "name": "T2.VIDEO.mp4", "desc": "Vídeo demostrativo de competiciones de BattleBots y mechas gigantes reales.", "rel": "2.TEORIA/T2.VIDEO.mp4" }
        ],
        "practices_phase2": [
            { "code": "P1", "ext": "HTML", "name": "P1.CONOCE_A_MECHA.html", "desc": "Simulador 3D: Inspección técnica del chasis, actuadores de potencia y armadura.", "rel": "3.PRACTICAS/P1.CONOCE_A_MECHA.html" },
            { "code": "P2.1", "ext": "HTML", "name": "P2.1.VISOR_ANIMACIONES.html", "desc": "Simulador 3D: Máquina de estados con combos de ataque, esquiva y defensa.", "rel": "3.PRACTICAS/P2.1.VISOR_ANIMACIONES.html" }
        ],
        "practices_phase3": [
            { "code": "P3", "ext": "HTML", "name": "P3.LUCHA_DE-MECHAS.html", "desc": "Simulador 3D: Duelo de mechas en arena con físicas y barra de integridad.", "rel": "3.PRACTICAS/P3.LUCHA_DE-MECHAS.html" },
            { "code": "P4", "ext": "HTML", "name": "P4.JUEGO.html", "desc": "Reto gamificado: Supera oleadas de androides calibrando tiempos de reacción.", "rel": "3.PRACTICAS/P4.JUEGO.html" }
        ]
    }
]

def render_file_card(f, branch_color):
    if f["ext"] == "PDF":
        tag_class = "tag-pdf"
    elif f["ext"] == "MP4":
        tag_class = "tag-mp4"
    elif f["ext"] in ("PNG", "JPG", "IMG"):
        tag_class = "tag-png"
    else:
        tag_class = "tag-html"
    encoded_href = urllib.parse.quote(f['rel'], safe='/:')
    return f'''
        <a href="{encoded_href}" target="_blank" class="file-card">
            <div class="file-left">
                <span class="file-tag {tag_class}">{f['code']}</span>
                <div class="file-details">
                    <span class="file-title">{f['name']}</span>
                    <span class="file-desc">{f['desc']}</span>
                </div>
            </div>
            <span class="file-arrow" style="color: {branch_color};">↗</span>
        </a>
    '''

def generate_class_html_b5(c):
    total_resources = len(c["theory"]) + len(c["practices_phase2"]) + len(c["practices_phase3"])
    
    html = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clase {c['id']} • {c['headline']} — Mapa Mental Interactivo</title>
    <style>
        :root {{
            --bg-base: #070b14;
            --bg-card: rgba(15, 23, 42, 0.9);
            --border-glow: {c['color_glow']};
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --text-muted: #64748b;
            --primary: {c['color']};
            --cyan: #38bdf8;
            --emerald: #34d399;
            --amber: #fbbf24;
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: radial-gradient(circle at 50% 30%, #10162a 0%, #090b14 65%, #040508 100%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            user-select: none;
        }}

        header {{
            padding: 22px 20px 14px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            z-index: 10;
        }}
        .header-pill {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.06);
            color: var(--primary);
            border: 1px solid var(--border-glow);
            border-radius: 9999px;
            padding: 4px 16px;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }}
        h1 {{
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 40%, {c['color']} 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 6px;
        }}
        .subtitle {{
            font-size: 0.92rem;
            color: var(--text-sub);
            max-width: 720px;
            margin: 0 auto;
        }}

        .mindmap-canvas {{
            flex: 1;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 30px 20px 60px;
            max-width: 1300px;
            margin: 0 auto;
            width: 100%;
        }}

        .core-node {{
            background: radial-gradient(circle at 40% 30%, #1e293b 0%, #0f172a 80%);
            border: 2px solid var(--primary);
            border-radius: 28px;
            padding: 24px 36px;
            text-align: center;
            box-shadow: 0 0 35px var(--border-glow), inset 0 0 20px rgba(255, 255, 255, 0.05);
            margin-bottom: 45px;
            position: relative;
            z-index: 5;
            transition: all 0.3s ease;
        }}
        .core-node:hover {{
            transform: scale(1.03);
            box-shadow: 0 0 50px var(--border-glow);
        }}
        .core-icon {{
            font-size: 2.6rem;
            display: inline-block;
            margin-bottom: 6px;
        }}
        .core-title {{
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 4px;
        }}
        .core-desc {{
            font-size: 0.85rem;
            color: var(--text-sub);
            font-weight: 500;
        }}

        .branches-container {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            width: 100%;
            z-index: 4;
        }}
        @media (max-width: 960px) {{
            .branches-container {{ grid-template-columns: 1fr; }}
        }}

        .branch-column {{
            background: var(--bg-card);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 22px;
            backdrop-filter: blur(14px);
            display: flex;
            flex-direction: column;
            position: relative;
            transition: all 0.25s ease;
        }}
        .branch-column::before {{
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: var(--branch-color);
            border-radius: 20px 20px 0 0;
            box-shadow: 0 0 12px var(--branch-color);
        }}
        .branch-column:hover {{
            transform: translateY(-4px);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        }}

        .branch-header {{
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }}
        .branch-badge {{
            font-size: 0.75rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            color: var(--branch-color);
            font-family: monospace;
        }}
        .branch-title {{
            font-size: 1.12rem;
            font-weight: 700;
            color: #fff;
        }}
        .branch-count {{
            margin-left: auto;
            font-size: 0.75rem;
            color: var(--text-muted);
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 7px;
            border-radius: 10px;
        }}

        .file-stack {{
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex: 1;
        }}
        .file-card {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 14px 16px;
            text-decoration: none;
            color: var(--text-main);
            transition: all 0.2s ease;
        }}
        .file-card:hover {{
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--branch-color);
            transform: translateX(4px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }}
        .file-left {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .file-tag {{
            font-family: monospace;
            font-weight: 800;
            font-size: 0.78rem;
            padding: 4px 8px;
            border-radius: 6px;
            flex-shrink: 0;
        }}
        .tag-pdf {{ background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }}
        .tag-png {{ background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); }}
        .tag-mp4 {{ background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.4); }}
        .tag-html {{ background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }}

        .file-details {{
            display: flex;
            flex-direction: column;
        }}
        .file-title {{
            font-size: 0.95rem;
            font-weight: 600;
            color: #f1f5f9;
            line-height: 1.3;
        }}
        .file-desc {{
            font-size: 0.78rem;
            color: var(--text-muted);
            margin-top: 2px;
        }}
        .file-arrow {{
            font-size: 0.9rem;
            font-weight: 700;
            margin-left: 10px;
            flex-shrink: 0;
        }}

        .bottom-bar {{
            margin-top: 36px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 900px;
            font-size: 0.85rem;
            color: var(--text-sub);
            flex-wrap: wrap;
            gap: 12px;
        }}
        .status-dot {{
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            margin-right: 6px;
        }}
    </style>
</head>
<body>

    <header>
        <div class="header-pill">BLOQUE 5 • ANDROIDES Y BIPEDISMO • CLASE {c['id']}</div>
        <h1>{c['headline']}</h1>
        <p class="subtitle">{c['subhead']}</p>
    </header>

    <main class="mindmap-canvas">

        <!-- NODO CENTRAL (NÚCLEO) -->
        <div class="core-node">
            <span class="core-icon">{c['icon']}</span>
            <h2 class="core-title">{c['headline']}</h2>
            <p class="core-desc">Mapa de Recursos Educativos, Diapositivas y Simuladores Interactivos</p>
        </div>

        <!-- CONTENEDOR DE 3 RAMAS -->
        <div class="branches-container">

            <!-- FASE 1 -->
            <div class="branch-column" style="--branch-color: var(--cyan);">
                <div class="branch-header">
                    <span class="branch-badge">FASE 1</span>
                    <h3 class="branch-title">Teoría y Fundamentos</h3>
                    <span class="branch-count">{len(c['theory'])} recursos</span>
                </div>
                <div class="file-stack">
                    {''.join([render_file_card(f, "var(--cyan)") for f in c['theory']])}
                </div>
            </div>

            <!-- FASE 2 -->
            <div class="branch-column" style="--branch-color: var(--emerald);">
                <div class="branch-header">
                    <span class="branch-badge">FASE 2</span>
                    <h3 class="branch-title">Montaje y Gemelo Digital</h3>
                    <span class="branch-count">{len(c['practices_phase2'])} simuladores</span>
                </div>
                <div class="file-stack">
                    {''.join([render_file_card(f, "var(--emerald)") for f in c['practices_phase2']])}
                </div>
            </div>

            <!-- FASE 3 -->
            <div class="branch-column" style="--branch-color: var(--amber);">
                <div class="branch-header">
                    <span class="branch-badge">FASE 3</span>
                    <h3 class="branch-title">Programación y Reto</h3>
                    <span class="branch-count">{len(c['practices_phase3'])} talleres</span>
                </div>
                <div class="file-stack">
                    {''.join([render_file_card(f, "var(--amber)") for f in c['practices_phase3']])}
                </div>
            </div>

        </div>

        <div class="bottom-bar">
            <div>
                <span class="status-dot"></span>
                <span>Clase activa e independiente • {total_resources} recursos vinculados</span>
            </div>
            <div>
                <span>Solo un enlace en Classroom para toda la clase</span>
            </div>
        </div>

    </main>

</body>
</html>
'''
    target_path = os.path.join(ROOT_DIR, "BLOQUE-5_Androides", c["folder"], c["html_file"])
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Mapa interactivo creado en: {target_path}")

def update_csv():
    csv_file = os.path.join(ROOT_DIR, "PANELES_CSV", "5.PANEL_B5.csv")
    backup_file = os.path.join(ROOT_DIR, "PANELES_CSV", "5.PANEL_B5.backup_48_ficheros.csv")
    
    # Backup original if not already backed up
    if os.path.exists(csv_file) and not os.path.exists(backup_file):
        with open(csv_file, 'r', encoding='utf-8') as src, open(backup_file, 'w', encoding='utf-8') as dst:
            dst.write(src.read())
        print(f"💾 Copia de seguridad del CSV anterior guardada en: {backup_file}")
        
    rows = []
    for c in CLASSES_DEF_B5:
        rel_path = f"BLOQUE-5_Androides/{c['folder']}/{c['html_file']}"
        rel_path_nfc = unicodedata.normalize('NFC', rel_path)
        url_github = BASE_URL + urllib.parse.quote(rel_path_nfc)
        
        rows.append([
            '',
            c["theme_classroom"],
            c["title_classroom"],
            c["desc_classroom"],
            url_github
        ])
        
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID_CURSO', 'TEMA_CLASSROOM', 'TITULO_MATERIAL', 'DESCRIPCION_MATERIAL', 'URL_GITHUB'])
        writer.writerows(rows)
        
    print(f"✅ CSV actualizado con éxito ({len(rows)} filas) en: {csv_file}")

def main():
    print("🚀 Generando los 6 mapas interactivos del Bloque 5...")
    for c in CLASSES_DEF_B5:
        generate_class_html_b5(c)
    update_csv()
    print("🎉 ¡Todo generado correctamente!")

if __name__ == "__main__":
    main()
