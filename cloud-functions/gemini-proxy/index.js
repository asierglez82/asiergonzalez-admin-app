const functions = require('@google-cloud/functions-framework');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const cors = require('cors');

// Configurar CORS para permitir requests desde tu app
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:8081', 
    'https://tu-dominio.com',
    'https://asiergonzalez.es'
  ], // Ajustar según tu app
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
};

const corsHandler = cors(corsOptions);

// Cliente de Secret Manager
const secretClient = new SecretManagerServiceClient();

// ID del proyecto de Google Cloud
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'asiergonzalez-web-app';

// Nombre del secret para el API key de Gemini
const GEMINI_API_KEY_SECRET = 'gemini-api-key';

// Cache para el API key (válido por 1 hora)
let cachedApiKey = null;
let cacheExpiration = 0;

// Función principal del proxy de Gemini
functions.http('geminiProxy', async (req, res) => {
  // Importar fetch dinámicamente
  const fetch = (await import('node-fetch')).default;
  
  corsHandler(req, res, async () => {
    try {
      const { method } = req;

      if (method === 'OPTIONS') {
        return res.status(200).send();
      }

      if (method !== 'POST') {
        return res.status(405).json({ 
          success: false, 
          error: 'Método no permitido. Solo POST es soportado.' 
        });
      }

      // Extraer parámetros del request
      const { 
        prompt, 
        model = 'gemini-2.5-flash-lite', 
        system, 
        temperature = 0.7,
        maxOutputTokens = 2048,
        safetySettings = []
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          error: 'El prompt es requerido' 
        });
      }

      // Obtener el API key de Gemini desde Secret Manager
      const apiKey = await getGeminiApiKey();

      if (!apiKey) {
        return res.status(500).json({ 
          success: false, 
          error: 'No se pudo obtener el API key de Gemini' 
        });
      }

      // Construir el request para la API de Gemini
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
        safetySettings
      };

      // Añadir system instruction si se proporciona
      if (system) {
        requestBody.systemInstruction = {
          role: 'system',
          parts: [{ text: system }]
        };
      }

      console.log(`🤖 Gemini Request - Model: ${model}, Prompt length: ${prompt.length}`);

      // Realizar el request a la API de Gemini
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('❌ Gemini API Error:', errorText);
        
        return res.status(geminiResponse.status).json({
          success: false,
          error: `Gemini API Error (${geminiResponse.status}): ${errorText}`,
          geminiStatus: geminiResponse.status
        });
      }

      const geminiData = await geminiResponse.json();

      // Extraer el texto de la respuesta
      const candidates = geminiData?.candidates || [];
      if (candidates.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'No se recibieron candidatos en la respuesta de Gemini',
          rawResponse: geminiData
        });
      }

      const parts = candidates[0]?.content?.parts || [];
      const text = parts.map(p => p?.text || '').join('\n').trim();

      if (!text) {
        return res.status(500).json({
          success: false,
          error: 'No se pudo extraer texto de la respuesta de Gemini',
          candidates
        });
      }

      console.log(`✅ Gemini Response - Length: ${text.length} characters`);

      // Respuesta exitosa
      res.json({
        success: true,
        data: {
          text,
          model,
          usage: geminiData?.usageMetadata || null,
          finishReason: candidates[0]?.finishReason || null
        },
        metadata: {
          requestId: req.headers['x-request-id'] || null,
          timestamp: new Date().toISOString(),
          model,
          promptLength: prompt.length,
          responseLength: text.length
        }
      });

    } catch (error) {
      console.error('❌ Error en Gemini Cloud Function:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Función para obtener el API key de Gemini desde Secret Manager
async function getGeminiApiKey() {
  try {
    // Verificar cache (deshabilitado temporalmente para debug)
    // const now = Date.now();
    // if (cachedApiKey && now < cacheExpiration) {
    //   return cachedApiKey;
    // }

    const secretName = `projects/${PROJECT_ID}/secrets/${GEMINI_API_KEY_SECRET}/versions/latest`;
    
    console.log(`🔍 Intentando acceder al secret: ${secretName}`);
    const [version] = await secretClient.accessSecretVersion({ name: secretName });
    const apiKey = version.payload.data.toString();

    console.log(`🔐 API key obtenido: ${apiKey.substring(0, 10)}...`);

    // Cache por 1 hora
    cachedApiKey = apiKey;
    cacheExpiration = Date.now() + (60 * 60 * 1000);

    console.log('🔐 API key de Gemini obtenido desde Secret Manager');
    return apiKey;

  } catch (error) {
    console.error('❌ Error obteniendo API key de Gemini:', error);
    
    if (error.code === 5) { // NOT_FOUND
      console.error('❌ Secret no encontrado. Asegúrate de que el secret "gemini-api-key" existe.');
    }
    
    return null;
  }
}

// Función para configurar el API key de Gemini (solo para admin)
functions.http('setGeminiApiKey', async (req, res) => {
  // Importar fetch dinámicamente
  const fetch = (await import('node-fetch')).default;
  
  corsHandler(req, res, async () => {
    try {
      const { method } = req;

      if (method !== 'POST') {
        return res.status(405).json({ 
          success: false, 
          error: 'Método no permitido' 
        });
      }

      const { apiKey, adminSecret } = req.body;

      // Verificación de seguridad básica (en producción usar autenticación más robusta)
      const expectedAdminSecret = process.env.ADMIN_SECRET || 'admin-secret-change-me';
      if (adminSecret !== expectedAdminSecret) {
        return res.status(403).json({ 
          success: false, 
          error: 'No autorizado' 
        });
      }

      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          error: 'API key es requerido' 
        });
      }

      await saveGeminiApiKey(apiKey);
      
      // Limpiar cache
      cachedApiKey = null;
      cacheExpiration = 0;

      res.json({ 
        success: true, 
        message: 'API key de Gemini guardado correctamente' 
      });

    } catch (error) {
      console.error('Error configurando API key de Gemini:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error guardando API key' 
      });
    }
  });
});

