{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.viral-or-vile;
  
  # Import enhanced package
  appPackage = pkgs.callPackage ./enhanced-package.nix { 
    inherit (config.hardware) cudaPackages;
  };
  
  # Configuration for production deployment
  configFile = pkgs.writeText "viral-or-vile-config.json" (builtins.toJSON {
    port = cfg.port;
    host = cfg.host;
    redis_url = "redis://localhost:6379";
    ollama_host = "http://localhost:11434";
    max_upload_size = "50MB";
    rate_limiting = {
      requests_per_minute = cfg.rateLimiting.requestsPerMinute;
      burst_size = cfg.rateLimiting.burstSize;
    };
    ai_models = cfg.aiModels;
    cache_ttl = cfg.cacheTtl;
  });

in {
  options.services.viral-or-vile = {
    enable = mkEnableOption "VIRAL OR VILE - AI Social Media Predictor";
    
    port = mkOption {
      type = types.port;
      default = 3000;
      description = "Port for the web application";
    };
    
    host = mkOption {
      type = types.str;
      default = "0.0.0.0";
      description = "Host to bind the application";
    };
    
    domain = mkOption {
      type = types.str;
      default = "viral-or-vile.local";
      description = "Domain name for the service";
    };
    
    # GPU Configuration
    enableGPU = mkOption {
      type = types.bool;
      default = true;
      description = "Enable GPU acceleration for AI models";
    };
    
    # AI Model Configuration
    aiModels = mkOption {
      type = types.listOf types.str;
      default = [ "llava:latest" "llava:13b" "mistral:latest" ];
      description = "List of AI models to pre-download";
    };
    
    # Caching Configuration
    enableRedis = mkOption {
      type = types.bool;
      default = true;
      description = "Enable Redis caching for performance";
    };
    
    cacheTtl = mkOption {
      type = types.int;
      default = 3600;
      description = "Cache TTL in seconds";
    };
    
    # Rate Limiting
    rateLimiting = {
      requestsPerMinute = mkOption {
        type = types.int;
        default = 60;
        description = "Maximum requests per minute per IP";
      };
      
      burstSize = mkOption {
        type = types.int;
        default = 10;
        description = "Burst size for rate limiting";
      };
    };
    
    # Security
    enableFirewall = mkOption {
      type = types.bool;
      default = true;
      description = "Enable firewall rules";
    };
    
    # Monitoring
    enableMetrics = mkOption {
      type = types.bool;
      default = true;
      description = "Enable Prometheus metrics";
    };
  };

  config = mkIf cfg.enable {
    # GPU Support
    hardware.opengl.enable = mkIf cfg.enableGPU true;
    hardware.nvidia.modesetting.enable = mkIf cfg.enableGPU true;
    
    # Users and Groups
    users.users.viral-or-vile = {
      isSystemUser = true;
      group = "viral-or-vile";
      description = "VIRAL OR VILE service user";
      home = "/var/lib/viral-or-vile";
      createHome = true;
    };
    
    users.groups.viral-or-vile = {};
    
    # Redis Service (if enabled)
    services.redis.servers.viral-cache = mkIf cfg.enableRedis {
      enable = true;
      port = 6379;
      bind = "127.0.0.1";
      settings = {
        maxmemory = "1GB";
        maxmemory-policy = "allkeys-lru";
        save = [ "900 1" "300 10" "60 10000" ];
      };
    };
    
    # Ollama Service with GPU support
    systemd.services.ollama-viral = {
      description = "Ollama AI service for VIRAL OR VILE";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ] ++ optional cfg.enableRedis "redis-viral-cache.service";
      
      environment = {
        OLLAMA_HOST = "127.0.0.1:11434";
        OLLAMA_MODELS = "/var/lib/ollama/models";
      } // optionalAttrs cfg.enableGPU {
        CUDA_VISIBLE_DEVICES = "0";
        OLLAMA_GPU_LAYERS = "35";
      };
      
      serviceConfig = {
        Type = "simple";
        User = "viral-or-vile";
        Group = "viral-or-vile";
        ExecStart = "${pkgs.ollama}/bin/ollama serve";
        Restart = "always";
        RestartSec = "10";
        WorkingDirectory = "/var/lib/viral-or-vile";
        
        # Security hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ReadWritePaths = [ "/var/lib/viral-or-vile" "/tmp" ];
      };
      
      # Pre-download models
      postStart = ''
        sleep 5
        ${concatMapStringsSep "\n" (model: ''
          ${pkgs.ollama}/bin/ollama pull ${model} || echo "Warning: Failed to pull ${model}"
        '') cfg.aiModels}
      '';
    };
    
    # Main Application Service
    systemd.services.viral-or-vile = {
      description = "VIRAL OR VILE Web Application";
      wantedBy = [ "multi-user.target" ];
      after = [ 
        "network.target" 
        "ollama-viral.service" 
      ] ++ optional cfg.enableRedis "redis-viral-cache.service";
      
      environment = {
        NODE_ENV = "production";
        PORT = toString cfg.port;
        HOST = cfg.host;
        REDIS_URL = mkIf cfg.enableRedis "redis://localhost:6379";
        OLLAMA_HOST = "http://localhost:11434";
        CONFIG_FILE = toString configFile;
      };
      
      serviceConfig = {
        Type = "simple";
        User = "viral-or-vile";
        Group = "viral-or-vile";
        WorkingDirectory = "${appPackage}";
        ExecStart = "${appPackage}/bin/viral-or-vile";
        Restart = "always";
        RestartSec = "10";
        
        # Resource limits
        MemoryMax = "4G";
        CPUQuota = "200%";
        
        # Security hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ReadWritePaths = [ "/var/lib/viral-or-vile" "/tmp" ];
        CapabilityBoundingSet = "";
        SystemCallFilter = [ "@system-service" "~@privileged" ];
      };
    };
    
    # Nginx Reverse Proxy with SSL
    services.nginx = {
      enable = true;
      virtualHosts.${cfg.domain} = {
        enableACME = true;
        forceSSL = true;
        
        locations."/" = {
          proxyPass = "http://${cfg.host}:${toString cfg.port}";
          proxyWebsockets = true;
          extraConfig = ''
            # Performance optimizations
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            proxy_cache_lock on;
            
            # Security headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Rate limiting
            limit_req zone=api burst=${toString cfg.rateLimiting.burstSize} nodelay;
            
            # File upload size
            client_max_body_size 50M;
          '';
        };
        
        locations."/api/" = {
          proxyPass = "http://${cfg.host}:${toString cfg.port}";
          extraConfig = ''
            # API-specific rate limiting
            limit_req zone=api burst=5 nodelay;
            
            # Longer timeout for AI processing
            proxy_read_timeout 120s;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
          '';
        };
      };
      
      # Rate limiting zones
      appendHttpConfig = ''
        limit_req_zone $binary_remote_addr zone=api:10m rate=${toString cfg.rateLimiting.requestsPerMinute}r/m;
      '';
    };
    
    # ACME/Let's Encrypt
    security.acme = {
      acceptTerms = true;
      defaults.email = "admin@${cfg.domain}";
    };
    
    # Firewall Configuration
    networking.firewall = mkIf cfg.enableFirewall {
      allowedTCPPorts = [ 80 443 cfg.port ];
      allowedUDPPorts = [ ];
    };
    
    # Monitoring with Prometheus (if enabled)
    services.prometheus = mkIf cfg.enableMetrics {
      enable = true;
      scrapeConfigs = [
        {
          job_name = "viral-or-vile";
          static_configs = [
            {
              targets = [ "${cfg.host}:${toString cfg.port}" ];
            }
          ];
        }
      ];
    };
    
    # Log rotation
    services.logrotate.settings.viral-or-vile = {
      files = "/var/log/viral-or-vile/*.log";
      rotate = 7;
      daily = true;
      compress = true;
      delaycompress = true;
      missingok = true;
      notifempty = true;
    };
    
    # Backup script for models and cache
    systemd.services.viral-or-vile-backup = {
      description = "Backup VIRAL OR VILE data";
      startAt = "daily";
      
      script = ''
        # Backup AI models
        tar -czf /var/backups/viral-models-$(date +%Y%m%d).tar.gz /var/lib/ollama/models/
        
        # Backup Redis data (if enabled)
        ${optionalString cfg.enableRedis ''
          redis-cli --rdb /var/backups/viral-cache-$(date +%Y%m%d).rdb
        ''}
        
        # Clean old backups (keep 7 days)
        find /var/backups -name "viral-*" -mtime +7 -delete
      '';
      
      serviceConfig = {
        Type = "oneshot";
        User = "viral-or-vile";
        Group = "viral-or-vile";
      };
    };
  };
}
