# GUÍA TÉCNICA Y MANUAL DE APRENDIZAJE: SISTEMA DE PERSONAJES MIXAMO Y ARMAMENTO 3D

Este documento recopila la metodología completa, decisiones técnicas, soluciones a incidencias y arquitectura implementada para integrar personajes 3D de Mixamo, animaciones esqueléticas, acoplamiento dinámico de armas (sables de luz y blásters) y optimización de rendimiento en el Gran Museo de Star Wars y visores web Three.js.

---

## 1. Pipeline de Personajes Mixamo a Three.js

### 1.1 Descarga y Preparación de Modelos
* **Formato Base:** Modelos FBX descargados desde Mixamo en *T-Pose* o *A-Pose* (con Skin).
* **Nomenclatura y Jerarquía Esquelética:** Mixamo utiliza por defecto la convención de huesos `mixamorig:Hips`, `mixamorig:Spine`, `mixamorig:RightArm`, `mixamorig:RightForeArm`, `mixamorig:RightHand`, etc.
* **Problema de Prefijos Incompatibles:** Algunos modelos descargados o modificados contienen variaciones como `mixamorig9:`, `mixamorig1:`, o sin prefijo.
* **Solución de Normalización:**
  ```javascript
  function normalizeBoneNames(skinnedMesh) {
    skinnedMesh.skeleton.bones.forEach(bone => {
      // Unifica cualquier prefijo numérico a 'mixamorig:' estándar
      bone.name = bone.name.replace(/^mixamorig\d*:/, 'mixamorig:');
    });
  }
  ```

### 1.2 Texturizado y Materiales
* **Problemas de Texturas Negras o Transparentes:**
  * Mezcla incorrecta de canales alfa en modelos con capas de ropa o transparencias (`material.transparent = true`, `material.alphaTest = 0.5`, `material.depthWrite = true`).
  * Normales invertidas o materiales de doble cara requeridos (`material.side = THREE.DoubleSide`).
* **Optimización de Materiales PBR:** Uso de `MeshStandardMaterial` configurando adecuadamente `roughness`, `metalness` y mapeo de entorno (`envMap`) para reflejos metálicos realistas en armaduras (Vader, Boba Fett, Stormtroopers).

---

## 2. Sistema de Armamento y Sables Láser en Tiempo Real

### 2.1 Acoplamiento al Esqueleto (Bone Attachment)
Existen dos métodos implementados:
1. **Acoplamiento Directo al Hueso:**
   * Se localiza el hueso de la mano (`rightHandBone = character.getObjectByName('mixamorig:RightHand')`).
   * Se añade la malla del arma directamente como hijo: `rightHandBone.add(weaponMesh)`.
   * **Ventaja:** El arma sigue automáticamente cualquier animación sin necesidad de recalcular transformaciones en el bucle de render.

2. **Calibración de Offsets por Personaje:**
   * Cada personaje y pose de mano requiere un offset fino de posición (`x, y, z`) y rotación (`rotation.x, rotation.y, rotation.z` en radianes).
   * **Tabla de Calibración:**
     * **Sables estándar (Vader, Luke, Obi-Wan):** Alineados al eje longitudinal del antebrazo con empuñadura cerrada en la palma.
     * **Ahsoka Tano (Estilo Shien / Agarre Invertido):** Rotación de 180° en el eje Y/Z del sable para que la hoja apunte hacia atrás a lo largo del antebrazo.
     * **Darth Maul (Doble Sable Láser):** Centrado exacto en la mano con doble hoja procedural emergente hacia ambos extremos.
     * **Blásters y Rifles (Boba Fett, Stormtrooper, Din Djarin):** Agarre alineado al gatillo con vector de apuntado frontal.

### 2.2 Generación Procedural de Sables de Luz de Alto Impacto Visual
En lugar de depender de mallas estáticas de baja calidad, los sables de luz se componen de 3 elementos:
1. **Empuñadura 3D (Hilt):** Malla cilíndrica metálica detallada (`MeshStandardMaterial` con `metalness: 0.9, roughness: 0.2`).
2. **Núcleo Incandescente (Core Blade):** Cilindro blanco brillante (`MeshBasicMaterial({ color: 0xffffff })`).
3. **Halo de Energía / Glow:** Cilindro exterior ligeramente más ancho con `MeshBasicMaterial`, color emisivo puro (rojo `#ff0033`, azul `#0088ff`, verde `#00ff44`, púrpura `#aa00ff`), `transparent: true`, `opacity: 0.7` y `blending: THREE.AdditiveBlending`.

