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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

const corsHandler = cors(corsOptions);

// Cliente de Secret Manager
const secretClient = new SecretManagerServiceClient();

// ID del proyecto de Google Cloud
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'asiergonzalez-web-app';

// Función principal
functions.http('socialCredentials', async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { method } = req;
      // Priorizar query en GET y body en el resto de métodos
      const source = method === 'GET' ? (req.query || {}) : (req.body || {});
      const { userId, platform, action } = source;
      console.log('[CF] ➡️ Incoming request', { method, userId, platform, action, hasBody: !!req.body });

      // Validación básica
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID es requerido' 
        });
      }

      // Validar plataformas soportadas
      const supportedPlatforms = ['instagram', 'twitter', 'linkedin'];
      if (platform && !supportedPlatforms.includes(platform)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Plataforma no soportada' 
        });
      }

      switch (method) {
        case 'GET':
          await handleGetCredentials(req, res, userId, platform);
          break;
        case 'POST':
          await handleSaveCredentials(req, res, userId, platform);
          break;
        case 'DELETE':
          await handleDeleteCredentials(req, res, userId, platform);
          break;
        default:
          res.status(405).json({ 
            success: false, 
            error: 'Método no permitido' 
          });
      }
    } catch (error) {
      console.error('Error en Cloud Function:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// Obtener credenciales
async function handleGetCredentials(req, res, userId, platform) {
  try {
    console.log('[CF] 🔐 handleGetCredentials', { userId, platform });
    if (platform) {
      // Obtener credenciales de una plataforma específica
      const credentials = await getSecretCredentials(userId, platform);
      console.log('[CF] 🔐 credentials loaded (single)', { platform, userId, hasAccessToken: !!credentials?.accessToken });
      res.json({ 
        success: true, 
        platform,
        credentials: credentials || { connected: false }
      });
    } else {
      // Obtener credenciales de todas las plataformas
      const [instagram, twitter, linkedin] = await Promise.allSettled([
        getSecretCredentials(userId, 'instagram'),
        getSecretCredentials(userId, 'twitter'),
        getSecretCredentials(userId, 'linkedin')
      ]);
      console.log('[CF] 🔐 credentials loaded (all)', {
        userId,
        instagram: instagram.status === 'fulfilled' && !!instagram.value?.accessToken,
        twitter: twitter.status === 'fulfilled' && !!twitter.value?.bearerToken,
        linkedin: linkedin.status === 'fulfilled' && !!linkedin.value?.accessToken,
      });

      res.json({ 
        success: true, 
        credentials: {
          instagram: instagram.status === 'fulfilled' ? instagram.value : { connected: false },
          twitter: twitter.status === 'fulfilled' ? twitter.value : { connected: false },
          linkedin: linkedin.status === 'fulfilled' ? linkedin.value : { connected: false }
        }
      });
    }
  } catch (error) {
    console.error('Error obteniendo credenciales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo credenciales' 
    });
  }
}

// Guardar credenciales
async function handleSaveCredentials(req, res, userId, platform) {
  try {
    const { credentials, action } = req.body;
    console.log('[CF] 💾 handleSaveCredentials', { userId, platform, action, hasCredentials: !!credentials });
    
    // Si es una acción de prueba, no necesitamos credenciales
    if (action === 'test') {
      const testResult = await testPlatformConnection(platform, userId);
      console.log('[CF] 🧪 testPlatformConnection result', testResult);
      return res.json(testResult);
    }
    
    // Si es intercambio de token de LinkedIn
    if (action === 'exchange_token' && platform === 'linkedin') {
      const { code, redirectUri } = req.body;
      console.log('[CF] 🔄 exchange_token', { userId, platform, hasCode: !!code, redirectUri });
      const tokenResult = await exchangeLinkedInToken(code, redirectUri, userId);
      console.log('[CF] 🔄 exchange_token result', { success: tokenResult?.success, hasProfile: !!tokenResult?.credentials?.profile });
      return res.json(tokenResult);
    }
    
    if (!credentials) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenciales son requeridas' 
      });
    }

    await saveSecretCredentials(userId, platform, credentials);
    
    res.json({ 
      success: true, 
      message: `Credenciales de ${platform} guardadas correctamente`,
      platform
    });
  } catch (error) {
    console.error('Error guardando credenciales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error guardando credenciales' 
    });
  }
}

