import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ContentEditorScreen from './src/screens/ContentEditorScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CRMScreen from './src/screens/CRMScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import Sidebar from './src/components/Sidebar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for authenticated users
const AuthenticatedApp = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#1C1C1E',
          width: Platform.OS === 'web' ? 300 : 280,
        },
        drawerType: Platform.OS === 'web' ? 'permanent' : 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen 
        name="ContentEditor" 
        component={ContentEditorScreen}
        options={{ title: 'Editor de Contenido' }}
      />
      <Drawer.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ title: 'Calendario' }}
      />
      <Drawer.Screen 
        name="CRM" 
        component={CRMScreen}
        options={{ title: 'CRM Contactos' }}
      />
      <Drawer.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
    </Drawer.Navigator>
  );
};

// Component that handles navigation based on auth state
const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Podrías mostrar un splash screen aquí
  }

  return (
    <NavigationContainer>
      {user ? (
        <AuthenticatedApp />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: Platform.OS === 'web' ? styles.webCardStyle : { backgroundColor: '#0f0f0f' },
            animationEnabled: Platform.OS !== 'web',
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ title: 'Login' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider style={Platform.OS === 'web' ? styles.webContainer : undefined}>
      <StatusBar style="light" backgroundColor="#0f0f0f" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    height: '100vh',
    overflow: 'auto', // Habilitar scroll en web
  },
  webCardStyle: {
    backgroundColor: '#0f0f0f',
    height: '100vh',
    overflow: 'auto', // Permitir scroll en cada pantalla
  },
});