const functions = require('firebase-functions');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const cors = require('cors');

// Configurar CORS
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

// Configurar cliente de Secret Manager
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'asiergonzalez-web-app';
const client = new SecretManagerServiceClient();

// Cache para la API key
let cachedApiKey = null;
let cacheExpiration = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función para obtener la API key de Gemini
async function getGeminiApiKey() {
  try {
    // Verificar cache (deshabilitado temporalmente para debug)
    // const now = Date.now();
    // if (cachedApiKey && now < cacheExpiration) {
    //   return cachedApiKey;
    // }

    const [version] = await client.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/gemini-api-key/versions/latest`,
    });

    const apiKey = version.payload.data.toString();
    
    // Actualizar cache
    cachedApiKey = apiKey;
    cacheExpiration = Date.now() + CACHE_DURATION;
    
    return apiKey;
  } catch (error) {
    console.error('Error obteniendo API key de Gemini:', error);
    return null;
  }
}

// Función para verificar si Gemini está funcionando
async function testGeminiConnection(apiKey) {
  try {
    const fetch = require('node-fetch').default;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Responde solo 'OK' si puedes leer este mensaje."
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.candidates && result.candidates.length > 0;
  } catch (error) {
    console.error('Error probando conexión con Gemini:', error);
    return false;
  }
}

// Cloud Function para health check
exports.geminiHealthCheck = functions
  .region('europe-west1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https
  .onRequest(async (req, res) => {
    // Manejar CORS
    corsHandler(req, res, async () => {
      try {
        console.log('🔍 Iniciando health check de Gemini...');
        
        // Obtener API key
        const apiKey = await getGeminiApiKey();
        const hasApiKey = !!apiKey;
        
        let geminiWorking = false;
        let cacheStatus = 'unknown';
        
        if (hasApiKey) {
          // Probar conexión con Gemini
          geminiWorking = await testGeminiConnection(apiKey);
          cacheStatus = cachedApiKey ? 'cached' : 'fresh';
        }
        
        const status = {
          success: true,
          status: {
            hasApiKey,
            geminiWorking,
            cacheStatus,
            timestamp: new Date().toISOString(),
            projectId: PROJECT_ID
          }
        };
        
        console.log('✅ Health check completado:', status);
        
        res.status(200).json(status);
        
      } catch (error) {
        console.error('❌ Error en health check:', error);
        
        res.status(500).json({
          success: false,
          error: error.message,
          status: {
            hasApiKey: false,
            geminiWorking: false,
            cacheStatus: 'error',
            timestamp: new Date().toISOString()
          }
        });
      }
    });
  });
