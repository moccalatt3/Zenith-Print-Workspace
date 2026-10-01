import { Link } from "react-router-dom";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import homeService from "../../services/homeService";
import FloatingContact from "../../components/FloatingContact";
import popupService from "../../services/popupService";

let shimmerStylesInjected = false;
const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
}
.shimmer {
  animation: shimmer 1.25s infinite linear;
  background: linear-gradient(to right, rgba(255,255,255,0.1) 8%, rgba(255,255,255,0.2) 18%, rgba(255,255,255,0.1) 33%);
  background-size: 800px 104px;
  position: relative;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-fade-in {
  animation: fadeIn 0.5s ease-out;
}
`;

if (typeof document !== "undefined" && !shimmerStylesInjected) {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = shimmerStyles;
  document.head.appendChild(styleSheet);
  shimmerStylesInjected = true;
}

// ✅ Load Three.js modules secara dinamis
const loadThreeJS = async () => {
  const THREE = await import("three");
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader");
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader");
  const { ThreeMFLoader } = await import(
    "three/examples/jsm/loaders/3MFLoader"
  );
  return { THREE, STLLoader, OBJLoader, ThreeMFLoader };
};

// ✅ Komponen 3D Preview untuk Home - IMPLEMENTASI LENGKAP
const ThreeDPreviewHome = React.memo(({ file }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const cameraRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Performance monitoring
  const performanceStats = useRef({
    frameCount: 0,
    lastFPSUpdate: 0,
    currentFPS: 0,
  });

  // ✅ FUNGSI OPTIMIZE GEOMETRY
  const optimizeSTLGeometry = (geometry) => {
    const vertexCount = geometry.attributes.position.count;
    console.log(`🔧 STL Geometry optimization: ${vertexCount} vertices`);

    if (vertexCount > 50000) {
      console.log(`⚡ Simplifying large STL geometry: ${vertexCount} vertices`);

      // mergeVertices hanya untuk Geometry, bukan BufferGeometry
      if (geometry.mergeVertices) {
        geometry.mergeVertices(0.01);
      }

      if (geometry.attributes.normal) geometry.deleteAttribute("normal");
      if (geometry.attributes.uv) geometry.deleteAttribute("uv");
      if (geometry.attributes.color) geometry.deleteAttribute("color");

      console.log(
        `✅ Simplified STL to: ${geometry.attributes.position.count} vertices`
      );
    }

    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    return geometry;
  };

  const optimizeOBJGeometry = (geometry, THREE) => {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      return geometry;
    }

    const vertexCount = geometry.attributes.position.count;
    console.log(`🔧 OBJ Geometry optimization: ${vertexCount} vertices`);

    // Untuk model yang sangat besar (>50k vertices), lakukan simplification
    if (vertexCount > 50000) {
      console.log(`⚡ Large OBJ geometry detected: ${vertexCount} vertices`);

      // Hapus atribut yang tidak diperlukan untuk performa
      if (geometry.attributes.normal) {
        geometry.deleteAttribute("normal");
      }
      if (geometry.attributes.uv) {
        geometry.deleteAttribute("uv");
      }
      if (geometry.attributes.color) {
        geometry.deleteAttribute("color");
      }

      console.log(
        `✅ Optimized OBJ geometry: ${vertexCount} vertices (attributes removed)`
      );
    }

    // Compute normals hanya jika benar-benar diperlukan
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    return geometry;
  };

  const optimize3MFGeometry = (geometry, THREE) => {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      return geometry;
    }

    const vertexCount = geometry.attributes.position.count;
    console.log(`🔧 3MF Geometry optimization: ${vertexCount} vertices`);

    // Untuk model yang sangat besar (>50k vertices), lakukan simplification
    if (vertexCount > 50000) {
      console.log(`⚡ Large 3MF geometry detected: ${vertexCount} vertices`);

      // Hapus atribut yang tidak diperlukan untuk performa
      if (geometry.attributes.normal) {
        geometry.deleteAttribute("normal");
      }
      if (geometry.attributes.uv) {
        geometry.deleteAttribute("uv");
      }
      if (geometry.attributes.color) {
        geometry.deleteAttribute("color");
      }

      console.log(
        `✅ Optimized 3MF geometry: ${vertexCount} vertices (attributes removed)`
      );
    }

    // Compute normals hanya jika benar-benar diperlukan
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    return geometry;
  };

  // ✅ FUNGSI CENTERING DAN SCALING YANG LEBIH BAIK
  const centerAndScaleSTLGeometry = (mesh, geometry, camera, THREE) => {
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Center the geometry by modifying vertices
    const positionAttribute = geometry.getAttribute("position");
    const vertices = [];

    for (let i = 0; i < positionAttribute.count; i++) {
      vertices.push(
        positionAttribute.getX(i) - center.x,
        positionAttribute.getY(i) - center.y,
        positionAttribute.getZ(i) - center.z
      );
    }

    // Update geometry dengan vertices yang sudah di-center
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.computeBoundingBox();

    // ✅ PRESERVE UKURAN OBJEK - Consistent scaling
    const newBbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    newBbox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 8;
    let scale = targetSize / maxDim;

    scale = Math.max(0.1, Math.min(20, scale));
    mesh.scale.setScalar(scale);
    mesh.position.set(0, 0, 0);

    // ✅ Optimal camera positioning berdasarkan scaled object
    const scaledSize = size.multiplyScalar(scale);
    const cameraDistance =
      Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 2.5;
    camera.position.set(0, 0, Math.max(cameraDistance, 5));
    camera.lookAt(0, 0, 0);
  };

  // ✅ FUNGSI CLEANUP MEMORY
  const cleanupThreeJSMemory = (scene, renderer, camera, THREE) => {
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
  };

  // ✅ USE EFFECT UTAMA UNTUK 3D VIEWER
  useEffect(() => {
    if (!file || !mountRef.current) return;

    let isMounted = true;
    let threeJSModules = null;
    let objectURL = null;

    const initEfficientViewer = async () => {
      try {
        console.log("🚀 Initializing optimized 3D viewer for Home...");

        // Lazy load Three.js modules dengan error handling
        threeJSModules = await loadThreeJS();
        const { THREE, STLLoader, OBJLoader, ThreeMFLoader } = threeJSModules;

        if (!isMounted) return;

        // ✅ Setup scene dengan optimasi memory
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);

        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // ✅ Camera dengan frustum culling optimizations
        const camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 0, 15);
        camera.lookAt(0, 0, 0);

        // ✅ Ultra-optimized Renderer configuration
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        });

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = false;
        renderer.autoClear = true;

        // Clear container dan append renderer
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // ✅ Minimal lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // ✅ Load model dengan optimasi dan pivot preservation
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

            // ✅ Enhanced geometry optimization untuk STL
            const optimizedGeometry = optimizeSTLGeometry(geometry);

            // ✅ Simple material dengan memory efficiency
            const material = new THREE.MeshLambertMaterial({
              color: 0xfa812f,
              wireframe: false,
              transparent: false,
            });

            const mesh = new THREE.Mesh(optimizedGeometry, material);
            mesh.name = "stlMesh";

            // ✅ PRESERVE PIVOT DAN BENTUK ASLI
            centerAndScaleSTLGeometry(mesh, optimizedGeometry, camera, THREE);

            objectGroup.add(mesh);
            scene.add(objectGroup);

            console.log("✅ STL loaded successfully in Home");
          } catch (stlError) {
            console.error("STL loading failed:", stlError);
            throw stlError;
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
              // Cleanup obj model
              objModel.traverse((child) => {
                if (child.isMesh) {
                  if (child.geometry) child.geometry.dispose();
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((material) => material.dispose());
                    } else {
                      child.material.dispose();
                    }
                  }
                }
              });
              return;
            }

            // ✅ Optimize OBJ model
            objModel.traverse((child) => {
              if (child.isMesh && child.geometry) {
                child.geometry = optimizeOBJGeometry(child.geometry, THREE);

                // Replace material dengan yang lebih sederhana
                const originalMaterial = child.material;
                child.material = new THREE.MeshLambertMaterial({
                  color: 0xfa812f,
                  wireframe: false,
                  transparent: false,
                });

                // Dispose original material
                if (originalMaterial) {
                  if (Array.isArray(originalMaterial)) {
                    originalMaterial.forEach((material) => material.dispose());
                  } else {
                    originalMaterial.dispose();
                  }
                }
              }
            });

            // ✅ PRESERVE PIVOT DI TENGAH DAN POSISI DEKAT KAMERA UNTUK OBJ
            const bbox = new THREE.Box3().setFromObject(objModel);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            console.log(`📐 OBJ Original - Center:`, center, `Size:`, size);

            // Buat group wrapper untuk objek
            const objWrapper = new THREE.Group();

            // Posisikan objek relatif terhadap wrapper
            objModel.position.set(-center.x, -center.y, -center.z);
            objWrapper.add(objModel);

            // Scale object secara proporsional
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 10;
            let scale = targetSize / maxDim;

            scale = Math.max(0.5, Math.min(15, scale));
            objWrapper.scale.setScalar(scale);

            objectGroup.add(objWrapper);
            scene.add(objectGroup);

            // Hitung ulang bbox setelah scaling
            const scaledBbox = new THREE.Box3().setFromObject(objWrapper);
            const scaledSize = new THREE.Vector3();
            scaledBbox.getSize(scaledSize);

            // Position camera lebih dekat berdasarkan ukuran objek yang sudah di-scale
            const maxScaledDim = Math.max(
              scaledSize.x,
              scaledSize.y,
              scaledSize.z
            );
            const cameraDistance = maxScaledDim * 1.8;

            camera.position.set(0, 0, Math.max(cameraDistance, 3));
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            console.log(`✅ OBJ loaded: ${objModel.children.length} meshes`);
            console.log(`📏 Scaled size:`, scaledSize);
            console.log(`📷 Camera distance: ${cameraDistance}`);
          } catch (objError) {
            console.error("OBJ loading failed:", objError);
            throw objError;
          }
        } else if (fileExtension === "3mf") {
          // ✅ TAMBAHKAN SUPPORT 3MF
          try {
            objectURL = URL.createObjectURL(file);
            const loader = new ThreeMFLoader();

            const loadPromise = loader.loadAsync(objectURL);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("3MF load timeout")), 15000)
            );

            const threeMFModel = await Promise.race([
              loadPromise,
              timeoutPromise,
            ]);

            if (!isMounted) {
              // Cleanup 3MF model
              threeMFModel.traverse((child) => {
                if (child.isMesh) {
                  if (child.geometry) child.geometry.dispose();
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((material) => material.dispose());
                    } else {
                      child.material.dispose();
                    }
                  }
                }
              });
              return;
            }

            // ✅ Optimize 3MF model
            threeMFModel.traverse((child) => {
              if (child.isMesh && child.geometry) {
                child.geometry = optimize3MFGeometry(child.geometry, THREE);

                // Replace material dengan yang lebih sederhana
                const originalMaterial = child.material;
                child.material = new THREE.MeshLambertMaterial({
                  color: 0xfa812f,
                  wireframe: false,
                  transparent: false,
                });

                // Dispose original material
                if (originalMaterial) {
                  if (Array.isArray(originalMaterial)) {
                    originalMaterial.forEach((material) => material.dispose());
                  } else {
                    originalMaterial.dispose();
                  }
                }
              }
            });

            // ✅ PRESERVE PIVOT DI TENGAH DAN POSISI DEKAT KAMERA UNTUK 3MF
            const bbox = new THREE.Box3().setFromObject(threeMFModel);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            console.log(`📐 3MF Original - Center:`, center, `Size:`, size);

            // Buat group wrapper untuk objek
            const threeMFWrapper = new THREE.Group();

            // Posisikan objek relatif terhadap wrapper
            threeMFModel.position.set(-center.x, -center.y, -center.z);
            threeMFWrapper.add(threeMFModel);

            // Scale object secara proporsional
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 10;
            let scale = targetSize / maxDim;

            scale = Math.max(0.5, Math.min(15, scale));
            threeMFWrapper.scale.setScalar(scale);

            objectGroup.add(threeMFWrapper);
            scene.add(objectGroup);

            // Hitung ulang bbox setelah scaling
            const scaledBbox = new THREE.Box3().setFromObject(threeMFWrapper);
            const scaledSize = new THREE.Vector3();
            scaledBbox.getSize(scaledSize);

            // Position camera lebih dekat berdasarkan ukuran objek yang sudah di-scale
            const maxScaledDim = Math.max(
              scaledSize.x,
              scaledSize.y,
              scaledSize.z
            );
            const cameraDistance = maxScaledDim * 1.8;

            camera.position.set(0, 0, Math.max(cameraDistance, 3));
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            console.log(
              `✅ 3MF loaded: ${threeMFModel.children.length} meshes`
            );
            console.log(`📏 Scaled size:`, scaledSize);
            console.log(`📷 Camera distance: ${cameraDistance}`);
          } catch (threeMFError) {
            console.error("3MF loading failed:", threeMFError);
            throw threeMFError;
          }
        } else {
          // Fallback untuk file yang tidak didukung
          console.warn(`Unsupported file format: ${fileExtension}`);
          const geometry = new THREE.BoxGeometry(4, 4, 4);
          const material = new THREE.MeshLambertMaterial({
            color: 0x444444,
            wireframe: true,
          });
          const mesh = new THREE.Mesh(geometry, material);
          objectGroup.add(mesh);
          scene.add(objectGroup);
        }

        // ✅ Enhanced custom rotation handler dengan performance
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

        // ✅ Optimized event listeners
        const passiveOptions = { passive: true };
        renderer.domElement.addEventListener(
          "mousedown",
          onMouseDown,
          passiveOptions
        );
        renderer.domElement.addEventListener(
          "mousemove",
          onMouseMove,
          passiveOptions
        );
        renderer.domElement.addEventListener(
          "mouseup",
          onMouseUp,
          passiveOptions
        );
        renderer.domElement.addEventListener(
          "mouseleave",
          onMouseUp,
          passiveOptions
        );
        renderer.domElement.style.cursor = "grab";

        // ✅ Handle wheel untuk zoom
        const onWheel = (e) => {
          e.preventDefault();
          const zoomSpeed = 0.002;
          const delta = e.deltaY * zoomSpeed;

          // Batasi zoom
          camera.position.z = Math.max(
            1,
            Math.min(50, camera.position.z + delta)
          );
        };

        renderer.domElement.addEventListener("wheel", onWheel, {
          passive: false,
        });

        // ✅ Ultra-efficient animation loop
        let lastRenderTime = performance.now();
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const animate = (currentTime) => {
          if (!isMounted) return;
          animationRef.current = requestAnimationFrame(animate);

          const deltaTime = currentTime - lastRenderTime;
          if (deltaTime < frameInterval) return;

          // Performance monitoring
          performanceStats.current.frameCount++;
          if (currentTime - performanceStats.current.lastFPSUpdate > 1000) {
            performanceStats.current.currentFPS = Math.round(
              (performanceStats.current.frameCount * 1000) /
                (currentTime - performanceStats.current.lastFPSUpdate)
            );
            performanceStats.current.frameCount = 0;
            performanceStats.current.lastFPSUpdate = currentTime;
          }

          // Smooth rotation interpolation
          if (objectGroup) {
            const smoothing = 0.15;
            rotationState.currentRotationX +=
              (rotationState.targetRotationX - rotationState.currentRotationX) *
              smoothing;
            rotationState.currentRotationY +=
              (rotationState.targetRotationY - rotationState.currentRotationY) *
              smoothing;

            objectGroup.rotation.x = rotationState.currentRotationX;
            objectGroup.rotation.y = rotationState.currentRotationY;
          }

          renderer.render(scene, camera);
          lastRenderTime = currentTime - (deltaTime % frameInterval);
        };

        // Start animation loop
        animate(performance.now());

        // ✅ Optimized resize handler
        let resizeTimeout;
        const handleResize = () => {
          if (!isMounted || !container) return;

          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }, 100);
        };

        window.addEventListener("resize", handleResize, passiveOptions);

        // Store references untuk cleanup
        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        setIsLoading(false);
        console.log("✅ 3D viewer initialized successfully in Home");

        // Return cleanup function
        return () => {
          if (renderer.domElement) {
            renderer.domElement.removeEventListener("mousedown", onMouseDown);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);
            renderer.domElement.removeEventListener("mouseup", onMouseUp);
            renderer.domElement.removeEventListener("mouseleave", onMouseUp);
            renderer.domElement.removeEventListener("wheel", onWheel);
          }
          window.removeEventListener("resize", handleResize);
          clearTimeout(resizeTimeout);

          if (objectURL) {
            URL.revokeObjectURL(objectURL);
          }
        };
      } catch (error) {
        console.error("❌ Error in efficient viewer:", error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Initialize viewer
    setIsLoading(true);
    setHasError(false);
    initEfficientViewer();

    // Main cleanup function
    return () => {
      console.log("🛑 Cleaning up 3D viewer in Home...");
      isMounted = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      cleanupThreeJSMemory(
        sceneRef.current,
        rendererRef.current,
        cameraRef.current,
        threeJSModules?.THREE
      );

      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;

      console.log("✅ 3D viewer cleanup completed in Home");
    };
  }, [file]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full rounded-lg bg-gray-800" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#FA812F] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-white text-sm">Loading 3D model...</p>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 rounded-lg">
          <div className="text-center">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-white text-sm">Failed to load 3D model</p>
            <p className="text-gray-400 text-xs mt-1">
              Try a different file format
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!file && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 rounded-lg">
          <div className="text-center">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-white text-sm">3D Preview</p>
            <p className="text-gray-400 text-xs">
              Upload a file to see preview
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// Komponen Upload Area untuk Home (DIPERTAHANKAN)
const UploadAreaHome = React.memo(({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isValidFileType = useCallback((file) => {
    const validExtensions = ["stl", "obj", "3mf"];
    const fileExtension = file.name.split(".").pop().toLowerCase();
    return validExtensions.includes(fileExtension);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (isValidFileType(file)) {
          setIsLoading(true);
          setUploadedFile(file);
          onFileUpload(file);
          // Auto reset loading setelah delay
          setTimeout(() => setIsLoading(false), 1000);
        } else {
          alert(
            "Format file tidak didukung. Silakan upload file STL, OBJ, atau 3MF."
          );
        }
      }
    },
    [onFileUpload, isValidFileType]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file && isValidFileType(file)) {
        setIsLoading(true);
        setUploadedFile(file);
        onFileUpload(file);
        setTimeout(() => setIsLoading(false), 1000);
      } else if (file) {
        alert(
          "Format file tidak didukung. Silakan upload file STL, OBJ, atau 3MF."
        );
      }
    },
    [onFileUpload, isValidFileType]
  );

  const handleClick = useCallback(() => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  }, [isLoading]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    onFileUpload(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileUpload]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {!uploadedFile ? (
        <div
          className={`w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors duration-200 ${
            isDragOver
              ? "border-[#FA812F] bg-[#FA812F]/10"
              : "border-gray-300/30 hover:border-[#FA812F]/50"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".stl,.obj,.3mf"
            className="hidden"
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#FA812F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white font-medium mb-1">Loading 3D Model...</p>
              <p className="text-gray-400 text-sm">Processing your file</p>
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-white font-medium mb-1">Upload File 3D Anda</p>
              <p className="text-gray-400 text-sm">
                Drag & drop file STL, OBJ, atau 3MF
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Atau klik untuk memilih file
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 rounded-lg overflow-hidden bg-gray-900/50">
            <ThreeDPreviewHome file={uploadedFile} />
          </div>
        </div>
      )}
    </div>
  );
});

