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
import { projectsService } from '../services/firestore';
import socialMediaService from '../config/socialMediaConfig';
import { storageService } from '../services/storage';
import geminiService from '../config/geminiConfig';

const { width, height } = Dimensions.get('window');

const EditProjectScreen = ({ navigation, route }) => {
  const { projectId } = route.params;
  console.log('EditProjectScreen - Received projectId:', projectId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [project, setProject] = useState(null);
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
  const [publishing, setPublishing] = useState({ linkedin: false, instagram: false, twitter: false });
  const [generatingContent, setGeneratingContent] = useState(false);
  
  // Form fields - campos de la colección project
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category: '',
    description: '',
    content: '',
    image: '',
    detailImage: '',
    tags: '',
    company: '',
    website: '',
    date: '',
    path: '',
    url: '',
    event: '',
    brochure: '',
    video: '',
    videolink1: '',
    press1: '',
    press2: '',
    press3: '',
    press4: '',
    presslink1: '',
    presslink2: '',
    presslink3: '',
    presslink4: '',
    image1: '',
    image2: '',
    image3: '',
    image4: '',
    video1: ''
  });

  // Función para cargar datos
  const loadProject = async () => {
    try {
      console.log('loadProject called with projectId:', projectId);
      setLoading(true);
      
      const data = await projectsService.getById(projectId);
      console.log('Data loaded:', data);
      
      setProject(data);
      setFormData({
        title: data.title || '',
        subtitle: data.subtitle || '',
        category: data.category || '',
        description: data.description || '',
        content: data.content || '',
        image: data.image || '',
        detailImage: data.detailImage || '',
        tags: data.tags || '',
        company: data.company || '',
        website: data.website || '',
        date: data.date || '',
        path: data.path || '',
        url: data.url || '',
        event: data.event || '',
        brochure: data.brochure || '',
        video: data.video || '',
        videolink1: data.videolink1 || '',
        press1: data.press1 || '',
        press2: data.press2 || '',
        press3: data.press3 || '',
        press4: data.press4 || '',
        presslink1: data.presslink1 || '',
        presslink2: data.presslink2 || '',
        presslink3: data.presslink3 || '',
        presslink4: data.presslink4 || '',
        image1: data.image1 || '',
        image2: data.image2 || '',
        image3: data.image3 || '',
        image4: data.image4 || '',
        video1: data.video1 || ''
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
      console.error('Error loading project:', error);
      Alert.alert('Error', `Error al cargar el proyecto: ${error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // useEffect para cargar datos
  useEffect(() => {
    console.log('useEffect triggered with projectId:', projectId);
    if (projectId) {
      console.log('Calling loadProject from useEffect...');
      loadProject();
    } else {
      console.error('No projectId provided');
      Alert.alert('Error', 'No se proporcionó ID del proyecto');
      navigation.goBack();
    }
  }, [projectId]);
  
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

  const generateSocialMediaContent = async () => {
    try {
      setGeneratingContent(true);
      
      const prompt = `Genera contenido para redes sociales basado en este proyecto:

Título: ${formData.title || '[Sin título]'}
Subtítulo: ${formData.subtitle || '[Sin subtítulo]'}
Categoría: ${formData.category || '[Sin categoría]'}
Empresa: ${formData.company || '[Sin empresa]'}
Descripción: ${formData.description || '[Sin descripción]'}
Contenido: ${formData.content ? formData.content.replace(/<[^>]+>/g, '').substring(0, 500) + '...' : '[Sin contenido]'}

IMPORTANTE: 
- Los campos título, subtítulo, categoría y empresa son fijos y NO deben ser generados ni modificados.
- NO uses emojis en ninguna de las respuestas.

Genera contenido específico para cada plataforma:

LinkedIn: Contenido profesional y detallado sobre el proyecto (máximo 3000 caracteres)
Instagram: Contenido visual y atractivo sobre el proyecto (máximo 2200 caracteres)  
Twitter: Contenido conciso y directo sobre el proyecto (máximo 280 caracteres)

Devuelve un JSON con esta estructura:
{
  "linkedin": "contenido para LinkedIn",
  "instagram": "contenido para Instagram", 
  "twitter": "contenido para Twitter"
}`;

      const response = await geminiService.generateContent(prompt);
      const parsed = JSON.parse(response);
      
      if (parsed.linkedin) {
        setSocialMediaData(prev => ({ ...prev, linkedin: parsed.linkedin }));
      }
      if (parsed.instagram) {
        setSocialMediaData(prev => ({ ...prev, instagram: parsed.instagram }));
      }
      if (parsed.twitter) {
        setSocialMediaData(prev => ({ ...prev, twitter: parsed.twitter }));
      }
      
      Alert.alert('Éxito', 'Contenido de redes sociales generado correctamente');
    } catch (error) {
      console.error('Error generating social media content:', error);
      Alert.alert('Error', 'No se pudo generar el contenido de redes sociales');
    } finally {
      setGeneratingContent(false);
    }
  };

  // useEffect para dimensiones
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

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

      await projectsService.update(projectId, updateData);
      
      Alert.alert(
        'Éxito', 
        'Proyecto actualizado correctamente',
        [{ text: 'OK', onPress: () => navigation.navigate('ProjectsCRUD') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el proyecto');
      console.error('Error updating project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('ProjectsCRUD');
  };

  const handleCancel = () => {
    // Deshacer cambios - restaurar datos originales
    if (project) {
      setFormData({
        title: project.title || '',
        subtitle: project.subtitle || '',
        category: project.category || '',
        description: project.description || '',
        content: project.content || '',
        image: project.image || '',
        detailImage: project.detailImage || '',
        tags: project.tags || '',
        company: project.company || '',
        website: project.website || '',
        date: project.date || '',
        path: project.path || '',
        url: project.url || '',
        event: project.event || '',
        brochure: project.brochure || '',
        video: project.video || '',
        videolink1: project.videolink1 || '',
        press1: project.press1 || '',
        press2: project.press2 || '',
        press3: project.press3 || '',
        press4: project.press4 || '',
        presslink1: project.presslink1 || '',
        presslink2: project.presslink2 || '',
        presslink3: project.presslink3 || '',
        presslink4: project.presslink4 || '',
        image1: project.image1 || '',
        image2: project.image2 || '',
        image3: project.image3 || '',
        image4: project.image4 || '',
        video1: project.video1 || ''
      });
      setIsDraft(project.draft !== false);
      
      // Restaurar datos de redes sociales
      if (project.socialMedia) {
        setSocialMediaData({
          linkedin: project.socialMedia.linkedin || '',
          instagram: project.socialMedia.instagram || '',
          twitter: project.socialMedia.twitter || '',
          settings: {
            genLinkedin: project.socialMedia.settings?.genLinkedin !== false,
            genInstagram: project.socialMedia.settings?.genInstagram !== false,
            genTwitter: project.socialMedia.settings?.genTwitter || false
          }
        });
        setPublishedStatus({
          linkedin: !!project.socialMedia?.published?.linkedin,
          instagram: !!project.socialMedia?.published?.instagram,
          twitter: !!project.socialMedia?.published?.twitter,
        });
      }
    }
    Alert.alert('Cambios deshechos', 'Se han restaurado los valores originales del proyecto');
  };

  // Función unificada para republicar en redes sociales
  const republishToSocialMedia = async (platform, content) => {
    try {
      setPublishing(prev => ({ ...prev, [platform]: true }));
      
      // Asegurar URL pública de imagen (igual que en publicación inicial)
      let imageToUse = formData.image;
      console.log(`[EditProjectScreen] Republicando en ${platform}...`);
      
      if (imageToUse && !/^https?:\/\//i.test(imageToUse)) {
        try {
          console.log(`[EditProjectScreen] Imagen no es URL pública. Subiendo a Storage...`);
          const uploadResult = await storageService.uploadImage(imageToUse, 'project-images');
          if (uploadResult?.success && uploadResult.url) {
            imageToUse = uploadResult.url;
            console.log(`[EditProjectScreen] Imagen subida. URL pública:`, imageToUse);
          } else {
            console.warn(`[EditProjectScreen] Falló subida a Storage, se publicará sin imagen`);
            imageToUse = null;
          }
        } catch (uploadErr) {
          console.warn(`[EditProjectScreen] Error subiendo imagen para ${platform}:`, uploadErr?.message || uploadErr);
          imageToUse = null;
        }
      }

      // Publicar según la plataforma
      let result;
      if (platform === 'linkedin') {
        result = await socialMediaService.publishToLinkedIn(content, imageToUse);
      } else if (platform === 'instagram') {
        result = await socialMediaService.publishToInstagram(content, imageToUse);
      } else if (platform === 'twitter') {
        result = await socialMediaService.publishToTwitter(content);
      }

      if (result?.success) {
        setPublishedStatus(prev => ({ ...prev, [platform]: true }));
        
        // Actualizar el estado en Firebase también
        const updateData = {
          ...formData,
          draft: isDraft,
          updatedAt: new Date(),
          socialMedia: { 
            ...socialMediaData, 
            published: { ...publishedStatus, [platform]: true } 
          }
        };
        await projectsService.update(projectId, updateData);
        
        Alert.alert('Éxito', `Re-publicado en ${platform === 'twitter' ? 'Twitter/X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`);
      } else {
        Alert.alert('Error', result?.error || `No se pudo re-publicar en ${platform === 'twitter' ? 'Twitter/X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`);
      }
    } catch (e) {
      console.error(`Error republicando en ${platform}:`, e);
      Alert.alert('Error', e?.message || `No se pudo re-publicar en ${platform === 'twitter' ? 'Twitter/X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`);
    } finally {
      setPublishing(prev => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
        <Text style={styles.loadingText}>ID: {projectId}</Text>
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
            Editar Proyecto
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet, isMobile && styles.subtitleMobile]}>
            Modifica los campos del proyecto
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
              placeholder="Título del proyecto"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Subtítulo</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.subtitle}
              onChangeText={(value) => handleInputChange('subtitle', value)}
              placeholder="Subtítulo del proyecto"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Categoría</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.category}
              onChangeText={(value) => handleInputChange('category', value)}
              placeholder="Ej: Smart Building, IoT Platform"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Empresa</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.company}
              onChangeText={(value) => handleInputChange('company', value)}
              placeholder="Nombre de la empresa"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Fecha</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.date}
              onChangeText={(value) => handleInputChange('date', value)}
              placeholder="Ej: 2024"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Tags</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.tags}
              onChangeText={(value) => handleInputChange('tags', value)}
              placeholder="Ej: #iot #platform #azure #iothub"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          {/* Toggle para borrador/publicado */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, isTablet && styles.toggleLabelTablet, isMobile && styles.toggleLabelMobile]}>
                Estado del Proyecto
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
              {isDraft ? 'El proyecto está en borrador y no se muestra en la web' : 'El proyecto está publicado y es visible en la web'}
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
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Descripción</Text>
            <TextInput
              style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Descripción breve del proyecto"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido completo (HTML)</Text>
            <TextInput
              style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
              value={formData.content}
              onChangeText={(value) => handleInputChange('content', value)}
              placeholder="Contenido HTML completo del proyecto"
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
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen de detalle</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.detailImage}
              onChangeText={(value) => handleInputChange('detailImage', value)}
              placeholder="Ruta de la imagen de detalle"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Website</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.website}
              onChangeText={(value) => handleInputChange('website', value)}
              placeholder="https://ejemplo.com"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Path</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.path}
              onChangeText={(value) => handleInputChange('path', value)}
              placeholder="Ej: /portfolio/nombre-proyecto"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>URL completa</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.url}
              onChangeText={(value) => handleInputChange('url', value)}
              placeholder="https://asiergonzalez.es/portfolio/nombre-proyecto"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Evento</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.event}
              onChangeText={(value) => handleInputChange('event', value)}
              placeholder="Ej: proyecto_view"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
          <View style={styles.cardAccent} />
        </View>

        {/* Medios adicionales */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Medios Adicionales
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Brochure</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.brochure}
              onChangeText={(value) => handleInputChange('brochure', value)}
              placeholder="Ruta del brochure PDF"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Video</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.video}
              onChangeText={(value) => handleInputChange('video', value)}
              placeholder="Título del video"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Video Link</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.videolink1}
              onChangeText={(value) => handleInputChange('videolink1', value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Video ID</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.video1}
              onChangeText={(value) => handleInputChange('video1', value)}
              placeholder="ID del video de YouTube"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
          <View style={styles.cardAccent} />
        </View>

        {/* Imágenes adicionales */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Imágenes Adicionales
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen 1</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.image1}
              onChangeText={(value) => handleInputChange('image1', value)}
              placeholder="Ruta de la imagen 1"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen 2</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.image2}
              onChangeText={(value) => handleInputChange('image2', value)}
              placeholder="Ruta de la imagen 2"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen 3</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.image3}
              onChangeText={(value) => handleInputChange('image3', value)}
              placeholder="Ruta de la imagen 3"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen 4</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.image4}
              onChangeText={(value) => handleInputChange('image4', value)}
              placeholder="Ruta de la imagen 4"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
          <View style={styles.cardAccent} />
        </View>

        {/* Prensa */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>
            Prensa
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Prensa 1</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.press1}
              onChangeText={(value) => handleInputChange('press1', value)}
              placeholder="Título de la noticia 1"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Link Prensa 1</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.presslink1}
              onChangeText={(value) => handleInputChange('presslink1', value)}
              placeholder="https://ejemplo.com/noticia1"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Prensa 2</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.press2}
              onChangeText={(value) => handleInputChange('press2', value)}
              placeholder="Título de la noticia 2"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Link Prensa 2</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.presslink2}
              onChangeText={(value) => handleInputChange('presslink2', value)}
              placeholder="https://ejemplo.com/noticia2"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Prensa 3</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.press3}
              onChangeText={(value) => handleInputChange('press3', value)}
              placeholder="Título de la noticia 3"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Link Prensa 3</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.presslink3}
              onChangeText={(value) => handleInputChange('presslink3', value)}
              placeholder="https://ejemplo.com/noticia3"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Prensa 4</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.press4}
              onChangeText={(value) => handleInputChange('press4', value)}
              placeholder="Título de la noticia 4"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Link Prensa 4</Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]}
              value={formData.presslink4}
              onChangeText={(value) => handleInputChange('presslink4', value)}
              placeholder="https://ejemplo.com/noticia4"
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
            <View style={styles.socialMediaActions}>
              <TouchableOpacity 
                style={[styles.generateContentButton, generatingContent && styles.generateContentButtonDisabled]}
                onPress={generateSocialMediaContent}
                disabled={generatingContent}
              >
                {generatingContent ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.generateContentButtonText}>
                  {generatingContent ? 'Generando...' : 'Generar Contenido'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={loadConnectedPlatforms}
              >
                <Ionicons name="refresh-outline" size={20} color="#64D2FF" />
              </TouchableOpacity>
            </View>
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
                  {!publishedStatus.linkedin ? (
                    <TouchableOpacity 
                      style={[styles.postBtn, (publishing.linkedin || !socialMediaData.linkedin?.trim()) && styles.postBtnDisabled]}
                      onPress={async () => {
                        try {
                          setPublishing(prev => ({ ...prev, linkedin: true }));
                          const res = await socialMediaService.publishToLinkedIn(socialMediaData.linkedin, formData.image);
                          if (res.success) {
                            setPublishedStatus(prev => ({ ...prev, linkedin: true }));
                            
                            // Actualizar el estado en Firebase también
                            const updateData = {
                              ...formData,
                              draft: isDraft,
                              updatedAt: new Date(),
                              socialMedia: { 
                                ...socialMediaData, 
                                published: { ...publishedStatus, linkedin: true } 
                              }
                            };
                            await projectsService.update(projectId, updateData);
                            
                            Alert.alert('Éxito', 'Publicado en LinkedIn');
                          } else {
                            Alert.alert('Error', res.error || 'No se pudo publicar en LinkedIn');
                          }
                        } catch (err) {
                          Alert.alert('Error', err?.message || 'No se pudo publicar en LinkedIn');
                        } finally {
                          setPublishing(prev => ({ ...prev, linkedin: false }));
                        }
                      }}
                      disabled={publishing.linkedin || !socialMediaData.linkedin?.trim()}
                    >
                      {publishing.linkedin ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>
                        {publishing.linkedin ? 'Publicando...' : 'Publicar'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.postBtn}
                      onPress={() => republishToSocialMedia('linkedin', socialMediaData.linkedin)}
                    >
                      {publishing.linkedin ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="refresh" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>{publishing.linkedin ? '...' : 'Re-publicar'}</Text>
                    </TouchableOpacity>
                  )}
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
                  {!publishedStatus.instagram ? (
                    <TouchableOpacity 
                      style={[styles.postBtn, (publishing.instagram || !socialMediaData.instagram?.trim()) && styles.postBtnDisabled]}
                      onPress={async () => {
                        try {
                          setPublishing(prev => ({ ...prev, instagram: true }));
                          const res = await socialMediaService.publishToInstagram(socialMediaData.instagram, formData.image);
                          if (res.success) {
                            setPublishedStatus(prev => ({ ...prev, instagram: true }));
                            
                            // Actualizar el estado en Firebase también
                            const updateData = {
                              ...formData,
                              draft: isDraft,
                              updatedAt: new Date(),
                              socialMedia: { 
                                ...socialMediaData, 
                                published: { ...publishedStatus, instagram: true } 
                              }
                            };
                            await projectsService.update(projectId, updateData);
                            
                            Alert.alert('Éxito', 'Publicado en Instagram');
                          } else {
                            Alert.alert('Error', res.error || 'No se pudo publicar en Instagram');
                          }
                        } catch (err) {
                          Alert.alert('Error', err?.message || 'No se pudo publicar en Instagram');
                        } finally {
                          setPublishing(prev => ({ ...prev, instagram: false }));
                        }
                      }}
                      disabled={publishing.instagram || !socialMediaData.instagram?.trim()}
                    >
                      {publishing.instagram ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>
                        {publishing.instagram ? 'Publicando...' : 'Publicar'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.postBtn}
                      onPress={() => republishToSocialMedia('instagram', socialMediaData.instagram)}
                    >
                      {publishing.instagram ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="refresh" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>{publishing.instagram ? '...' : 'Re-publicar'}</Text>
                    </TouchableOpacity>
                  )}
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
                  {!publishedStatus.twitter ? (
                    <TouchableOpacity 
                      style={[styles.postBtn, (publishing.twitter || !socialMediaData.twitter?.trim()) && styles.postBtnDisabled]}
                      onPress={async () => {
                        try {
                          setPublishing(prev => ({ ...prev, twitter: true }));
                          const res = await socialMediaService.publishToTwitter(socialMediaData.twitter);
                          if (res.success) {
                            setPublishedStatus(prev => ({ ...prev, twitter: true }));
                            
                            // Actualizar el estado en Firebase también
                            const updateData = {
                              ...formData,
                              draft: isDraft,
                              updatedAt: new Date(),
                              socialMedia: { 
                                ...socialMediaData, 
                                published: { ...publishedStatus, twitter: true } 
                              }
                            };
                            await projectsService.update(projectId, updateData);
                            
                            Alert.alert('Éxito', 'Publicado en Twitter/X');
                          } else {
                            Alert.alert('Error', res.error || 'No se pudo publicar en Twitter/X');
                          }
                        } catch (err) {
                          Alert.alert('Error', err?.message || 'No se pudo publicar en Twitter/X');
                        } finally {
                          setPublishing(prev => ({ ...prev, twitter: false }));
                        }
                      }}
                      disabled={publishing.twitter || !socialMediaData.twitter?.trim()}
                    >
                      {publishing.twitter ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>
                        {publishing.twitter ? 'Publicando...' : 'Publicar'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.postBtn}
                      onPress={() => republishToSocialMedia('twitter', socialMediaData.twitter)}
                    >
                      {publishing.twitter ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="refresh" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.postBtnText}>{publishing.twitter ? '...' : 'Re-publicar'}</Text>
                    </TouchableOpacity>
                  )}
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
  socialMediaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  generateContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  generateContentButtonDisabled: {
    backgroundColor: 'rgba(156, 39, 176, 0.5)',
  },
  generateContentButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
});

export default EditProjectScreen;
