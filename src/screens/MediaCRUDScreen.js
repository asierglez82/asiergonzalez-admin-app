import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { videosService } from '../services/firestore';

const { width } = Dimensions.get('window');

const MediaCRUDScreen = ({ navigation }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMedia, setFilteredMedia] = useState([]);

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    filterMedia();
  }, [searchQuery, media]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await videosService.getAll();
      setMedia(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar el media');
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMedia = () => {
    if (!searchQuery.trim()) {
      setFilteredMedia(media);
      return;
    }

    const filtered = media.filter(item => 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMedia(filtered);
  };

  const handleDelete = (mediaId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este media?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteMedia(mediaId)
        }
      ]
    );
  };

  const deleteMedia = async (mediaId) => {
    try {
      await videosService.delete(mediaId);
      setMedia(media.filter(m => m.id !== mediaId));
      Alert.alert('Éxito', 'Media eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el media');
      console.error('Error deleting media:', error);
    }
  };

  const MediaCard = ({ item }) => (
    <View style={styles.mediaCard}>
      <View style={styles.mediaImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.mediaImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="newspaper-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.mediaContent}>
        <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.mediaSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        <Text style={styles.mediaTags} numberOfLines={1}>{item.tags}</Text>
        <Text style={styles.mediaDate}>{item.date}</Text>
      </View>

      <View style={styles.mediaActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditMedia', { mediaId: item.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
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
        <Text style={styles.loadingText}>Cargando media...</Text>
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
          <Text style={styles.title}>Gestión de Media & Press</Text>
          <Text style={styles.subtitle}>{filteredMedia.length} elementos encontrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateMedia')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar media..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.mediaList}>
        {filteredMedia.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay media</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron elementos con ese criterio' : 'Comienza creando tu primer elemento de media'}
            </Text>
          </View>
        ) : (
          filteredMedia.map((item) => (
            <MediaCard key={item.id} item={item} />
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
  mediaList: {
    gap: 16,
  },
  mediaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  mediaImage: {
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
  mediaContent: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mediaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  mediaTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  mediaDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  mediaActions: {
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

export default MediaCRUDScreen;