// DiscountModal component (tetap sama seperti sebelumnya)
const DiscountModal = React.memo(({ isOpen, onClose, activeDiscount }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeDiscount) return null;

  const discountValue =
    activeDiscount.type === "percentage"
      ? `${activeDiscount.value}%`
      : `Rp ${formatRupiah(activeDiscount.value)}`;

  const discountImage = activeDiscount.image_url || "/images/home2.jpg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="modal-fade-in relative bg-gradient-to-br from-[#000000] to-[#212121] rounded-2xl max-w-lg w-full mx-auto overflow-hidden shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-150"
          aria-label="Tutup modal"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="absolute top-4 left-4 z-10">
          <div className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
            DISKON SPESIAL {discountValue}
          </div>
        </div>

        <div className="relative">
          <div className="w-full h-64 sm:h-72 bg-gray-300/10">
            <img
              src={discountImage}
              alt={activeDiscount.name || "Diskon Spesial 3D Printing"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/images/home2.jpg";
              }}
            />
          </div>

          <div className="p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              {activeDiscount.name || "Diskon Spesial!"}
            </h3>

            {activeDiscount.description && (
              <p className="text-gray-300 mb-6 leading-relaxed">
                {activeDiscount.description}
              </p>
            )}

            {activeDiscount.min_order_amount > 0 && (
              <p className="text-yellow-400 text-sm mb-4 font-medium">
                ⚡ Minimal order: Rp{" "}
                {formatRupiah(activeDiscount.min_order_amount)}
              </p>
            )}

            <div className="flex justify-center">
              <Link to="/printing-service" onClick={onClose}>
                <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-transform duration-150 hover:scale-105 text-sm min-w-[200px]">
                  ORDER SEKARANG
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Skeleton Loading Components (tetap sama)
const HeroSkeleton = React.memo(() => (
  <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#000000] to-[#212121] w-full overflow-hidden">
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        <div className="space-y-4 lg:space-y-6">
          <div className="h-8 sm:h-10 lg:h-12 xl:h-16 bg-white/10 rounded-lg shimmer"></div>
          <div className="h-4 sm:h-5 lg:h-6 bg-white/10 rounded shimmer"></div>
          <div className="h-4 sm:h-5 lg:h-6 bg-white/10 rounded shimmer w-3/4"></div>
          <div className="flex flex-row gap-3 pt-2">
            <div className="h-12 bg-white/10 rounded-lg shimmer min-w-[160px]"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
));

const MaterialCardSkeleton = React.memo(() => (
  <div className="group relative bg-white/5 rounded-xl p-4 lg:p-6 border-0 mx-auto w-full max-w-[280px] lg:max-w-none">
    <div className="relative text-center mb-4">
      <div className="w-14 h-14 lg:w-20 lg:h-20 mx-auto mb-3 rounded-xl bg-white/10 shimmer"></div>
      <div className="h-5 lg:h-5 bg-white/10 rounded shimmer mb-2"></div>
      <div className="h-3 bg-white/10 rounded shimmer w-3/4 mx-auto"></div>
    </div>
    <div className="relative mb-4">
      <div className="h-3 bg-white/10 rounded shimmer mb-1"></div>
      <div className="h-3 bg-white/10 rounded shimmer mb-1"></div>
      <div className="h-3 bg-white/10 rounded shimmer w-2/3 mx-auto"></div>
    </div>
    <div className="relative text-center">
      <div className="h-8 bg-white/10 rounded-lg shimmer"></div>
    </div>
  </div>
));

const MaterialSectionSkeleton = React.memo(() => (
  <section className="py-12 lg:py-20 bg-gradient-to-b from-[#1a1a1a] via-[#0f0f0f] to-[#000000] w-full overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8 lg:mb-16">
        <div className="h-7 lg:h-10 bg-white/10 rounded shimmer w-1/2 mx-auto mb-3"></div>
        <div className="h-3 bg-white/10 rounded shimmer w-3/4 mx-auto"></div>
      </div>
      
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-sm">
          <MaterialCardSkeleton />
        </div>
        
        <div className="flex justify-center mt-6 space-x-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-white/30 rounded-full shimmer"></div>
          ))}
        </div>
      </div>
      
      <div className="hidden lg:block">
        <div className="relative">
          <div className="absolute -left-8 lg:-left-16 top-1/2 transform -translate-y-1/2">
            <div className="w-10 h-10 bg-white/10 rounded-full shimmer"></div>
          </div>
          <div className="absolute -right-8 lg:-right-16 top-1/2 transform -translate-y-1/2">
            <div className="w-10 h-10 bg-white/10 rounded-full shimmer"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <MaterialCardSkeleton key={i} />
            ))}
          </div>
          
          <div className="flex justify-center mt-6 lg:mt-8 space-x-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-6 h-1.5 bg-white/10 rounded shimmer"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
));

