// frontend/src/pages/user/ProcessingStep.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { authService } from "../../services/authService";

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ProcessingStep = ({
  currentStep,
  setCurrentStep,
  selectedFiles,
  setSelectedFiles,
  isDragging,
  setIsDragging,
  isProcessingFile,
  setIsProcessingFile,
  uploadProgress,
  setUploadProgress,
  currentlyProcessing,
  setCurrentlyProcessing,
  materials,
  showMessage,
  formatCurrency,
  formatFileSize,
  calculateFilePricing,
}) => {
  // Konfigurasi upload
  const UPLOAD_CONFIG = useMemo(() => ({
    maxFiles: 5,
    maxTotalSize: 100 * 1024 * 1024, // 100MB total
    maxFileSize: 25 * 1024 * 1024, // 25MB per file
    allowedTypes: [".stl", ".obj", ".3mf", ".step", ".iges", ".fbx", ".dae"],
  }), []);

  // Refs untuk debounce dan cleanup
  const debouncedSaveRef = useRef(null);
  const cleanupRefs = useRef(new Set());
  
  // ✅ FIX: Flag untuk prevent load setelah intentional remove
  const isRemovingRef = useRef(false);

// ProcessingStep.jsx - Enhanced save function dengan authService
const saveOrderToStorage = useCallback((files) => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return;

  const orderData = {
    selectedFiles: files,
    userId: currentUser.id,
    userEmail: currentUser.email,
    timestamp: new Date().toISOString(),
    currentStep: currentStep,
  };

  // ✅ ENHANCED: Gunakan authService untuk save dengan validation
  authService.saveOrderData(orderData);
  console.log("💾 Saved order data for user:", currentUser.email);
}, [currentStep]);

// ProcessingStep.jsx - Enhanced load function dengan authService
const loadOrderFromStorage = useCallback(() => {
  // ✅ ENHANCED: Gunakan authService untuk load dengan validation
  const validatedOrderData = authService.validateAndCleanOrderData();
  
  if (validatedOrderData) {
    console.log("🔄 Loading validated order data for current user");
    return validatedOrderData;
  }
  return null;
}, []);

// ProcessingStep.jsx - Enhanced remove functions
const handleRemoveFile = useCallback((fileId) => {
  // Set flag untuk prevent load
  isRemovingRef.current = true;
  
  setSelectedFiles((prev) => {
    const newFiles = prev.filter((f) => f.id !== fileId);

    // ✅ ENHANCED: Immediate save dengan authService
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const orderData = {
        selectedFiles: newFiles,
        userId: currentUser.id,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString(),
        currentStep: currentStep,
      };
      authService.saveOrderData(orderData);
    }

    return newFiles;
  });

  // Reset flag setelah operation complete
  setTimeout(() => {
    isRemovingRef.current = false;
  }, 1000);
}, [setSelectedFiles, currentStep]);

