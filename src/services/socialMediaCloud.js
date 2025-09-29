// Servicio de redes sociales usando Google Cloud Functions y Secret Manager
import { useAuth } from '../context/AuthContext';

// URL de la Cloud Function (actualizar después del despliegue)
const CLOUD_FUNCTION_URL = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || 'https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/socialCredentials';

export const socialMediaCloudService = {
  
  // Obtener ID del usuario actual
  getCurrentUserId() {
    // En una implementación real, obtendrías esto del contexto de autenticación
    // Por ahora usamos un ID fijo o del localStorage para demo
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedUser = window.localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.uid) return parsed.uid;
        }
      }
    } catch (_) {}
    return 'demo-user';
  },

  // Realizar request a la Cloud Function
  async makeCloudRequest(method, endpoint = '', body = null) {
    try {
      const url = `${CLOUD_FUNCTION_URL}${endpoint}`;
      console.log('[socialMediaCloud] ▶️ Request', { method, url, hasBody: !!body, action: body?.action, platform: body?.platform });
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (body) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      console.log('[socialMediaCloud] ◀️ Response', { status: response.status, statusText: response.statusText });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en Cloud Request:', error);
      throw error;
    }
  },

  // Obtener credenciales de todas las redes sociales
  async getAllCredentials() {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('GET', `?userId=${userId}`);
      
      if (response.success) {
        return response.credentials;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error getting all credentials from cloud:', error);
      // Fallback a valores por defecto si falla la conexión
      return {
        instagram: { connected: false },
        twitter: { connected: false },
        linkedin: { connected: false }
      };
    }
  },

  // Instagram
  async getInstagramCredentials() {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('GET', `?userId=${userId}&platform=instagram`);
      
      return response.success ? response.credentials : { connected: false };
    } catch (error) {
      console.error('Error getting Instagram credentials from cloud:', error);
      return { connected: false };
    }
  },

  async saveInstagramCredentials(credentials) {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('POST', '', {
        userId,
        platform: 'instagram',
        credentials
      });
      
      return { success: response.success, message: response.message };
    } catch (error) {
      console.error('Error saving Instagram credentials to cloud:', error);
      return { success: false, error: error.message };
    }
  },

  // Twitter/X
  async getTwitterCredentials() {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('GET', `?userId=${userId}&platform=twitter`);
      
      return response.success ? response.credentials : { connected: false };
    } catch (error) {
      console.error('Error getting Twitter credentials from cloud:', error);
      return { connected: false };
    }
  },

  async saveTwitterCredentials(credentials) {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('POST', '', {
        userId,
        platform: 'twitter',
        credentials
      });
      
      return { success: response.success, message: response.message };
    } catch (error) {
      console.error('Error saving Twitter credentials to cloud:', error);
      return { success: false, error: error.message };
    }
  },

  // LinkedIn
  async getLinkedInCredentials() {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('GET', `?userId=${userId}&platform=linkedin`);
      
      return response.success ? response.credentials : { connected: false };
    } catch (error) {
      console.error('Error getting LinkedIn credentials from cloud:', error);
      return { connected: false };
    }
  },

  async saveLinkedInCredentials(credentials) {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('POST', '', {
        userId,
        platform: 'linkedin',
        credentials
      });
      
      return { success: response.success, message: response.message };
    } catch (error) {
      console.error('Error saving LinkedIn credentials to cloud:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar credenciales
  async deleteCredentials(platform) {
    try {
      const userId = this.getCurrentUserId();
      const response = await this.makeCloudRequest('DELETE', '', {
        userId,
        platform
      });
      
      return { success: response.success, message: response.message };
    } catch (error) {
      console.error(`Error deleting ${platform} credentials from cloud:`, error);
      return { success: false, error: error.message };
    }
  },

  // Publicación en redes sociales (usando credenciales de la nube)
  async publishToInstagram(content, imageUrl = null) {
    try {
      const credentials = await this.getInstagramCredentials();
      
      if (!credentials.connected || !credentials.accessToken) {
        throw new Error('Instagram no está conectado');
      }

      // Aquí iría la lógica real para publicar en Instagram usando las credenciales de la nube
      console.log('Publishing to Instagram with cloud credentials:', { content, imageUrl });
      
      // Simulación de llamada a la API de Instagram
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { 
        success: true, 
        platform: 'instagram',
        message: 'Publicado correctamente en Instagram (usando credenciales de la nube)'
      };
    } catch (error) {
      console.error('Error publishing to Instagram:', error);
      return { 
        success: false, 
        platform: 'instagram',
        error: error.message 
      };
    }
  },

  async publishToTwitter(content) {
    try {
      const credentials = await this.getTwitterCredentials();
      
      if (!credentials.connected || (!credentials.bearerToken && !credentials.accessToken)) {
        throw new Error('Twitter no está conectado');
      }

      // Aquí iría la lógica real para publicar en Twitter/X
      console.log('Publishing to Twitter with cloud credentials:', { content });
      
      // Simulación de llamada a la API de Twitter
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { 
        success: true, 
        platform: 'twitter',
        message: 'Publicado correctamente en Twitter (usando credenciales de la nube)'
      };
    } catch (error) {
      console.error('Error publishing to Twitter:', error);
      return { 
        success: false, 
        platform: 'twitter',
        error: error.message 
      };
    }
  },

  async publishToLinkedIn(content, imageUrl = null) {
    try {
      const credentials = await this.getLinkedInCredentials();
      
      if (!credentials.connected || !credentials.accessToken) {
        throw new Error('LinkedIn no está conectado');
      }

      // Aquí iría la lógica real para publicar en LinkedIn
      console.log('Publishing to LinkedIn with cloud credentials:', { content, imageUrl });
      
      // Simulación de llamada a la API de LinkedIn
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      return { 
        success: true, 
        platform: 'linkedin',
        message: 'Publicado correctamente en LinkedIn (usando credenciales de la nube)'
      };
    } catch (error) {
      console.error('Error publishing to LinkedIn:', error);
      return { 
        success: false, 
        platform: 'linkedin',
        error: error.message 
      };
    }
  },

  // Publicar en múltiples plataformas
  async publishToMultiplePlatforms(platformsContent, imageUrl = null) {
    try {
      const results = [];
      
      // Publicar en Instagram si está configurado
      if (platformsContent.instagram) {
        const result = await this.publishToInstagram(platformsContent.instagram, imageUrl);
        results.push(result);
      }
      
      // Publicar en Twitter si está configurado
      if (platformsContent.twitter) {
        const result = await this.publishToTwitter(platformsContent.twitter);
        results.push(result);
      }
      
      // Publicar en LinkedIn si está configurado
      if (platformsContent.linkedin) {
        const result = await this.publishToLinkedIn(platformsContent.linkedin, imageUrl);
        results.push(result);
      }
      
      // Verificar si hay al menos una publicación exitosa
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      return {
        success: successCount > 0,
        results,
        summary: {
          successful: successCount,
          total: totalCount,
          failed: totalCount - successCount
        }
      };
    } catch (error) {
      console.error('Error publishing to multiple platforms:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  },

  // Verificar conexiones activas
  async getConnectedPlatforms() {
    try {
      const credentials = await this.getAllCredentials();
      
      return {
        instagram: credentials.instagram?.connected || false,
        twitter: credentials.twitter?.connected || false,
        linkedin: credentials.linkedin?.connected || false
      };
    } catch (error) {
      console.error('Error getting connected platforms from cloud:', error);
      return {
        instagram: false,
        twitter: false,
        linkedin: false
      };
    }
  },

  // Limpiar todas las credenciales en la nube
  async clearAllCredentials() {
    try {
      const platforms = ['instagram', 'twitter', 'linkedin'];
      const results = await Promise.allSettled(
        platforms.map(platform => this.deleteCredentials(platform))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      
      return { 
        success: successful > 0,
        message: `${successful} de ${platforms.length} plataformas desconectadas`
      };
    } catch (error) {
      console.error('Error clearing all credentials from cloud:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar salud de la Cloud Function
  async checkCloudFunctionHealth() {
    try {
      const response = await fetch(`${CLOUD_FUNCTION_URL.replace('social-credentials', 'healthCheck')}`);
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Cloud Function health check failed:', error);
      return false;
    }
  },

  // Probar conexión a una plataforma específica
  async testConnection(platform) {
    try {
      const userId = this.getCurrentUserId();
      console.log('[socialMediaCloud] 🧪 testConnection', { platform, userId });
      const response = await this.makeCloudRequest('POST', '', {
        userId,
        platform,
        action: 'test'
      });
      
      return response;
    } catch (error) {
      console.error(`Error testing ${platform} connection:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
