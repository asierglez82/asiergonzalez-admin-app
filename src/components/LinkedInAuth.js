import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { socialMediaCloudService } from '../services/socialMediaCloud';

const LinkedInAuth = ({ onAuthSuccess, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Configuración de LinkedIn OAuth
  const LINKEDIN_CLIENT_ID = '77nofg3l51f0kb';
  const REDIRECT_URI = 'http://localhost:8081/auth/linkedin/callback';
  const SCOPE = 'openid profile email w_member_social';
  const STATE = 'linkedin_auth_' + Date.now();

  const handleLinkedInAuth = async () => {
    setIsLoading(true);

    try {
      // Listener de fallback: si el popup carga el callback, enviará un postMessage con la URL
      const onLinkedInPopupMessage = (event) => {
        try {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS_URL' && typeof event.data.url === 'string') {
            console.log('✅ [FALLBACK] URL recibida vía postMessage:', event.data.url);
            const url = new URL(event.data.url);
            const params = new URLSearchParams(url.search);
            const code = params.get('code');
            const returnedState = params.get('state');
            if (returnedState === STATE && code) {
              window.removeEventListener('message', onLinkedInPopupMessage);
              onAuthSuccess?.(code);
            }
          }
        } catch (_) {}
      };
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('message', onLinkedInPopupMessage);
      }
      // (Un solo listener es suficiente: onLinkedInPopupMessage)

      // Construir la URL de autorización de LinkedIn
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `state=${STATE}&` +
        `scope=${encodeURIComponent(SCOPE)}`;

      console.log('🔗 URL de autorización:', authUrl);

      // Abrir sesión de auth con Expo Web Browser (web y nativo)
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (result.type === 'success' && result.url) {
        console.log('✅ [PASO 1] Ventana cerrada con éxito. URL recibida:', result.url);
        const url = new URL(result.url);
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
      } else if (result.type === 'cancel') {
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
