import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const InstagramAuth = ({ onAuthSuccess, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Configuración de Instagram Basic Display OAuth
  const INSTAGRAM_APP_ID = 'YOUR_INSTAGRAM_APP_ID';
  const REDIRECT_URI = 'http://localhost:8081/auth/instagram/callback/';
  const SCOPE = 'user_profile,user_media';
  const STATE = 'instagram_auth_' + Date.now();

  const handleInstagramAuth = async () => {
    setIsLoading(true);
    try {
      const authUrl = `https://api.instagram.com/oauth/authorize?` +
        `client_id=${INSTAGRAM_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(SCOPE)}&` +
        `response_type=code&` +
        `state=${STATE}`;

      console.log('🔗 [Instagram] URL de autorización:', authUrl);

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
          await WebBrowser.openBrowserAsync(authUrl);
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', onMessage);
            reject(new Error('Timeout esperando respuesta de Instagram'));
          }, 120000);
        });

        if (codeFromMessage) {
          console.log('✅ [Instagram] Código de autorización extraído:', (codeFromMessage || '').substring(0, 15) + '...');
          onAuthSuccess?.(codeFromMessage);
          return;
        }
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      console.log('ℹ️ [Instagram] openAuthSessionAsync result.type:', result?.type);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        if (!url.pathname.startsWith('/auth/instagram/callback')) {
          throw new Error('La redirección no fue a la URL de callback esperada.');
        }
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const returnedState = params.get('state');
        if (returnedState !== STATE) {
          throw new Error('El parámetro STATE no coincide');
        }
        if (code) {
          console.log('✅ [Instagram] Código de autorización extraído:', (code || '').substring(0, 15) + '...');
          onAuthSuccess?.(code);
        } else {
          const errorDescription = params.get('error_description') || 'No se recibió el código de autorización.';
          throw new Error(errorDescription);
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('👋 [Instagram] Autorización cancelada por el usuario');
      }
    } catch (error) {
      console.error('❌ Error en autorización de Instagram:', error);
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
        onPress={handleInstagramAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.buttonText}>
          {isLoading ? 'Autorizando...' : 'Autorizar con Instagram'}
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
    backgroundColor: '#C13584',
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

export default InstagramAuth;


