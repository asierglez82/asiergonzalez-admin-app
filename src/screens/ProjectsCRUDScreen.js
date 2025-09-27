import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectsService } from '../services/firestore';

const { width } = Dimensions.get('window');

const ProjectsCRUDScreen = ({ navigation }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getAllProjects();
      setProjects(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los proyectos');
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(project => 
      project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProjects(filtered);
  };

  const handleDelete = (projectId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este proyecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteProject(projectId)
        }
      ]
    );
  };

  const deleteProject = async (projectId) => {
    try {
      await projectsService.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      Alert.alert('Éxito', 'Proyecto eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el proyecto');
      console.error('Error deleting project:', error);
    }
  };

  const ProjectCard = ({ project }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectImageContainer}>
        {project.image ? (
          <Image source={{ uri: project.image }} style={styles.projectImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.projectContent}>
        <Text style={styles.projectTitle} numberOfLines={2}>{project.title}</Text>
        <Text style={styles.projectSubtitle} numberOfLines={1}>{project.subtitle}</Text>
        <Text style={styles.projectDescription} numberOfLines={2}>{project.description}</Text>
        <Text style={styles.projectTags} numberOfLines={1}>{project.tags}</Text>
        <Text style={styles.projectDate}>{project.date}</Text>
      </View>

      <View style={styles.projectActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditProject', { projectId: project.id })}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(project.id)}
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
        <Text style={styles.loadingText}>Cargando proyectos...</Text>
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
          <Text style={styles.title}>Gestión de Proyectos</Text>
          <Text style={styles.subtitle}>{filteredProjects.length} proyectos encontrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateProject')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar proyectos..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.projectsList}>
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No hay proyectos</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'No se encontraron proyectos con ese criterio' : 'Comienza creando tu primer proyecto'}
            </Text>
          </View>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
  projectsList: {
    gap: 16,
  },
  projectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  projectImage: {
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
  projectContent: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  projectTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  projectActions: {
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

export default ProjectsCRUDScreen;