---

## 3. Retargeting e Intercambio Dinámico de Animaciones

### 3.1 Carga de Clips FBX Independientes
* Las animaciones se almacenan como archivos `.fbx` ligeros (solo esqueleto y keyframes, sin malla pesada).
* **Mapeo al `AnimationMixer`:**
  ```javascript
  const mixer = new THREE.AnimationMixer(characterModel);
  const action = mixer.clipAction(loadedAnimationClip);
  action.reset().fadeIn(0.3).play();
  ```

### 3.2 Transiciones Suaves (Cross-Fading)
* Para alternar entre poses (Idle, Combate, Ataque, Caminar, Saludo, Danza/Swing), se utiliza cross-fading para evitar saltos bruscos:
  ```javascript
  function changeAnimation(newClip, duration = 0.4) {
    const nextAction = mixer.clipAction(newClip);
    nextAction.reset();
    if (currentAction) {
      currentAction.crossFadeTo(nextAction, duration, true);
    }
    nextAction.play();
    currentAction = nextAction;
  }
  ```

---

## 4. Prevención de Bloqueos y Optimización de Rendimiento

### 4.1 Caso de Estudio: Corrección del Landspeeder #8 y Modelos Pesados
* **Diagnóstico del Fallo:** Modelos con mallas sin congelar, matrices jerárquicas profundas recalculadas en cada frame o archivos externos `.bin`/texturas bloqueantes provocaban congelación del hilo principal de JavaScript y del navegador.
* **Solución Implementada:**
  1. Empaquetado integral en un único binario `.glb` auto-contenido y comprimido.
  2. Uso de `mesh.matrixAutoUpdate = false` y `mesh.freezeWorldMatrix()` en mallas estáticas.
  3. Límite de resolución en texturas WebGL (máximo 2048x2048 para modelos en tiempo real).
  4. Liberación explícita de memoria WebGL al cambiar de sala o visor:
     ```javascript
     function disposeHierarchy(node) {
       if (node.geometry) node.geometry.dispose();
       if (node.material) {
         if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
         else node.material.dispose();
       }
     }
     ```

---

## 5. Arquitectura de las Salas y Visores en el Proyecto

* **Sala 4 (Galería de Personajes Mixamo):**
  * Ubicación: `BLOQUE-6_Naves_espaciales/6.2_Star_Wars/4.GRAN_MUSEO_STAR_WARS/4.PERSONAJES_MIXAMO/`
  * 16 personajes optimizados con selector de animaciones y armas sincronizadas.
* **Sala 6 (Sala Interactiva Darth Maul / Alumnos):**
  * Ubicación: `BLOQUE-6_Naves_espaciales/6.2_Star_Wars/4.GRAN_MUSEO_STAR_WARS/6.SALA_INTERACTIVA_DARTH_MAUL/`
  * Control de rotación 360°, sable doble interactivo, animaciones dinámicas y panel de calibración.
* **Taller de Animación y Escaparate:**
  * `P2.2_ESCAPARATE_PERSONAJES_STAR_WARS.html`: Visor comparativo multipersonaje.
  * `P2.3_TALLER_ANIMACION_MIXAMO_STAR_WARS.html`: Entorno interactivo para pruebas de esqueleto y armas.

---

## 6. Procedimiento para Añadir Nuevos Personajes o Armas

1. **Obtener FBX de Mixamo:** Descargar en T-Pose con Skin.
2. **Exportar a GLB:** Pasar por Blender verificando que el esqueleto conserve el root `mixamorig:Hips`.
3. **Definir Armamento en el Visor:**
   * Si es sable de luz: instanciar mediante la función generadora `createLightsaber(color, hiltStyle)`.
   * Si es arma externa (bláster): cargar el modelo `.glb` de `3.ARMERIA_GALACTICA/`.
4. **Registrar Offset en Configuración:**
   ```javascript
   const WEAPON_OFFSETS = {
     darth_vader: { pos: [0.02, 0.05, -0.01], rot: [0, Math.PI / 2, 0], scale: 1.0 },
     ahsoka_tano: { pos: [-0.01, 0.04, 0.02], rot: [Math.PI, 0, 0], scale: 0.9 },
     // Añadir nuevo personaje aquí
   };
   ```
5. **Probar en Google Chrome** usando el servidor local en el puerto `8888`.
