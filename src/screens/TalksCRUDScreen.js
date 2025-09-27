import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { talksService } from '../services/firestore';

const { width } = Dimensions.get('window');

const TalksCRUDScreen = ({ navigation }) => {
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTalks, setFilteredTalks] = useState([]);

  useEffect(() => {
    loadTalks();
  }, []);

  useEffect(() => {
    filterTalks();
  }, [searchQuery, talks]);

  const loadTalks = async () => {
    try {
      setLoading(true);
      const data = await talksService.getAll();
      setTalks(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los talks');
      console.error('Error loading talks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTalks = () => {
    if (!searchQuery.trim()) {
      setFilteredTalks(talks);
      return;
    }

    const filtered = talks.filter(talk => 
      talk.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      talk.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      talk.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTalks(filtered);
  };

  const handleDelete = (talkId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este talk?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteTalk(talkId)
        }
      ]
    );
  };

  const deleteTalk = async (talkId) => {
    try {
      await talksService.delete(talkId);
      setTalks(talks.filter(t => t.id !== talkId));
      Alert.alert('Éxito', 'Talk eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el talk');
      console.error('Error deleting talk:', error);
    }
  };

  const TalkCard = ({ talk }) => (
    <View style={styles.talkCard}>
      <View style={styles.talkImageContainer}>
        {talk.image ? (
          <Image source={{ uri: talk.image }} style={styles.talkImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="podium-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.talkContent}>
        <Text style={styles.talkTitle} numberOfLines={2}>{talk.title}</Text>
        <Text style={styles.talkSubtitle} numberOfLines={1}>{talk.subtitle}</Text>
        <Text style={styles.talkTags} numberOfLines={1}>{talk.tags}</Text>
        <Text style={styles.talkDate}>{talk.date}</Text>
      </View>

      <View style={styles.talkActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditTalk', { talkId: talk.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(talk.id)}
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
        <Text style={styles.loadingText}>Cargando talks...</Text>
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
          <Text style={styles.title}>Gestión de Talks</Text>
          <Text style={styles.subtitle}>{filteredTalks.length} talks encontrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateTalk')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar talks..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.talksList}>
        {filteredTalks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="podium-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay talks</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron talks con ese criterio' : 'Comienza creando tu primer talk'}
            </Text>
          </View>
        ) : (
          filteredTalks.map((talk) => (
            <TalkCard key={talk.id} talk={talk} />
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
  talksList: {
    gap: 16,
  },
  talkCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  talkImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  talkImage: {
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
  talkContent: {
    flex: 1,
  },
  talkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  talkSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  talkTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  talkDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  talkActions: {
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

export default TalksCRUDScreen;
