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
import geminiService, { geminiConfig } from '../config/geminiConfig';
import { geminiCloudService } from '../services/geminiCloud';

const GeminiSettingsScreen = ({ navigation }) => {
  // Estados para la configuración
  const [useCloudService, setUseCloudService] = useState(geminiConfig.useCloudService);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  
  // Estados de UI
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({
    cloud: { available: false, error: null },
    local: { available: false, error: null },
    proxy: { available: false, error: null }
  });

  useEffect(() => {
    checkServiceAvailability();
  }, []);

  const checkServiceAvailability = async () => {
    try {
      setTesting(true);
      const status = await geminiService.checkAvailability();
      setServiceStatus(status);
    } catch (error) {
      console.error('Error checking Gemini service availability:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleTestService = async (serviceType) => {
    setTesting(true);
    try {
      const testPrompt = 'Responde brevemente: ¿Funciona Gemini correctamente?';
      let result;

      switch (serviceType) {
        case 'cloud':
          if (geminiConfig.useCloudService) {
            result = await geminiService.generateSmart(testPrompt);
          } else {
            result = await geminiService.switchToCloud().generateSmart(testPrompt);
          }
          break;
        case 'local':
          result = await geminiService.switchToLocal().generateWithGemini(testPrompt);
          break;
        case 'proxy':
          result = await geminiService.switchToLocal().generateJsonOrText(testPrompt);
          break;
        default:
          result = await geminiService.generateSmart(testPrompt);
      }

      Alert.alert(
        'Test Exitoso',
        `Servicio ${serviceType} funcionando correctamente:\n\n"${result.substring(0, 100)}${result.length > 100 ? '...' : ''}"`
      );
    } catch (error) {
      Alert.alert(
        'Test Falló',
        `Error en servicio ${serviceType}:\n\n${error.message}`
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey || !adminSecret) {
      Alert.alert('Campos requeridos', 'El API key y el secret de admin son obligatorios');
      return;
    }

    setSaving(true);
    try {
      await geminiCloudService.setGeminiApiKey(geminiApiKey, adminSecret);
      Alert.alert('Éxito', 'API key de Gemini guardado correctamente en Secret Manager');
      setGeminiApiKey('');
      setAdminSecret('');
      
      // Recheck availability after setting the API key
      setTimeout(checkServiceAvailability, 2000);
    } catch (error) {
      Alert.alert('Error', `No se pudo guardar el API key: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    geminiService.clearCache();
    Alert.alert('Cache limpiado', 'El cache de Gemini ha sido limpiado correctamente');
  };

  const getServiceStatusColor = (service) => {
    if (service.available) return '#00ca77';
    if (service.error) return '#FF6B6B';
    return '#FF9800';
  };

  const getServiceStatusIcon = (service) => {
    if (service.available) return 'checkmark-circle';
    if (service.error) return 'close-circle';
    return 'warning';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Configuración Gemini</Text>
            <Text style={styles.subtitle}>Gestión del servicio de IA y almacenamiento seguro del API key</Text>
            
            {/* Service Type Indicator */}
            <View style={styles.serviceIndicator}>
              <Ionicons 
                name={geminiConfig.useCloudService ? "cloud-outline" : "desktop-outline"} 
                size={16} 
                color={geminiConfig.useCloudService ? "#64D2FF" : "#FF9800"} 
              />
              <Text style={styles.serviceText}>
                Servicio: {geminiConfig.useCloudService ? "Google Cloud (Seguro)" : "Local/Proxy"}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Estado de Servicios</Text>
            <TouchableOpacity 
              style={[styles.refreshButton, testing && styles.refreshButtonDisabled]}
              onPress={checkServiceAvailability}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#64D2FF" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color="#64D2FF" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesList}>
            {/* Cloud Service */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Ionicons 
                  name="cloud-outline" 
                  size={24} 
                  color={getServiceStatusColor(serviceStatus.cloud)} 
                />
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>Google Cloud Function</Text>
                  <Text style={[styles.serviceStatus, { color: getServiceStatusColor(serviceStatus.cloud) }]}>
                    {serviceStatus.cloud.available ? 'Disponible' : 
                     serviceStatus.cloud.error ? `Error: ${serviceStatus.cloud.error}` : 'Desconocido'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={() => handleTestService('cloud')}
                disabled={testing}
              >
                <Text style={styles.testButtonText}>Test</Text>
              </TouchableOpacity>
            </View>

            {/* Local Service */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Ionicons 
                  name="desktop-outline" 
                  size={24} 
                  color={getServiceStatusColor(serviceStatus.local)} 
                />
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>API Local</Text>
                  <Text style={[styles.serviceStatus, { color: getServiceStatusColor(serviceStatus.local) }]}>
                    {serviceStatus.local.available ? 'Disponible' : 
                     serviceStatus.local.error ? `Error: ${serviceStatus.local.error}` : 'Desconocido'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={() => handleTestService('local')}
                disabled={testing}
              >
                <Text style={styles.testButtonText}>Test</Text>
              </TouchableOpacity>
            </View>

            {/* Proxy Service */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Ionicons 
                  name="server-outline" 
                  size={24} 
                  color={getServiceStatusColor(serviceStatus.proxy)} 
                />
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>Proxy Service</Text>
                  <Text style={[styles.serviceStatus, { color: getServiceStatusColor(serviceStatus.proxy) }]}>
                    {serviceStatus.proxy.available ? 'Disponible' : 
                     serviceStatus.proxy.error ? `Error: ${serviceStatus.proxy.error}` : 'Desconocido'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={() => handleTestService('proxy')}
                disabled={testing}
              >
                <Text style={styles.testButtonText}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* API Key Configuration (only for cloud service) */}
        {geminiConfig.useCloudService && (
          <View style={styles.configCard}>
            <Text style={styles.cardTitle}>Configurar API Key de Gemini</Text>
            <Text style={styles.cardSubtitle}>
              Solo administradores pueden configurar el API key en Secret Manager
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key de Gemini</Text>
              <TextInput
                style={styles.input}
                value={geminiApiKey}
                onChangeText={setGeminiApiKey}
                placeholder="Introduce tu API key de Gemini"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Secret de Admin</Text>
              <TextInput
                style={styles.input}
                value={adminSecret}
                onChangeText={setAdminSecret}
                placeholder="Secret de administrador"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={saving || !geminiApiKey || !adminSecret}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="key-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar en Secret Manager'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Configuration Options */}
        <View style={styles.configCard}>
          <Text style={styles.cardTitle}>Configuración</Text>
          
          <View style={styles.configOption}>
            <View style={styles.configInfo}>
              <Text style={styles.configName}>Usar Servicio Cloud</Text>
              <Text style={styles.configDescription}>
                {useCloudService ? 
                  'API key seguro en Google Secret Manager' : 
                  'API key en variables de entorno locales'}
              </Text>
            </View>
            <Switch
              value={useCloudService}
              onValueChange={setUseCloudService}
              trackColor={{ false: '#767577', true: '#64D2FF50' }}
              thumbColor={useCloudService ? '#64D2FF' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.cacheButton}
            onPress={handleClearCache}
          >
            <Ionicons name="trash-outline" size={18} color="#FF9800" />
            <Text style={styles.cacheButtonText}>Limpiar Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#64D2FF" />
            <Text style={styles.instructionsTitle}>Cómo configurar Gemini Cloud</Text>
          </View>
          
          <View style={styles.instructionsList}>
            <Text style={styles.instructionStep}>1. Obtén tu API key de Google AI Studio</Text>
            <Text style={styles.instructionStep}>2. Despliega la Cloud Function siguiendo GEMINI_DEPLOYMENT_GUIDE.md</Text>
            <Text style={styles.instructionStep}>3. Configura la variable ADMIN_SECRET en la Cloud Function</Text>
            <Text style={styles.instructionStep}>4. Introduce el API key y admin secret aquí</Text>
            <Text style={styles.instructionStep}>5. Activa "Usar Servicio Cloud"</Text>
            
            <Text style={[styles.instructionStep, { marginTop: 16, color: '#00ca77' }]}>
              ✅ Una vez configurado, el API key estará seguro en Google Secret Manager
            </Text>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    lineHeight: 20,
  },
  serviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  serviceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
    lineHeight: 20,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: '400',
  },
  testButton: {
    backgroundColor: 'rgba(100, 210, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.3)',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#64D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  configCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ca77',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  configOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  configInfo: {
    flex: 1,
    marginRight: 16,
  },
  configName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  cacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    gap: 8,
  },
  cacheButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: 'rgba(100, 210, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.2)',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  instructionsList: {
    marginLeft: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default GeminiSettingsScreen;
