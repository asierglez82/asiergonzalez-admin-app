import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ContentEditorScreen from './src/screens/ContentEditorScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import CreateQuoteScreen from './src/screens/CreateQuoteScreen';
import CreateBookScreen from './src/screens/CreateBookScreen';
import BlogCRUDScreen from './src/screens/BlogCRUDScreen';
import EditBlogPostScreen from './src/screens/EditBlogPostScreen';
import ProjectsCRUDScreen from './src/screens/ProjectsCRUDScreen';
import EditProjectScreen from './src/screens/EditProjectScreen';
import QuotesCRUDScreen from './src/screens/QuotesCRUDScreen';
import EditQuoteScreen from './src/screens/EditQuoteScreen';
import PodcastCRUDScreen from './src/screens/PodcastCRUDScreen';
import EditPodcastScreen from './src/screens/EditPodcastScreen';
import BooksCRUDScreen from './src/screens/BooksCRUDScreen';
import EditBookScreen from './src/screens/EditBookScreen';
import ConferencesCRUDScreen from './src/screens/ConferencesCRUDScreen';
import EditConferenceScreen from './src/screens/EditConferenceScreen';
import TalksCRUDScreen from './src/screens/TalksCRUDScreen';
import EditTalkScreen from './src/screens/EditTalkScreen';
import InfographicsCRUDScreen from './src/screens/InfographicsCRUDScreen';
import EditInfographicScreen from './src/screens/EditInfographicScreen';
import MediaCRUDScreen from './src/screens/MediaCRUDScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GeminiSettingsScreen from './src/screens/GeminiSettingsScreen';
import Sidebar from './src/components/Sidebar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for authenticated users
const AuthenticatedApp = () => {
  const { width } = Dimensions.get('window');
  const [windowWidth, setWindowWidth] = useState(width);

  useEffect(() => {
    const onChange = ({ window }) => setWindowWidth(window.width);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const isWeb = Platform.OS === 'web';
  const isNarrow = windowWidth < 1024;
  const drawerType = isWeb ? (isNarrow ? 'front' : 'permanent') : 'slide';
  const headerVisible = isWeb ? isNarrow : true;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: headerVisible,
        headerStyle: { backgroundColor: '#333b4d' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600', letterSpacing: -0.2 },
        headerLeft: () => (
          headerVisible ? (
            <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="menu" size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : null
        ),
        drawerStyle: {
          backgroundColor: '#1C1C1E',
          width: isWeb ? 300 : 280,
        },
        drawerType,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
      })}
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
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ title: 'Nuevo Post' }}
      />
      <Drawer.Screen 
        name="CreateQuote" 
        component={CreateQuoteScreen}
        options={{ title: 'Nueva Quote' }}
      />
      <Drawer.Screen 
        name="CreateBook" 
        component={CreateBookScreen}
        options={{ title: 'Nueva Reseña de Libro' }}
      />
      <Drawer.Screen 
        name="BlogCRUD" 
        component={BlogCRUDScreen}
        options={{ title: 'Gestión Blog' }}
      />
      <Drawer.Screen 
        name="EditBlogPost" 
        component={EditBlogPostScreen}
        options={{ title: 'Editar Post' }}
      />
      <Drawer.Screen 
        name="ProjectsCRUD" 
        component={ProjectsCRUDScreen}
        options={{ title: 'Gestión Proyectos' }}
      />
      <Drawer.Screen 
        name="EditProject" 
        component={EditProjectScreen}
        options={{ title: 'Editar Proyecto' }}
      />
      <Drawer.Screen 
        name="QuotesCRUD" 
        component={QuotesCRUDScreen}
        options={{ title: 'Gestión Quotes' }}
      />
      <Drawer.Screen 
        name="EditQuote" 
        component={EditQuoteScreen}
        options={{ title: 'Editar Quote' }}
      />
      <Drawer.Screen 
        name="PodcastCRUD" 
        component={PodcastCRUDScreen}
        options={{ title: 'Gestión Podcasts' }}
      />
      <Drawer.Screen 
        name="EditPodcast" 
        component={EditPodcastScreen}
        options={{ title: 'Editar Podcast' }}
      />
      <Drawer.Screen 
        name="BooksCRUD" 
        component={BooksCRUDScreen}
        options={{ title: 'Gestión Libros' }}
      />
      <Drawer.Screen 
        name="EditBook" 
        component={EditBookScreen}
        options={{ title: 'Editar Libro' }}
      />
      <Drawer.Screen 
        name="ConferencesCRUD" 
        component={ConferencesCRUDScreen}
        options={{ title: 'Gestión Conferencias' }}
      />
      <Drawer.Screen 
        name="EditConference" 
        component={EditConferenceScreen}
        options={{ title: 'Editar Conferencia' }}
      />
      <Drawer.Screen 
        name="TalksCRUD" 
        component={TalksCRUDScreen}
        options={{ title: 'Gestión Talks' }}
      />
      <Drawer.Screen 
        name="EditTalk" 
        component={EditTalkScreen}
        options={{ title: 'Editar Talk' }}
      />
      <Drawer.Screen 
        name="InfographicsCRUD" 
        component={InfographicsCRUDScreen}
        options={{ title: 'Gestión Infografías' }}
      />
      <Drawer.Screen 
        name="EditInfographic" 
        component={EditInfographicScreen}
        options={{ title: 'Editar Infografía' }}
      />
      <Drawer.Screen 
        name="MediaCRUD" 
        component={MediaCRUDScreen}
        options={{ title: 'Gestión Media' }}
      />
      
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Configuración' }}
      />
      <Drawer.Screen 
        name="GeminiSettings" 
        component={GeminiSettingsScreen}
        options={{ title: 'Configuración Gemini' }}
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