// Optimized Image Component (tetap sama)
const OptimizedImage = React.memo(
  ({ src, alt, className, fallback = "/images/placeholder.jpg" }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (!src) {
        setImageError(true);
        return;
      }

      const img = new Image();
      img.src = src;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
    }, [src]);

    return (
      <div className={`relative ${className}`}>
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-white/10 rounded shimmer"></div>
        )}
        <img
          src={imageError ? fallback : src}
          alt={alt}
          className={`w-full h-full object-cover ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-150`}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
);

// Optimized Hero Section
const HeroSection = React.memo(
  ({
    slides,
    currentSlide,
    onNextSlide,
    onPrevSlide,
    onSlideChange,
    onFileUpload,
  }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [backgroundLoaded, setBackgroundLoaded] = useState(false);
    const sectionRef = useRef(null);
    const currentHero = slides[currentSlide] || slides[0];

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => setIsVisible(entry.isIntersecting),
        { threshold: 0.05, rootMargin: "100px 0px" }
      );

      if (sectionRef.current) {
        observer.observe(sectionRef.current);
      }

      let mounted = true;
      let timeoutId;

      const loadBackground = () => {
        if (currentHero?.background_image_url) {
          const img = new Image();
          img.src = currentHero.background_image_url;
          img.onload = () => mounted && setBackgroundLoaded(true);
          img.onerror = () => mounted && setBackgroundLoaded(true);

          timeoutId = setTimeout(() => {
            if (mounted && !backgroundLoaded) setBackgroundLoaded(true);
          }, 2000);
        } else {
          setBackgroundLoaded(true);
        }
      };

      loadBackground();

      return () => {
        mounted = false;
        observer.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [currentHero, backgroundLoaded]);

    const backgroundStyle = useMemo(
      () => ({
        backgroundImage: backgroundLoaded
          ? `url('${currentHero?.background_image_url || "/images/home2.jpg"}')`
          : "linear-gradient(135deg, #000000 0%, #212121 100%)",
      }),
      [backgroundLoaded, currentHero]
    );

    return (
      <section
        ref={sectionRef}
        id="hero"
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat pt-0 w-full overflow-hidden"
        style={backgroundStyle}
      >
        <div className="absolute inset-0 bg-black/20"></div>

        {slides.length > 1 && isVisible && (
          <>
            <button
              onClick={onPrevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors duration-150 z-10"
              aria-label="Previous slide"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={onNextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors duration-150 z-10"
              aria-label="Next slide"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => onSlideChange(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-150 ${
                  index === currentSlide ? "bg-[#FA812F]" : "bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:hidden gap-8 items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="bg-black/90 rounded-xl p-4">
                <div className="w-full h-64 bg-gray-300/10 rounded-lg">
                  <UploadAreaHome onFileUpload={onFileUpload} />
                </div>
              </div>
            </div>

            <div className="text-center text-white space-y-3 max-w-2xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                {currentHero?.title || "Layanan 3D Printing Profesional"}
              </h1>
              <p className="text-lg sm:text-xl text-white/80 leading-relaxed">
                {currentHero?.subtitle ||
                  "Transformasi ide digital menjadi objek fisik dengan presisi tinggi. Solusi lengkap untuk prototyping hingga production."}
              </p>
              <div className="pt-4">
                <Link to="/printing-service">
                  <button className="bg-[#FA812F] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#F25912] transition-colors duration-200 text-sm">
                    START 3D PRINTING
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-3 lg:space-y-4 text-white">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-snug">
                {currentHero?.title || "Layanan 3D Printing Profesional"}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white leading-relaxed">
                {currentHero?.subtitle ||
                  "Transformasi ide digital menjadi objek fisik dengan presisi tinggi. Solusi lengkap untuk prototyping hingga production."}
              </p>
              <div className="flex flex-row gap-3 pt-2">
                <Link to="/printing-service">
                  <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-6 sm:px-7 py-2 rounded-lg font-bold hover:shadow-lg transition-transform duration-150 hover:scale-105 text-sm sm:text-base min-w-[160px]">
                    START 3D PRINTING
                  </button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-black/90 rounded-xl p-4">
                <div className="w-full h-56 sm:h-64 lg:h-80 bg-gray-300/10 rounded-lg">
                  <UploadAreaHome onFileUpload={onFileUpload} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

const MaterialCard = React.memo(({ material }) => {
  return (
    <div className="group relative bg-white/5 rounded-xl lg:rounded-2xl p-4 lg:p-8 hover:shadow-lg lg:hover:shadow-xl transition-all duration-250 hover:-translate-y-1 mx-auto w-full max-w-[280px] lg:max-w-none">
      <div className="relative text-center mb-4 lg:mb-6">
        <div className="w-16 h-16 lg:w-24 lg:h-24 mx-auto mb-3 lg:mb-4 rounded-xl lg:rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-2 lg:p-3 flex items-center justify-center">
          {material.image_url ? (
            <OptimizedImage
              src={material.image_url}
              alt={material.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <svg
              className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          )}
        </div>
        <h3 className="text-lg lg:text-2xl font-bold text-white mb-1 lg:mb-2">
          {material.name}
        </h3>
        <div className="flex justify-center items-center gap-2 text-xs lg:text-sm text-gray-400">
          Density: {material.density ? `${material.density} gr/cm³` : "Tidak tersedia"}
        </div>
      </div>

      <div className="relative mb-6 lg:mb-8">
        <p className="text-gray-300 text-xs lg:text-sm leading-relaxed text-center line-clamp-3">
          {material.description || "Deskripsi material tidak tersedia."}
        </p>
      </div>

      <div className="relative text-center">
        <Link to="/printing-service">
          <button className="w-full bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:shadow-lg transition-transform duration-150 text-sm hover:scale-105 shadow-md">
            Pilih Material
          </button>
        </Link>
      </div>
    </div>
  );
});

const MaterialSection = React.memo(({ materials }) => {
  const [currentMaterialSlide, setCurrentMaterialSlide] = useState(0);
  const [currentDesktopSlide, setCurrentDesktopSlide] = useState(0);
  const sectionRef = useRef(null);

  const totalMaterialSlides = materials.length;
  const totalDesktopSlides = Math.ceil(materials.length / 4);
  
  const currentDesktopMaterials = useMemo(() => {
    const startIndex = currentDesktopSlide * 4;
    return materials.slice(startIndex, startIndex + 4);
  }, [materials, currentDesktopSlide]);

  const nextMaterialSlide = useCallback(() => {
    setCurrentMaterialSlide((prev) => (prev + 1) % totalMaterialSlides);
  }, [totalMaterialSlides]);

  const prevMaterialSlide = useCallback(() => {
    setCurrentMaterialSlide(
      (prev) => (prev - 1 + totalMaterialSlides) % totalMaterialSlides
    );
  }, [totalMaterialSlides]);

  const nextDesktopSlide = useCallback(() => {
    setCurrentDesktopSlide((prev) => (prev + 1) % totalDesktopSlides);
  }, [totalDesktopSlides]);

  const prevDesktopSlide = useCallback(() => {
    setCurrentDesktopSlide(
      (prev) => (prev - 1 + totalDesktopSlides) % totalDesktopSlides
    );
  }, [totalDesktopSlides]);

  const goToDesktopSlide = useCallback((index) => {
    setCurrentDesktopSlide(index);
  }, []);

  const goToMaterialSlide = useCallback((index) => {
    setCurrentMaterialSlide(index);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="paket"
      className="py-12 lg:py-20 bg-gradient-to-b from-[#1a1a1a] via-[#0f0f0f] to-[#000000] w-full overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 lg:mb-16">
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
            Pilih Material
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm lg:text-lg leading-relaxed">
            Setiap material memiliki karakteristik unik untuk project 3D printing Anda.
          </p>
        </div>

        <div className="relative">
          <div className="lg:hidden">
            {materials.length > 1 && (
              <>
                <button
                  onClick={prevMaterialSlide}
                  className="absolute -left-2 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-all duration-150 z-10"
                  aria-label="Material sebelumnya"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextMaterialSlide}
                  className="absolute -right-2 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-all duration-150 z-10"
                  aria-label="Material berikutnya"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            <div className="flex justify-center">
              <div className="w-full max-w-[280px]">
                {materials[currentMaterialSlide] && (
                  <MaterialCard key={materials[currentMaterialSlide].id} material={materials[currentMaterialSlide]} />
                )}
              </div>
            </div>
            
            {materials.length > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                {materials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToMaterialSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-150 ${
                      index === currentMaterialSlide
                        ? "bg-[#FA812F] w-6"
                        : "bg-white/30 hover:bg-white/50"
                    }`}
                    aria-label={`Go to material ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            {materials.length > 4 && (
              <>
                <button
                  onClick={prevDesktopSlide}
                  className="absolute -left-8 lg:-left-16 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-all duration-150 z-10"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextDesktopSlide}
                  className="absolute -right-8 lg:-right-16 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-all duration-150 z-10"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              {currentDesktopMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>

            {materials.length > 4 && (
              <div className="flex justify-center mt-6 lg:mt-8 space-x-1.5">
                {Array.from({ length: totalDesktopSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToDesktopSlide(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                      index === currentDesktopSlide
                        ? "bg-[#FA812F] w-6"
                        : "bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

const ProcessSection = React.memo(() => (
  <section
    id="cara-kerja"
    className="py-16 lg:py-28 bg-gradient-to-br from-[#000000] to-[#0a0a0a] w-full overflow-hidden"
  >
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12 lg:mb-20">
        <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
          Cara Mudah Pesan
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm lg:text-lg">
          Hanya 3 langkah sederhana untuk mewujudkan desain 3D Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
        {[
          {
            number: 1,
            title: "Upload File",
            desc: "Upload file 3D Anda. Sistem kami akan menganalisis volume dan memberikan estimasi harga.",
          },
          {
            number: 2,
            title: "Pilih Material",
            desc: "Pilih material yang sesuai dengan kebutuhan Anda. Dapatkan rekomendasi material.",
          },
          {
            number: 3,
            title: "Proses & Kirim",
            desc: "Tim kami akan memproses printing dan finishing. Produk akan dikirim ke alamat Anda.",
          },
        ].map((step, index) => (
          <div key={index} className="text-center group">
            <div className="w-14 h-14 lg:w-24 lg:h-24 bg-white/5 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-8 group-hover:border-[#FA812F] group-hover:bg-[#FA812F]/10 transition-all duration-300 shadow-lg">
              <span className="text-white text-lg lg:text-3xl font-bold group-hover:text-[#FA812F] transition-colors duration-300">
                {step.number}
              </span>
            </div>
            <h3 className="text-base lg:text-2xl font-semibold text-white mb-3 lg:mb-6">
              {step.title}
            </h3>
            <p className="text-gray-300 text-xs lg:text-base leading-relaxed lg:leading-loose">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
));

const CTASection = React.memo(({ heroSlides }) => {
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  const firstHeroSlide = heroSlides?.[0];
  const backgroundImageUrl = firstHeroSlide?.background_image_url || "/images/home2.jpg";

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const loadBackground = () => {
      const img = new Image();
      img.src = backgroundImageUrl;
      img.onload = () => mounted && setBackgroundLoaded(true);
      img.onerror = () => mounted && setBackgroundLoaded(true);

      timeoutId = setTimeout(() => {
        if (mounted && !backgroundLoaded) setBackgroundLoaded(true);
      }, 1500);
    };

    loadBackground();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [backgroundImageUrl, backgroundLoaded]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: backgroundLoaded
        ? `url('${backgroundImageUrl}')`
        : "linear-gradient(135deg, #000000 0%, #212121 100%)",
    }),
    [backgroundLoaded, backgroundImageUrl]
  );

  return (
    <section
      id="cta"
      className="py-12 lg:py-20 bg-cover bg-center bg-no-repeat relative w-full overflow-hidden"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4 lg:mb-6">
          Siap Mewujudkan Ide Anda?
        </h2>
        <p className="text-white/90 text-sm lg:text-lg mb-6 lg:mb-8 max-w-2xl mx-auto leading-relaxed">
          Upload file 3D Anda sekarang dan dapatkan penawaran harga instan.
          Konsultasi gratis dengan tim ahli kami.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
          <Link to="/printing-service">
            <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-lg font-bold hover:shadow-xl transition-transform duration-150 transform hover:scale-105 shadow-lg text-sm lg:text-base">
              UPLOAD FILE 3D
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
});

const formatRupiah = (number) => {
  if (!number && number !== 0) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const Home = () => {
  const [homeContent, setHomeContent] = useState({
    heroSlides: [],
    siteStats: [],
    materials: [],
    activeDiscount: null,
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const fallbackData = useMemo(
    () => ({
      heroSlides: [
        {
          id: 1,
          title: "Layanan 3D Printing Profesional",
          subtitle:
            "Transformasi ide digital menjadi objek fisik dengan presisi tinggi. Solusi lengkap untuk prototyping hingga production.",
          background_image_url: "/images/home2.jpg",
        },
      ],
      siteStats: [
        { stat_number: "2.5K+", stat_label: "Project sejak 2015" },
        { stat_number: "100+", stat_label: "Material tersedia" },
        { stat_number: "98%", stat_label: "Klien puas" },
        { stat_number: "60%", stat_label: "Order kembali" },
      ],
      materials: [
        {
          id: 1,
          name: "Aluminium",
          description:
            "Material kuat dan ringan dengan konduktivitas termal yang baik, cocok untuk berbagai aplikasi industri.",
          density: 2.7,
          image_url: "/images/contoh.png",
        },
        {
          id: 2,
          name: "Titanium",
          description:
            "Material dengan kekuatan sangat tinggi dan ringan, tahan korosi, ideal untuk aplikasi medis dan aerospace.",
          density: 4.5,
          image_url: "/images/contoh.png",
        },
      ],
      activeDiscount: null,
    }),
    []
  );

  const handleFileUpload = useCallback((file) => {
    setUploadedFile(file);
    console.log("File uploaded:", file?.name);
  }, []);

  useEffect(() => {
    const initializePopup = async () => {
      try {
        const response = await popupService.getPopupSettings();
        
        if (!response) return;

        let popupData;

        if (response && response.success !== undefined && response.data) {
          popupData = response.data;
        } else if (response && response.interval_minutes !== undefined) {
          popupData = response;
        } else if (response && response.data && response.data.interval_minutes !== undefined) {
          popupData = response.data;
        } else {
          popupData = {
            is_active: true,
            interval_minutes: 120,
            delay_seconds: 5,
            show_only_with_discount: true,
          };
        }

        if (!popupData.is_active) return;

        const shouldShow = !popupData.show_only_with_discount || homeContent.activeDiscount;
        if (!shouldShow) return;

        const storageKey = "lastPopupShown_discount";
        const lastShown = localStorage.getItem(storageKey);
        const now = Date.now();
        const intervalMs = popupData.interval_minutes * 60 * 1000;

        if (!lastShown || now - parseInt(lastShown) >= intervalMs) {
          const timer = setTimeout(() => {
            setShowDiscountModal(true);
            localStorage.setItem(storageKey, now.toString());
          }, popupData.delay_seconds * 1000);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Popup initialization error:", error);
        if (homeContent.activeDiscount) {
          const fallbackTimer = setTimeout(() => {
            setShowDiscountModal(true);
          }, 5000);
          return () => clearTimeout(fallbackTimer);
        }
      }
    };

    initializePopup();
  }, [homeContent.activeDiscount]);

  const handleCloseModal = useCallback(() => {
    setShowDiscountModal(false);
  }, []);

  const fetchHomeContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await homeService.getHomeContent();
      if (response.success) {
        setHomeContent(response.data);
      } else {
        throw new Error("Failed to fetch home content");
      }
    } catch (err) {
      console.error("Error fetching home content:", err);
      setError(err.message);
      setHomeContent(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [fallbackData]);

  useEffect(() => {
    fetchHomeContent();
  }, [fetchHomeContent]);

  useEffect(() => {
    if (homeContent.heroSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % homeContent.heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [homeContent.heroSlides.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % homeContent.heroSlides.length);
  }, [homeContent.heroSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(
      (prev) => (prev - 1 + homeContent.heroSlides.length) % homeContent.heroSlides.length
    );
  }, [homeContent.heroSlides.length]);

  const handleSlideChange = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#000000] to-[#212121] w-full overflow-x-hidden">
        <HeroSkeleton />
        <MaterialSectionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#212121] flex items-center justify-center w-full overflow-x-hidden">
        <div className="text-center text-white">
          <p className="text-lg mb-4">Terjadi error: {error}</p>
          <button
            onClick={fetchHomeContent}
            className="bg-[#FA812F] px-6 py-3 rounded-lg hover:bg-[#F25912] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#000000] to-[#212121] w-full overflow-x-hidden">
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={handleCloseModal}
        activeDiscount={homeContent.activeDiscount}
      />
      <HeroSection
        slides={homeContent.heroSlides}
        currentSlide={currentSlide}
        onNextSlide={nextSlide}
        onPrevSlide={prevSlide}
        onSlideChange={handleSlideChange}
        stats={homeContent.siteStats}
        onFileUpload={handleFileUpload}
      />
      <MaterialSection materials={homeContent.materials} />
      <ProcessSection />
      <CTASection heroSlides={homeContent.heroSlides} />
      <FloatingContact />
    </div>
  );
};

export default Home;