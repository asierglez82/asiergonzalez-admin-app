import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Dimensions, 
  Image, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blogPostsService } from '../services/firestore';

const { width, height } = Dimensions.get('window');

const EditBlogPostScreen = ({ navigation, route }) => {
  const { postId } = route.params;
  console.log('EditBlogPostScreen - Received postId:', postId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [post, setPost] = useState(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    date: '',
    content: '',
    modalContent: '',
    tags: '',
    image: '',
    modalImage: '',
    pdfFile: '',
    event: '',
    modal: 'mymodal',
    width: '1200px',
    path: '',
    url: ''
  });

  // Función para cargar datos
  const loadBlogPost = async () => {
    try {
      console.log('loadBlogPost called with postId:', postId);
      setLoading(true);
      
      const data = await blogPostsService.getById(postId);
      console.log('Data loaded:', data);
      
      setPost(data);
      setFormData({
        title: data.title || '',
        subtitle: data.subtitle || '',
        author: data.author || '',
        date: data.date || '',
        content: data.content || '',
        modalContent: data.modalContent || '',
        tags: data.tags || '',
        image: data.image || '',
        modalImage: data.modalImage || '',
        pdfFile: data.pdfFile || '',
        event: data.event || '',
        modal: data.modal || 'mymodal',
        width: data.width || '1200px',
        path: data.path || '',
        url: data.url || ''
      });
      
      console.log('Form data set:', formData);
    } catch (error) {
      console.error('Error loading blog post:', error);
      Alert.alert('Error', `Error al cargar el post: ${error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // useEffect para cargar datos
  useEffect(() => {
    console.log('useEffect triggered with postId:', postId);
    if (postId) {
      console.log('Calling loadBlogPost from useEffect...');
      loadBlogPost();
    } else {
      console.error('No postId provided');
      Alert.alert('Error', 'No se proporcionó ID del post');
      navigation.goBack();
    }
  }, [postId]);

  // useEffect para dimensiones
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Monitorear cambios en formData
  useEffect(() => {
    console.log('FormData changed:', formData);
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!formData.title.trim()) {
        Alert.alert('Error', 'El título es requerido');
        return;
      }
      
      const updateData = {
        ...formData,
        updatedAt: new Date()
      };

      await blogPostsService.update(postId, updateData);
      
      Alert.alert(
        'Éxito', 
        'Post actualizado correctamente',
        [{ text: 'OK', onPress: () => navigation.navigate('BlogCRUD') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el post');
      console.error('Error updating blog post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar edición',
      '¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Cancelar', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  console.log('Rendering with formData:', formData);
  console.log('Rendering with post:', post);
  console.log('Rendering with loading:', loading);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando post del blog...</Text>
        <Text style={styles.loadingText}>ID: {postId}</Text>
      </View>
    );
  }

  const isTablet = screenData.width >= 768;
  const isMobile = screenData.width < 768;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet, isMobile && styles.headerMobile]}>
        <TouchableOpacity 
          style={[styles.backButton, isTablet && styles.backButtonTablet, isMobile && styles.backButtonMobile]}
          onPress={handleCancel}
        >
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={[styles.headerContent, isTablet && styles.headerContentTablet, isMobile && styles.headerContentMobile]}>
          <Text style={[styles.title, isTablet && styles.titleTablet, isMobile && styles.titleMobile]}>
            Editar Post del Blog
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet, isMobile && styles.subtitleMobile]}>
            Modifica los campos del post
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveButton, isTablet && styles.saveButtonTablet, isMobile && styles.saveButtonMobile, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={isTablet ? 28 : 24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet, isMobile && styles.scrollContentMobile]}>
        {/* Información básica */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Información Básica
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Título *</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Título del post"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Autor *</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.author}
              onChangeText={(value) => handleInputChange('author', value)}
              placeholder="Nombre del autor"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Fecha *</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.date}
              onChangeText={(value) => handleInputChange('date', value)}
              placeholder="Ej: 6 June 2025"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Tags</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.tags}
              onChangeText={(value) => handleInputChange('tags', value)}
              placeholder="Ej: #tag1 #tag2"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        </View>

        {/* Contenido */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Contenido
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido breve</Text>
            <TextInput
              style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
              value={formData.content}
              onChangeText={(value) => handleInputChange('content', value)}
              placeholder="Descripción breve del post"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido modal (HTML)</Text>
            <TextInput
              style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
              value={formData.modalContent}
              onChangeText={(value) => handleInputChange('modalContent', value)}
              placeholder="Contenido HTML para el modal"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              numberOfLines={8}
            />
          </View>
        </View>

        {/* URLs e imágenes */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            URLs e Imágenes
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen principal</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.image}
              onChangeText={(value) => handleInputChange('image', value)}
              placeholder="URL de la imagen principal"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Path</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.path}
              onChangeText={(value) => handleInputChange('path', value)}
              placeholder="Ej: /blog/mi-post"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>URL completa</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.url}
              onChangeText={(value) => handleInputChange('url', value)}
              placeholder="https://asiergonzalez.es/blog/mi-post"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  saveButton: {
    backgroundColor: '#00ca77',
    borderRadius: 8,
    padding: 12,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 202, 119, 0.5)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Responsive styles for tablets (768px+)
  scrollContentTablet: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerTablet: {
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  backButtonTablet: {
    padding: 12,
    marginRight: 20,
  },
  headerContentTablet: {
    flex: 1,
  },
  titleTablet: {
    fontSize: 32,
    marginBottom: 6,
  },
  subtitleTablet: {
    fontSize: 16,
  },
  saveButtonTablet: {
    padding: 16,
    borderRadius: 12,
  },
  sectionTablet: {
    marginBottom: 40,
  },
  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 24,
  },
  labelTablet: {
    fontSize: 18,
    marginBottom: 10,
  },
  inputTablet: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    borderRadius: 12,
  },
  textAreaTablet: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    borderRadius: 12,
    minHeight: 120,
  },

  // Responsive styles for mobile (< 768px)
  scrollContentMobile: {
    padding: 16,
  },
  headerMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonMobile: {
    padding: 6,
    marginRight: 12,
  },
  headerContentMobile: {
    flex: 1,
  },
  titleMobile: {
    fontSize: 20,
    marginBottom: 2,
  },
  subtitleMobile: {
    fontSize: 12,
  },
  saveButtonMobile: {
    padding: 8,
    borderRadius: 6,
  },
  sectionMobile: {
    marginBottom: 24,
  },
  sectionTitleMobile: {
    fontSize: 18,
    marginBottom: 16,
  },
  labelMobile: {
    fontSize: 14,
    marginBottom: 6,
  },
  inputMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderRadius: 6,
  },
  textAreaMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderRadius: 6,
    minHeight: 80,
  },
});

export default EditBlogPostScreen;