// Función para guardar el API key en Secret Manager
async function saveGeminiApiKey(apiKey) {
  const secretName = `projects/${PROJECT_ID}/secrets/${GEMINI_API_KEY_SECRET}`;
  
  try {
    // Intentar crear el secret si no existe
    try {
      await secretClient.createSecret({
        parent: `projects/${PROJECT_ID}`,
        secretId: GEMINI_API_KEY_SECRET,
        secret: {
          replication: {
            automatic: {}
          }
        }
      });
      console.log('🔐 Secret para Gemini API key creado');
    } catch (createError) {
      // Si ya existe, continúa
      if (createError.code !== 6) { // ALREADY_EXISTS
        throw createError;
      }
    }

    // Añadir nueva versión del secret
    await secretClient.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(apiKey)
      }
    });

    console.log('🔐 Nueva versión del API key de Gemini guardada');

  } catch (error) {
    console.error(`❌ Error guardando API key de Gemini:`, error);
    throw error;
  }
}

// Health check específico para Gemini
functions.http('geminiHealthCheck', async (req, res) => {
  // Importar fetch dinámicamente
  const fetch = (await import('node-fetch')).default;
  
  try {
    const apiKey = await getGeminiApiKey();
    const hasApiKey = !!apiKey;
    
    // Test básico con Gemini (solo si tenemos API key)
    let geminiWorking = false;
    if (hasApiKey) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
        const testResponse = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }]
          })
        });
        geminiWorking = testResponse.ok;
      } catch (testError) {
        console.error('Test de Gemini falló:', testError);
      }
    }

    res.json({ 
      success: true,
      message: 'Gemini Proxy funcionando',
      status: {
        hasApiKey,
        geminiWorking,
        cacheStatus: cachedApiKey ? 'cached' : 'not-cached',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error en health check de Gemini:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error en health check' 
    });
  }
});
