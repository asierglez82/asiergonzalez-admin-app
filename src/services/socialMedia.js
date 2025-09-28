import AsyncStorage from '@react-native-async-storage/async-storage';

export const socialMediaService = {
  
  // Obtener credenciales de todas las redes sociales
  async getAllCredentials() {
    try {
      const [instagram, twitter, linkedin] = await Promise.all([
        this.getInstagramCredentials(),
        this.getTwitterCredentials(),
        this.getLinkedInCredentials()
      ]);
      
      return {
        instagram,
        twitter,
        linkedin
      };
    } catch (error) {
      console.error('Error getting all social media credentials:', error);
      throw error;
    }
  },

  // Instagram
  async getInstagramCredentials() {
    try {
      const data = await AsyncStorage.getItem('instagram_credentials');
      if (data) {
        return JSON.parse(data);
      }
      return { connected: false };
    } catch (error) {
      console.error('Error getting Instagram credentials:', error);
      return { connected: false };
    }
  },

  async saveInstagramCredentials(credentials) {
    try {
      await AsyncStorage.setItem('instagram_credentials', JSON.stringify(credentials));
      return { success: true };
    } catch (error) {
      console.error('Error saving Instagram credentials:', error);
      return { success: false, error: error.message };
    }
  },

  // Twitter/X
  async getTwitterCredentials() {
    try {
      const data = await AsyncStorage.getItem('twitter_credentials');
      if (data) {
        return JSON.parse(data);
      }
      return { connected: false };
    } catch (error) {
      console.error('Error getting Twitter credentials:', error);
      return { connected: false };
    }
  },

  async saveTwitterCredentials(credentials) {
    try {
      await AsyncStorage.setItem('twitter_credentials', JSON.stringify(credentials));
      return { success: true };
    } catch (error) {
      console.error('Error saving Twitter credentials:', error);
      return { success: false, error: error.message };
    }
  },

  // LinkedIn
  async getLinkedInCredentials() {
    try {
      const data = await AsyncStorage.getItem('linkedin_credentials');
      if (data) {
        return JSON.parse(data);
      }
      return { connected: false };
    } catch (error) {
      console.error('Error getting LinkedIn credentials:', error);
      return { connected: false };
    }
  },

  async saveLinkedInCredentials(credentials) {
    try {
      await AsyncStorage.setItem('linkedin_credentials', JSON.stringify(credentials));
      return { success: true };
    } catch (error) {
      console.error('Error saving LinkedIn credentials:', error);
      return { success: false, error: error.message };
    }
  },

  // Publicación en redes sociales
  async publishToInstagram(content, imageUrl = null) {
    try {
      const credentials = await this.getInstagramCredentials();
      
      if (!credentials.connected || !credentials.accessToken) {
        throw new Error('Instagram no está conectado');
      }

      // Aquí iría la lógica real para publicar en Instagram
      // Por ahora simularemos la publicación
      console.log('Publishing to Instagram:', { content, imageUrl });
      
      // Simulación de llamada a la API de Instagram
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { 
        success: true, 
        platform: 'instagram',
        message: 'Publicado correctamente en Instagram'
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
      console.log('Publishing to Twitter:', { content });
      
      // Simulación de llamada a la API de Twitter
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { 
        success: true, 
        platform: 'twitter',
        message: 'Publicado correctamente en Twitter'
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
      console.log('Publishing to LinkedIn:', { content, imageUrl });
      
      // Simulación de llamada a la API de LinkedIn
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      return { 
        success: true, 
        platform: 'linkedin',
        message: 'Publicado correctamente en LinkedIn'
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
        instagram: credentials.instagram.connected || false,
        twitter: credentials.twitter.connected || false,
        linkedin: credentials.linkedin.connected || false
      };
    } catch (error) {
      console.error('Error getting connected platforms:', error);
      return {
        instagram: false,
        twitter: false,
        linkedin: false
      };
    }
  },

  // Limpiar todas las credenciales
  async clearAllCredentials() {
    try {
      await Promise.all([
        AsyncStorage.removeItem('instagram_credentials'),
        AsyncStorage.removeItem('twitter_credentials'),
        AsyncStorage.removeItem('linkedin_credentials')
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing all credentials:', error);
      return { success: false, error: error.message };
    }
  }
};
