import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { podcastService } from '../services/firestore';

const { width } = Dimensions.get('window');

const PodcastCRUDScreen = ({ navigation }) => {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPodcasts, setFilteredPodcasts] = useState([]);

  useEffect(() => {
    loadPodcasts();
  }, []);

  useEffect(() => {
    filterPodcasts();
  }, [searchQuery, podcasts]);

  const loadPodcasts = async () => {
    try {
      setLoading(true);
      const data = await podcastService.getAll();
      setPodcasts(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los podcasts');
      console.error('Error loading podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPodcasts = () => {
    if (!searchQuery.trim()) {
      setFilteredPodcasts(podcasts);
      return;
    }

    const filtered = podcasts.filter(podcast => 
      podcast.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPodcasts(filtered);
  };

  const handleDelete = (podcastId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este podcast?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deletePodcast(podcastId)
        }
      ]
    );
  };

  const deletePodcast = async (podcastId) => {
    try {
      await podcastService.delete(podcastId);
      setPodcasts(podcasts.filter(p => p.id !== podcastId));
      Alert.alert('Éxito', 'Podcast eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el podcast');
      console.error('Error deleting podcast:', error);
    }
  };

  const PodcastCard = ({ podcast }) => (
    <View style={styles.podcastCard}>
      <View style={styles.podcastImageContainer}>
        {podcast.image ? (
          <Image source={{ uri: podcast.image }} style={styles.podcastImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="mic-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.podcastContent}>
        <Text style={styles.podcastTitle} numberOfLines={2}>{podcast.title}</Text>
        <Text style={styles.podcastSubtitle} numberOfLines={1}>{podcast.subtitle}</Text>
        <Text style={styles.podcastDescription} numberOfLines={2}>{podcast.description}</Text>
        <Text style={styles.podcastTags} numberOfLines={1}>{podcast.tags}</Text>
        <Text style={styles.podcastDate}>{podcast.date}</Text>
      </View>

      <View style={styles.podcastActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditPodcast', { podcastId: podcast.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(podcast.id)}
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
        <Text style={styles.loadingText}>Cargando podcasts...</Text>
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
          <Text style={styles.title}>Gestión de Podcasts</Text>
          <Text style={styles.subtitle}>{filteredPodcasts.length} podcasts encontrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePodcast')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar podcasts..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.podcastsList}>
        {filteredPodcasts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mic-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay podcasts</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron podcasts con ese criterio' : 'Comienza creando tu primer podcast'}
            </Text>
          </View>
        ) : (
          filteredPodcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
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
  podcastsList: {
    gap: 16,
  },
  podcastCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  podcastImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  podcastImage: {
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
  podcastContent: {
    flex: 1,
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  podcastSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  podcastDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  podcastTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  podcastDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  podcastActions: {
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

export default PodcastCRUDScreen;
