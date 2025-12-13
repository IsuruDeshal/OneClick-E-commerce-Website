/**
 * ========================================
 * AUTO-DETECT ENVIRONMENT CONFIGURATION (IMPROVED)
 * ========================================
 * - Better localhost detection
 * - Allow runtime overrides via meta tag (name="api-base-url") or query param (?api_base_url=... or ?env=local)
 * - Safer console silencing (preserve errors/warn)
 * - Robust fetch handling (response.ok, non-JSON bodies)
 */

(function() {
  'use strict';

  // Helper: read meta tag value
  function getMetaContent(name) {
    try {
      const m = document.querySelector(`meta[name="${name}"]`);
      return m ? m.getAttribute('content') : null;
    } catch (e) {
      return null;
    }
  }

  // Detect environment (more flexible)
  const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
  const isLikelyLocal = (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  );

  // Auto-detect production domain
  const prodDomain = !isLikelyLocal && hostname ? `https://${hostname}` : 'https://techelevate.news';

  // Default config
  const DEFAULTS = {
    localApi: 'http://localhost/oneclick/api',
    localFrontend: 'http://localhost/oneclick',
    prodApi: 'https://techelevate.news/api',
    prodFrontend: 'https://techelevate.news'
  };

  // Build API_CONFIG (will be mutable via setters)
  const API_CONFIG = {
    isLocal: isLikelyLocal,
    environment: isLikelyLocal ? 'development' : 'production',
    debug: isLikelyLocal,
    apiUrl: isLikelyLocal ? DEFAULTS.localApi : DEFAULTS.prodApi,
    frontendUrl: isLikelyLocal ? DEFAULTS.localFrontend : DEFAULTS.prodFrontend,

    // setters for runtime adjustments
    setApiUrl(url) {
      if (typeof url === 'string' && url.trim()) {
        this.apiUrl = url.trim().replace(/\/$/, '');
      }
    },
    setFrontendUrl(url) {
      if (typeof url === 'string' && url.trim()) {
        this.frontendUrl = url.trim().replace(/\/$/, '');
      }
    },
    setEnvironment(env) {
      this.environment = env === 'development' ? 'development' : 'production';
      this.isLocal = this.environment === 'development';
      this.debug = this.isLocal;
    }
  };

  // Apply overrides in this order: meta tag, query param
  // Meta tag: <meta name="api-base-url" content="https://example.com/api">
  const metaApi = getMetaContent('api-base-url');
  if (metaApi) {
    API_CONFIG.setApiUrl(metaApi);
    API_CONFIG.setFrontendUrl(getMetaContent('frontend-url') || API_CONFIG.frontendUrl);
    API_CONFIG.setEnvironment(getMetaContent('env') || API_CONFIG.environment);
  }

  // Query params override: ?api_base_url=... or ?env=development
  try {
    const params = new URLSearchParams(window.location.search);
    const qApi = params.get('api_base_url') || params.get('api_baseurl') || params.get('api');
    const qFrontend = params.get('frontend_url') || params.get('frontend');
    const qEnv = params.get('env') || params.get('environment');
    if (qApi) API_CONFIG.setApiUrl(qApi);
    if (qFrontend) API_CONFIG.setFrontendUrl(qFrontend);
    if (qEnv) API_CONFIG.setEnvironment(qEnv);
  } catch (e) {
    // ignore
  }

  // Expose to window
  window.API_CONFIG = API_CONFIG;

  // Preserve important console methods, but silence verbose logs in production
  const _console = {
    log: console.log.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
    info: console.info ? console.info.bind(console) : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
    error: console.error ? console.error.bind(console) : console.log.bind(console)
  };

  if (!API_CONFIG.debug) {
    console.log = function() {};
    console.debug = function() {};
    console.info = function() {};
    // keep warn/error for visibility
  }

  // Show local mode banner only when debug is true
  if (API_CONFIG.isLocal) {
    addLocalModeBanner();
  }

  function addLocalModeBanner() {
    try {
      const banner = document.createElement('div');
      banner.id = 'local-mode-banner';
      banner.style.zIndex = '99999';
      banner.innerHTML = `\n      <div style="\n        position: fixed;\n        bottom: 0;\n        left: 0;\n        right: 0;\n        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n        color: white;\n        padding: 12px 20px;\n        text-align: center;\n        font-family: Arial, sans-serif;\n        font-size: 14px;\n        font-weight: 600;\n        box-shadow: 0 -2px 10px rgba(0,0,0,0.2);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 15px;\n      ">\n        <span style="\n          background: rgba(255,255,255,0.2);\n          padding: 5px 12px;\n          border-radius: 15px;\n          font-size: 12px;\n        ">\n          🖥️ XAMPP LOCAL MODE\n        </span>\n        <span>\n          Running on localhost - API: ${API_CONFIG.apiUrl}\n        </span>\n        <button aria-label="close local banner" style="\n          background: rgba(255,255,255,0.2);\n          border: none;\n          color: white;\n          padding: 5px 12px;\n          border-radius: 15px;\n          cursor: pointer;\n          font-weight: 600;\n        ">\n          ✕ Close\n        </button>\n      </div>\n    `;

      // Attach close handler
      banner.addEventListener('click', function(e) {
        if (e.target && (e.target.tagName === 'BUTTON' || e.target.getAttribute('aria-label') === 'close local banner')) {
          banner.remove();
        }
      });

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(banner));
      } else {
        document.body.appendChild(banner);
      }
    } catch (e) {
      // ignore DOM injection errors
    }
  }

  /**
   * Global fetch wrapper with auto API URL and robust handling
   * - Accepts full URLs or endpoint paths
   * - Handles non-JSON responses
   * - Throws an error object with status, statusText, and body
   */
  window.apiRequest = async function(endpoint, options = {}) {
    const isAbsolute = /^(https?:)?\/\//i.test(endpoint);
    const url = isAbsolute ? endpoint : `${API_CONFIG.apiUrl}/${endpoint.replace(/^\//, '')}`;

    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, mergedOptions);

      if (API_CONFIG.debug) {
        _console.log(`API Request: ${url}`);
        _console.log('Options:', mergedOptions);
        _console.log('Status:', response.status, response.statusText);
      }

      // Try to parse body safely
      const contentType = response.headers.get('content-type') || '';
      let body = null;

      if (response.status === 204) {
        body = null; // No content
      } else if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch (e) {
          body = await response.text();
        }
      } else {
        // fallback to text for HTML or other content-types
        body = await response.text();
      }

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status} ${response.statusText}`);
        err.status = response.status;
        err.statusText = response.statusText;
        err.body = body;
        if (API_CONFIG.debug) _console.warn('API Error body:', body);
        throw err;
      }

      if (API_CONFIG.debug) _console.log('API Data:', body);
      return body;
    } catch (error) {
      // Ensure important errors are visible
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  };

  // Helpful debug logs
  if (API_CONFIG.debug) {
    _console.log('%c🚀 One Click Computers', 'font-size: 20px; font-weight: bold; color: #ff6b35;');
    _console.log('%cEnvironment: ' + API_CONFIG.environment, 'font-size: 14px; color: #4ade80;');
    _console.log('%cAPI URL: ' + API_CONFIG.apiUrl, 'font-size: 14px; color: #3b82f6;');
    _console.log('%cDebug Mode: ON', 'font-size: 14px; color: #fbbf24;');
  }

  // Auto-load WhatsApp floating button script (idempotent)
  (function(){
    const existing = document.querySelector('script[data-whatsapp-button]');
    if(existing) return;
    const src = '/assets/js/whatsapp-button.js';
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.whatsappButton = 'true';
    document.head.appendChild(s);
  })();

})();
