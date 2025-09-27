import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { quotesService } from '../services/firestore';

const { width } = Dimensions.get('window');

const QuotesCRUDScreen = ({ navigation }) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [searchQuery, quotes]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quotesService.getAllQuotes();
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
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta quote?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteQuote(quoteId)
        }
      ]
    );
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
        <Text style={styles.quoteAuthor} numberOfLines={1}>{quote.author}</Text>
        <Text style={styles.quoteWhere} numberOfLines={1}>{quote.where}</Text>
        <Text style={styles.quoteContent} numberOfLines={3}>{quote.content}</Text>
        <Text style={styles.quoteTags} numberOfLines={1}>{quote.tags}</Text>
      </View>

      <View style={styles.quoteActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditQuote', { quoteId: quote.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(quote.id)}
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
        <Text style={styles.loadingText}>Cargando quotes...</Text>
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
          <Text style={styles.title}>Gestión de Quotes</Text>
          <Text style={styles.subtitle}>{filteredQuotes.length} quotes encontradas</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateQuote')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
  quotesList: {
    gap: 16,
  },
  quoteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  },
  quoteAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quoteWhere: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  quoteContent: {
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

export default QuotesCRUDScreen;
