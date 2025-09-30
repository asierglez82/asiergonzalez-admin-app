import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ navigation, state }) => {
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState({});

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
      name: 'Configuración', 
      route: 'Settings',
      description: 'Configuraciones del sistema',
      isExpandable: true,
      subItems: [
        {
          name: 'Redes Sociales',
          route: 'Settings',
          description: 'Vincular redes sociales'
        },
        {
          name: 'Gemini IA',
          route: 'GeminiSettings',
          description: 'Configurar servicio de IA'
        }
      ]
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
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
            <Image source={require('../../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>
        </View>

        {/* Usuario (solo estado online) */}
        <View style={styles.userSection}>
          <View style={styles.statusIndicator}>
            <View style={styles.onlineStatus} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Menú Principal */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <View key={item.route}>
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  isActiveRoute(item.route) && styles.menuItemActive
                ]}
                onPress={() => {
                  if (item.isExpandable) {
                    toggleSection(item.name);
                  } else {
                    navigation.navigate(item.route);
                  }
                }}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemHeader}>
                    <Text style={[
                      styles.menuTitle,
                      isActiveRoute(item.route) && styles.menuTitleActive
                    ]}>
                      {item.name}
                    </Text>
                    {item.isExpandable && (
                      <Text style={styles.expandIcon}>
                        {expandedSections[item.name] ? '▼' : '▶'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                {isActiveRoute(item.route) && <View style={styles.activeBar} />}
              </TouchableOpacity>
              
              {/* Submenú expandible */}
              {item.isExpandable && expandedSections[item.name] && item.subItems && (
                <View style={styles.subMenu}>
                  {item.subItems.map((subItem) => (
                    <TouchableOpacity
                      key={subItem.route}
                      style={[
                        styles.subMenuItem,
                        isActiveRoute(subItem.route) && styles.subMenuItemActive
                      ]}
                      onPress={() => navigation.navigate(subItem.route)}
                    >
                      <View style={styles.subMenuItemContent}>
                        <Text style={[
                          styles.subMenuTitle,
                          isActiveRoute(subItem.route) && styles.subMenuTitleActive
                        ]}>
                          {subItem.name}
                        </Text>
                        <Text style={styles.subMenuDescription}>{subItem.description}</Text>
                      </View>
                      {isActiveRoute(subItem.route) && <View style={styles.subMenuActiveBar} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreatePost')}>
            <Text style={styles.actionText}>New Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateQuote')}>
            <Text style={styles.actionText}>New Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL('https://asiergonzalez.es')}>
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
    backgroundColor: 'transparent',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 230,
    height: 60,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
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
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
    letterSpacing: -0.1,
    flex: 1,
  },
  menuTitleActive: {
    fontWeight: '600',
    color: '#00ca77',
  },
  expandIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },
  menuDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 16,
  },
  subMenu: {
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  subMenuItem: {
    marginBottom: 2,
    position: 'relative',
    borderRadius: 6,
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(0, 202, 119, 0.1)',
  },
  subMenuItemContent: {
    padding: 12,
    paddingLeft: 16,
  },
  subMenuTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  subMenuTitleActive: {
    fontWeight: '500',
    color: '#00ca77',
  },
  subMenuDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 14,
  },
  subMenuActiveBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: '#00ca77',
    borderRadius: 1,
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
