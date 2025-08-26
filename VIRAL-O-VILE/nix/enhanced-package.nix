{ lib
, stdenv
, nodejs
, nodePackages
, ollama
, redis
, postgresql
, writeShellScriptBin
, makeWrapper
, cudaPackages ? null
, rocmPackages ? null
}:

let
  # Enhanced Node.js environment with performance optimizations
  nodeEnv = nodePackages.nodejs-20_x;
  
  # Multiple AI models for different analysis types
  aiModels = [
    "llava:latest"           # Main visual analysis
    "llava:13b"             # Higher quality analysis
    "codellama:latest"      # Code/hashtag generation
    "mistral:latest"        # Text enhancement
  ];
  
  # GPU acceleration support
  gpuSupport = if cudaPackages != null then "cuda" 
              else if rocmPackages != null then "rocm" 
              else "cpu";
  
  # Enhanced Ollama service with GPU and model preloading
  ollamaService = writeShellScriptBin "enhanced-ollama" ''
    set -e
    
    # Configure GPU acceleration
    ${if gpuSupport == "cuda" then ''
      export CUDA_VISIBLE_DEVICES=0
      export OLLAMA_GPU_LAYERS=35
    '' else if gpuSupport == "rocm" then ''
      export HSA_VISIBLE_DEVICES=0
      export OLLAMA_GPU_LAYERS=35
    '' else ''
      export OLLAMA_NUM_PARALLEL=4
    ''}
    
    # Start Ollama server with optimizations
    echo "🚀 Starting Enhanced Ollama for VIRAL OR VILE..."
    ollama serve &
    OLLAMA_PID=$!
    
    # Wait for server to be ready
    sleep 2
    
    # Pre-download and cache all models
    echo "📦 Downloading AI models..."
    ${lib.concatMapStringsSep "\n" (model: ''
      echo "Downloading ${model}..."
      ollama pull ${model} || echo "Warning: Failed to download ${model}"
    '') aiModels}
    
    echo "✅ All models ready!"
    wait $OLLAMA_PID
  '';
  
  # Redis cache setup for viral analysis results
  redisCache = writeShellScriptBin "setup-redis" ''
    echo "🔄 Setting up Redis cache for viral predictions..."
    redis-server --daemonize yes --port 6379 --maxmemory 512mb --maxmemory-policy allkeys-lru
    echo "✅ Redis cache ready!"
  '';
  
  # Performance monitoring script
  performanceMonitor = writeShellScriptBin "monitor-performance" ''
    echo "📊 VIRAL OR VILE Performance Monitor"
    echo "====================================="
    echo "GPU: ${gpuSupport}"
    echo "Models: ${toString (lib.length aiModels)}"
    echo "Memory usage:"
    free -h
    echo "GPU usage:"
    ${if gpuSupport == "cuda" then "nvidia-smi || echo 'nvidia-smi not available'" else "echo 'CPU mode'"}
  '';

in stdenv.mkDerivation {
  pname = "viral-or-vile-enhanced";
  version = "2.0.0";

  src = ../.;

  buildInputs = [ 
    nodeEnv 
    nodePackages.npm 
    ollama 
    redis
    makeWrapper
  ] ++ lib.optionals (gpuSupport == "cuda") [ cudaPackages.cudatoolkit ]
    ++ lib.optionals (gpuSupport == "rocm") [ rocmPackages.rocm-runtime ];

  buildPhase = ''
    # Install dependencies with production optimizations
    npm ci --production=false --prefer-offline
    
    # Build optimized Next.js bundle
    NODE_ENV=production npm run build
    
    # Optimize for production
    npm prune --production
  '';

  installPhase = ''
    mkdir -p $out/bin $out/share $out/var/cache
    
    # Copy application files
    cp -r .next $out/
    cp -r public $out/
    cp -r src $out/
    cp -r node_modules $out/
    cp package.json next.config.ts tsconfig.json $out/
    
    # Install enhanced services
    ln -s ${ollamaService}/bin/enhanced-ollama $out/bin/
    ln -s ${redisCache}/bin/setup-redis $out/bin/
    ln -s ${performanceMonitor}/bin/monitor-performance $out/bin/
    
    # Create main launcher with all services
    cat > $out/bin/viral-or-vile <<EOF
    #!${stdenv.shell}
    set -e
    
    echo "🚀 Starting VIRAL OR VILE - AI Social Media Predictor"
    echo "=================================================="
    
    # Start Redis cache
    $out/bin/setup-redis
    
    # Start enhanced Ollama with GPU support
    $out/bin/enhanced-ollama &
    OLLAMA_PID=\$!
    
    # Wait for AI models to load
    sleep 5
    
    # Start Next.js application
    cd $out
    export NODE_ENV=production
    export REDIS_URL=redis://localhost:6379
    export OLLAMA_HOST=http://localhost:11434
    
    echo "✅ All services ready!"
    echo "🌐 Access at: http://localhost:3000"
    
    ${nodeEnv}/bin/node $out/.next/standalone/server.js
    
    # Cleanup on exit
    kill \$OLLAMA_PID || true
    redis-cli shutdown || true
    EOF
    
    chmod +x $out/bin/viral-or-vile
  '';

  meta = with lib; {
    description = "VIRAL OR VILE - Enhanced AI-Powered Social Media Success Predictor";
    longDescription = ''
      Advanced viral content analysis with:
      - Multi-model AI analysis (LLaVA, CodeLlama, Mistral)
      - GPU acceleration support (CUDA/ROCm)
      - Redis caching for performance
      - Real-time viral prediction scoring
      - Platform-specific optimization suggestions
    '';
    license = licenses.mit;
    platforms = platforms.linux;
    maintainers = [ "hackathon-team" ];
  };
}
