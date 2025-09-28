// Configuración para alternar entre almacenamiento local y cloud
import { socialMediaService } from '../services/socialMedia';
import { socialMediaCloudService } from '../services/socialMediaCloud';

// Configuración del servicio a usar
const USE_CLOUD_STORAGE = process.env.EXPO_PUBLIC_USE_CLOUD_STORAGE === 'true';

// Exportar el servicio según la configuración
export const activeSocialMediaService = USE_CLOUD_STORAGE 
  ? socialMediaCloudService 
  : socialMediaService;

// Configuración adicional
export const socialMediaConfig = {
  useCloudStorage: USE_CLOUD_STORAGE,
  cloudFunctionUrl: process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL,
  
  // Configuración de timeouts
  requestTimeout: 30000, // 30 segundos
  
  // Configuración de reintentos
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  
  // Debug
  enableDebugLogs: process.env.NODE_ENV === 'development',
  
  // Validación de credenciales
  validateCredentials: true,
  
  // Cache local (para reducir calls a la cloud function)
  enableLocalCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
};

// Función para alternar dinámicamente entre servicios
export const switchToCloudStorage = () => {
  console.log('🌥️ Cambiando a almacenamiento en la nube...');
  return socialMediaCloudService;
};

export const switchToLocalStorage = () => {
  console.log('💾 Cambiando a almacenamiento local...');
  return socialMediaService;
};

// Función para verificar disponibilidad del servicio cloud
export const checkCloudAvailability = async () => {
  if (!USE_CLOUD_STORAGE) return false;
  
  try {
    return await socialMediaCloudService.checkCloudFunctionHealth();
  } catch (error) {
    console.error('Cloud service no disponible:', error);
    return false;
  }
};

export default activeSocialMediaService;
