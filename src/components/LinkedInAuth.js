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
        const codeFromMessage = await new Promise(async (resolve, reject) => {
          let timeoutId;
          const onMessage = (event) => {
            try {
              const data = event?.data || {};
              if (data?.type === 'expo-web-browser' && typeof data?.url === 'string') {
                if (data.url.startsWith(REDIRECT_URI)) {
                  window.removeEventListener('message', onMessage);
                  clearTimeout(timeoutId);
                  resolve(new URL(data.url).searchParams.get('code'));
                }
              }
            } catch (_) {}
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
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      console.log('ℹ️ openAuthSessionAsync result.type:', result?.type);

      if (result.type === 'success' && result.url) {
        console.log('✅ [PASO 1] Ventana cerrada con éxito. URL recibida:', result.url);
        const url = new URL(result.url);
        // Verificamos que la URL recibida sea la correcta, aunque el cierre se haya activado antes
        if (!url.pathname.startsWith('/auth/linkedin/callback')) {
          throw new Error('La redirección no fue a la URL de callback esperada.');
        }
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const returnedState = params.get('state');

        if (returnedState !== STATE) {
          throw new Error('El parámetro STATE no coincide');
        }

        if (code) {
          console.log('✅ [PASO 2] Código de autorización extraído:', (code || '').substring(0, 15) + '...');
          onAuthSuccess?.(code);
        } else {
          const errorDescription = params.get('error_description') || 'No se recibió el código de autorización.';
          throw new Error(errorDescription);
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('👋 Autorización cancelada por el usuario');
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
