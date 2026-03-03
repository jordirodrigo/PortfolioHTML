/**
 * viewer3d.js
 * 
 * Visor 3D interactivo con Three.js
 * Características:
 * - Carga de modelos GLTF/GLB con múltiples fallbacks
 * - Controles de órbita
 * - Sliders para posición/rotación/escala
 * - Wireframe toggle
 * - Skeleton helper
 * - Animación (para modelos con armadura)
 * - Cambio de fondo
 */

class Viewer3D {
    constructor(canvasContainer, modelId = 'model') {
        this.container = canvasContainer;
        this.modelId = modelId;
        this.prefix = `[${modelId}]`;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.animationMixer = null;
        this.actions = [];
        this.currentAnimation = null;
        this.skeletonHelper = null;
        this.isWireframe = false;
        this.demoMesh = null;
        this.rafId = null;
        
        this.backgroundColors = [
            0x1a1a2e,
            0x0f3460,
            0x16213e,
            0x533483,
            0x2d5a78
        ];
        this.currentBgIndex = 0;
        this.resizeObserver = null;

        this.init();
    }

    /**
     * Inicializar escena de Three.js
     */
    init() {
        console.log(`${this.prefix} init() called with container:`, this.container);

        if (!this.container) {
            console.error(`${this.prefix} no container provided`);
            return;
        }

        // Verificar que el container tiene tamaño
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            console.warn(`${this.prefix} container has zero size:`, this.container.clientWidth, this.container.clientHeight);
        }

        // Validar que THREE existe - si no, esperar
        if (!window.THREE) {
            console.warn(`${this.prefix} THREE.js not available yet, retrying...`);
            setTimeout(() => this.init(), 100);
            return;
        }

