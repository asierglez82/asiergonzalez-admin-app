import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ navigation, state }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { 
      name: 'Dashboard', 
      route: 'Dashboard',
      description: 'Panel de control'
    },
    { 
      name: 'Content Editor', 
      route: 'ContentEditor',
      description: 'Crear y editar contenido'
    },
    { 
      name: 'Analytics', 
      route: 'Analytics',
      description: 'Métricas y reportes'
    },
    { 
      name: 'Configuración', 
      route: 'Settings',
      description: 'Vincular redes sociales'
    },
    { 
      name: 'Gemini IA', 
      route: 'GeminiSettings',
      description: 'Configurar servicio de IA'
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isActiveRoute = (routeName) => {
    const currentRoute = state.routes[state.index].name;
    return currentRoute === routeName;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Elegante */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.brandName}>AG</Text>
            </View>
            <View style={styles.brandInfo}>
              <Text style={styles.brandTitle}>Asier González</Text>
              <Text style={styles.brandSubtitle}>Digital Command Center</Text>
            </View>
          </View>
        </View>

        {/* Usuario */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {(user?.displayName || user?.email || 'Admin').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.displayName || 'Administrator'}</Text>
            <Text style={styles.userRole}>Content Manager</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.onlineStatus} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        {/* Menú Principal */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                isActiveRoute(item.route) && styles.menuItemActive
              ]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuItemContent}>
                <Text style={[
                  styles.menuTitle,
                  isActiveRoute(item.route) && styles.menuTitleActive
                ]}>
                  {item.name}
                </Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              {isActiveRoute(item.route) && <View style={styles.activeBar} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>New Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>View Website</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer Elegante */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>asiergonzalez.es • v2.1</Text>
      </View>
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
  header: {
    padding: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(0, 202, 119, 0.1)',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ca77',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandInfo: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userSection: {
    padding: 20,
    marginVertical: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00ca77',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00ca77',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  userInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ca77',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  menuItem: {
    marginBottom: 2,
    position: 'relative',
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 202, 119, 0.15)',
  },
  menuItemContent: {
    padding: 16,
    paddingLeft: 20,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  menuTitleActive: {
    fontWeight: '600',
    color: '#00ca77',
  },
  menuDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 16,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#00ca77',
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 202, 119, 0.1)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.2)',
  },
  actionText: {
    fontSize: 13,
    color: '#00ca77',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  version: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});

export default Sidebar;
