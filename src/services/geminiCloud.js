// Servicio de Gemini usando Google Cloud Functions y Secret Manager
// URL de la Cloud Function (actualizar después del despliegue)
const GEMINI_CLOUD_FUNCTION_URL = process.env.EXPO_PUBLIC_GEMINI_CLOUD_FUNCTION_URL || 'https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/geminiProxy';

export const geminiCloudService = {
  
  // Realizar request a la Cloud Function de Gemini
  async makeGeminiRequest(prompt, options = {}) {
    try {
      const {
        model = 'gemini-2.5-flash-lite',
        system = null,
        temperature = 0.2, // Temperatura baja para contenido más fiel a las notas
        maxOutputTokens = 8192, // Aumentado para permitir respuestas más largas
        timeout = 30000
      } = options;

      const requestBody = {
        prompt,
        model,
        temperature,
        maxOutputTokens
      };

      if (system) {
        requestBody.system = system;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`🌥️ Gemini Cloud Request - Model: ${model}, Prompt: ${prompt.length} chars`);
      console.log('📊 Prompt Preview (first 500 chars):', prompt.substring(0, 500));
      console.log('📊 Prompt Preview (last 500 chars):', prompt.substring(Math.max(0, prompt.length - 500)));

      const response = await fetch(GEMINI_CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini Cloud Function Error (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido en Gemini Cloud Function');
      }

      const responseText = result.data?.text || '';
      const responseLength = responseText.length || 0;
      const finishReason = result.data?.finishReason || 'unknown';
      const usage = result.data?.usage || {};
      
      console.log(`✅ Gemini Cloud Response - ${responseLength} chars`);
      console.log(`📊 Finish Reason: ${finishReason}`);
      console.log(`📊 Usage:`, JSON.stringify(usage));
      
      // Advertir si la respuesta fue truncada
      if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
        console.warn('⚠️ La respuesta fue truncada por límite de tokens. Considera aumentar maxOutputTokens.');
      }

      return responseText;

    } catch (error) {
      console.error('❌ Error en Gemini Cloud Service:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Timeout: La request a Gemini Cloud Function tardó demasiado');
      }
      
      throw error;
    }
  },

  // Verificar salud del servicio cloud
  async checkGeminiCloudHealth() {
    try {
      const healthUrl = GEMINI_CLOUD_FUNCTION_URL.replace('geminiProxy', 'geminiHealthCheck');
      const response = await fetch(healthUrl, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      
      return {
        healthy: result.success && result.status?.geminiWorking,
        hasApiKey: result.status?.hasApiKey || false,
        geminiWorking: result.status?.geminiWorking || false,
        cacheStatus: result.status?.cacheStatus || 'unknown',
        timestamp: result.status?.timestamp
      };
    } catch (error) {
      console.error('Error en health check de Gemini Cloud:', error);
      return { healthy: false, error: error.message };
    }
  },

  // Configurar API key de Gemini (función admin)
  async setGeminiApiKey(apiKey, adminSecret) {
    try {
      const setKeyUrl = GEMINI_CLOUD_FUNCTION_URL.replace('geminiProxy', 'setGeminiApiKey');
      
      const response = await fetch(setKeyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          adminSecret
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error configurando API key de Gemini:', error);
      throw error;
    }
  }
};

// Funciones compatibles con la API existente
export async function generateWithGeminiCloud(prompt, system = '') {
  try {
    return await geminiCloudService.makeGeminiRequest(prompt, { 
      system: system || null,
      model: 'gemini-2.5-flash-lite' // Mantener compatibilidad
    });
  } catch (error) {
    console.error('Error en generateWithGeminiCloud:', error);
    throw new Error(`Gemini Cloud generation failed: ${error.message}`);
  }
}

export async function generateJsonOrTextCloud(prompt, model = 'gemini-2.5-flash-lite') {
  try {
    return await geminiCloudService.makeGeminiRequest(prompt, { model });
  } catch (error) {
    console.error('Error en generateJsonOrTextCloud:', error);
    throw new Error(`Gemini Cloud proxy error: ${error.message}`);
  }
}

export async function generateSmartCloud(prompt, opts = {}) {
  try {
    const model = opts.model || opts.directModel || 'gemini-2.5-flash-lite';
    return await geminiCloudService.makeGeminiRequest(prompt, { 
      model,
      temperature: opts.temperature !== undefined ? opts.temperature : 0.2, // Temperatura baja por defecto para contenido más fiel
      maxOutputTokens: opts.maxOutputTokens || 8192 // Aumentado para permitir respuestas más largas
    });
  } catch (error) {
    console.error('Error en generateSmartCloud:', error);
    throw new Error(`Gemini Cloud smart generation failed: ${error.message}`);
  }
}
