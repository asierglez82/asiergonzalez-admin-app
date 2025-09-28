const functions = require('@google-cloud/functions-framework');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const cors = require('cors');

// Configurar CORS para permitir requests desde tu app
const corsOptions = {
  origin: ['http://localhost:3000', 'https://tu-dominio.com'], // Ajustar según tu app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

const corsHandler = cors(corsOptions);

// Cliente de Secret Manager
const secretClient = new SecretManagerServiceClient();

// ID del proyecto de Google Cloud
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'tu-project-id';

// Función principal
functions.http('socialCredentials', async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { method } = req;
      const { userId, platform, action } = req.body || req.query;

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
    if (platform) {
      // Obtener credenciales de una plataforma específica
      const credentials = await getSecretCredentials(userId, platform);
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
    const { credentials } = req.body;
    
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
    const [version] = await secretClient.accessSecretVersion({ name: secretName });
    const credentialsData = version.payload.data.toString();
    return JSON.parse(credentialsData);
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

// Función para verificar la salud del servicio
functions.http('healthCheck', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Social Credentials Manager funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
