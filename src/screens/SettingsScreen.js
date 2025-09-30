import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  Alert, 
  ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socialMediaService, { socialMediaConfig } from '../config/socialMediaConfig';
import { socialMediaCloudService } from '../services/socialMediaCloud';
import LinkedInAuth from '../components/LinkedInAuth';
import InstagramAuth from '../components/InstagramAuth';

const SettingsScreen = ({ navigation }) => {
  // Estados para Instagram
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  const [instagramUserId, setInstagramUserId] = useState('');
  
  // Estados para Twitter/X
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterBearerToken, setTwitterBearerToken] = useState('');
  const [twitterApiKey, setTwitterApiKey] = useState('');
  const [twitterApiSecret, setTwitterApiSecret] = useState('');
  const [twitterAccessToken, setTwitterAccessToken] = useState('');
  const [twitterAccessTokenSecret, setTwitterAccessTokenSecret] = useState('');
  
  // Estados para LinkedIn
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinAccessToken, setLinkedinAccessToken] = useState('');
  const [linkedinPersonId, setLinkedinPersonId] = useState('');
  
  // Estados de UI
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState('');

  useEffect(() => {
    loadSocialMediaCredentials();
    // Si venimos del callback en la misma pestaña, procesa parámetros
    try {
      // Intentar primero con search (?query)
      let urlParams = new URLSearchParams(window.location.search);
      let linkedinAuth = urlParams.get('linkedin_auth');
      let code = urlParams.get('code');
      let state = urlParams.get('state');

      // Si no vienen en search, intentar extraerlos del hash (#/ruta?query)
      if (!linkedinAuth || !code) {
        const hash = window.location.hash || '';
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          const query = hash.substring(qIndex + 1);
          const hashParams = new URLSearchParams(query);
          if (!linkedinAuth) linkedinAuth = hashParams.get('linkedin_auth');
          if (!code) code = hashParams.get('code');
          if (!state) state = hashParams.get('state');
        }
      }
      if (linkedinAuth === 'success' && code) {
        console.log('🔄 Procesando callback de LinkedIn en la misma pestaña (hash/search detectados)...');
        exchangeCodeForToken(code);
        // Limpia la URL
        window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash.split('?')[0] || ''));
      }
    } catch (_) {}
  }, []);

  // (El flujo de OAuth ahora se maneja dentro de LinkedInAuth usando expo-web-browser)

  // Intercambiar código por token
  const exchangeCodeForToken = async (code) => {
    try {
      console.log('🔄 [PASO 4] Llamando a la Cloud Function para intercambiar el token...');
      
      const response = await fetch('https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/socialCredentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: socialMediaCloudService.getCurrentUserId(),
          platform: 'linkedin',
          action: 'exchange_token',
          code: code,
          redirectUri: window.location.origin + '/auth/linkedin/callback/'
        })
      });

      const result = await response.json();
      console.log('✅ [PASO 5] Respuesta recibida de la Cloud Function:', result);

      if (result.success) {
        console.log('🎉 ¡ÉXITO TOTAL! Token obtenido y guardado.');
        setLinkedinConnected(true);
        if (result.credentials?.profile) {
          setLinkedinPersonId(String(result.credentials.profile.id || ''));
        }
        Alert.alert('Éxito', 'LinkedIn autorizado correctamente');
        
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error(result.error || 'Error obteniendo el token');
      }

    } catch (error) {
      console.error('❌ Error en el intercambio de código:', error);
      Alert.alert('Error', `Error obteniendo el token: ${error.message}`);
    }
  };

  // Intercambiar código por token (Instagram)
  const exchangeInstagramCodeForToken = async (code) => {
    try {
      console.log('🔄 [IG PASO 4] Llamando a la Cloud Function para intercambiar el token de Instagram...');
      const response = await fetch('https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/socialCredentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: socialMediaCloudService.getCurrentUserId(),
          platform: 'instagram',
          action: 'exchange_token',
          code: code,
          redirectUri: window.location.origin + '/auth/instagram/callback/'
        })
      });

      const result = await response.json();
      console.log('✅ [IG PASO 5] Respuesta recibida de la Cloud Function (Instagram):', result);

      if (result.success) {
        setInstagramConnected(true);
        if (result.credentials?.accessToken) {
          setInstagramAccessToken(String(result.credentials.accessToken));
        }
        if (result.credentials?.userId) {
          setInstagramUserId(String(result.credentials.userId));
        }
        Alert.alert('Éxito', 'Instagram autorizado correctamente');
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
      } else {
        throw new Error(result.error || 'Error obteniendo el token de Instagram');
      }
    } catch (error) {
      console.error('❌ Error en el intercambio de código (Instagram):', error);
      Alert.alert('Error', `Error obteniendo el token de Instagram: ${error.message}`);
    }
  };

  const loadSocialMediaCredentials = async () => {
    try {
      // Cargar credenciales de Instagram desde AsyncStorage
      const instagramData = await AsyncStorage.getItem('instagram_credentials');
      if (instagramData) {
        const { accessToken, userId, connected } = JSON.parse(instagramData);
        setInstagramAccessToken(accessToken || '');
        setInstagramUserId(userId || '');
        setInstagramConnected(connected || false);
      }

      // Cargar credenciales de Twitter desde AsyncStorage
      const twitterData = await AsyncStorage.getItem('twitter_credentials');
      if (twitterData) {
        const { 
          bearerToken, 
          apiKey, 
          apiSecret, 
          accessToken, 
          accessTokenSecret, 
          connected 
        } = JSON.parse(twitterData);
        setTwitterBearerToken(bearerToken || '');
        setTwitterApiKey(apiKey || '');
        setTwitterApiSecret(apiSecret || '');
        setTwitterAccessToken(accessToken || '');
        setTwitterAccessTokenSecret(accessTokenSecret || '');
        setTwitterConnected(connected || false);
      }

      // Cargar estado de LinkedIn desde Secret Manager (Cloud)
      console.log('🔍 Verificando estado de LinkedIn desde Secret Manager...');
      try {
        const linkedinCreds = await socialMediaCloudService.getLinkedInCredentials();
        console.log('LinkedIn credentials from cloud:', linkedinCreds);
        
        if (linkedinCreds?.connected && linkedinCreds?.accessToken) {
          setLinkedinConnected(true);
          setLinkedinAccessToken('***'); // No mostrar el token real por seguridad
          console.log('✅ LinkedIn conectado desde Secret Manager');
          
          // Sincronizar con AsyncStorage para mantener coherencia
          await AsyncStorage.setItem('linkedin_credentials', JSON.stringify({
            accessToken: linkedinCreds.accessToken,
            personId: linkedinCreds.personId || '',
            connected: true
          }));
        } else {
          // No está conectado en Secret Manager, verificar AsyncStorage como fallback
          const linkedinData = await AsyncStorage.getItem('linkedin_credentials');
          if (linkedinData) {
            const { accessToken, personId, connected } = JSON.parse(linkedinData);
            setLinkedinAccessToken(accessToken || '');
            setLinkedinPersonId(personId || '');
            setLinkedinConnected(connected || false);
          } else {
            setLinkedinConnected(false);
            console.log('ℹ️ LinkedIn no conectado');
          }
        }
      } catch (cloudError) {
        console.warn('⚠️ Error consultando Secret Manager, usando AsyncStorage:', cloudError.message);
        // Fallback a AsyncStorage si falla la consulta a Secret Manager
        const linkedinData = await AsyncStorage.getItem('linkedin_credentials');
        if (linkedinData) {
          const { accessToken, personId, connected } = JSON.parse(linkedinData);
          setLinkedinAccessToken(accessToken || '');
          setLinkedinPersonId(personId || '');
          setLinkedinConnected(connected || false);
        }
      }
    } catch (error) {
      console.error('Error loading social media credentials:', error);
      Alert.alert('Error', 'No se pudieron cargar las credenciales guardadas');
    }
  };

  const saveSocialMediaCredentials = async () => {
    try {
      setSaving(true);

      // Guardar credenciales de Instagram
      const instagramCredentials = {
        accessToken: instagramAccessToken,
        userId: instagramUserId,
        connected: instagramConnected
      };
      await AsyncStorage.setItem('instagram_credentials', JSON.stringify(instagramCredentials));

      // Guardar credenciales de Twitter
      const twitterCredentials = {
        bearerToken: twitterBearerToken,
        apiKey: twitterApiKey,
        apiSecret: twitterApiSecret,
        accessToken: twitterAccessToken,
        accessTokenSecret: twitterAccessTokenSecret,
        connected: twitterConnected
      };
      await AsyncStorage.setItem('twitter_credentials', JSON.stringify(twitterCredentials));

      // Guardar/Desconectar LinkedIn
      if (!linkedinConnected) {
        // Si el usuario desconectó LinkedIn, eliminar de Secret Manager y AsyncStorage
        console.log('🔌 Desconectando LinkedIn...');
        try {
          await socialMediaCloudService.deleteCredentials('linkedin');
          await AsyncStorage.removeItem('linkedin_credentials');
          setLinkedinAccessToken('');
          setLinkedinPersonId('');
          console.log('✅ LinkedIn desconectado correctamente');
        } catch (deleteError) {
          console.error('⚠️ Error eliminando credenciales de LinkedIn:', deleteError);
          // Continuar aunque falle, al menos limpiamos local
          await AsyncStorage.removeItem('linkedin_credentials');
        }
      } else {
        // Si está conectado, solo actualizar AsyncStorage (Secret Manager ya tiene el token)
        const linkedinCredentials = {
          accessToken: linkedinAccessToken,
          personId: linkedinPersonId,
          connected: linkedinConnected
        };
        await AsyncStorage.setItem('linkedin_credentials', JSON.stringify(linkedinCredentials));
      }

      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving social media credentials:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (platform) => {
    console.log(`🔍 Iniciando prueba de conexión para ${platform}`);
    setTestingConnection(platform);
    
    try {
      console.log(`📡 Usando servicio:`, socialMediaService);
      console.log(`🌥️ Cloud storage habilitado:`, socialMediaConfig.useCloudStorage);
      
      // Usar el servicio cloud para probar la conexión
      const result = await socialMediaService.testConnection(platform);
      
      console.log(`📊 Resultado de la prueba:`, result);
      
      if (result.success) {
        Alert.alert('Éxito', `Conexión a ${platform} verificada correctamente`);
        // Actualizar el estado local
        switch (platform) {
          case 'instagram':
            setInstagramConnected(true);
            break;
          case 'twitter':
            setTwitterConnected(true);
            break;
          case 'linkedin':
            setLinkedinConnected(true);
            break;
        }
      } else {
        Alert.alert('Error', result.error || `No se pudo verificar la conexión a ${platform}`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${platform} connection:`, error);
      Alert.alert('Error', `Error al probar la conexión a ${platform}: ${error.message}`);
    } finally {
      setTestingConnection('');
    }
  };

  const handleLinkedInAuthSuccess = (codeOrObj) => {
    const code = typeof codeOrObj === 'string' ? codeOrObj : codeOrObj?.code;
    console.log('✅ [PASO 3] Código recibido en SettingsScreen. Iniciando intercambio de token...');
    exchangeCodeForToken(code);
  };

  const handleLinkedInAuthError = (error) => {
    console.error('❌ Error en autorización de LinkedIn:', error);
    Alert.alert('Error', `Error autorizando LinkedIn: ${error.message}`);
  };

  const handleInstagramAuthSuccess = (codeOrObj) => {
    const code = typeof codeOrObj === 'string' ? codeOrObj : codeOrObj?.code;
    console.log('✅ [IG PASO 3] Código recibido en SettingsScreen. Iniciando intercambio de token...');
    exchangeInstagramCodeForToken(code);
  };

  const handleInstagramAuthError = (error) => {
    console.error('❌ Error en autorización de Instagram:', error);
    Alert.alert('Error', `Error autorizando Instagram: ${error.message}`);
  };

  const clearCredentials = (platform) => {
    Alert.alert(
      'Confirmar',
      `¿Estás seguro de que quieres desconectar ${platform}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => {
            switch (platform) {
              case 'instagram':
                setInstagramAccessToken('');
                setInstagramUserId('');
                setInstagramConnected(false);
                break;
              case 'twitter':
                setTwitterBearerToken('');
                setTwitterApiKey('');
                setTwitterApiSecret('');
                setTwitterAccessToken('');
                setTwitterAccessTokenSecret('');
                setTwitterConnected(false);
                break;
              case 'linkedin':
                setLinkedinAccessToken('');
                setLinkedinPersonId('');
                setLinkedinConnected(false);
                break;
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Configuración</Text>
            <Text style={styles.subtitle}>Vincula tus cuentas de redes sociales para publicar directamente</Text>
            
            {/* Storage Type Indicator */}
            <View style={styles.storageIndicator}>
              <View style={styles.storageIconCircle}>
                <Ionicons 
                  name={socialMediaConfig.useCloudStorage ? "cloud-outline" : "phone-portrait-outline"} 
                  size={12} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={styles.storageText}>
                Almacenamiento: {socialMediaConfig.useCloudStorage ? "Google Cloud (Seguro)" : "Local (Dispositivo)"}
              </Text>
            </View>
          </View>
        </View>

        {/* Instagram Card */}
        <View style={styles.socialCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.socialInfo}>
              <Text style={styles.socialName}>Instagram</Text>
              <Text style={styles.socialDescription}>
                {instagramConnected ? 'Conectado' : 'No conectado'}
              </Text>
            </View>
            <Switch
              style={styles.switch}
              value={instagramConnected}
              onValueChange={setInstagramConnected}
              trackColor={{ false: '#767577', true: '#767577' }}
              ios_backgroundColor="#767577"
              thumbColor={instagramConnected ? '#00ca77' : '#f4f3f4'}
            />
          </View>

          {instagramConnected && (
            <View style={styles.credentialsSection}>
              <InstagramAuth
                onAuthSuccess={(codeOrObj) => {
                  const code = typeof codeOrObj === 'string' ? codeOrObj : codeOrObj?.code;
                  handleInstagramAuthSuccess(code);
                }}
                onAuthError={(err) => handleInstagramAuthError(err)}
              />
              <Text style={styles.credentialLabel}>Access Token</Text>
              <TextInput
                style={styles.credentialInput}
                value={instagramAccessToken}
                onChangeText={setInstagramAccessToken}
                placeholder="Tu access token de Instagram"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.credentialLabel}>User ID</Text>
              <TextInput
                style={styles.credentialInput}
                value={instagramUserId}
                onChangeText={setInstagramUserId}
                placeholder="Tu user ID de Instagram"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.testButton, testingConnection === 'instagram' && styles.testButtonDisabled]}
                  onPress={() => testConnection('instagram')}
                  disabled={testingConnection === 'instagram'}
                >
                  {testingConnection === 'instagram' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.testButtonText}>
                    {testingConnection === 'instagram' ? 'Probando...' : 'Probar conexión'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => clearCredentials('instagram')}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  <Text style={styles.clearButtonText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Twitter/X Card */}
        <View style={styles.socialCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.socialInfo}>
              <Text style={styles.socialName}>Twitter / X</Text>
              <Text style={styles.socialDescription}>
                {twitterConnected ? 'Conectado' : 'No conectado'}
              </Text>
            </View>
            <Switch
              style={styles.switch}
              value={twitterConnected}
              onValueChange={setTwitterConnected}
              trackColor={{ false: '#767577', true: '#767577' }}
              ios_backgroundColor="#767577"
              thumbColor={twitterConnected ? '#00ca77' : '#f4f3f4'}
            />
          </View>

          {twitterConnected && (
            <View style={styles.credentialsSection}>
              <Text style={styles.credentialLabel}>Bearer Token</Text>
              <TextInput
                style={styles.credentialInput}
                value={twitterBearerToken}
                onChangeText={setTwitterBearerToken}
                placeholder="Tu bearer token de Twitter"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.credentialLabel}>API Key</Text>
              <TextInput
                style={styles.credentialInput}
                value={twitterApiKey}
                onChangeText={setTwitterApiKey}
                placeholder="Tu API key de Twitter"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.credentialLabel}>API Secret</Text>
              <TextInput
                style={styles.credentialInput}
                value={twitterApiSecret}
                onChangeText={setTwitterApiSecret}
                placeholder="Tu API secret de Twitter"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.credentialLabel}>Access Token</Text>
              <TextInput
                style={styles.credentialInput}
                value={twitterAccessToken}
                onChangeText={setTwitterAccessToken}
                placeholder="Tu access token de Twitter"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.credentialLabel}>Access Token Secret</Text>
              <TextInput
                style={styles.credentialInput}
                value={twitterAccessTokenSecret}
                onChangeText={setTwitterAccessTokenSecret}
                placeholder="Tu access token secret de Twitter"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.testButton, testingConnection === 'twitter' && styles.testButtonDisabled]}
                  onPress={() => testConnection('twitter')}
                  disabled={testingConnection === 'twitter'}
                >
                  {testingConnection === 'twitter' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.testButtonText}>
                    {testingConnection === 'twitter' ? 'Probando...' : 'Probar conexión'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => clearCredentials('twitter')}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  <Text style={styles.clearButtonText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* LinkedIn Card */}
        <View style={styles.socialCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Ionicons name="logo-linkedin" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.socialInfo}>
              <Text style={styles.socialName}>LinkedIn</Text>
              <Text style={styles.socialDescription}>
                {linkedinConnected ? 'Conectado' : 'No conectado'}
              </Text>
            </View>
            <Switch
              style={styles.switch}
              value={linkedinConnected}
              onValueChange={setLinkedinConnected}
              trackColor={{ false: '#767577', true: '#767577' }}
              ios_backgroundColor="#767577"
              thumbColor={linkedinConnected ? '#00ca77' : '#f4f3f4'}
            />
          </View>

          {linkedinConnected && (
            <View style={styles.credentialsSection}>
              {/* Componente de autorización de LinkedIn */}
              <LinkedInAuth
                onAuthSuccess={handleLinkedInAuthSuccess}
                onAuthError={handleLinkedInAuthError}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.testButton, testingConnection === 'linkedin' && styles.testButtonDisabled]}
                  onPress={() => testConnection('linkedin')}
                  disabled={testingConnection === 'linkedin'}
                >
                  {testingConnection === 'linkedin' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.testButtonText}>
                    {testingConnection === 'linkedin' ? 'Probando...' : 'Probar conexión'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => clearCredentials('linkedin')}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  <Text style={styles.clearButtonText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Instrucciones */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <View style={styles.instructionsIconCircle}>
              <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.instructionsTitle}>Cómo obtener las credenciales</Text>
          </View>
          
          <View style={styles.instructionsList}>
            <Text style={styles.instructionsSubtitle}>Instagram:</Text>
            <Text style={styles.instructionsText}>1. Ve a Meta for Developers</Text>
            <Text style={styles.instructionsText}>2. Crea una nueva app</Text>
            <Text style={styles.instructionsText}>3. Configura Instagram Basic Display</Text>
            <Text style={styles.instructionsText}>4. Obtén tu access token y user ID</Text>

            <Text style={[styles.instructionsSubtitle, { marginTop: 16 }]}>Twitter/X:</Text>
            <Text style={styles.instructionsText}>1. Ve a Twitter Developer Portal</Text>
            <Text style={styles.instructionsText}>2. Crea un proyecto y app</Text>
            <Text style={styles.instructionsText}>3. Genera tus keys y tokens</Text>
            <Text style={styles.instructionsText}>4. Configura permisos de escritura</Text>

            <Text style={[styles.instructionsSubtitle, { marginTop: 16 }]}>LinkedIn:</Text>
            <Text style={styles.instructionsText}>1. Ve a LinkedIn Developers</Text>
            <Text style={styles.instructionsText}>2. Crea una nueva app</Text>
            <Text style={styles.instructionsText}>3. Solicita acceso a Share on LinkedIn</Text>
            <Text style={styles.instructionsText}>4. Obtén tu access token</Text>
          </View>
        </View>

        {/* Botón de guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSocialMediaCredentials}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00ca77',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    lineHeight: 20,
  },
  storageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  storageIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00ca77',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  socialCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 16,
  },
  iconCircleGreen: {
    backgroundColor: '#00ca77',
    borderColor: '#00ca77',
  },
  socialInfo: {
    flex: 1,
  },
  socialName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  socialDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  credentialsSection: {
    marginTop: 8,
  },
  credentialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 12,
  },
  credentialInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ca77',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: 'rgba(0, 202, 119, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.2)',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00ca77',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ca77',
    marginLeft: 12,
  },
  instructionsList: {
    marginLeft: 8,
  },
  instructionsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ca77',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ca77',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SettingsScreen;