        try {
            // Escena
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(this.backgroundColors[this.currentBgIndex]);
            this.scene.fog = new THREE.Fog(this.backgroundColors[this.currentBgIndex], 100, 1000);
            console.log(`${this.prefix} scene created`);

            // Cámara
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            this.camera.position.set(0, 2, 5);
            console.log(`${this.prefix} camera created: ${width}x${height}`);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.shadowMap.enabled = false;
            this.renderer.domElement.style.display = 'block';
            this.container.appendChild(this.renderer.domElement);
            console.log(`${this.prefix} renderer created and appended`);

            // Observar cambios de tamaño del contenedor (para fullscreen y resize)
            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    this.onContainerResize();
                });
                this.resizeObserver.observe(this.container);
                console.log(`${this.prefix} ResizeObserver set up`);
            }

            // Luces
            this.setupLights();

            // Demo mesh (cubo) mientras se carga el modelo
            this.createDemoMesh();

            // Controles de órbita
            this.setupOrbitControls();

            // Handle resize
            window.addEventListener('resize', () => this.onWindowResize());

            // Loop de animación
            this.animate();

            console.log(`${this.prefix} init complete`);
        } catch (err) {
            console.error(`${this.prefix} init failed:`, err);
        }
    }

    /**
     * Crear mesh de demostración (cubo)
     */
    createDemoMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x8AC });
        this.demoMesh = new THREE.Mesh(geometry, material);
        this.demoMesh.position.set(0, 0.5, 0);
        this.demoMesh.scale.set(1.2, 1.2, 1.2);
        this.scene.add(this.demoMesh);
        this.camera.lookAt(this.demoMesh.position);
        
        this.demoMesh._originalMaterial = material;
        console.log(`${this.prefix} demo mesh created`);
    }

    /**
     * Configurar controles de órbita con fallbacks
     */
    setupOrbitControls() {
        if (!window.THREE || !window.THREE.OrbitControls) {
            console.warn(`${this.prefix} OrbitControls not available yet`);
            return;
        }

        try {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 3;
            
            if (this.demoMesh) {
                this.controls.target.copy(this.demoMesh.position);
            }
            this.controls.update();
            console.log(`${this.prefix} OrbitControls initialized`);
        } catch (err) {
            console.warn(`${this.prefix} OrbitControls init failed:`, err);
            this.controls = null;
        }
    }

    /**
     * Configurar iluminación
     */
    setupLights() {
        // Luz ambiental (más fuerte sin sombras dinámicas)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Luz direccional (sin sombras)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = false;
        this.scene.add(directionalLight);

        // Luz azul mágica (relleno)
        const fillLight = new THREE.PointLight(0x4a7ba7, 0.6);
        fillLight.position.set(-5, 3, 5);
        this.scene.add(fillLight);

        // Luz púrpura mágica (relleno)
        const magicLight = new THREE.PointLight(0x8b6bb1, 0.5);
        magicLight.position.set(5, 2, -5);
        this.scene.add(magicLight);

        console.log(`${this.prefix} lights configured`);
    }

    /**
     * Cargar modelo GLTF/GLB con múltiples fallbacks
     */
    async loadModel(modelPath) {
        console.log(`${this.prefix} loadModel() called with path:`, modelPath);

        if (!modelPath) {
            console.error(`${this.prefix} no model path provided`);
            return null;
        }

        return new Promise((resolve, reject) => {
            this.tryLoadWithGLTFLoader(modelPath)
                .then(gltf => {
                    this.onModelLoaded(gltf);
                    resolve(gltf.scene);
                })
                .catch(err => {
                    console.error(`${this.prefix} model load failed:`, err);
                    reject(err);
                });
        });
    }

    /**
     * Intentar cargar con GLTFLoader (primero intenta window.THREE, luego fallbacks)
     */
    tryLoadWithGLTFLoader(modelPath) {
        return new Promise((resolve, reject) => {
            console.log(`${this.prefix} checking for GLTFLoader...`);
            console.log(`${this.prefix}   window.THREE:`, !!window.THREE);
            console.log(`${this.prefix}   window.THREE.GLTFLoader:`, !!(window.THREE && window.THREE.GLTFLoader));
            console.log(`${this.prefix}   window.GLTFLoader:`, !!window.GLTFLoader);
            console.log(`${this.prefix}   window keys with GLTF:`, Object.keys(window).filter(k => k.includes('GLTF')));

            let LoaderClass = null;

            // Intentar obtener GLTFLoader de distintas formas
            if (typeof window.THREE !== 'undefined' && window.THREE.GLTFLoader) {
                LoaderClass = window.THREE.GLTFLoader;
                console.log(`${this.prefix} using window.THREE.GLTFLoader`);
            } else if (typeof window.GLTFLoader !== 'undefined') {
                LoaderClass = window.GLTFLoader;
                console.log(`${this.prefix} using window.GLTFLoader`);
            } else if (typeof GLTFLoader !== 'undefined') {
                LoaderClass = GLTFLoader;
                console.log(`${this.prefix} using global GLTFLoader`);
            }

            if (LoaderClass) {
                try {
                    if (LoaderClass.default) LoaderClass = LoaderClass.default;
                    const loader = new LoaderClass();
                    console.log(`${this.prefix} loading model with direct loader:`, modelPath);
                    
                    loader.load(
                        modelPath,
                        (gltf) => {
                            console.log(`${this.prefix} model loaded successfully`, gltf);
                            resolve(gltf);
                        },
                        (progress) => {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            console.log(`${this.prefix} loading progress: ${percent}%`);
                        },
                        (error) => {
                            console.error(`${this.prefix} loader error:`, error);
                            reject(error);
                        }
                    );
                } catch (err) {
                    console.error(`${this.prefix} loader initialization failed:`, err);
                    reject(err);
                }
            } else {
                console.error(`${this.prefix} GLTFLoader not found in any location`);
                reject(new Error('GLTFLoader not available'));
            }
        });
    }

    /**
     * Procesar modelo cargado
     */
    onModelLoaded(gltf) {
        console.log(`${this.prefix} onModelLoaded called`);

        // Remover modelo anterior
        if (this.model) {
            this.scene.remove(this.model);
            console.log(`${this.prefix} removed previous model`);
        }

        // Remover demo mesh
        if (this.demoMesh) {
            this.scene.remove(this.demoMesh);
            this.demoMesh.visible = false;
            console.log(`${this.prefix} hid demo mesh`);
        }

        this.model = gltf.scene;
        
        // Configurar materiales y sombras
        this.model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
                node.frustumCulled = true;
                
                // Guardar material original para toggle wireframe
                if (!node._originalMaterial) {
                    node._originalMaterial = node.material;
                }

                // Configurar propiedades de los materiales
                if (node.material) {
                    const materials = Array.isArray(node.material) ? node.material : [node.material];
                    materials.forEach((mat, idx) => {
                        if (mat) {
                            // Habilitar depth test y write para profundidad correcta
                            mat.depthTest = true;
                            mat.depthWrite = true;
                            mat.depthFunc = THREE.LessEqualDepth;
                            
                            // Renderizar ambos lados si es necesario
                            mat.side = THREE.DoubleSide;
                            
                            // Recalcular normales para evitar problemas de iluminación
                            if (node.geometry && node.geometry.attributes && !node.geometry.attributes.normal) {
                                node.geometry.computeVertexNormals();
                            }
                            
                            console.log(`${this.prefix} material ${idx} configured:`, {
                                depthTest: mat.depthTest,
                                depthWrite: mat.depthWrite,
                                side: mat.side,
                                castShadow: node.castShadow,
                                receiveShadow: node.receiveShadow
                            });
                        }
                    });
                }
            }
        });

        this.scene.add(this.model);
        console.log(`${this.prefix} model added to scene`);

        // Ajustar cámara para enmarcar el modelo
        this.fitCameraToObject(this.model);

        // Configurar animaciones si existen
        if (gltf.animations && gltf.animations.length > 0) {
            this.animationMixer = new THREE.AnimationMixer(this.model);
            this.actions = gltf.animations.map(clip =>
                this.animationMixer.clipAction(clip)
            );
            console.log(`${this.prefix} found ${gltf.animations.length} animations`);
        }

        // Reapplicar wireframe si estaba activo
        if (this.isWireframe) {
            console.log(`${this.prefix} reapplying wireframe to loaded model`);
            this.toggleWireframe();
        }
    }

    /**
     * Ajustar cámara para enmarcar el objeto
     */
    fitCameraToObject(obj) {
        try {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5;

            this.camera.position.set(center.x, center.y + maxDim * 0.25, center.z + cameraZ);
            this.camera.lookAt(center);
            this.camera.updateProjectionMatrix();

            if (this.controls) {
                this.controls.target.copy(center);
                this.controls.update();
            }

            console.log(`${this.prefix} camera fitted to object:`, { size, center, cameraZ });
        } catch (err) {
            console.warn(`${this.prefix} error fitting camera:`, err);
        }
    }

    /**
     * Alternar wireframe
     */
    toggleWireframe() {
        this.isWireframe = !this.isWireframe;

        if (this.model) {
            this.model.traverse((node) => {
                if (node.isMesh && node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            mat.wireframe = this.isWireframe;
                        });
                    } else {
                        node.material.wireframe = this.isWireframe;
                    }
                }
            });
        }

        return this.isWireframe;
    }

    /**
     * Alternar skeleton helper
     */
    toggleSkeletonHelper() {
        if (!this.model) return;

        if (this.skeletonHelper) {
            this.scene.remove(this.skeletonHelper);
            this.skeletonHelper = null;
            return false;
        } else {
            const skeleton = this.findSkeleton(this.model);
            if (skeleton) {
                this.skeletonHelper = new THREE.SkeletonHelper(this.model);
                this.skeletonHelper.material.linewidth = 2;
                this.scene.add(this.skeletonHelper);
                return true;
            }
        }

        return false;
    }

    /**
     * Buscar skeleton en el objeto
     */
    findSkeleton(obj) {
        let skeleton = null;
        obj.traverse((node) => {
            if (node.isSkinnedMesh && node.skeleton) {
                skeleton = node.skeleton;
            }
        });
        return skeleton;
    }

    /**
     * Cambiar color de fondo
     */
    changeBackground() {
        this.currentBgIndex = (this.currentBgIndex + 1) % this.backgroundColors.length;
        const newColor = this.backgroundColors[this.currentBgIndex];

        this.scene.background.setHex(newColor);
        this.scene.fog.color.setHex(newColor);
    }

    /**
     * Establecer escala del modelo
     */
    setScale(x, y, z) {
        if (this.model) {
            this.model.scale.set(x, y, z);
        }
    }

    /**
     * Reproducir animación por índice
     */
    playAnimation(index) {
        if (this.animationMixer && this.actions.length > 0) {
            // Detener todas las otras
            this.actions.forEach(action => action.stop());

            // Reproducir la seleccionada
            if (index >= 0 && index < this.actions.length) {
                this.currentAnimation = this.actions[index];
                this.currentAnimation.play();
            }
        }
    }

    /**
     * Detener animación actual
     */
    stopAnimation() {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation = null;
        }
    }

    /**
     * Obtener lista de animaciones
     */
    getAnimations() {
        return this.actions.map((action, index) => ({
            index: index,
            name: action.getClip().name
        }));
    }

    /**
     * Loop de animación/renderizado
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = 0.016; // ~60fps

        if (this.animationMixer) {
            this.animationMixer.update(delta);
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.skeletonHelper) {
            this.skeletonHelper.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Ajustar tamaño cuando el contenedor se redimensiona
     */
    onContainerResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width === 0 || height === 0) return;

        console.log(`${this.prefix} container resized to:`, width, 'x', height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Ajustar tamaño al cambiar ventana
     */
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Limpiar recursos
     */
    dispose() {
        // Detener ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }

        if (this.model) {
            this.model.traverse((node) => {
                if (node.isMesh) {
                    node.geometry.dispose();
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => mat.dispose());
                    } else {
                        node.material.dispose();
                    }
                }
            });
        }
    }
}

// Exportar para uso global
window.Viewer3D = Viewer3D;
