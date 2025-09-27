import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { infographicsService } from '../services/firestore';

const { width } = Dimensions.get('window');

const InfographicsCRUDScreen = ({ navigation }) => {
  const [infographics, setInfographics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInfographics, setFilteredInfographics] = useState([]);

  useEffect(() => {
    loadInfographics();
  }, []);

  useEffect(() => {
    filterInfographics();
  }, [searchQuery, infographics]);

  const loadInfographics = async () => {
    try {
      setLoading(true);
      const data = await infographicsService.getAll();
      setInfographics(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar las infografías');
      console.error('Error loading infographics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInfographics = () => {
    if (!searchQuery.trim()) {
      setFilteredInfographics(infographics);
      return;
    }

    const filtered = infographics.filter(infographic => 
      infographic.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      infographic.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      infographic.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      infographic.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredInfographics(filtered);
  };

  const handleDelete = (infographicId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta infografía?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteInfographic(infographicId)
        }
      ]
    );
  };

  const deleteInfographic = async (infographicId) => {
    try {
      await infographicsService.delete(infographicId);
      setInfographics(infographics.filter(i => i.id !== infographicId));
      Alert.alert('Éxito', 'Infografía eliminada correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar la infografía');
      console.error('Error deleting infographic:', error);
    }
  };

  const InfographicCard = ({ infographic }) => (
    <View style={styles.infographicCard}>
      <View style={styles.infographicImageContainer}>
        {infographic.image ? (
          <Image source={{ uri: infographic.image }} style={styles.infographicImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="stats-chart-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.infographicContent}>
        <Text style={styles.infographicTitle} numberOfLines={2}>{infographic.title}</Text>
        <Text style={styles.infographicSubtitle} numberOfLines={1}>{infographic.subtitle}</Text>
        <Text style={styles.infographicDescription} numberOfLines={2}>{infographic.description}</Text>
        <Text style={styles.infographicTags} numberOfLines={1}>{infographic.tags}</Text>
        <Text style={styles.infographicDate}>{infographic.date}</Text>
      </View>

      <View style={styles.infographicActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditInfographic', { infographicId: infographic.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(infographic.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando infografías...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Gestión de Infografías</Text>
          <Text style={styles.subtitle}>{filteredInfographics.length} infografías encontradas</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateInfographic')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar infografías..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.infographicsList}>
        {filteredInfographics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay infografías</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron infografías con ese criterio' : 'Comienza creando tu primera infografía'}
            </Text>
          </View>
        ) : (
          filteredInfographics.map((infographic) => (
            <InfographicCard key={infographic.id} infographic={infographic} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333b4d',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  addButton: {
    backgroundColor: '#00ca77',
    borderRadius: 8,
    padding: 12,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
  },
  infographicsList: {
    gap: 16,
  },
  infographicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infographicImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  infographicImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infographicContent: {
    flex: 1,
  },
  infographicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infographicSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  infographicDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  infographicTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  infographicDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  infographicActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default InfographicsCRUDScreen;
