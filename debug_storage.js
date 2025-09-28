// Script para debuggear el almacenamiento AsyncStorage
// Ejecutar en una consola de React Native para ver las claves guardadas

import AsyncStorage from '@react-native-async-storage/async-storage';

const debugStorage = async () => {
  try {
    console.log('\n🔍 DEPURACIÓN DEL ALMACENAMIENTO\n');
    
    // Obtener todas las claves almacenadas
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 Todas las claves:', allKeys);
    
    // Verificar claves específicas de redes sociales
    const socialKeys = ['instagram_credentials', 'twitter_credentials', 'linkedin_credentials'];
    
    for (const key of socialKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`\n🔑 ${key}:`);
      if (value) {
        const parsed = JSON.parse(value);
        // Ocultar tokens sensibles para seguridad
        const sanitized = { ...parsed };
        if (sanitized.accessToken) sanitized.accessToken = '***HIDDEN***';
        if (sanitized.bearerToken) sanitized.bearerToken = '***HIDDEN***';
        if (sanitized.apiSecret) sanitized.apiSecret = '***HIDDEN***';
        if (sanitized.accessTokenSecret) sanitized.accessTokenSecret = '***HIDDEN***';
        
        console.log(JSON.stringify(sanitized, null, 2));
      } else {
        console.log('❌ No hay datos guardados');
      }
    }
    
  } catch (error) {
    console.error('❌ Error accediendo al storage:', error);
  }
};

// Para limpiar todas las credenciales (útil para testing)
const clearAllCredentials = async () => {
  try {
    await AsyncStorage.multiRemove(['instagram_credentials', 'twitter_credentials', 'linkedin_credentials']);
    console.log('✅ Todas las credenciales eliminadas');
  } catch (error) {
    console.error('❌ Error eliminando credenciales:', error);
  }
};

// Exportar funciones para usar en desarrollo
export { debugStorage, clearAllCredentials };
