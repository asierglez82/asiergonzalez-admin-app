import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { videosService } from '../services/firestore';
const stripHtml = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const { width } = Dimensions.get('window');

const MediaCRUDScreen = ({ navigation }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMedia, setFilteredMedia] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState(null);

  useEffect(() => {
    loadMedia();
  }, []);

  // Recargar automáticamente cuando la pantalla gana foco (al volver de crear/editar)
  useFocusEffect(
    React.useCallback(() => {
      loadMedia();
    }, [])
  );

  useEffect(() => {
    filterMedia();
  }, [searchQuery, media]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await videosService.getAll('createdAt', 'desc', 100);
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
    const m = media.find(m => m.id === mediaId);
    setMediaToDelete(m);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) return;
    await deleteMedia(mediaToDelete.id);
    setShowDeleteModal(false);
    setMediaToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMediaToDelete(null);
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
        <View style={styles.titleRow}>
          <Text style={styles.mediaTitle} numberOfLines={1}>{item.title}</Text>
          {(() => {
            const isPublished = item?.draft === false; // Publicado si draft === false
            return (
              <View style={[styles.statusBadge, isPublished ? styles.publishedBadge : styles.draftBadge]}>
                <Ionicons name={isPublished ? 'checkmark-circle' : 'document-outline'} size={12} color="#FFFFFF" />
                <Text style={styles.statusText}>{isPublished ? 'Publicado' : 'Borrador'}</Text>
              </View>
            );
          })()}
        </View>
        <Text style={styles.mediaSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        <Text style={styles.mediaBody} numberOfLines={2}>{stripHtml(item.description || '')}</Text>
        <Text style={styles.mediaTags} numberOfLines={1}>{item.tags}</Text>
      </View>

      <View style={styles.mediaActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditMedia', { mediaId: item.id })}
        >
          <Ionicons name="create-outline" size={16} color="#B0B0B0" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardAccent} />
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>Gestión de Media & Press</Text>
          <Text style={styles.subtitle}>{filteredMedia.length} elementos encontrados</Text>
        </View>
        <View style={styles.rightButtons}>
          <TouchableOpacity 
            style={styles.iconHeaderButton}
            onPress={() => navigation.navigate('CreateMedia')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconHeaderButton}
            onPress={() => navigation.navigate('ContentEditor')}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color="#FF3B30" />
              <Text style={styles.modalTitle}>Confirmar eliminación</Text>
            </View>
            <Text style={styles.modalMessage}>¿Seguro que quieres eliminar este elemento de media?</Text>
            {mediaToDelete && (
              <View style={styles.modalPostInfo}>
                <Text style={styles.modalPostTitle} numberOfLines={2}>{mediaToDelete.title || 'Sin título'}</Text>
                <Text style={styles.modalPostAuthor}>{mediaToDelete.subtitle || 'Sin subtítulo'}</Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={cancelDelete}>
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.deleteModalButton]} onPress={confirmDelete}>
                <Text style={styles.deleteModalButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconHeaderButton: {
    padding: 10,
    backgroundColor: '#00ca77',
    borderRadius: 8,
  },
  backButton: {
    padding: 10,
    marginRight: 16,
    backgroundColor: '#00ca77',
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00ca77',
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
    alignItems: 'stretch',
  },
  mediaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    paddingRight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#00ca77',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
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
    paddingRight: 12,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  publishedBadge: { backgroundColor: '#00ca77' },
  draftBadge: { backgroundColor: '#FF9800' },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  mediaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  mediaBody: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    lineHeight: 16,
  },
  mediaTags: {
    fontSize: 12,
    color: '#00ca77',
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
    marginRight: 12,
    alignItems: 'center',
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(176, 176, 176, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(176, 176, 176, 0.5)',
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
  // Modal styles (alineados con QuotesCRUDScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalPostInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalPostTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalPostAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteModalButton: {
    backgroundColor: '#FF3B30',
  },
  cancelModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MediaCRUDScreen;