// Eliminar credenciales
async function handleDeleteCredentials(req, res, userId, platform) {
  try {
    await deleteSecretCredentials(userId, platform);
    
    res.json({ 
      success: true, 
      message: `Credenciales de ${platform} eliminadas correctamente`,
      platform
    });
  } catch (error) {
    console.error('Error eliminando credenciales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error eliminando credenciales' 
    });
  }
}

// Funciones auxiliares para Secret Manager
async function getSecretCredentials(userId, platform) {
  const secretName = `projects/${PROJECT_ID}/secrets/social-${userId}-${platform}/versions/latest`;
  
  try {
    console.log('[CF] 🔎 accessSecretVersion', { secretName });
    const [version] = await secretClient.accessSecretVersion({ name: secretName });
    const credentialsData = version.payload.data.toString();
    const json = JSON.parse(credentialsData);
    console.log('[CF] 🔎 secret loaded', { platform, hasAccessToken: !!json?.accessToken, connected: json?.connected });
    return json;
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      return { connected: false };
    }
    throw error;
  }
}

async function saveSecretCredentials(userId, platform, credentials) {
  const secretId = `social-${userId}-${platform}`;
  const secretName = `projects/${PROJECT_ID}/secrets/${secretId}`;
  
  try {
    // Intentar crear el secret si no existe
    try {
      await secretClient.createSecret({
        parent: `projects/${PROJECT_ID}`,
        secretId: secretId,
        secret: {
          replication: {
            automatic: {}
          }
        }
      });
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
        data: Buffer.from(JSON.stringify(credentials))
      }
    });
  } catch (error) {
    console.error(`Error guardando secret ${secretId}:`, error);
    throw error;
  }
}

async function deleteSecretCredentials(userId, platform) {
  const secretId = `social-${userId}-${platform}`;
  const secretName = `projects/${PROJECT_ID}/secrets/${secretId}`;
  
  try {
    await secretClient.deleteSecret({ name: secretName });
  } catch (error) {
    if (error.code !== 5) { // NOT_FOUND
      throw error;
    }
    // Si no existe, no hay problema
  }
}

// Función para probar la conexión a una plataforma
async function testPlatformConnection(platform, userId) {
  try {
    // Obtener las credenciales almacenadas
    const credentials = await getSecretCredentials(userId, platform);
    
    if (!credentials) {
      return {
        success: false,
        error: `No se encontraron credenciales para ${platform}`,
        platform
      };
    }

    // Probar la conexión según la plataforma
    switch (platform) {
      case 'linkedin':
        return await testLinkedInConnection(credentials);
      case 'instagram':
        return await testInstagramConnection(credentials);
      case 'twitter':
        return await testTwitterConnection(credentials);
      default:
        return {
          success: false,
          error: `Plataforma ${platform} no soportada para pruebas`,
          platform
        };
    }
  } catch (error) {
    console.error(`Error testing ${platform} connection:`, error);
    return {
      success: false,
      error: `Error probando conexión a ${platform}: ${error.message}`,
      platform
    };
  }
}

// Función específica para probar LinkedIn
async function testLinkedInConnection(credentials) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Probar con la API OIDC userinfo (compatible con scopes openid/profile/email)
    const url = 'https://api.linkedin.com/v2/userinfo';
    console.log('[CF] 🌐 testLinkedInConnection calling (userinfo)', { url, hasAccessToken: !!credentials?.accessToken });
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken || 'test'}`,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    console.log('[CF] 🌐 LinkedIn response (userinfo)', { status: response.status, body: text?.slice(0, 300) });

    if (response.ok) {
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}
      const memberId = data?.sub;
      return {
        success: true,
        message: 'Conexión a LinkedIn verificada correctamente',
        platform: 'linkedin',
        memberId
      };
    } else {
      return {
        success: false,
        error: `LinkedIn API respondió con código ${response.status}`,
        platform: 'linkedin'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error conectando a LinkedIn: ${error.message}`,
      platform: 'linkedin'
    };
  }
}

