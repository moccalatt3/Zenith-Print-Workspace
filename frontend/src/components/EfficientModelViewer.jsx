// frontend/src/components/EfficientModelViewer.jsx
import { useEffect, useRef } from "react";

const EfficientModelViewer = ({ file }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!file || !mountRef.current) return;

    let isMounted = true;
    let threeJSModules = null;
    let objectURL = null;

    const initEfficientViewer = async () => {
      try {
        console.log("🚀 Initializing optimized 3D viewer...");

        // Lazy load Three.js modules
        threeJSModules = await loadThreeJS();
        const { THREE, OrbitControls, STLLoader, OBJLoader, ThreeMFLoader } = threeJSModules;

        if (!isMounted) return;

        // Setup scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const container = mountRef.current;
        const width = container.clientWidth;
        const height = Math.min(width * 0.6, 200);

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
        camera.position.set(0, 0, 15);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          stencil: false,
          depth: true,
        });

        renderer.setSize(width, height);
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        renderer.autoClear = true;

        // Clear container dan append renderer
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // Load model
        const fileExtension = file.name.split(".").pop().toLowerCase();
        const objectGroup = new THREE.Group();
        objectGroup.name = "modelGroup";

        if (fileExtension === "stl") {
          try {
            objectURL = URL.createObjectURL(file);
            const loader = new STLLoader();

            const loadPromise = loader.loadAsync(objectURL);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("STL load timeout")), 15000)
            );

            const geometry = await Promise.race([loadPromise, timeoutPromise]);

            if (!isMounted) {
              geometry.dispose();
              return;
            }

            // Optimize geometry
            const optimizedGeometry = optimizeSTLGeometry(geometry);

            // Material
            const material = new THREE.MeshLambertMaterial({
              color: 0xffffff,
              wireframe: false,
              transparent: false,
            });

            const mesh = new THREE.Mesh(optimizedGeometry, material);
            mesh.name = "stlMesh";

            // Center and scale
            centerAndScaleSTLGeometry(mesh, optimizedGeometry, camera, THREE);

            objectGroup.add(mesh);
            scene.add(objectGroup);

            console.log("✅ STL loaded successfully");
          } catch (stlError) {
            console.error("STL loading failed:", stlError);
            createFallbackModel(scene, THREE);
          }
        } else if (fileExtension === "obj") {
          try {
            objectURL = URL.createObjectURL(file);
            const loader = new OBJLoader();

            const loadPromise = loader.loadAsync(objectURL);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("OBJ load timeout")), 15000)
            );

            const objModel = await Promise.race([loadPromise, timeoutPromise]);

            if (!isMounted) {
              cleanupObjModel(objModel);
              return;
            }

            // Optimize OBJ model
            optimizeOBJModel(objModel, THREE);

            // Center and scale OBJ
            centerAndScaleOBJModel(objModel, camera, THREE);

            objectGroup.add(objModel);
            scene.add(objectGroup);

            console.log(`✅ OBJ loaded: ${objModel.children.length} meshes`);
          } catch (objError) {
            console.error("OBJ loading failed:", objError);
            createFallbackModel(scene, THREE);
          }
        } else if (fileExtension === "3mf") {
          try {
            objectURL = URL.createObjectURL(file);
            const loader = new ThreeMFLoader();

            const loadPromise = loader.loadAsync(objectURL);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("3MF load timeout")), 15000)
            );

            const threeMFModel = await Promise.race([loadPromise, timeoutPromise]);

            if (!isMounted) {
              cleanup3MFModel(threeMFModel);
              return;
            }

            // Optimize 3MF model
            optimize3MFModel(threeMFModel, THREE);

            // Center and scale 3MF
            centerAndScale3MFModel(threeMFModel, camera, THREE);

            objectGroup.add(threeMFModel);
            scene.add(objectGroup);

            console.log(`✅ 3MF loaded: ${threeMFModel.children.length} meshes`);
          } catch (threeMFError) {
            console.error("3MF loading failed:", threeMFError);
            createFallbackModel(scene, THREE);
          }
        } else {
          console.warn(`Unsupported file format: ${fileExtension}`);
          createFallbackModel(scene, THREE);
        }

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 0.0;
        controls.minDistance = 0.5;
        controls.maxDistance = 100;
        controls.autoRotate = false;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);
        controls.update();

        // Custom rotation handler
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        const rotationState = {
          targetRotationX: 0,
          targetRotationY: 0,
          currentRotationX: 0,
          currentRotationY: 0,
        };

        const onMouseDown = (event) => {
          isDragging = true;
          previousMousePosition = { x: event.clientX, y: event.clientY };
          renderer.domElement.style.cursor = "grabbing";
        };

        const onMouseMove = (event) => {
          if (!isDragging || !objectGroup) return;

          const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y,
          };

          rotationState.targetRotationY += deltaMove.x * 0.005;
          rotationState.targetRotationX += deltaMove.y * 0.005;
          rotationState.targetRotationX = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, rotationState.targetRotationX)
          );
          previousMousePosition = { x: event.clientX, y: event.clientY };
        };

        const onMouseUp = () => {
          isDragging = false;
          renderer.domElement.style.cursor = "grab";
        };

        // Event listeners
        const passiveOptions = { passive: true };
        renderer.domElement.addEventListener("mousedown", onMouseDown, passiveOptions);
        renderer.domElement.addEventListener("mousemove", onMouseMove, passiveOptions);
        renderer.domElement.addEventListener("mouseup", onMouseUp, passiveOptions);
        renderer.domElement.addEventListener("mouseleave", onMouseUp, passiveOptions);
        renderer.domElement.style.cursor = "grab";

        // Animation loop
        let lastRenderTime = performance.now();
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const animate = (currentTime) => {
          if (!isMounted) return;
          animationRef.current = requestAnimationFrame(animate);

          const deltaTime = currentTime - lastRenderTime;
          if (deltaTime < frameInterval) return;

          // Smooth rotation
          if (objectGroup) {
            const smoothing = 0.15;
            rotationState.currentRotationX +=
              (rotationState.targetRotationX - rotationState.currentRotationX) * smoothing;
            rotationState.currentRotationY +=
              (rotationState.targetRotationY - rotationState.currentRotationY) * smoothing;

            objectGroup.rotation.x = rotationState.currentRotationX;
            objectGroup.rotation.y = rotationState.currentRotationY;
          }

          controls.update();
          renderer.render(scene, camera);
          lastRenderTime = currentTime - (deltaTime % frameInterval);
        };

        // Start animation
        animate(performance.now());

        // Resize handler
        let resizeTimeout;
        const handleResize = () => {
          if (!isMounted || !container) return;

          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            const newWidth = container.clientWidth;
            const newHeight = Math.min(newWidth * 0.6, 200);

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }, 100);
        };

        window.addEventListener("resize", handleResize, passiveOptions);

        // Store references
        sceneRef.current = scene;
        rendererRef.current = renderer;
        controlsRef.current = controls;
        cameraRef.current = camera;

        console.log("✅ 3D viewer initialized successfully");

        return () => {
          if (renderer.domElement) {
            renderer.domElement.removeEventListener("mousedown", onMouseDown);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);
            renderer.domElement.removeEventListener("mouseup", onMouseUp);
            renderer.domElement.removeEventListener("mouseleave", onMouseUp);
          }
          window.removeEventListener("resize", handleResize);
          clearTimeout(resizeTimeout);

          if (objectURL) {
            URL.revokeObjectURL(objectURL);
          }
        };
      } catch (error) {
        console.error("❌ Error in efficient viewer:", error);
        if (mountRef.current && isMounted) {
          mountRef.current.innerHTML = `
            <div class="w-full h-48 bg-black rounded-lg border border-gray-700 flex items-center justify-center">
              <div class="text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-sm font-medium text-gray-300">3D Preview</p>
                <p class="text-xs text-gray-500 mt-1">Unable to load 3D model</p>
                <p class="text-xs text-red-400 mt-2">${error.message}</p>
              </div>
            </div>
          `;
        }
      }
    };

    // Initialize viewer
    initEfficientViewer();

    // Cleanup function
    return () => {
      console.log("🛑 Cleaning up 3D viewer...");
      isMounted = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      cleanupThreeJSMemory(
        sceneRef.current,
        rendererRef.current,
        controlsRef.current,
        cameraRef.current,
        threeJSModules?.THREE
      );

      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;

      console.log("✅ 3D viewer cleanup completed");
    };
  }, [file]);

  return (
    <div className="w-full">
      <div
        ref={mountRef}
        className="w-full h-48 bg-black rounded-lg border border-gray-700"
      />
      <p className="text-xs text-gray-400 text-center mt-2">
        Drag to rotate object • Scroll to zoom
      </p>
    </div>
  );
};

