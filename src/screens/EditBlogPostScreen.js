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
  Platform,
  Switch
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
  const [isDraft, setIsDraft] = useState(true);
  
  // Form fields - actualizados para coincidir con Firebase
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    date: '',
    modalContent: '',
    tags: '',
    image: '',
    event: '',
    modal: 'mymodal',
    width: '1200px',
    path: '',
    url: '',
    slug: ''
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
        author: data.author || '',
        date: data.date || '',
        modalContent: data.modalContent || '',
        tags: data.tags || '',
        image: data.image || '',
        event: data.event || '',
        modal: data.modal || 'mymodal',
        width: data.width || '1200px',
        path: data.path || '',
        url: data.url || '',
        slug: data.slug || ''
      });
      
      // Inicializar estado de borrador
      setIsDraft(data.draft !== false);
      
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
        draft: isDraft,
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

  const handleBack = () => {
    navigation.navigate('BlogCRUD');
  };

  const handleCancel = () => {
    // Deshacer cambios - restaurar datos originales
    if (post) {
      setFormData({
        title: post.title || '',
        author: post.author || '',
        date: post.date || '',
        modalContent: post.modalContent || '',
        tags: post.tags || '',
        image: post.image || '',
        event: post.event || '',
        modal: post.modal || 'mymodal',
        width: post.width || '1200px',
        path: post.path || '',
        url: post.url || '',
        slug: post.slug || ''
      });
      setIsDraft(post.draft !== false);
    }
    Alert.alert('Cambios deshechos', 'Se han restaurado los valores originales del post');
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
          onPress={handleBack}
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
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.cancelButton, isTablet && styles.cancelButtonTablet, isMobile && styles.cancelButtonMobile]}
            onPress={handleCancel}
          >
            <Ionicons name="arrow-undo" size={isTablet ? 28 : 24} color="#FFFFFF" />
          </TouchableOpacity>
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
              placeholder="Ej: 23 July 2024"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Evento</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.event}
              onChangeText={(value) => handleInputChange('event', value)}
              placeholder="Ej: Web Summit"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Tags</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.tags}
              onChangeText={(value) => handleInputChange('tags', value)}
              placeholder="Ej: #emprendimiento #innovación #liderazgo"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          {/* Toggle para borrador/publicado */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, isTablet && styles.toggleLabelTablet, isMobile && styles.toggleLabelMobile]}>
                Estado del Post
              </Text>
              <View style={styles.toggleContainer}>
                <Text style={[styles.toggleText, isDraft && styles.toggleTextActive]}>
                  Borrador
                </Text>
                <Switch
                  value={!isDraft}
                  onValueChange={(value) => setIsDraft(!value)}
                  trackColor={{ false: '#FF9800', true: '#4CAF50' }}
                  thumbColor={isDraft ? '#FFFFFF' : '#FFFFFF'}
                />
                <Text style={[styles.toggleText, !isDraft && styles.toggleTextActive]}>
                  Publicado
                </Text>
              </View>
            </View>
            <Text style={[styles.toggleDescription, isTablet && styles.toggleDescriptionTablet, isMobile && styles.toggleDescriptionMobile]}>
              {isDraft ? 'El post está en borrador y no se muestra en la web' : 'El post está publicado y es visible en la web'}
            </Text>
          </View>
        </View>

        {/* Contenido */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Contenido
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido modal (HTML) *</Text>
            <TextInput
              style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
              value={formData.modalContent}
              onChangeText={(value) => handleInputChange('modalContent', value)}
              placeholder="Contenido HTML completo del blog post"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              numberOfLines={12}
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
              placeholder="Ruta de la imagen principal"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Slug</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.slug}
              onChangeText={(value) => handleInputChange('slug', value)}
              placeholder="Ej: conexiones-que-impulsan-el-futuro-emprendedor"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Path</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.path}
              onChangeText={(value) => handleInputChange('path', value)}
              placeholder="Ej: /blog/conexiones-que-impulsan-el-futuro-emprendedor"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>URL completa</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.url}
              onChangeText={(value) => handleInputChange('url', value)}
              placeholder="https://asiergonzalez.es/blog/conexiones-que-impulsan-el-futuro-emprendedor"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Modal</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.modal}
              onChangeText={(value) => handleInputChange('modal', value)}
              placeholder="mymodal"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Width</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.width}
              onChangeText={(value) => handleInputChange('width', value)}
              placeholder="1200px"
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
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
  cancelButtonTablet: {
    padding: 16,
    borderRadius: 12,
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
  cancelButtonMobile: {
    padding: 8,
    borderRadius: 6,
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

  // Toggle styles
  toggleGroup: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 8,
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },

  // Responsive toggle styles
  toggleLabelTablet: {
    fontSize: 18,
  },
  toggleLabelMobile: {
    fontSize: 14,
  },
  toggleDescriptionTablet: {
    fontSize: 14,
  },
  toggleDescriptionMobile: {
    fontSize: 11,
  },
});

export default EditBlogPostScreen;