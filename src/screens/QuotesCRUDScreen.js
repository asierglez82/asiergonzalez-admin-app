import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { quotesService } from '../services/firestore';
const stripHtml = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const { width } = Dimensions.get('window');

const QuotesCRUDScreen = ({ navigation }) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  // Recargar automáticamente cuando la pantalla gana foco (al volver de crear/editar)
  useFocusEffect(
    React.useCallback(() => {
      loadQuotes();
    }, [])
  );

  useEffect(() => {
    filterQuotes();
  }, [searchQuery, quotes]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quotesService.getAll('createdAt', 'desc', 100);
      setQuotes(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar las quotes');
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    if (!searchQuery.trim()) {
      setFilteredQuotes(quotes);
      return;
    }

    const filtered = quotes.filter(quote => 
      quote.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.where?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredQuotes(filtered);
  };

  const handleDelete = (quoteId) => {
    const q = quotes.find(q => q.id === quoteId);
    setQuoteToDelete(q);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    await deleteQuote(quoteToDelete.id);
    setShowDeleteModal(false);
    setQuoteToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setQuoteToDelete(null);
  };

  const deleteQuote = async (quoteId) => {
    try {
      await quotesService.delete(quoteId);
      setQuotes(quotes.filter(q => q.id !== quoteId));
      Alert.alert('Éxito', 'Quote eliminada correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar la quote');
      console.error('Error deleting quote:', error);
    }
  };

  // (Botón temporal de actualización masiva eliminado)

  const QuoteCard = ({ quote }) => (
    <View style={styles.quoteCard}>
      <View style={styles.quoteImageContainer}>
        {quote.image ? (
          <Image source={{ uri: quote.image }} style={styles.quoteImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.quoteContent}>
        <View style={styles.titleRow}>
          <Text style={styles.quoteAuthor} numberOfLines={1}>{quote.author}</Text>
          <View style={[
            styles.statusBadge,
            quote?.social?.draft === false ? styles.publishedBadge : styles.draftBadge
          ]}>
            <Ionicons name={quote?.social?.draft === false ? 'checkmark-circle' : 'document-outline'} size={12} color="#FFFFFF" />
            <Text style={styles.statusText}>{quote?.social?.draft === false ? 'Publicado' : 'Borrador'}</Text>
          </View>
        </View>
        <Text style={styles.quoteWhere} numberOfLines={1}>{quote.where}</Text>
        <Text style={styles.quoteBody} numberOfLines={2}>{stripHtml(quote.content)}</Text>
        <Text style={styles.quoteTags} numberOfLines={1}>{quote.tags}</Text>
      </View>

      <View style={styles.quoteActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditQuote', { quoteId: quote.id })}
        >
          <Ionicons name="create-outline" size={16} color="#B0B0B0" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(quote.id)}
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
        <Text style={styles.loadingText}>Cargando quotes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Gestión de Quotes</Text>
          <Text style={styles.subtitle}>{filteredQuotes.length} quotes encontradas</Text>
        </View>
        <View style={styles.rightButtons}>
          <TouchableOpacity 
            style={styles.iconHeaderButton}
            onPress={() => navigation.navigate('CreateQuote')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {/* Botón temporal de bulk update eliminado */}
          <TouchableOpacity 
            style={styles.iconHeaderButton}
            onPress={() => navigation.goBack()}
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
            placeholder="Buscar quotes..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.quotesList}>
        {filteredQuotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay quotes</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron quotes con ese criterio' : 'Comienza creando tu primera quote'}
            </Text>
          </View>
        ) : (
          filteredQuotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
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
            <Text style={styles.modalMessage}>¿Seguro que quieres eliminar esta quote?</Text>
            {quoteToDelete && (
              <View style={styles.modalPostInfo}>
                <Text style={styles.modalPostTitle} numberOfLines={2}>{quoteToDelete.author || 'Sin autor'}</Text>
                <Text style={styles.modalPostAuthor}>{quoteToDelete.where || 'Sin lugar/evento'}</Text>
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
  // bulkBtn eliminado
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
  quotesList: {
    gap: 16,
    alignItems: 'stretch',
  },
  quoteCard: {
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
  quoteImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  quoteImage: {
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
  quoteContent: {
    flex: 1,
    paddingRight: 12,
  },
  quoteAuthor: {
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
  quoteWhere: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  quoteBody: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    lineHeight: 16,
  },
  quoteTags: {
    fontSize: 12,
    color: '#00ca77',
  },
  quoteActions: {
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
  // Modal styles (alineados con BlogCRUDScreen)
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

export default QuotesCRUDScreen;