// Helper functions
const loadThreeJS = async () => {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls");
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader");
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader");
  const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader");
  return { THREE, OrbitControls, STLLoader, OBJLoader, ThreeMFLoader };
};

const optimizeSTLGeometry = (geometry) => {
  const vertexCount = geometry.attributes.position.count;
  console.log(`🔧 STL Geometry optimization: ${vertexCount} vertices`);

  if (vertexCount > 50000) {
    console.log(`⚡ Simplifying large STL geometry: ${vertexCount} vertices`);
    if (geometry.mergeVertices) {
      geometry.mergeVertices(0.01);
    }
    if (geometry.attributes.normal) geometry.deleteAttribute("normal");
    if (geometry.attributes.uv) geometry.deleteAttribute("uv");
    if (geometry.attributes.color) geometry.deleteAttribute("color");
    console.log(`✅ Simplified STL to: ${geometry.attributes.position.count} vertices`);
  }

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  return geometry;
};

const optimizeOBJModel = (objModel, THREE) => {
  objModel.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geometry = child.geometry;
      const vertexCount = geometry.attributes.position?.count || 0;
      
      if (vertexCount > 50000) {
        console.log(`⚡ Large OBJ geometry detected: ${vertexCount} vertices`);
        if (geometry.attributes.normal) geometry.deleteAttribute("normal");
        if (geometry.attributes.uv) geometry.deleteAttribute("uv");
        if (geometry.attributes.color) geometry.deleteAttribute("color");
      }

      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }

      // Replace material dengan yang lebih sederhana
      const originalMaterial = child.material;
      child.material = new THREE.MeshLambertMaterial({
        color: originalMaterial && typeof originalMaterial.color !== "undefined" 
          ? originalMaterial.color 
          : 0xffffff,
        wireframe: false,
        transparent: false,
      });

      // Dispose original material
      if (originalMaterial) {
        if (Array.isArray(originalMaterial)) {
          originalMaterial.forEach(material => material.dispose());
        } else {
          originalMaterial.dispose();
        }
      }
    }
  });
};

