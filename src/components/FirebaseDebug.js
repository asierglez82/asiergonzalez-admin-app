import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const FirebaseDebug = () => {
  const [debugInfo, setDebugInfo] = useState(['🔧 Debug Console Iniciado']);
  const [testResult, setTestResult] = useState(null);

  const addDebugInfo = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry); // También log en consola del navegador
    setDebugInfo(prev => [...prev, logEntry]);
  };

  useEffect(() => {
    checkFirebaseConfig();
  }, []);

  const checkFirebaseConfig = () => {
    try {
      addDebugInfo('🔍 Iniciando diagnóstico Firebase...');
      
      // Check environment variables
      addDebugInfo('📋 Verificando variables de entorno:');
      
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
      const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      
      addDebugInfo(apiKey ? `✅ API Key: ${apiKey.substring(0, 10)}...` : '❌ API Key: NO DEFINIDA');
      addDebugInfo(authDomain ? `✅ Auth Domain: ${authDomain}` : '❌ Auth Domain: NO DEFINIDA');
      addDebugInfo(projectId ? `✅ Project ID: ${projectId}` : '❌ Project ID: NO DEFINIDA');
      
      // Check current environment
      addDebugInfo('🌐 Información del entorno:');
      addDebugInfo(`URL actual: ${window.location.href}`);
      addDebugInfo(`Protocolo: ${window.location.protocol}`);
      addDebugInfo(`Host: ${window.location.host}`);
      
      // Try to import Firebase
      addDebugInfo('🔥 Verificando imports Firebase...');
      
      import('../config/firebase').then((firebaseModule) => {
        addDebugInfo('✅ Firebase config importado correctamente');
        addDebugInfo(`Auth objeto: ${firebaseModule.auth ? 'OK' : 'NULL'}`);
        addDebugInfo(`DB objeto: ${firebaseModule.db ? 'OK' : 'NULL'}`);
      }).catch((error) => {
        addDebugInfo(`❌ Error importando Firebase: ${error.message}`);
      });
      
    } catch (error) {
      addDebugInfo(`❌ Error en checkFirebaseConfig: ${error.message}`);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      addDebugInfo('🧪 Iniciando test de conexión...');
      
      const firebaseModule = await import('../config/firebase');
      const { auth } = firebaseModule;
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      addDebugInfo('✅ Módulos Firebase importados correctamente');
      
      // Test con credenciales inválidas para ver qué error obtenemos
      addDebugInfo('🔑 Probando autenticación...');
      
      try {
        await signInWithEmailAndPassword(auth, 'test@test.com', 'wrongpassword');
        addDebugInfo('⚠️ Login exitoso inesperado');
      } catch (authError) {
        addDebugInfo(`🔍 Error Auth recibido: ${authError.code}`);
        addDebugInfo(`📝 Mensaje: ${authError.message}`);
        
        if (authError.code === 'auth/api-key-not-valid') {
          addDebugInfo('❌ PROBLEMA DETECTADO: API Key inválida');
          addDebugInfo('🔧 Solución: Verificar API Key en Firebase Console');
        } else if (authError.code === 'auth/unauthorized-domain') {
          addDebugInfo('❌ PROBLEMA DETECTADO: Dominio no autorizado');
          addDebugInfo('🔧 Solución: Agregar localhost a dominios autorizados');
        } else {
          addDebugInfo('✅ Firebase Auth funciona (error esperado)');
        }
      }
      
    } catch (error) {
      addDebugInfo(`❌ Error crítico: ${error.message}`);
    }
  };

  const testRealLogin = async () => {
    addDebugInfo('🔑 Probando login real...', 'info');
    
    try {
      const result = await signInWithEmailAndPassword(
        auth, 
        'hola@asiergonzalez.es', 
        'tu_password_aqui' // Cambiar por password real
      );
      
      addDebugInfo('✅ Login exitoso!', 'success');
      addDebugInfo(`Usuario: ${result.user.email}`, 'success');
      
    } catch (error) {
      addDebugInfo(`❌ Login falló: ${error.code}`, 'error');
      addDebugInfo(`Mensaje: ${error.message}`, 'error');
      
      // Specific error handling
      if (error.code === 'auth/api-key-not-valid') {
        addDebugInfo('🔧 Solución: Verificar API Key en Firebase Console', 'warning');
      } else if (error.code === 'auth/unauthorized-domain') {
        addDebugInfo('🔧 Solución: Agregar localhost a dominios autorizados', 'warning');
      }
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
    setTestResult(null);
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'success': return '#00ca77';
      case 'error': return '#ff4444';
      case 'warning': return '#ffa500';
      default: return '#ffffff';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Firebase Debug Console</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={checkFirebaseConfig}>
          <Text style={styles.buttonText}>🔍 Check Config</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testFirebaseConnection}>
          <Text style={styles.buttonText}>🧪 Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testRealLogin}>
          <Text style={styles.buttonText}>🔑 Test Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearDebug}>
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>📝 Debug Log ({debugInfo.length} entradas):</Text>
        
        {debugInfo.map((message, index) => (
          <View key={index} style={styles.logItem}>
            <Text style={styles.logMessage}>
              {message}
            </Text>
          </View>
        ))}
        
        {debugInfo.length === 1 && (
          <Text style={styles.emptyLog}>
            Presiona "Check Config" para empezar el diagnóstico
          </Text>
        )}
      </ScrollView>

      {testResult && (
        <View style={[styles.resultContainer, 
          { backgroundColor: testResult === 'success' ? '#00ca7720' : '#ff444420' }
        ]}>
          <Text style={[styles.resultText, 
            { color: testResult === 'success' ? '#00ca77' : '#ff4444' }
          ]}>
            {testResult === 'success' ? '✅ Tests completados' : '❌ Errores detectados'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '48%',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#333333',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00ca77',
    marginBottom: 12,
  },
  logItem: {
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  logMessage: {
    fontSize: 11,
    color: '#ffffff',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  emptyLog: {
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  resultContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FirebaseDebug;
