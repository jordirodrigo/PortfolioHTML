/**
 * desktop.js
 * 
 * Lógica principal del escritorio retro-fantástico
 * Gestiona:
 * - Creación de iconos del escritorio
 * - Ventanas de explorador de archivos
 * - Visor 3D con Three.js
 * - Eventos de doble-clic
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const MODELS = {
    muelle: { icon: '📁', name: 'Muelle', path: 'modelos/muelle.glb' },
    guitarra: { icon: '📁', name: 'Guitarra', path: 'modelos/guitarra.glb' },
    guardian: { icon: '📁', name: 'Guardian', path: 'modelos/guardian.glb' },
    camisa: { icon: '📁', name: 'Camisa', path: 'modelos/camisa.glb' }
};

const DESKTOP_FILES = {
    cv: { icon: '📄', name: 'CV', path: 'modelos/cv/CV.pdf', type: 'pdf' }
};

// ============================================
// INSTANCIAS GLOBALES
// ============================================

let windowManager = null;
let openViewers = new Map(); // Mapear ID de ventana a instancia de Viewer3D

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que THREE.js esté cargado desde CDN
    setTimeout(() => {
        console.log('[desktop] DOMContentLoaded - initializing...');
        console.log('[desktop] THREE available?', !!window.THREE);
        
        // Inicializar manager de ventanas
        windowManager = new WindowManager('windowsContainer', 'taskbarTasks');

        // Crear iconos del escritorio
        createDesktopIcons();

        // Actualizar hora del sistema
        updateSystemTime();
        setInterval(updateSystemTime, 1000);

        // Manejar doble-clic en escritorio
        setupDesktopEvents();

        console.log('✨ Portfolio retro-fantástico iniciado');
    }, 200);
});

// ============================================
// ICONOS DEL ESCRITORIO
// ============================================

function createDesktopIcons() {
    const desktopIcons = document.getElementById('desktopIcons');

    // Crear iconos de carpetas (modelos)
    Object.entries(MODELS).forEach(([key, model]) => {
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.id = `icon-${key}`;
        icon.draggable = false;

        // Imagen del icono
        const image = document.createElement('div');
        image.className = 'desktop-icon-image';
        image.textContent = model.icon;

        // Etiqueta
        const label = document.createElement('div');
        label.className = 'desktop-icon-label';
        label.textContent = model.name;

        icon.appendChild(image);
        icon.appendChild(label);

        // Eventos
        icon.addEventListener('dblclick', () => openFolderWindow(key, model));
        icon.addEventListener('mousedown', () => {
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
        });

        desktopIcons.appendChild(icon);
    });

    // Crear iconos de archivos (PDF, etc)
    Object.entries(DESKTOP_FILES).forEach(([key, file]) => {
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.id = `file-icon-${key}`;
        icon.draggable = false;

        // Imagen del icono
        const image = document.createElement('div');
        image.className = 'desktop-icon-image';
        image.textContent = file.icon;

        // Etiqueta
        const label = document.createElement('div');
        label.className = 'desktop-icon-label';
        label.textContent = file.name;

        icon.appendChild(image);
        icon.appendChild(label);

        // Eventos
        if (file.type === 'pdf') {
            icon.addEventListener('dblclick', () => openPDF(file.path));
        }
        icon.addEventListener('mousedown', () => {
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
        });

        desktopIcons.appendChild(icon);
    });
}

// ============================================
// VENTANA DE EXPLORADOR
// ============================================

function openFolderWindow(folderId, modelInfo) {
    const windowId = `folder-${folderId}`;

    // Evitar duplicar ventana
    if (windowManager.getWindow(windowId)) {
        windowManager.bringToFront(windowId);
        return;
    }

    // Crear contenedor de explorador
    const explorerDiv = document.createElement('div');
    explorerDiv.className = 'file-explorer';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'explorer-toolbar';

    const backBtn = document.createElement('button');
    backBtn.className = 'explorer-button';
    backBtn.textContent = '⬅️ Atrás';
    backBtn.addEventListener('click', () => {
        windowManager.closeWindow(windowId);
    });
    toolbar.appendChild(backBtn);

    explorerDiv.appendChild(toolbar);

    // Contenedor de archivos
    const fileContainer = document.createElement('div');
    fileContainer.className = 'explorer-files';

    // Crear archivo .blend
    const blendFile = document.createElement('div');
    blendFile.className = 'file-item';
    blendFile.id = `file-${folderId}`;
    const fileIcon = document.createElement('img');
    fileIcon.className = 'file-icon';
    fileIcon.src = 'modelos/iconos/blender.png';
    fileIcon.alt = 'Blender';

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = `${folderId}.blend`;

    blendFile.appendChild(fileIcon);
    blendFile.appendChild(fileName);

    // Eventos del archivo
    blendFile.addEventListener('click', () => {
        selectFile(blendFile);
    });

    blendFile.addEventListener('dblclick', () => {
        openViewer3D(folderId, modelInfo);
    });

    fileContainer.appendChild(blendFile);
    explorerDiv.appendChild(fileContainer);

    // Crear ventana
    windowManager.createWindow({
        id: windowId,
        title: `📁 ${modelInfo.name}`,
        contentElement: explorerDiv,
        width: 500,
        height: 350,
        closable: true
    });
}

function selectFile(fileEl) {
    document.querySelectorAll('.file-item').forEach(f => f.classList.remove('selected'));
    fileEl.classList.add('selected');
}

// ============================================
// ABRIR PDF
// ============================================

function openPDF(pdfPath) {
    const windowId = 'pdf-viewer';
    if (windowManager.getWindow(windowId)) {
        windowManager.bringToFront(windowId);
        return;
    }
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'padding: 10px; background: #c0c0c0; border-bottom: 2px solid #dfdfdf; display: flex; gap: 5px;';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'explorer-button';
    downloadBtn.textContent = '⬇️ Descargar';
    downloadBtn.style.cssText = 'padding: 4px 12px; cursor: pointer;';
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = pdfPath;
        link.download = 'CV.pdf';
        link.click();
    });
    toolbar.appendChild(downloadBtn);
    pdfContainer.appendChild(toolbar);
    const iframe = document.createElement('iframe');
    iframe.src = pdfPath;
    iframe.style.cssText = 'flex: 1; border: none; width: 100%;';
    pdfContainer.appendChild(iframe);
    windowManager.createWindow({
        id: windowId,
        title: '📄 CV',
        contentElement: pdfContainer,
        width: 800,
        height: 600,
        closable: true
    });

}
// ============================================
// VENTANA VISOR 3D
// ============================================

function openViewer3D(modelId, modelInfo) {
    const windowId = `viewer-${modelId}`;

    // Evitar duplicar ventana
    if (windowManager.getWindow(windowId)) {
        windowManager.bringToFront(windowId);
        return;
    }

    // Crear contenedor principal del visor
    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'viewer-3d-container';

    // Canvas para Three.js
    const canvas = document.createElement('div');
    canvas.className = 'viewer-canvas';
    canvas.id = `canvas-${modelId}`;
    viewerContainer.appendChild(canvas);

    // Panel de controles
    const controlsPanel = document.createElement('div');
    controlsPanel.className = 'viewer-controls';

    // ===== SLIDERS DE ESCALA =====
    const scaleGroup = document.createElement('div');
    scaleGroup.className = 'control-group';

    const scaleLabel = document.createElement('div');
    scaleLabel.className = 'control-label';
    scaleLabel.textContent = '📏 Escala del Modelo';
    scaleGroup.appendChild(scaleLabel);

    // Valores por defecto
    const scaleDefaults = { x: 1, y: 1, z: 1 };
    const scaleValues = { ...scaleDefaults };

    // Slider X
    const scaleXRow = createSliderControl('Scale X', scaleValues.x, 0.1, 3, 0.1, (val) => {
        scaleValues.x = val;
        if (openViewers.has(windowId)) {
            openViewers.get(windowId).setScale(scaleValues.x, scaleValues.y, scaleValues.z);
        }
    });
    scaleGroup.appendChild(scaleXRow);

    // Slider Y
    const scaleYRow = createSliderControl('Scale Y', scaleValues.y, 0.1, 3, 0.1, (val) => {
        scaleValues.y = val;
        if (openViewers.has(windowId)) {
            openViewers.get(windowId).setScale(scaleValues.x, scaleValues.y, scaleValues.z);
        }
    });
    scaleGroup.appendChild(scaleYRow);

    // Slider Z
    const scaleZRow = createSliderControl('Scale Z', scaleValues.z, 0.1, 3, 0.1, (val) => {
        scaleValues.z = val;
        if (openViewers.has(windowId)) {
            openViewers.get(windowId).setScale(scaleValues.x, scaleValues.y, scaleValues.z);
        }
    });
    scaleGroup.appendChild(scaleZRow);

    controlsPanel.appendChild(scaleGroup);

    // ===== BOTONES =====
    const buttonsGroup = document.createElement('div');
    buttonsGroup.className = 'control-group';

    const buttonsLabel = document.createElement('div');
    buttonsLabel.className = 'control-label';
    buttonsLabel.textContent = '🎛️ Herramientas';
    buttonsGroup.appendChild(buttonsLabel);

    const buttonRow1 = document.createElement('div');
    buttonRow1.className = 'button-group';

    // Botón Wireframe
    const wireframeBtn = document.createElement('button');
    wireframeBtn.className = 'control-button';
    wireframeBtn.textContent = 'Wireframe';
    wireframeBtn.addEventListener('click', () => {
        if (openViewers.has(windowId)) {
            const isWireframe = openViewers.get(windowId).toggleWireframe();
            wireframeBtn.classList.toggle('active', isWireframe);
        }
    });
    buttonRow1.appendChild(wireframeBtn);

    // Botón Show Rig
    const rigBtn = document.createElement('button');
    rigBtn.className = 'control-button';
    rigBtn.textContent = 'Show Rig';
    rigBtn.addEventListener('click', () => {
        if (openViewers.has(windowId)) {
            const hasRig = openViewers.get(windowId).toggleSkeletonHelper();
            rigBtn.classList.toggle('active', hasRig);
        }
    });
    buttonRow1.appendChild(rigBtn);

    // Botón Cambiar Fondo
    const bgBtn = document.createElement('button');
    bgBtn.className = 'control-button';
    bgBtn.textContent = 'Fondo';
    bgBtn.addEventListener('click', () => {
        if (openViewers.has(windowId)) {
            openViewers.get(windowId).changeBackground();
        }
    });
    buttonRow1.appendChild(bgBtn);

    buttonsGroup.appendChild(buttonRow1);

    // ===== BOTÓN ANIMACIÓN (SOLO PARA GUARDIAN) =====
    if (modelId === 'guardian') {
        const animRow = document.createElement('div');
        animRow.className = 'button-group';

        const playAnimBtn = document.createElement('button');
        playAnimBtn.className = 'control-button';
        playAnimBtn.textContent = '▶️ Play Anim';
        playAnimBtn.addEventListener('click', async () => {
            if (openViewers.has(windowId)) {
                const viewer = openViewers.get(windowId);
                const animations = viewer.getAnimations();

                if (animations.length > 0) {
                    // Reproducir primera animación (o la siguiente)
                    const currentIndex = viewer.actions.findIndex(a => a.isRunning());
                    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % animations.length;
                    viewer.playAnimation(nextIndex);
                    playAnimBtn.classList.add('active');
                } else {
                    alert('❌ Este modelo no tiene animaciones');
                }
            }
        });

        const stopAnimBtn = document.createElement('button');
        stopAnimBtn.className = 'control-button';
        stopAnimBtn.textContent = '⏹️ Stop Anim';
        stopAnimBtn.addEventListener('click', () => {
            if (openViewers.has(windowId)) {
                openViewers.get(windowId).stopAnimation();
                playAnimBtn.classList.remove('active');
            }
        });

        animRow.appendChild(playAnimBtn);
        animRow.appendChild(stopAnimBtn);
        buttonsGroup.appendChild(animRow);
    }

    controlsPanel.appendChild(buttonsGroup);
    viewerContainer.appendChild(controlsPanel);

    // Crear ventana
    const windowEl = windowManager.createWindow({
        id: windowId,
        title: `🎬 ${modelInfo.name} (.blend)`,
        contentElement: viewerContainer,
        width: 800,
        height: 600,
        closable: true,
        onClose: () => {
            // Limpiar visor 3D al cerrar
            if (openViewers.has(windowId)) {
                openViewers.get(windowId).dispose();
                openViewers.delete(windowId);
            }
        }
    });

    // Inicializar visor 3D directamente
    // (No esperar a THREE - Viewer3D maneja los fallbacks internamente)
    setTimeout(() => {
        try {
            console.log(`[desktop] Creating Viewer3D for ${modelId}`);
            const viewer = new Viewer3D(canvas, modelId);
            openViewers.set(windowId, viewer);
            console.log(`[desktop] Viewer3D instance created for ${modelId}`);

            // Cargar modelo
            viewer.loadModel(modelInfo.path)
                .then(() => {
                    console.log(`[desktop] Model loaded successfully for ${modelId}`);
                })
                .catch(err => {
                    console.error(`[desktop] Error cargando ${modelInfo.name}:`, err);
                    alert(`❌ Error cargando el modelo: ${modelInfo.name}\n\nAsegúrate de que el archivo existe en: ${modelInfo.path}\n\nError: ${err.message}`);
                });
        } catch (err) {
            console.error(`[desktop] Error inicializando visor para ${modelInfo.name}:`, err);
            alert(`❌ Error inicializando visor 3D: ${err.message}`);
        }
    }, 50);
}

// ============================================
// CONTROLES GENÉRICOS
// ============================================

function createSliderControl(label, defaultValue, min, max, step, onChange) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelEl = document.createElement('label');
    labelEl.style.fontSize = '10px';
    labelEl.style.minWidth = '50px';
    labelEl.textContent = label;

    const container = document.createElement('div');
    container.className = 'slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = defaultValue;

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = defaultValue.toFixed(2);

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueDisplay.textContent = val.toFixed(2);
        onChange(val);
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);

    row.appendChild(labelEl);
    row.appendChild(container);

    return row;
}

// ============================================
// EVENTOS DEL ESCRITORIO
// ============================================

function setupDesktopEvents() {
    const desktop = document.getElementById('desktop');

    desktop.addEventListener('click', (e) => {
        // Deseleccionar iconos al clickear en escritorio vacío
        if (e.target === desktop) {
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('active'));
        }
    });

    // Evento de teclado para seleccionar archivos
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            const selected = document.querySelector('.desktop-icon.active');
            if (selected) {
                const id = selected.id.replace('icon-', '');
                console.log(`Intento de borrar: ${id}`);
            }
        }
    });
}

// ============================================
// RELOJ DEL SISTEMA
// ============================================

function updateSystemTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('systemTime');
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}`;
    }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Debug: Log de estado del sistema
 */
function debugStatus() {
    console.group('📊 Estado del Sistema');
    console.log('Ventanas abiertas:', windowManager.getOpenWindows());
    console.log('Visores 3D activos:', Array.from(openViewers.keys()));
    console.group();
}

// Exponer para consola
window.debugStatus = debugStatus;