// Función específica para probar Instagram
async function testInstagramConnection(credentials) {
  // Por ahora, solo verificamos que tengamos las credenciales básicas
  if (credentials.clientId && credentials.clientSecret) {
    return {
      success: true,
      message: 'Credenciales de Instagram configuradas correctamente',
      platform: 'instagram'
    };
  } else {
    return {
      success: false,
      error: 'Credenciales de Instagram incompletas',
      platform: 'instagram'
    };
  }
}

// Función específica para probar Twitter
async function testTwitterConnection(credentials) {
  // Por ahora, solo verificamos que tengamos las credenciales básicas
  if (credentials.apiKey && credentials.apiSecret) {
    return {
      success: true,
      message: 'Credenciales de Twitter configuradas correctamente',
      platform: 'twitter'
    };
  } else {
    return {
      success: false,
      error: 'Credenciales de Twitter incompletas',
      platform: 'twitter'
    };
  }
}

// Función para intercambiar código de autorización por access token de LinkedIn
async function exchangeLinkedInToken(code, redirectUri, userId) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Obtener las credenciales de LinkedIn
    let clientId = await getSecretValue('linkedin-client-id');
    let clientSecret = await getSecretValue('linkedin-client-secret');

    // Normalizar posibles comillas/saltos de línea en secretos
    clientId = sanitizeSecretValue(clientId);
    clientSecret = sanitizeSecretValue(clientSecret);
    // Refuerzo: eliminar TODOS los espacios y saltos en clientId (solo debe ser alfanumérico)
    if (typeof clientId === 'string') {
      clientId = clientId.replace(/[\r\n]/g, '').replace(/\s+/g, '');
    }
    
    if (!clientId || !clientSecret) {
      throw new Error('Credenciales de LinkedIn no configuradas');
    }

    // Logs detallados (incluye valores reales para depuración)
    try {
      console.log('[CF] 🔎 linkedin creds format', {
        clientId,
        clientSecret,
        clientIdLength: clientId ? clientId.length : 0,
        clientSecretLength: clientSecret ? clientSecret.length : 0,
        clientIdHasWhitespace: /\s/.test(clientId || ''),
        clientSecretHasWhitespace: /\s/.test(clientSecret || ''),
        redirectUri,
        codeSample: (code || '').slice(0, 12) + '...'
      });
    } catch (_) {}

    // Intercambiar código por token
    const formBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });
    const formBodyString = formBody.toString();
    console.log('[CF] 📦 token request body', formBodyString);
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`LinkedIn token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Obtener información del usuario con OIDC (userinfo)
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    let profileData = null;
    if (profileResponse.ok) {
      profileData = await profileResponse.json();
    }

    // Guardar las credenciales completas
    const credentials = {
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      connected: true,
      profile: profileData,
      memberId: profileData?.sub,
      personUrn: profileData?.sub ? `urn:li:person:${profileData.sub}` : undefined,
      connectedAt: new Date().toISOString()
    };

    await saveSecretCredentials(userId, 'linkedin', credentials);

    return {
      success: true,
      message: 'LinkedIn autorizado correctamente',
      platform: 'linkedin',
      credentials: {
        accessToken: tokenData.access_token,
        profile: profileData
      },
      debug: {
        clientId,
        clientSecret,
        redirectUri,
        requestBody: formBodyString
      }
    };

  } catch (error) {
    console.error('Error exchanging LinkedIn token:', error);
    return {
      success: false,
      error: `Error autorizando LinkedIn: ${error.message}`,
      platform: 'linkedin',
      debug: {
        note: 'debug on error',
        redirectUri,
        // Estos campos pueden ser null si el fallo es previo
        // Los exponemos temporalmente a petición del usuario
        clientId: typeof clientId !== 'undefined' ? clientId : null,
        clientSecret: typeof clientSecret !== 'undefined' ? clientSecret : null
      }
    };
  }
}

// Función auxiliar para obtener valores de secretos
async function getSecretValue(secretId) {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/${secretId}/versions/latest`,
    });
    // Trim para evitar espacios/saltos de línea que rompen OAuth (e.g. "...\n")
    return version.payload.data.toString().trim();
  } catch (error) {
    console.error(`Error getting secret ${secretId}:`, error);
    return null;
  }
}

function sanitizeSecretValue(value) {
  if (typeof value !== 'string') return value;
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

// Función para verificar la salud del servicio
functions.http('healthCheck', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Social Credentials Manager funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
