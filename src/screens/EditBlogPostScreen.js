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
import socialMediaService from '../config/socialMediaConfig';

const { width, height } = Dimensions.get('window');

const EditBlogPostScreen = ({ navigation, route }) => {
  const { postId } = route.params;
  console.log('EditBlogPostScreen - Received postId:', postId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [post, setPost] = useState(null);
  const [isDraft, setIsDraft] = useState(true);
  
  // Estados para redes sociales
  const [connectedPlatforms, setConnectedPlatforms] = useState({
    instagram: false,
    twitter: false,
    linkedin: false
  });
  const [socialMediaData, setSocialMediaData] = useState({
    linkedin: '',
    instagram: '',
    twitter: '',
    settings: {
      genLinkedin: true,
      genInstagram: true,
      genTwitter: false
    }
  });
  const [publishedStatus, setPublishedStatus] = useState({
    linkedin: false,
    instagram: false,
    twitter: false,
  });
  
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
      
      // Cargar datos de redes sociales si existen
      if (data.socialMedia) {
        setSocialMediaData({
          linkedin: data.socialMedia.linkedin || '',
          instagram: data.socialMedia.instagram || '',
          twitter: data.socialMedia.twitter || '',
          settings: {
            genLinkedin: data.socialMedia.settings?.genLinkedin !== false,
            genInstagram: data.socialMedia.settings?.genInstagram !== false,
            genTwitter: data.socialMedia.settings?.genTwitter || false
          }
        });
        setPublishedStatus({
          linkedin: !!data.socialMedia?.published?.linkedin,
          instagram: !!data.socialMedia?.published?.instagram,
          twitter: !!data.socialMedia?.published?.twitter,
        });
      }
      
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
  
  // Cargar plataformas conectadas al montar el componente
  useEffect(() => {
    loadConnectedPlatforms();
  }, []);
  
  const loadConnectedPlatforms = async () => {
    try {
      const platforms = await socialMediaService.getConnectedPlatforms();
      setConnectedPlatforms(platforms);
    } catch (error) {
      console.error('Error loading connected platforms:', error);
    }
  };

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
        updatedAt: new Date(),
        // Incluir datos de redes sociales
        socialMedia: { ...socialMediaData, published: publishedStatus }
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

  // Función para publicar (actualizar a publicado Y publicar en redes sociales)
  const handlePublish = async () => {
    try {
      setSaving(true);
      
      if (!formData.title.trim()) {
        Alert.alert('Error', 'El título es requerido');
        return;
      }
      
      // 1. Actualizar el post como publicado
      const updateData = {
        ...formData,
        draft: false, // Marcar como publicado
        updatedAt: new Date(),
        socialMedia: { ...socialMediaData, published: publishedStatus }
      };

      await blogPostsService.update(postId, updateData);
      
      // 2. Publicar en redes sociales si hay contenido
      const platformsContent = {};
      
      if (connectedPlatforms.linkedin && socialMediaData.linkedin && socialMediaData.settings.genLinkedin) {
        platformsContent.linkedin = socialMediaData.linkedin;
      }
      
      if (connectedPlatforms.instagram && socialMediaData.instagram && socialMediaData.settings.genInstagram) {
        platformsContent.instagram = socialMediaData.instagram;
      }
      
      if (connectedPlatforms.twitter && socialMediaData.twitter && socialMediaData.settings.genTwitter) {
        platformsContent.twitter = socialMediaData.twitter;
      }
      
      let socialMediaResults = null;
      
      // Si hay contenido para publicar en redes sociales, publicar
      if (Object.keys(platformsContent).length > 0) {
        try {
          console.log('Publicando en redes sociales desde edición...');
          
          const result = await socialMediaService.publishToMultiplePlatforms(
            platformsContent, 
            formData.image
          );
          
          socialMediaResults = result;
          console.log('Resultado publicación redes sociales:', result);
        } catch (socialError) {
          console.warn('Error publicando en redes sociales:', socialError);
        }
      }
      
      // Mostrar mensaje de éxito
      const webMessage = 'Post publicado en la web correctamente.';
      let socialMessage = '';
      
      if (socialMediaResults && socialMediaResults.success) {
        const { successful, total, failed } = socialMediaResults.summary;
        socialMessage = ` También publicado en ${successful} de ${total} redes sociales.`;
        if (failed > 0) {
          socialMessage += ` ${failed} fallaron.`;
        }
      } else if (Object.keys(platformsContent).length > 0) {
        socialMessage = ' Error al publicar en redes sociales.';
      } else {
        socialMessage = ' Sin contenido para redes sociales.';
      }
      
      Alert.alert(
        'Publicación completada', 
        webMessage + socialMessage,
        [{ text: 'OK', onPress: () => navigation.navigate('BlogCRUD') }]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Error al publicar el post');
      console.error('Error publishing blog post:', error);
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
      
      // Restaurar datos de redes sociales
      if (post.socialMedia) {
        setSocialMediaData({
          linkedin: post.socialMedia.linkedin || '',
          instagram: post.socialMedia.instagram || '',
          twitter: post.socialMedia.twitter || '',
          settings: {
            genLinkedin: post.socialMedia.settings?.genLinkedin !== false,
            genInstagram: post.socialMedia.settings?.genInstagram !== false,
            genTwitter: post.socialMedia.settings?.genTwitter || false
          }
        });
        setPublishedStatus({
          linkedin: !!post.socialMedia?.published?.linkedin,
          instagram: !!post.socialMedia?.published?.instagram,
          twitter: !!post.socialMedia?.published?.twitter,
        });
      }
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
          <TouchableOpacity 
            style={[styles.iconHeaderButton, isTablet && styles.iconHeaderButtonTablet, isMobile && styles.iconHeaderButtonMobile]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={isTablet ? 24 : 20} color="#FFFFFF" />
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
          <View style={styles.cardAccent} />
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
          <View style={styles.cardAccent} />
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
          <View style={styles.cardAccent} />
        </View>

        {/* Sección de redes sociales */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Redes Sociales
          </Text>
          
          <View style={styles.socialMediaHeader}>
            <Text style={styles.socialMediaSubtitle}>Estado de plataformas conectadas</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadConnectedPlatforms}
            >
              <Ionicons name="refresh-outline" size={20} color="#64D2FF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.connectedPlatforms}>
            <View style={[styles.platformIndicator, connectedPlatforms.instagram && styles.platformConnected]}>
              <Ionicons 
                name="logo-instagram" 
                size={20} 
                color={connectedPlatforms.instagram ? "#FF2D92" : "rgba(255,255,255,0.3)"} 
              />
              <Text style={[styles.platformText, connectedPlatforms.instagram && styles.platformTextConnected]}>
                Instagram
              </Text>
              {connectedPlatforms.instagram && (
                <Ionicons name="checkmark-circle" size={16} color="#00ca77" />
              )}
            </View>
            
            <View style={[styles.platformIndicator, connectedPlatforms.twitter && styles.platformConnected]}>
              <Ionicons 
                name="logo-twitter" 
                size={20} 
                color={connectedPlatforms.twitter ? "#1DA1F2" : "rgba(255,255,255,0.3)"} 
              />
              <Text style={[styles.platformText, connectedPlatforms.twitter && styles.platformTextConnected]}>
                Twitter/X
              </Text>
              {connectedPlatforms.twitter && (
                <Ionicons name="checkmark-circle" size={16} color="#00ca77" />
              )}
            </View>
            
            <View style={[styles.platformIndicator, connectedPlatforms.linkedin && styles.platformConnected]}>
              <Ionicons 
                name="logo-linkedin" 
                size={20} 
                color={connectedPlatforms.linkedin ? "#0A66C2" : "rgba(255,255,255,0.3)"} 
              />
              <Text style={[styles.platformText, connectedPlatforms.linkedin && styles.platformTextConnected]}>
                LinkedIn
              </Text>
              {connectedPlatforms.linkedin && (
                <Ionicons name="checkmark-circle" size={16} color="#00ca77" />
              )}
            </View>
          </View>
          
          {/* Campos de contenido para redes sociales */}
          {socialMediaData.settings.genLinkedin && (
            <View style={styles.inputGroup}>
              <View style={styles.socialFieldHeader}>
                <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido LinkedIn</Text>
                <View style={styles.socialActionsRow}>
                  {publishedStatus.linkedin && (
                    <View style={styles.publishedChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.publishedChipText}>Publicado</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.postBtn, publishedStatus.linkedin && styles.postBtnDisabled]}
                    onPress={async () => {
                      const res = await socialMediaService.publishToLinkedIn(socialMediaData.linkedin, formData.image);
                      if (res.success) {
                        setPublishedStatus(prev => ({ ...prev, linkedin: true }));
                        Alert.alert('Éxito', 'Publicado en LinkedIn');
                      } else {
                        Alert.alert('Error', res.error || 'No se pudo publicar en LinkedIn');
                      }
                    }}
                    disabled={publishedStatus.linkedin}
                  >
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.postBtnText}>{publishedStatus.linkedin ? 'Publicado' : 'Publicar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.linkedin}
                onChangeText={(value) => setSocialMediaData(prev => ({...prev, linkedin: value}))}
                placeholder="Contenido para LinkedIn"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={4}
              />
            </View>
          )}
          
          {socialMediaData.settings.genInstagram && (
            <View style={styles.inputGroup}>
              <View style={styles.socialFieldHeader}>
                <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido Instagram</Text>
                <View style={styles.socialActionsRow}>
                  {publishedStatus.instagram && (
                    <View style={styles.publishedChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.publishedChipText}>Publicado</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.postBtn, publishedStatus.instagram && styles.postBtnDisabled]}
                    onPress={async () => {
                      const res = await socialMediaService.publishToInstagram(socialMediaData.instagram, formData.image);
                      if (res.success) {
                        setPublishedStatus(prev => ({ ...prev, instagram: true }));
                        Alert.alert('Éxito', 'Publicado en Instagram');
                      } else {
                        Alert.alert('Error', res.error || 'No se pudo publicar en Instagram');
                      }
                    }}
                    disabled={publishedStatus.instagram}
                  >
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.postBtnText}>{publishedStatus.instagram ? 'Publicado' : 'Publicar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.instagram}
                onChangeText={(value) => setSocialMediaData(prev => ({...prev, instagram: value}))}
                placeholder="Contenido para Instagram"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={4}
              />
            </View>
          )}
          
          {socialMediaData.settings.genTwitter && (
            <View style={styles.inputGroup}>
              <View style={styles.socialFieldHeader}>
                <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido Twitter/X</Text>
                <View style={styles.socialActionsRow}>
                  {publishedStatus.twitter && (
                    <View style={styles.publishedChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.publishedChipText}>Publicado</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.postBtn, publishedStatus.twitter && styles.postBtnDisabled]}
                    onPress={async () => {
                      const res = await socialMediaService.publishToTwitter(socialMediaData.twitter);
                      if (res.success) {
                        setPublishedStatus(prev => ({ ...prev, twitter: true }));
                        Alert.alert('Éxito', 'Publicado en Twitter/X');
                      } else {
                        Alert.alert('Error', res.error || 'No se pudo publicar en Twitter/X');
                      }
                    }}
                    disabled={publishedStatus.twitter}
                  >
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.postBtnText}>{publishedStatus.twitter ? 'Publicado' : 'Publicar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.twitter}
                onChangeText={(value) => setSocialMediaData(prev => ({...prev, twitter: value}))}
                placeholder="Contenido para Twitter/X"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={4}
              />
            </View>
          )}
          <View style={styles.cardAccent} />
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          {isDraft && (
            <TouchableOpacity 
              style={[styles.publishButton, saving && styles.publishButtonDisabled]} 
              onPress={handlePublish} 
              disabled={saving}
            >
              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
              <Text style={styles.publishButtonText}>{saving ? 'Publicando...' : 'Publicar en Web y Redes Sociales'}</Text>
            </TouchableOpacity>
          )}
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
    color: '#00ca77',
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
  iconHeaderButton: {
    padding: 10,
    backgroundColor: '#00ca77',
    borderRadius: 8,
  },
  iconHeaderButtonTablet: {
    padding: 12,
    borderRadius: 10,
  },
  iconHeaderButtonMobile: {
    padding: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 10,
  },
  saveButton: {
    backgroundColor: '#00ca77',
    borderRadius: 8,
    padding: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00ca77',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  socialFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  socialActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ca77',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  publishedChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ca77',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    alignSelf: 'stretch',
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
    padding: 12,
    borderRadius: 10,
  },
  saveButtonTablet: {
    padding: 12,
    borderRadius: 10,
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

  // Estilos para redes sociales
  socialMediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialMediaSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  connectedPlatforms: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  platformIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 80,
  },
  platformConnected: {
    backgroundColor: 'rgba(0, 202, 119, 0.1)',
    borderColor: 'rgba(0, 202, 119, 0.3)',
  },
  platformText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    textAlign: 'center',
  },
  platformTextConnected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  socialInfoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  // Estilos para botones de acción
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    display: 'none',
  },
  publishButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  publishButtonDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.5)',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default EditBlogPostScreen;