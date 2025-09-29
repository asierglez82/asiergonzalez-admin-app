// Configuración para alternar entre Gemini local y cloud
import { generateWithGemini, generateJsonOrText, generateSmart } from '../services/ai';
import { generateJsonOrText as generateJsonOrTextProxy, generateSmart as generateSmartProxy } from '../services/geminiProxy';
import { 
  generateWithGeminiCloud, 
  generateJsonOrTextCloud, 
  generateSmartCloud,
  geminiCloudService 
} from '../services/geminiCloud';

// Configuración del servicio a usar
const USE_GEMINI_CLOUD = process.env.EXPO_PUBLIC_USE_GEMINI_CLOUD === 'true';

// Configuración
export const geminiConfig = {
  useCloudService: USE_GEMINI_CLOUD,
  cloudFunctionUrl: process.env.EXPO_PUBLIC_GEMINI_CLOUD_FUNCTION_URL,
  localApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  
  // Configuración de modelos
  defaultModel: 'gemini-2.5-flash-lite',
  fastModel: 'gemini-2.5-flash-lite',
  advancedModel: 'gemini-1.5-pro',
  
  // Configuración de requests
  defaultTimeout: 30000, // 30 segundos
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  
  // Configuración de generación
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
  
  // Debug y logs
  enableDebugLogs: process.env.NODE_ENV === 'development',
  
  // Cache (para reducir calls a la cloud function)
  enableCache: true,
  cacheTimeout: 2 * 60 * 1000, // 2 minutos
};

// Cache simple para respuestas (solo para desarrollo)
const responseCache = new Map();

// Función principal para generar contenido con Gemini
export const generateWithGeminiSmart = async (prompt, system = '', options = {}) => {
  const cacheKey = USE_GEMINI_CLOUD ? `cloud_${prompt}_${system}` : `local_${prompt}_${system}`;
  
  // Verificar cache si está habilitado
  if (geminiConfig.enableCache && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < geminiConfig.cacheTimeout) {
      if (geminiConfig.enableDebugLogs) {
        console.log('📋 Gemini: Respuesta desde cache');
      }
      return cached.response;
    } else {
      responseCache.delete(cacheKey);
    }
  }

  let attempts = 0;
  const maxAttempts = geminiConfig.maxRetries + 1;

  while (attempts < maxAttempts) {
    try {
      let response;

      if (USE_GEMINI_CLOUD) {
        if (geminiConfig.enableDebugLogs) {
          console.log('🌥️ Gemini: Usando servicio cloud');
        }
        response = await generateWithGeminiCloud(prompt, system);
      } else {
        if (geminiConfig.enableDebugLogs) {
          console.log('💻 Gemini: Usando servicio local');
        }
        // Intentar con el servicio local (AI.js) primero
        try {
          response = await generateWithGemini(prompt, system);
        } catch (localError) {
          // Si falla el servicio local, intentar con el proxy
          console.warn('❌ Servicio local falló, intentando proxy:', localError.message);
          response = await generateSmartProxy(prompt, { 
            model: geminiConfig.defaultModel,
            ...options 
          });
        }
      }

      // Guardar en cache si está habilitado
      if (geminiConfig.enableCache && response) {
        responseCache.set(cacheKey, {
          response,
          timestamp: Date.now()
        });
      }

      return response;

    } catch (error) {
      attempts++;
      console.error(`❌ Gemini intento ${attempts}/${maxAttempts} falló:`, error.message);

      if (attempts >= maxAttempts) {
        // Si es cloud y falla, intentar fallback a local
        if (USE_GEMINI_CLOUD && geminiConfig.localApiKey) {
          console.log('🔄 Fallback: Cloud falló, intentando local...');
          try {
            const response = await generateWithGemini(prompt, system);
            return response;
          } catch (fallbackError) {
            console.error('❌ Fallback local también falló:', fallbackError.message);
          }
        }
        
        throw new Error(`Gemini generation failed after ${maxAttempts} attempts: ${error.message}`);
      }

      // Esperar antes del siguiente intento
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, geminiConfig.retryDelay * attempts));
      }
    }
  }
};

// Función para generar JSON o texto con reintentos inteligentes
export const generateJsonOrTextSmart = async (prompt, model = geminiConfig.defaultModel) => {
  try {
    if (USE_GEMINI_CLOUD) {
      return await generateJsonOrTextCloud(prompt, model);
    } else {
      // Intentar proxy primero, luego fallback a local
      try {
        return await generateJsonOrTextProxy(prompt, model);
      } catch (proxyError) {
        if (geminiConfig.localApiKey) {
          console.warn('❌ Proxy falló, usando API directa:', proxyError.message);
          return await generateWithGemini(prompt);
        }
        throw proxyError;
      }
    }
  } catch (error) {
    console.error('❌ Error en generateJsonOrTextSmart:', error);
    throw error;
  }
};

// Función inteligente con múltiples fallbacks
export const generateContentSmart = async (prompt, options = {}) => {
  try {
    if (USE_GEMINI_CLOUD) {
      return await generateSmartCloud(prompt, options);
    } else {
      return await generateSmartProxy(prompt, options);
    }
  } catch (error) {
    console.error('❌ Error en generateContentSmart:', error);
    throw error;
  }
};

// Funciones para alternar dinámicamente entre servicios
export const switchToGeminiCloud = () => {
  console.log('🌥️ Cambiando a Gemini Cloud...');
  return {
    generateWithGemini: generateWithGeminiCloud,
    generateJsonOrText: generateJsonOrTextCloud,
    generateSmart: generateSmartCloud
  };
};

export const switchToGeminiLocal = () => {
  console.log('💻 Cambiando a Gemini Local...');
  return {
    generateWithGemini,
    generateJsonOrText: generateJsonOrTextProxy,
    generateSmart: generateSmartProxy
  };
};

// Función para verificar disponibilidad de servicios
export const checkGeminiServiceAvailability = async () => {
  const results = {
    cloud: { available: false, error: null },
    local: { available: false, error: null },
    proxy: { available: false, error: null }
  };

  // Test Cloud Service
  if (geminiConfig.cloudFunctionUrl) {
    try {
      const healthCheck = await geminiCloudService.checkGeminiCloudHealth();
      results.cloud.available = healthCheck.healthy;
      if (!healthCheck.healthy) {
        results.cloud.error = healthCheck.error;
      }
    } catch (error) {
      results.cloud.error = error.message;
    }
  }

  // Test Local Service
  if (geminiConfig.localApiKey) {
    try {
      await generateWithGemini('test', '');
      results.local.available = true;
    } catch (error) {
      results.local.error = error.message;
    }
  }

  // Test Proxy Service
  try {
    await generateJsonOrTextProxy('test');
    results.proxy.available = true;
  } catch (error) {
    results.proxy.error = error.message;
  }

  return results;
};

// Limpiar cache
export const clearGeminiCache = () => {
  responseCache.clear();
  console.log('🗑️ Cache de Gemini limpiado');
};

// Exportar la configuración activa
export default {
  generateWithGemini: generateWithGeminiSmart,
  generateJsonOrText: generateJsonOrTextSmart,
  generateSmart: generateContentSmart,
  config: geminiConfig,
  switchToCloud: switchToGeminiCloud,
  switchToLocal: switchToGeminiLocal,
  checkAvailability: checkGeminiServiceAvailability,
  clearCache: clearGeminiCache
};
