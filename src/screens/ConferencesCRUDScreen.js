import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { conferencesService } from '../services/firestore';

const { width } = Dimensions.get('window');

const ConferencesCRUDScreen = ({ navigation }) => {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConferences, setFilteredConferences] = useState([]);

  useEffect(() => {
    loadConferences();
  }, []);

  useEffect(() => {
    filterConferences();
  }, [searchQuery, conferences]);

  const loadConferences = async () => {
    try {
      setLoading(true);
      const data = await conferencesService.getAll();
      setConferences(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar las conferencias');
      console.error('Error loading conferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterConferences = () => {
    if (!searchQuery.trim()) {
      setFilteredConferences(conferences);
      return;
    }

    const filtered = conferences.filter(conference => 
      conference.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conference.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conference.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredConferences(filtered);
  };

  const handleDelete = (conferenceId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta conferencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteConference(conferenceId)
        }
      ]
    );
  };

  const deleteConference = async (conferenceId) => {
    try {
      await conferencesService.delete(conferenceId);
      setConferences(conferences.filter(c => c.id !== conferenceId));
      Alert.alert('Éxito', 'Conferencia eliminada correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar la conferencia');
      console.error('Error deleting conference:', error);
    }
  };

  const ConferenceCard = ({ conference }) => (
    <View style={styles.conferenceCard}>
      <View style={styles.conferenceImageContainer}>
        {conference.image ? (
          <Image source={{ uri: conference.image }} style={styles.conferenceImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.conferenceContent}>
        <Text style={styles.conferenceTitle} numberOfLines={2}>{conference.title}</Text>
        <Text style={styles.conferenceSubtitle} numberOfLines={1}>{conference.subtitle}</Text>
        <Text style={styles.conferenceTags} numberOfLines={1}>{conference.tags}</Text>
        <Text style={styles.conferenceDate}>{conference.date}</Text>
      </View>

      <View style={styles.conferenceActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditConference', { conferenceId: conference.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(conference.id)}
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
        <Text style={styles.loadingText}>Cargando conferencias...</Text>
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
          <Text style={styles.title}>Gestión de Conferencias</Text>
          <Text style={styles.subtitle}>{filteredConferences.length} conferencias encontradas</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateConference')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conferencias..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.conferencesList}>
        {filteredConferences.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay conferencias</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron conferencias con ese criterio' : 'Comienza creando tu primera conferencia'}
            </Text>
          </View>
        ) : (
          filteredConferences.map((conference) => (
            <ConferenceCard key={conference.id} conference={conference} />
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
  conferencesList: {
    gap: 16,
  },
  conferenceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  conferenceImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  conferenceImage: {
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
  conferenceContent: {
    flex: 1,
  },
  conferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  conferenceSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  conferenceTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  conferenceDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  conferenceActions: {
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

export default ConferencesCRUDScreen;
