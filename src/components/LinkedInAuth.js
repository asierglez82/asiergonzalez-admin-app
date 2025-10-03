import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { socialMediaCloudService } from '../services/socialMediaCloud';

const LinkedInAuth = ({ onAuthSuccess, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Configuración de LinkedIn OAuth
  const LINKEDIN_CLIENT_ID = '77nofg3l51f0kb';
  const REDIRECT_URI = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/linkedin/callback/`
    : 'http://localhost:8081/auth/linkedin/callback/';
  const SCOPE = 'openid profile email w_member_social';
  const STATE = 'linkedin_auth_' + Date.now();

  const handleLinkedInAuth = async () => {
    setIsLoading(true);

    try {
      // Construir la URL de autorización de LinkedIn
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `state=${STATE}&` +
        `scope=${encodeURIComponent(SCOPE)}`;

      console.log('🔗 URL de autorización:', authUrl);

      // Flujo específico para Web: escuchar manualmente el postMessage del callback
      if (Platform.OS === 'web') {
        console.log('🌐 Usando flujo web con postMessage');
        const codeFromMessage = await new Promise(async (resolve, reject) => {
          let timeoutId;
          const onMessage = (event) => {
            try {
              const data = event?.data || {};
              console.log('📨 Mensaje recibido:', data);
              if (data?.type === 'expo-web-browser' && typeof data?.url === 'string') {
                console.log('🔍 Verificando URL:', data.url);
                console.log('🔍 REDIRECT_URI esperada:', REDIRECT_URI);
                console.log('🔍 ¿Coincide?', data.url.startsWith(REDIRECT_URI));
                
                if (data.url.startsWith(REDIRECT_URI)) {
                  console.log('✅ URL coincide, extrayendo código...');
                  window.removeEventListener('message', onMessage);
                  clearTimeout(timeoutId);
                  const url = new URL(data.url);
                  const code = url.searchParams.get('code');
                  console.log('🔑 Código extraído:', code ? code.substring(0, 15) + '...' : 'NO ENCONTRADO');
                  resolve(code);
                } else if (data.url.includes('/auth/linkedin/callback') && data.url.includes('code=')) {
                  console.log('✅ URL contiene callback y código, extrayendo...');
                  window.removeEventListener('message', onMessage);
                  clearTimeout(timeoutId);
                  const url = new URL(data.url);
                  const code = url.searchParams.get('code');
                  console.log('🔑 Código extraído (alternativo):', code ? code.substring(0, 15) + '...' : 'NO ENCONTRADO');
                  resolve(code);
                } else {
                  console.log('❌ URL no coincide con redirect URI esperado');
                }
              } else {
                console.log('❌ Mensaje no válido o no es de expo-web-browser');
              }
            } catch (error) {
              console.error('❌ Error procesando mensaje:', error);
            }
          };
          window.addEventListener('message', onMessage);
          // Abrir en una nueva pestaña/ventana
          await WebBrowser.openBrowserAsync(authUrl);
          // Timeout de seguridad
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', onMessage);
            reject(new Error('Timeout esperando respuesta de LinkedIn'));
          }, 120000);
        });

        if (codeFromMessage) {
          console.log('✅ [PASO 2] Código de autorización extraído:', (codeFromMessage || '').substring(0, 15) + '...');
          onAuthSuccess?.(codeFromMessage);
          return;
        }
      }

      // Flujo estándar (nativo y fallback web)
      console.log('🔄 Abriendo sesión de autorización...');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      console.log('ℹ️ openAuthSessionAsync result:', result);

      if (result.type === 'success' && result.url) {
        console.log('✅ [PASO 1] Ventana cerrada con éxito. URL recibida:', result.url);
        const url = new URL(result.url);
        
        // Verificamos que la URL recibida sea la correcta
        if (!url.pathname.startsWith('/auth/linkedin/callback')) {
          throw new Error(`La redirección no fue a la URL de callback esperada. Recibido: ${url.pathname}`);
        }
        
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const returnedState = params.get('state');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        console.log('🔍 Parámetros recibidos:', { code: code ? 'presente' : 'ausente', state: returnedState, error, errorDescription });

        if (error) {
          throw new Error(`Error de LinkedIn: ${error} - ${errorDescription || 'Sin descripción'}`);
        }

        if (returnedState !== STATE) {
          throw new Error(`El parámetro STATE no coincide. Esperado: ${STATE}, Recibido: ${returnedState}`);
        }

        if (code) {
          console.log('✅ [PASO 2] Código de autorización extraído:', (code || '').substring(0, 15) + '...');
          onAuthSuccess?.(code);
        } else {
          throw new Error('No se recibió el código de autorización de LinkedIn');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('👋 Autorización cancelada por el usuario');
        throw new Error('Autorización cancelada por el usuario');
      } else {
        console.log('❌ Resultado inesperado:', result);
        throw new Error(`Resultado inesperado de la autorización: ${result.type}`);
      }

    } catch (error) {
      console.error('❌ Error en autorización de LinkedIn:', error);
      Alert.alert('Error', `Error en la autorización: ${error.message}`);
      onAuthError?.(error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLinkedInAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="logo-linkedin" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.buttonText}>
          {isLoading ? 'Autorizando...' : 'Autorizar con LinkedIn'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#0077B5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LinkedInAuth;
