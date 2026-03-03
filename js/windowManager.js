/**
 * windowManager.js
 * 
 * Gestor centralizado de ventanas con soporte para:
 * - Crear/destruir ventanas
 * - Arrastrar ventanas (drag & drop)
 * - Gestión de z-index
 * - Registro de ventanas activas
 * - Integración con taskbar
 */

class WindowManager {
    constructor(containerId, taskbarTasksId) {
        this.container = document.getElementById(containerId);
        this.taskbarTasks = document.getElementById(taskbarTasksId);
        this.windows = new Map();
        this.zIndexCounter = 1000;
        this.draggingWindow = null;
        this.dragOffset = { x: 0, y: 0 };
        this.resizingWindow = null;
        this.resizeEdge = null;

        this.setupEventListeners();
    }

    /**
     * Evento global de mouse para arrastrar ventanas
     */
    setupEventListeners() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    /**
     * Crear una nueva ventana
     * @param {Object} config - Configuración de la ventana
     * @param {string} config.id - ID único de la ventana
     * @param {string} config.title - Título de la ventana
     * @param {string} config.content - Contenido HTML (opcional, usado si no hay contentElement)
     * @param {Element} config.contentElement - Elemento DOM (opcional)
     * @param {number} config.width - Ancho inicial (default 600)
     * @param {number} config.height - Alto inicial (default 400)
     * @param {number} config.x - Posición X (default aleatorio)
     * @param {number} config.y - Posición Y (default aleatorio)
     * @param {Function} config.onClose - Callback al cerrar
     * @param {boolean} config.closable - Si se puede cerrar (default true)
     * @returns {Element} El elemento de ventana creado
     */
    createWindow(config) {
        const {
            id,
            title,
            content = '',
            contentElement = null,
            width = 600,
            height = 400,
            x = Math.random() * (window.innerWidth - width - 48),
            y = Math.random() * (window.innerHeight - height - 100),
            onClose = null,
            closable = true
        } = config;

        // Crear elemento de ventana
        const windowEl = document.createElement('div');
        windowEl.className = 'window';
        windowEl.id = id;
        windowEl.style.width = width + 'px';
        windowEl.style.height = height + 'px';
        windowEl.style.left = x + 'px';
        windowEl.style.top = y + 'px';
        windowEl.style.zIndex = this.zIndexCounter++;

        // Crear barra de título
        const titleBar = document.createElement('div');
        titleBar.className = 'window-title-bar';
        titleBar.dataset.windowId = id;

        const titleText = document.createElement('div');
        titleText.className = 'window-title';
        titleText.textContent = title;
        titleBar.appendChild(titleText);

        // Crear botones de la ventana
        const buttons = document.createElement('div');
        buttons.className = 'window-buttons';

        // Botón Fullscreen
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'window-button';
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = 'Pantalla Completa';
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen(id));
        buttons.appendChild(fullscreenBtn);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'window-button';
            closeBtn.textContent = '×';
            closeBtn.title = 'Cerrar';
            closeBtn.addEventListener('click', () => this.closeWindow(id));
            buttons.appendChild(closeBtn);
        }

        titleBar.appendChild(buttons);
        windowEl.appendChild(titleBar);

        // Crear contenido
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-content';

        if (contentElement) {
            contentDiv.appendChild(contentElement);
        } else if (content) {
            contentDiv.innerHTML = content;
        }

        windowEl.appendChild(contentDiv);

        // Crear handles de resize en esquinas y bordes
        const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        resizeHandles.forEach(edge => {
            const handle = document.createElement('div');
            handle.className = `window-resize-handle resize-${edge}`;
            handle.dataset.edge = edge;
            handle.addEventListener('mousedown', (e) => this.handleResizeStart(e, id));
            windowEl.appendChild(handle);
        });

        // Añadir a contenedor
        this.container.appendChild(windowEl);

        // Registrar datos de ventana
        this.windows.set(id, {
            element: windowEl,
            titleBar: titleBar,
            onClose: onClose,
            contentDiv: contentDiv
        });

        // Añadir botón a taskbar
        this.addTaskbarButton(id, title);

        // Evento para traer ventana al frente al clickear
        windowEl.addEventListener('mousedown', () => this.bringToFront(id));

        return windowEl;
    }

    /**
     * Añadir botón de ventana a taskbar
     */
    addTaskbarButton(windowId, title) {
        const btn = document.createElement('button');
        btn.className = 'taskbar-button active';
        btn.textContent = title;
        btn.id = `taskbar-${windowId}`;
        btn.dataset.windowId = windowId;

        btn.addEventListener('click', () => {
            const windowEl = document.getElementById(windowId);
            if (windowEl.style.display === 'none') {
                windowEl.style.display = 'flex';
                this.bringToFront(windowId);
            } else {
                windowEl.style.display = 'none';
            }
        });

        this.taskbarTasks.appendChild(btn);
    }

    /**
     * Cerrar una ventana
     */
    closeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        // Callback
        if (windowData.onClose) {
            windowData.onClose();
        }

        // Remover elemento
        windowData.element.remove();

        // Remover de taskbar
        const taskbarBtn = document.getElementById(`taskbar-${windowId}`);
        if (taskbarBtn) taskbarBtn.remove();

        // Remover del registro
        this.windows.delete(windowId);
    }

    /**
     * Traer ventana al frente (z-index máximo)
     */
    bringToFront(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        windowData.element.style.zIndex = this.zIndexCounter++;

        // Actualizar estado de taskbar
        document.querySelectorAll('.taskbar-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const taskbarBtn = document.getElementById(`taskbar-${windowId}`);
        if (taskbarBtn) {
            taskbarBtn.classList.add('active');
        }
    }

    /**
     * Obtener contenido de una ventana para manipulación
     */
    getWindowContent(windowId) {
        const windowData = this.windows.get(windowId);
        return windowData ? windowData.contentDiv : null;
    }

    /**
     * Obtener elemento de ventana
     */
    getWindow(windowId) {
        const windowData = this.windows.get(windowId);
        return windowData ? windowData.element : null;
    }

    /**
     * Gestionar inicio de arrastre en barra de título
     */
    handleMouseDown(e) {
        const titleBar = e.target.closest('.window-title-bar');
        if (!titleBar && !e.target.classList.contains('window-title')) {
            return;
        }

        const windowId = titleBar.dataset.windowId;
        if (!windowId) return;

        const windowEl = document.getElementById(windowId);
        if (!windowEl) return;

        this.draggingWindow = windowEl;
        this.bringToFront(windowId);

        const rect = windowEl.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        titleBar.classList.add('dragging');
        windowEl.style.cursor = 'grabbing';
    }

    /**
     * Gestionar movimiento de ventana
     */
    handleMouseMove(e) {
        if (this.draggingWindow) {
            let x = e.clientX - this.dragOffset.x;
            let y = e.clientY - this.dragOffset.y;

            // Limitar a pantalla
            const maxX = window.innerWidth - 100;
            const maxY = window.innerHeight - 100;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            this.draggingWindow.style.left = x + 'px';
            this.draggingWindow.style.top = y + 'px';
        }

        if (this.resizingWindow) {
            const rect = this.resizingWindow.getBoundingClientRect();
            const edge = this.resizeEdge;
            let newWidth = this.resizingWindow.offsetWidth;
            let newHeight = this.resizingWindow.offsetHeight;
            let newX = this.resizingWindow.offsetLeft;
            let newY = this.resizingWindow.offsetTop;

            const minWidth = 300;
            const minHeight = 200;

            if (edge.includes('e')) {
                newWidth = Math.max(minWidth, e.clientX - rect.left);
            }
            if (edge.includes('s')) {
                newHeight = Math.max(minHeight, e.clientY - rect.top);
            }
            if (edge.includes('w')) {
                const newW = Math.max(minWidth, rect.right - e.clientX);
                newX = Math.min(e.clientX, rect.right - minWidth);
                newWidth = newW;
            }
            if (edge.includes('n')) {
                const newH = Math.max(minHeight, rect.bottom - e.clientY);
                newY = Math.min(e.clientY, rect.bottom - minHeight);
                newHeight = newH;
            }

            this.resizingWindow.style.width = newWidth + 'px';
            this.resizingWindow.style.height = newHeight + 'px';
            this.resizingWindow.style.left = newX + 'px';
            this.resizingWindow.style.top = newY + 'px';
        }
    }

    /**
     * Gestionar fin de arrastre
     */
    handleMouseUp(e) {
        if (this.draggingWindow) {
            const titleBar = this.draggingWindow.querySelector('.window-title-bar');
            titleBar.classList.remove('dragging');
            this.draggingWindow.style.cursor = 'default';
            this.draggingWindow = null;
        }

        if (this.resizingWindow) {
            this.resizingWindow.style.cursor = 'default';
            this.resizingWindow = null;
            this.resizeEdge = null;
        }
    }

    /**
     * Iniciar resize de ventana
     */
    handleResizeStart(e, windowId) {
        e.preventDefault();
        e.stopPropagation();

        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        this.resizingWindow = windowData.element;
        this.resizeEdge = e.target.dataset.edge;
        this.resizingWindow.style.cursor = this.getResizeCursor(this.resizeEdge);
    }

    /**
     * Obtener cursor según el edge
     */
    getResizeCursor(edge) {
        const cursorMap = {
            'n': 'n-resize',
            's': 's-resize',
            'e': 'e-resize',
            'w': 'w-resize',
            'ne': 'ne-resize',
            'nw': 'nw-resize',
            'se': 'se-resize',
            'sw': 'sw-resize'
        };
        return cursorMap[edge] || 'default';
    }

    /**
     * Toggle fullscreen de una ventana
     */
    toggleFullscreen(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        const windowEl = windowData.element;
        const isFullscreen = windowEl.classList.toggle('fullscreen');

        if (isFullscreen) {
            // Guardar posición y tamaño anterior
            windowEl.dataset.prevLeft = windowEl.style.left;
            windowEl.dataset.prevTop = windowEl.style.top;
            windowEl.dataset.prevWidth = windowEl.style.width;
            windowEl.dataset.prevHeight = windowEl.style.height;

            // Aplicar fullscreen
            windowEl.style.left = '0';
            windowEl.style.top = '0';
            windowEl.style.width = '100vw';
            windowEl.style.height = '100vh';
            windowEl.style.maxWidth = '100vw';
            windowEl.style.maxHeight = '100vh';
            windowEl.style.zIndex = this.zIndexCounter++;
        } else {
            // Restaurar posición y tamaño anterior
            windowEl.style.left = windowEl.dataset.prevLeft || '0';
            windowEl.style.top = windowEl.dataset.prevTop || '0';
            windowEl.style.width = windowEl.dataset.prevWidth || '600px';
            windowEl.style.height = windowEl.dataset.prevHeight || '400px';
            windowEl.style.maxWidth = 'none';
            windowEl.style.maxHeight = 'none';
            windowEl.style.zIndex = this.zIndexCounter++;
        }
    }

    /**
     * Cerrar todas las ventanas
     */
    closeAll() {
        const windowIds = Array.from(this.windows.keys());
        windowIds.forEach(id => this.closeWindow(id));
    }

    /**
     * Obtener lista de ventanas abiertas
     */
    getOpenWindows() {
        return Array.from(this.windows.values()).map(data => ({
            id: data.element.id,
            title: data.element.querySelector('.window-title').textContent,
            element: data.element
        }));
    }
}

// Exportar para uso global
window.WindowManager = WindowManager;