const optimize3MFModel = (threeMFModel, THREE) => {
  threeMFModel.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geometry = child.geometry;
      const vertexCount = geometry.attributes.position?.count || 0;
      
      if (vertexCount > 50000) {
        console.log(`⚡ Large 3MF geometry detected: ${vertexCount} vertices`);
        if (geometry.attributes.normal) geometry.deleteAttribute("normal");
        if (geometry.attributes.uv) geometry.deleteAttribute("uv");
        if (geometry.attributes.color) geometry.deleteAttribute("color");
      }

      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }

      // Replace material
      const originalMaterial = child.material;
      child.material = new THREE.MeshLambertMaterial({
        color: originalMaterial && typeof originalMaterial.color !== "undefined" 
          ? originalMaterial.color 
          : 0xffffff,
        wireframe: false,
        transparent: false,
      });

      // Dispose original material
      if (originalMaterial) {
        if (Array.isArray(originalMaterial)) {
          originalMaterial.forEach(material => material.dispose());
        } else {
          originalMaterial.dispose();
        }
      }
    }
  });
};

const centerAndScaleSTLGeometry = (mesh, geometry, camera, THREE) => {
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const bbox = geometry.boundingBox;
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Center the geometry
  const positionAttribute = geometry.getAttribute("position");
  const vertices = [];

  for (let i = 0; i < positionAttribute.count; i++) {
    vertices.push(
      positionAttribute.getX(i) - center.x,
      positionAttribute.getY(i) - center.y,
      positionAttribute.getZ(i) - center.z
    );
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeBoundingBox();

  // Scale
  const newBbox = geometry.boundingBox;
  const size = new THREE.Vector3();
  newBbox.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 8;
  let scale = targetSize / maxDim;

  scale = Math.max(0.1, Math.min(20, scale));
  mesh.scale.setScalar(scale);
  mesh.position.set(0, 0, 0);

  // Camera positioning
  const scaledSize = size.multiplyScalar(scale);
  const cameraDistance = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 2.5;
  camera.position.set(0, 0, Math.max(cameraDistance, 5));
  camera.lookAt(0, 0, 0);
};

const centerAndScaleOBJModel = (objModel, camera, THREE) => {
  const bbox = new THREE.Box3().setFromObject(objModel);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Buat group wrapper
  const objWrapper = new THREE.Group();

  // Posisikan objek relatif terhadap wrapper
  objModel.position.set(-center.x, -center.y, -center.z);
  objWrapper.add(objModel);

  // Scale
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 10;
  let scale = targetSize / maxDim;

  scale = Math.max(0.5, Math.min(15, scale));
  objWrapper.scale.setScalar(scale);

  // Camera positioning
  const scaledBbox = new THREE.Box3().setFromObject(objWrapper);
  const scaledSize = new THREE.Vector3();
  scaledBbox.getSize(scaledSize);

  const maxScaledDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
  const cameraDistance = maxScaledDim * 1.8;

  camera.position.set(0, 0, Math.max(cameraDistance, 3));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return objWrapper;
};

const centerAndScale3MFModel = (threeMFModel, camera, THREE) => {
  const bbox = new THREE.Box3().setFromObject(threeMFModel);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Buat group wrapper
  const threeMFWrapper = new THREE.Group();

  // Posisikan objek relatif terhadap wrapper
  threeMFModel.position.set(-center.x, -center.y, -center.z);
  threeMFWrapper.add(threeMFModel);

  // Scale
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 10;
  let scale = targetSize / maxDim;

  scale = Math.max(0.5, Math.min(15, scale));
  threeMFWrapper.scale.setScalar(scale);

  // Camera positioning
  const scaledBbox = new THREE.Box3().setFromObject(threeMFWrapper);
  const scaledSize = new THREE.Vector3();
  scaledBbox.getSize(scaledSize);

  const maxScaledDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
  const cameraDistance = maxScaledDim * 1.8;

  camera.position.set(0, 0, Math.max(cameraDistance, 3));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return threeMFWrapper;
};

const createFallbackModel = (scene, THREE) => {
  const geometry = new THREE.BoxGeometry(4, 4, 4);
  const material = new THREE.MeshLambertMaterial({
    color: 0x444444,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
};

const cleanupObjModel = (objModel) => {
  objModel.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
};

const cleanup3MFModel = (threeMFModel) => {
  threeMFModel.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
};

const cleanupThreeJSMemory = (scene, renderer, controls, camera, THREE) => {
  if (!THREE) return;

  // Cleanup scene
  if (scene) {
    scene.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  // Cleanup renderer
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  // Cleanup controls
  if (controls) {
    controls.dispose();
  }
};

export default EfficientModelViewer;