// ProcessingStep.jsx - Enhanced remove all files
const handleRemoveAllFiles = useCallback(() => {
  // Set flag untuk prevent load
  isRemovingRef.current = true;
  
  setSelectedFiles([]);

  // ✅ ENHANCED: Clear dengan authService
  authService.clearOrderData();

  // Reset flag setelah operation complete
  setTimeout(() => {
    isRemovingRef.current = false;
  }, 1000);
}, [setSelectedFiles]);

  // Initialize debounced save function
  useEffect(() => {
    debouncedSaveRef.current = debounce((files) => {
      saveOrderToStorage(files);
    }, 1000);

    return () => {
      // Cleanup semua resources
      cleanupRefs.current.forEach(cleanup => cleanup());
      cleanupRefs.current.clear();
      
      // ✅ FIX: Cancel pending debounce
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel?.();
      }
    };
  }, [saveOrderToStorage]);

  // ✅ FIXED: Load data dengan better timing dan prevention
  useEffect(() => {
    // Skip load jika sedang processing atau ada files
    if (isProcessingFile || selectedFiles.length > 0) {
      return;
    }

    const loadData = () => {
      const orderData = loadOrderFromStorage();
      
      if (orderData && orderData.selectedFiles) {
        console.log("🔄 Loading selectedFiles from localStorage:", orderData.selectedFiles.length, "files");
        setSelectedFiles(orderData.selectedFiles);
      }
    };

    // Delay untuk memastikan tidak conflict dengan remove operations
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [selectedFiles.length, setSelectedFiles, loadOrderFromStorage, isProcessingFile]);

  // ✅ FIXED: Clear files ketika pindah ke step 2
  useEffect(() => {
    if (currentStep === 2 && selectedFiles.length > 0) {
      console.log("🧹 Clearing files because moving to step 2");
      
      // Clear localStorage juga
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        localStorage.removeItem("lastActiveOrder");
      }
      
      // Optional: reset state jika needed
      // setSelectedFiles([]);
    }
  }, [currentStep, selectedFiles.length]);

  // Dynamic Three.js loader dengan better memory management
  const loadThreeJSDependencies = useCallback(async (fileType) => {
    try {
      switch (fileType) {
        case 'stl':
          const { STLLoader } = await import(
            "three/examples/jsm/loaders/STLLoader"
          );
          return { loader: STLLoader, type: 'stl' };
        case 'obj':
          const { OBJLoader } = await import(
            "three/examples/jsm/loaders/OBJLoader"
          );
          return { loader: OBJLoader, type: 'obj' };
        case '3mf':
          const { ThreeMFLoader } = await import(
            "three/examples/jsm/loaders/3MFLoader"
          );
          return { loader: ThreeMFLoader, type: '3mf' };
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to load Three.js dependency for ${fileType}:`, error);
      throw error;
    }
  }, []);

  // Validasi file dengan useCallback
  const validateFile = useCallback((file) => {
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();

    if (!UPLOAD_CONFIG.allowedTypes.includes(fileExtension)) {
      showMessage(
        `File type not supported. Please upload: ${UPLOAD_CONFIG.allowedTypes.join(", ")}`,
        "error"
      );
      return false;
    }

    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      showMessage(
        `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
        "error"
      );
      return false;
    }

    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0) + file.size;
    if (totalSize > UPLOAD_CONFIG.maxTotalSize) {
      showMessage(
        `Total files size too large. Maximum total size is ${UPLOAD_CONFIG.maxTotalSize / 1024 / 1024}MB`,
        "error"
      );
      return false;
    }

    return true;
  }, [UPLOAD_CONFIG, selectedFiles, showMessage]);

  // Process file dengan retry mechanism
  const processFileWithRetry = useCallback(async (file, retries = 2) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await analyze3DFile(file);
      } catch (error) {
        console.warn(`Attempt ${attempt} failed for ${file.name}:`, error);
        if (attempt === retries) {
          throw new Error(`Failed to process ${file.name} after ${retries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }
  }, []);

  // Process files dengan optimasi
  const processFiles = useCallback(async (files) => {
    if (files.length === 0) return;

    // Validasi jumlah file
    const availableSlots = UPLOAD_CONFIG.maxFiles - selectedFiles.length;
    if (availableSlots <= 0) {
      showMessage(`Maximum ${UPLOAD_CONFIG.maxFiles} files allowed`, "error");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      showMessage(
        `Only ${availableSlots} files can be added (max: ${UPLOAD_CONFIG.maxFiles})`,
        "warning"
      );
    }

    console.log(`📁 Processing ${filesToProcess.length} files with progress...`);

    // Reset progress state
    setUploadProgress({});
    setIsProcessingFile(true);

    const successfullyProcessed = [];
    const failedFiles = [];

    try {
      // Process files sequentially dengan progress
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];

        if (!validateFile(file)) {
          console.log(`⏭️ Skipping invalid file: ${file.name}`);
          failedFiles.push({ file: file.name, reason: "Validation failed" });
          continue;
        }

        try {
          // Update progress - file sedang diproses
          setCurrentlyProcessing({
            name: file.name,
            current: i + 1,
            total: filesToProcess.length,
          });

          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "analyzing", progress: 0 },
          }));

          console.log(`🔄 [${i + 1}/${filesToProcess.length}] Analyzing: ${file.name}`);

          // Simulasi progress analysis
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "analyzing", progress: 30 },
          }));

          // Analysis file dengan retry mechanism
          const analysis = await processFileWithRetry(file);

          // Progress setelah analysis
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "calculating", progress: 70 },
          }));

          // Calculate pricing
          const pricing = await calculateFilePricing({
            ...file,
            material: materials[0]?.id || 1,
            quantity: 1,
            volume: analysis.volume,
          });

          // Progress setelah pricing
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "finalizing", progress: 90 },
          }));

          const newFile = {
            file,
            id: Math.random().toString(36).substr(2, 9) + Date.now(),
            name: file.name,
            size: file.size,
            uploadTime: new Date().toLocaleTimeString(),
            material: materials[0]?.id || 1,
            quantity: 1,
            volume: analysis.volume,
            dimensions: analysis.dimensions,
            estimatedWeight: analysis.estimatedWeight,
            pricing: pricing,
            _lastMaterial: materials[0]?.id || 1,
            _lastQuantity: 1,
          };

          setSelectedFiles((prev) => {
            const newFiles = [...prev, newFile];

            // ✅ FIXED: Immediate save untuk new files
            saveOrderToStorage(newFiles);

            return newFiles;
          });

          // Progress complete
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "completed", progress: 100 },
          }));

          successfullyProcessed.push(file.name);
          console.log(`✅ Successfully processed: ${file.name}`);

          // Delay antar file untuk animasi progress
          if (filesToProcess.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error(`❌ Failed to process ${file.name}:`, error);
          failedFiles.push({ file: file.name, reason: error.message });
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: "error", progress: 0, error: error.message },
          }));
        }
      }

      console.log(`🎉 Completed processing ${successfullyProcessed.length} files`);

      // Show summary
      if (failedFiles.length > 0) {
        showMessage(
          `${successfullyProcessed.length} files processed successfully, ${failedFiles.length} failed`,
          "warning"
        );
      } else if (successfullyProcessed.length > 0) {
        showMessage(
          `Successfully processed ${successfullyProcessed.length} files`,
          "success"
        );
      }
    } catch (error) {
      console.error("❌ Critical error in processFiles:", error);
      showMessage("Terjadi kesalahan saat memproses file. Silakan coba lagi.", "error");
    } finally {
      // Reset processing state
      setCurrentlyProcessing(null);
      setIsProcessingFile(false);

      // Cleanup progress after 2 seconds
      setTimeout(() => {
        setUploadProgress({});
      }, 2000);
    }
  }, [
    UPLOAD_CONFIG, selectedFiles, validateFile, processFileWithRetry, materials, 
    calculateFilePricing, setUploadProgress, setIsProcessingFile, setCurrentlyProcessing, 
    setSelectedFiles, showMessage, saveOrderToStorage
  ]);

  // Handle file select dengan useCallback
  const handleFileSelect = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = "";
    await processFiles(files);
  }, [processFiles]);

  // Handle drop dengan useCallback
  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    await processFiles(files);
  }, [processFiles, setIsDragging]);

  // Handle drag over dengan useCallback
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  // Handle drag leave dengan useCallback
  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);
  
  // Performance monitoring
  const logPerformance = useCallback((operation, startTime, metadata = {}) => {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`, metadata);
  }, []);

  // Analyze STL file dengan better memory management
  const analyzeSTLFile = useCallback(async (arrayBuffer, fileName = "unknown") => {
    console.log(`🔍 Starting optimized STL analysis: ${fileName} (${(arrayBuffer.byteLength / 1024).toFixed(2)}KB)`);
    const analysisStartTime = performance.now();

    return new Promise((resolve, reject) => {
      const fileSizeKB = arrayBuffer.byteLength / 1024;

      const processSTL = async () => {
        try {
          // Try Three.js first for accuracy (only for reasonable file sizes)
          if (fileSizeKB < 5000) {
            try {
              const threeDeps = await loadThreeJSDependencies('stl');
              if (threeDeps) {
                const loader = new threeDeps.loader();
                const geometry = loader.parse(arrayBuffer);

                geometry.computeBoundingBox();
                const bbox = geometry.boundingBox;

                const dimensions = {
                  x: bbox.max.x - bbox.min.x,
                  y: bbox.max.y - bbox.min.y,
                  z: bbox.max.z - bbox.min.z,
                };

                const volume = calculateVolumeFromGeometry(geometry);
                const vertexCount = geometry.attributes.position?.count || 0;

                const result = {
                  dimensions: `${dimensions.x.toFixed(2)} x ${dimensions.y.toFixed(2)} x ${dimensions.z.toFixed(2)} (mm)`,
                  volume: Math.round(volume),
                  estimatedWeight: ((volume / 1000) * 8).toFixed(1),
                  rawDimensions: dimensions,
                };

                // Cleanup geometry immediately
                geometry.dispose();
                
                logPerformance('STL Analysis', analysisStartTime, { 
                  fileName, 
                  fileSize: arrayBuffer.byteLength,
                  method: 'threejs',
                  vertices: vertexCount
                });
                
                resolve(result);
                return;
              }
            } catch (threeError) {
              console.log(`⚠️ Three.js STL failed for ${fileName}, using manual parser:`, threeError.message);
            }
          }

          // Enhanced manual parsing dengan better performance
          const header = new Uint8Array(arrayBuffer, 0, 80);
          const isBinary = !(
            (
              header[0] === 115 && // 's'
              header[1] === 111 && // 'o'
              header[2] === 108 && // 'l'
              header[3] === 105 && // 'i'
              header[4] === 100    // 'd'
            )
          );

          let vertices = [];
          const maxVertices = fileSizeKB > 1000 ? 20000 : fileSizeKB > 500 ? 30000 : 50000;

          if (isBinary) {
            // Binary parsing dengan better memory management
            const triangleCount = new Uint32Array(arrayBuffer, 80, 1)[0];
            const dataView = new DataView(arrayBuffer);

            // Calculate optimal sample rate
            const totalVertices = triangleCount * 3;
            const sampleRate = totalVertices > maxVertices ? Math.ceil(totalVertices / maxVertices) : 1;

            for (let i = 0; i < triangleCount && vertices.length < maxVertices; i++) {
              const offset = 84 + i * 50;
              for (let v = 0; v < 3; v++) {
                if (vertices.length % sampleRate === 0) {
                  const vertexOffset = offset + 12 + v * 12;
                  const x = dataView.getFloat32(vertexOffset, true);
                  const y = dataView.getFloat32(vertexOffset + 4, true);
                  const z = dataView.getFloat32(vertexOffset + 8, true);
                  vertices.push({ x, y, z });
                }
              }
            }
          } else {
            // ASCII parsing dengan improved regex dan limits
            const text = new TextDecoder().decode(arrayBuffer);
            const vertexRegex = /vertex\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)/g;
            let match;

            while ((match = vertexRegex.exec(text)) !== null && vertices.length < maxVertices) {
              vertices.push({
                x: parseFloat(match[1]),
                y: parseFloat(match[2]),
                z: parseFloat(match[3]),
              });
            }
          }

          // Faster bounding box calculation
          const dimensions = calculateBoundingBox(vertices);
          const bboxVolume = dimensions.x * dimensions.y * dimensions.z;

          // Smart volume estimation based on vertex density
          const vertexDensity = vertices.length / 1000;
          let fillRatio;

          if (vertexDensity < 0.05) fillRatio = 0.3;
          else if (vertexDensity < 0.1) fillRatio = 0.4;
          else if (vertexDensity < 0.5) fillRatio = 0.5;
          else if (vertexDensity < 1.0) fillRatio = 0.6;
          else if (vertexDensity < 2.0) fillRatio = 0.65;
          else fillRatio = 0.7;

          const volume = bboxVolume * fillRatio;

          const result = {
            dimensions: `${dimensions.x.toFixed(2)} x ${dimensions.y.toFixed(2)} x ${dimensions.z.toFixed(2)} (mm)`,
            volume: Math.round(volume),
            estimatedWeight: ((volume / 1000) * 8).toFixed(1),
            rawDimensions: dimensions,
          };

          logPerformance('STL Analysis', analysisStartTime, { 
            fileName, 
            fileSize: arrayBuffer.byteLength,
            method: `manual-${isBinary ? "binary" : "ascii"}`,
            vertices: vertices.length
          });
          
          resolve(result);
        } catch (error) {
          console.error(`❌ STL analysis failed for ${fileName}:`, error);
          reject(new Error(`STL analysis failed: ${error.message}`));
        }
      };

      processSTL();
    });
  }, [loadThreeJSDependencies, logPerformance]);

  // Analyze with ThreeJS dengan better cleanup
  const analyzeWithThreeJS = useCallback(async (file, fileExtension, fileUrl) => {
    const analysisStartTime = performance.now();
    let geometry = null;
    let object = null;

    try {
      const threeDeps = await loadThreeJSDependencies(fileExtension);
      if (!threeDeps) {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      const loader = new threeDeps.loader();
      object = await loader.loadAsync(fileUrl);
      
      object.traverse((child) => {
        if (child.isMesh && !geometry) {
          geometry = child.geometry;
        }
      });

      if (geometry) {
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;

        const dimensions = {
          x: bbox.max.x - bbox.min.x,
          y: bbox.max.y - bbox.min.y,
          z: bbox.max.z - bbox.min.z,
        };

        const volume = calculateVolumeFromGeometry(geometry);
        const defaultDensity = materials[0]?.density || 1.2;

        const result = {
          dimensions: `${dimensions.x.toFixed(2)} x ${dimensions.y.toFixed(2)} x ${dimensions.z.toFixed(2)} (mm)`,
          volume: Math.round(volume),
          estimatedWeight: ((volume / 1000) * defaultDensity).toFixed(1),
          rawDimensions: dimensions,
        };

        logPerformance('Three.js Analysis', analysisStartTime, {
          fileExtension,
          fileName: file.name
        });
        return result;
      }

      throw new Error("Could not load geometry with Three.js");
    } catch (error) {
      console.error(`Three.js analysis failed for ${fileExtension}:`, error);
      throw error;
    } finally {
      // Cleanup resources
      if (geometry) {
        geometry.dispose();
        if (geometry.material) {
          if (Array.isArray(geometry.material)) {
            geometry.material.forEach(material => material.dispose());
          } else {
            geometry.material.dispose();
          }
        }
      }
    }
  }, [loadThreeJSDependencies, materials, logPerformance]);

  // Analyze with fallback - NO HARDCODE
  const analyzeWithFallback = useCallback(async (file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Estimasi berdasarkan file size dan tipe
    let baseSize = 50; // default base size in mm
    
    if (fileSizeMB < 0.1) baseSize = 25;
    else if (fileSizeMB < 0.5) baseSize = 40;
    else if (fileSizeMB < 1) baseSize = 60;
    else if (fileSizeMB < 5) baseSize = 80;
    else baseSize = 100;

    const dimensions = { 
      x: baseSize, 
      y: baseSize, 
      z: baseSize 
    };

    const volume = calculateVolumeFromDimensions(dimensions);
    const defaultDensity = materials[0]?.density || 1.2;
    const estimatedWeight = (volume / 1000) * defaultDensity;

    console.log(`🔄 Fallback estimation for ${file.name}:`, {
      fileSizeMB: fileSizeMB.toFixed(2),
      dimensions,
      volume: Math.round(volume),
      estimatedWeight: estimatedWeight.toFixed(1) + "g",
    });

    return {
      dimensions: `${dimensions.x.toFixed(2)} x ${dimensions.y.toFixed(2)} x ${dimensions.z.toFixed(2)} (mm)`,
      volume: Math.round(volume),
      estimatedWeight: estimatedWeight.toFixed(1),
      rawDimensions: dimensions,
    };
  }, [materials]);

  // Calculate bounding box
  const calculateBoundingBox = useCallback((vertices) => {
    if (vertices.length === 0) {
      return { x: 50, y: 50, z: 50 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
      minZ = Math.min(minZ, vertex.z);
      maxZ = Math.max(maxZ, vertex.z);
    }

    const dimensions = {
      x: Math.abs(maxX - minX) || 50,
      y: Math.abs(maxY - minY) || 50,
      z: Math.abs(maxZ - minZ) || 50,
    };

    return dimensions;
  }, []);

  // Calculate volume from dimensions
  const calculateVolumeFromDimensions = useCallback((dimensions) => {
    return Math.abs(dimensions.x * dimensions.y * dimensions.z);
  }, []);

  // Signed volume of triangle
  const signedVolumeOfTriangle = useCallback((x1, y1, z1, x2, y2, z2, x3, y3, z3) => {
    return (
      (x1 * y2 * z3 +
        x2 * y3 * z1 +
        x3 * y1 * z2 -
        x1 * y3 * z2 -
        x2 * y1 * z3 -
        x3 * y2 * z1) /
      6
    );
  }, []);

  // Calculate volume from geometry
  const calculateVolumeFromGeometry = useCallback((geometry) => {
    const volumeStartTime = performance.now();
    
    try {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      const bboxVolume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z);

      let triangleVolume = 0;
      const position = geometry.getAttribute("position");

      if (!position) {
        throw new Error("No position attribute in geometry");
      }

      // Gunakan indexed calculation jika available
      if (geometry.index) {
        const indices = geometry.index.array;
        const triangleCount = indices.length / 3;

        const maxTriangles = 100000;
        const sampleRate = triangleCount > maxTriangles ? Math.ceil(triangleCount / maxTriangles) : 1;

        for (let i = 0; i < indices.length; i += 3 * sampleRate) {
          const v1 = indices[i], v2 = indices[i + 1], v3 = indices[i + 2];
          const volume = signedVolumeOfTriangle(
            position.getX(v1), position.getY(v1), position.getZ(v1),
            position.getX(v2), position.getY(v2), position.getZ(v2),
            position.getX(v3), position.getY(v3), position.getZ(v3)
          );
          triangleVolume += volume * sampleRate;
        }
      } else {
        const triangleCount = position.count / 3;
        const maxTriangles = 100000;
        const sampleRate = triangleCount > maxTriangles ? Math.ceil(triangleCount / maxTriangles) : 1;

        for (let i = 0; i < position.count; i += 3 * sampleRate) {
          const volume = signedVolumeOfTriangle(
            position.getX(i), position.getY(i), position.getZ(i),
            position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1),
            position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2)
          );
          triangleVolume += volume * sampleRate;
        }
      }

      const actualVolume = Math.abs(triangleVolume);

      // Validasi volume
      if (actualVolume > 0 && actualVolume <= bboxVolume * 2) { // Allow some tolerance
        logPerformance('Volume Calculation', volumeStartTime, {
          method: 'triangle',
          volume: actualVolume
        });
        return actualVolume;
      } else {
        // Fallback reasonable estimate
        const estimatedVolume = bboxVolume * 0.6;
        console.log("🔄 Using bbox-based estimate:", {
          estimatedVolume: Math.round(estimatedVolume),
          reason: actualVolume <= 0 ? "Invalid volume" : "Volume > 2*bbox",
        });
        
        logPerformance('Volume Calculation', volumeStartTime, {
          method: 'bbox-estimate',
          volume: estimatedVolume
        });
        return estimatedVolume;
      }
    } catch (error) {
      console.error("❌ Volume calculation error:", error);
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      const bboxVolume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z);

      const estimatedVolume = bboxVolume * 0.5;
      
      logPerformance('Volume Calculation', volumeStartTime, {
        method: 'error-fallback',
        volume: estimatedVolume
      });

      return estimatedVolume;
    }
  }, [signedVolumeOfTriangle, logPerformance]);

  // Analyze 3D file dengan timeout dan fallback - NO HARDCODE
  const analyze3DFile = useCallback(async (file) => {
    console.log(`🔍 Starting optimized 3D analysis for: ${file.name}`);
    const analysisStartTime = performance.now();

    return new Promise((resolve, reject) => {
      const fileSizeMB = file.size / (1024 * 1024);
      const timeoutMs = fileSizeMB > 10 ? 35000 : fileSizeMB > 5 ? 30000 : fileSizeMB > 1 ? 25000 : 15000;

      let timeoutId;
      let isResolved = false;

      const safeResolve = (result) => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      };

      const safeReject = (error) => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      };

      timeoutId = setTimeout(() => {
        safeReject(new Error(`File processing timeout (${timeoutMs}ms): ${file.name}`));
      }, timeoutMs);

      const processFile = async () => {
        try {
          const fileExtension = file.name.split(".").pop().toLowerCase();
          let analysisResult;

          // Early detection for unsupported files
          const supportedFormats = ["stl", "obj", "3mf", "step", "iges", "fbx", "dae"];
          if (!supportedFormats.includes(fileExtension)) {
            throw new Error(`Unsupported file format: ${fileExtension}`);
          }

          // File size based strategy
          if (fileExtension === "stl") {
            console.log(`🎯 Using optimized STL analyzer for: ${file.name}`);
            const arrayBuffer = await file.arrayBuffer();
            analysisResult = await analyzeSTLFile(arrayBuffer, file.name);
          } else if (["obj", "3mf"].includes(fileExtension)) {
            if (fileSizeMB > 15) {
              console.log(`📦 Large ${fileExtension} file (${fileSizeMB.toFixed(1)}MB), using fallback`);
              analysisResult = await analyzeWithFallback(file);
            } else {
              console.log(`🎯 Using Three.js analyzer for: ${file.name}`);
              const fileUrl = URL.createObjectURL(file);
              try {
                analysisResult = await analyzeWithThreeJS(file, fileExtension, fileUrl);
              } finally {
                URL.revokeObjectURL(fileUrl);
              }
            }
          } else {
            // Untuk format lain, gunakan fallback
            analysisResult = await analyzeWithFallback(file);
          }

          const analysisTime = performance.now() - analysisStartTime;
          console.log(`✅ Successfully analyzed: ${file.name} in ${analysisTime.toFixed(2)}ms`, {
            volume: analysisResult.volume,
            dimensions: analysisResult.dimensions,
          });

          safeResolve(analysisResult);
        } catch (error) {
          console.error(`❌ Analysis error for ${file.name}:`, error);
          
          // Coba fallback analysis
          try {
            console.log(`🔄 Attempting fallback analysis for: ${file.name}`);
            const fallbackResult = await analyzeWithFallback(file);
            safeResolve(fallbackResult);
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed for ${file.name}:`, fallbackError);
            safeReject(new Error(`Failed to analyze file: ${fallbackError.message}`));
          }
        }
      };

      processFile();
    });
  }, [analyzeSTLFile, analyzeWithThreeJS, analyzeWithFallback]);

  // File upload progress component
  const FileUploadProgress = useCallback(({
    fileName,
    progress,
    status,
    current,
    total,
  }) => {
    const getStatusColor = () => {
      switch (status) {
        case "analyzing": return "text-blue-400";
        case "calculating": return "text-yellow-400";
        case "finalizing": return "text-purple-400";
        case "completed": return "text-green-400";
        case "error": return "text-red-400";
        default: return "text-gray-400";
      }
    };

    const getStatusText = () => {
      switch (status) {
        case "analyzing": return "Menganalisis file 3D...";
        case "calculating": return "Menghitung harga...";
        case "finalizing": return "Menyiapkan file...";
        case "completed": return "Selesai!";
        case "error": return "Error memproses file";
        default: return "Memproses...";
      }
    };

    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-blue-400">{current}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fileName}</p>
              <p className={`text-xs ${getStatusColor()}`}>{getStatusText()}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
        </div>

        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              status === "completed" ? "bg-green-500" :
              status === "error" ? "bg-red-500" :
              "bg-gradient-to-r from-[#F25912] to-[#FA812F]"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  }, []);

  // Optimasi computed values dengan useMemo
  const uploadedFilesSummary = useMemo(() => {
    return {
      totalFiles: selectedFiles.length,
      totalSize: selectedFiles.reduce((sum, file) => sum + file.size, 0),
      canAddMore: selectedFiles.length < UPLOAD_CONFIG.maxFiles,
    };
  }, [selectedFiles, UPLOAD_CONFIG.maxFiles]);

  const canProceed = useMemo(() => {
    return selectedFiles.length > 0 && !isProcessingFile;
  }, [selectedFiles.length, isProcessingFile]);

  // ✅ FIXED: Handle proceed to next step dengan cleanup
  const handleProceed = useCallback(() => {
    if (!canProceed) return;
    
    // Clear localStorage ketika proceed ke step 2
    localStorage.removeItem("lastActiveOrder");
    setCurrentStep(2);
  }, [canProceed, setCurrentStep]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 transition-all duration-300">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Upload Your 3D Files
        </h2>
        <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8">
          Upload up to {UPLOAD_CONFIG.maxFiles} files. Drag and drop or click to browse
        </p>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-8 lg:p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-[#FA812F] bg-white/10"
              : "border-white/20 hover:border-white/30"
          } ${selectedFiles.length > 0 ? "border-green-400 bg-white/10" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input").click()}
        >
          <div className="flex flex-col items-center justify-center">
            {isProcessingFile ? (
              <>
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#FA812F] border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
                <p className="text-base sm:text-lg font-medium text-white mb-2">
                  Analyzing 3D File...
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Calculating dimensions and volume
                </p>

                {currentlyProcessing && (
                  <div className="mt-4 w-full max-w-md">
                    <FileUploadProgress
                      fileName={currentlyProcessing.name}
                      progress={uploadProgress[currentlyProcessing.name]?.progress || 0}
                      status={uploadProgress[currentlyProcessing.name]?.status || "analyzing"}
                      current={currentlyProcessing.current}
                      total={currentlyProcessing.total}
                    />
                  </div>
                )}
              </>
            ) : selectedFiles.length === 0 ? (
              <>
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mb-3 sm:mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-base sm:text-lg font-medium text-white mb-2">
                  Drop your 3D files here
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                  Max {UPLOAD_CONFIG.maxFiles} files • {UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB per file
                </p>
                <button className="bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base">
                  Browse Files
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-400/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-green-400/30">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-base sm:text-lg font-medium text-white mb-2">
                  {selectedFiles.length} File{selectedFiles.length > 1 ? "s" : ""} Uploaded!
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mb-2">
                  Ready to proceed
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("file-input").click();
                  }}
                  className="text-[#FA812F] hover:text-[#F25912] text-xs sm:text-sm font-medium mr-4"
                >
                  Add More Files
                </button>

                {selectedFiles.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAllFiles();
                    }}
                    className="text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium"
                  >
                    Remove All
                  </button>
                )}
              </div>
            )}
          </div>

          <input
            id="file-input"
            type="file"
            accept={UPLOAD_CONFIG.allowedTypes.join(",")}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </div>

        {/* Uploaded Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Uploaded Files ({uploadedFilesSummary.totalFiles}/{UPLOAD_CONFIG.maxFiles})
            </h3>
            <div className="space-y-3">
              {selectedFiles.map((fileObj, index) => (
                <div
                  key={fileObj.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-white truncate">
                        {fileObj.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(fileObj.size)} • Uploaded at {fileObj.uploadTime}
                      </p>
                      <p className="text-xs text-white mt-1">
                        Volume: {fileObj.volume.toLocaleString()} mm³ • {fileObj.dimensions}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(fileObj.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Requirements */}
        <div className="mt-6 sm:mt-8 text-left bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6">
          <h3 className="font-semibold text-white mb-3 text-sm sm:text-base">
            File Requirements:
          </h3>
          <ul className="text-xs sm:text-sm text-gray-300 space-y-2">
            <li className="flex items-start">
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Supported formats: STL, OBJ, 3MF
            </li>
            <li className="flex items-start">
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Maximum 1 file • 50MB per file
            </li>
            <li className="flex items-start">
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              File akan dioptimasi secara otomatis ketika diupload
            </li>
          </ul>
        </div>
      </div>

      {/* Next Button */}
      <div className="text-center mt-6 sm:mt-8">
        <button
          onClick={handleProceed}
          disabled={!canProceed}
          className={`px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 ${
            canProceed
              ? "bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white hover:shadow-lg transform hover:scale-105 cursor-pointer"
              : "bg-white/10 text-gray-400 cursor-not-allowed border border-white/20"
          }`}
        >
          {isProcessingFile
            ? "Processing Files..."
            : selectedFiles.length > 0
            ? `Proceed with ${selectedFiles.length} File${selectedFiles.length > 1 ? "s" : ""}`
            : "Upload Files to Continue"}
        </button>
      </div>
    </div>
  );
};

export default ProcessingStep;