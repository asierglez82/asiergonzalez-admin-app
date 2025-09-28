import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, Dimensions, Image, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { buildPrompt, buildComprehensivePrompt } from '../services/ai';
import geminiService from '../config/geminiConfig';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { blogPostsService } from '../services/firestore';
import { storageService } from '../services/storage';
import socialMediaService from '../config/socialMediaConfig';

// Import dom-to-image solo para web
let domtoimage;
if (Platform.OS === 'web') {
  domtoimage = require('dom-to-image');
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isMobile = width < 768;
 
const LANGUAGES = ['es', 'en', 'eu', 'fr']; 

const CreatePostScreen = ({ navigation }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  });
  const [event, setEvent] = useState(''); 
  const [people, setPeople] = useState('');
  const [language, setLanguage] = useState('es');
  const [phrase, setPhrase] = useState('');
  const [cta, setCta] = useState('');
  const [webText, setWebText] = useState('');
  const [notes, setNotes] = useState('');

  // Campos específicos del blog post (basados en Firebase)
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('Asier González');
  const [blogDate, setBlogDate] = useState(() => {
    const today = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  });
  const [modalContent, setModalContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [modal, setModal] = useState('mymodal');
  const [width, setWidth] = useState('1200px');
  const [path, setPath] = useState('');
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');

  const [genLinkedin, setGenLinkedin] = useState(true);
  const [genInstagram, setGenInstagram] = useState(true);
  const [genTwitter, setGenTwitter] = useState(false);
  const [genWeb, setGenWeb] = useState(true);

  // Función para limpiar contenido cuando se desactiva un toggle
  const handleToggleChange = (platform, value) => {
    switch(platform) {
      case 'linkedin':
        setGenLinkedin(value);
        if (!value) setLinkedinText('');
        break;
      case 'instagram':
        setGenInstagram(value);
        if (!value) setInstagramText('');
        break;
      case 'twitter':
        setGenTwitter(value);
        if (!value) setTwitterText('');
        break;
      case 'web':
        setGenWeb(value);
        if (!value) setWebText('');
        break;
    }
  };

  const [linkedinText, setLinkedinText] = useState('');
  const [instagramText, setInstagramText] = useState('');
  const [twitterText, setTwitterText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [jsonPreview, setJsonPreview] = useState(null);
  const composeRef = React.useRef(null);
  const [exporting, setExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingCTA, setGeneratingCTA] = useState(false);
  const [uploadedImagePath, setUploadedImagePath] = useState(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState(new Set());
  const [isDraft, setIsDraft] = useState(true);
  
  // Estados para redes sociales conectadas
  const [connectedPlatforms, setConnectedPlatforms] = useState({
    instagram: false,
    twitter: false,
    linkedin: false
  });
  // Estados de publicación en redes sociales eliminados ya que ahora es automático

  const baseContext = useMemo(() => ({ imageUrl, location, date, event, people, language, phrase }), [imageUrl, location, date, event, people, language, phrase]);

  // Función para generar slug automáticamente
  const generateSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
      .trim();
  };

  // Función para generar URL automáticamente
  const generateUrl = (slug) => {
    if (!slug) return '';
    return `https://asiergonzalez.es/blog/${slug}`;
  };

  // Función para generar path automáticamente
  const generatePath = (slug) => {
    if (!slug) return '';
    return `/blog/${slug}`;
  };

  // Generar automáticamente slug, URL y path cuando cambie el título
  useEffect(() => {
    if (title) {
      const newSlug = generateSlug(title);
      setSlug(newSlug);
      setUrl(generateUrl(newSlug));
      setPath(generatePath(newSlug));
    }
  }, [title]);

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

  // Generación automática de contenido cuando hay suficientes campos
  useEffect(() => {
    const shouldGenerate = imageUrl && (location || event || people) && !generating;
    
    if (shouldGenerate) {
      const timeoutId = setTimeout(() => {
        handleAutoGenerate();
      }, 1000); // Debounce de 1 segundo
      
      return () => clearTimeout(timeoutId);
    }
  }, [imageUrl, location, event, people, language, notes]);

  const handleAutoGenerate = async () => {
    if (generating) return;
    
    setGenerating(true);
    try {
      // Solo generar si no hay contenido ya generado
      if (!phrase && !webText) {
        const prompt = buildComprehensivePrompt({ 
          imageUrl, 
          language, 
          notes 
        });
        const result = await geminiService.generateSmart(prompt);
        console.log('Raw AI response (auto):', result);
        
        try {
          const cleanedResponse = cleanAIResponse(result);
          console.log('Cleaned AI response (auto):', cleanedResponse);
          const parsed = JSON.parse(cleanedResponse);
          
          // Rellenar campos vacíos con la IA
          if (!location && parsed.location) setLocation(parsed.location);
          if (!event && parsed.event) setEvent(parsed.event);
          if (!people && parsed.people) setPeople(parsed.people);
          if (!phrase && parsed.phrase) setPhrase(parsed.phrase);
          if (!webText && parsed.webText) setWebText(parsed.webText);
          if (!cta && parsed.cta) setCta(parsed.cta);
          
          // Contenido para redes sociales (solo si el toggle está activado)
          if (parsed.platforms) {
            if (parsed.platforms.linkedin && !linkedinText && genLinkedin) {
              setLinkedinText(parsed.platforms.linkedin);
            }
            if (parsed.platforms.instagram && !instagramText && genInstagram) {
              setInstagramText(parsed.platforms.instagram);
            }
            if (parsed.platforms.twitter && !twitterText && genTwitter) {
              setTwitterText(parsed.platforms.twitter);
            }
          }
          
        } catch (parseError) {
          console.error('Error parsing AI response (auto):', parseError);
          console.error('Raw response was:', result);
          console.error('Cleaned response was:', cleanedResponse);
          // Fallback a generación local solo para campos vacíos
          generateLocalContentForEmptyFields();
        }
      }
    } catch (e) {
      console.warn('AI generation failed:', e.message);
      // Fallback a generación local solo para campos vacíos
      generateLocalContentForEmptyFields();
    } finally {
      setGenerating(false);
    }
  };

  const generateLocalContentForEmptyFields = () => {
    // Solo generar contenido local para campos que están vacíos Y que tienen el toggle activado
    if (!linkedinText && genLinkedin) setLinkedinText(generatePlatformContent('linkedin', baseContext));
    if (!instagramText && genInstagram) setInstagramText(generatePlatformContent('instagram', baseContext));
    if (!twitterText && genTwitter) setTwitterText(generatePlatformContent('twitter', baseContext));
    if (!webText && genWeb) setWebText(generateWebContent(baseContext, cta));
    if (!phrase) {
      const localPhrase = generateCTA(baseContext);
      setPhrase(localPhrase);
    }
  };

  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    const [day, month, year] = dateString.split('-');
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDate(`${day}-${month}-${year}`);
    }
  };

  const handleGenerateCTA = async () => {
    try {
      setGeneratingCTA(true);
      
      // Prompt simple solo para generar frase
      const prompt = `Genera una frase inspiradora y profesional para un post de Asier González (emprendedor y speaker).

IDIOMA: ${language}
NOTAS: ${notes || 'Ninguna'}

La frase debe ser:
- Inspiradora y motivacional
- Profesional pero cercana
- Máximo 2 líneas
- En ${language === 'es' ? 'español' : language === 'en' ? 'inglés' : language === 'eu' ? 'euskera' : 'francés'}

Devuelve SOLO la frase, sin comillas ni formato adicional.`;

      const result = await geminiService.generateSmart(prompt);
      
      // Limpiar la respuesta (quitar comillas y espacios extra)
      const cleanPhrase = result.replace(/^["']|["']$/g, '').trim();
      
      setPhrase(cleanPhrase);
      setCta(cleanPhrase);
      
    } catch (error) {
      console.error('Error generating CTA with AI:', error);
      // Fallback a generación local si falla la IA
      const generated = generateCTA(baseContext);
      setCta(generated);
      setPhrase(generated);
    } finally {
      setGeneratingCTA(false);
    }
  };

  // Función para limpiar la respuesta de la IA y extraer JSON
  const cleanAIResponse = (response) => {
    // Buscar JSON en la respuesta, puede estar envuelto en markdown
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/```\s*([\s\S]*?)\s*```/) ||
                     response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // Si no encuentra bloques de código, buscar JSON directo
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return response.substring(jsonStart, jsonEnd + 1);
    }
    
    return response;
  };

  const handleGenerateContents = async () => {
    setGenerating(true);
    try {
      // Intentar generación completa con IA
      try {
        const prompt = buildComprehensivePrompt({ 
          imageUrl: image, 
          language, 
          notes,
          location,
          date: blogDate,
          event,
          people
        });
        const result = await geminiService.generateSmart(prompt);
        console.log('Raw AI response:', result);
        
        try {
          const cleanedResponse = cleanAIResponse(result);
          console.log('Cleaned AI response:', cleanedResponse);
          const parsed = JSON.parse(cleanedResponse);
          
          // Rellenar campos de contenido con la IA (no sobrescribir campos de entrada)
          if (parsed.phrase) setPhrase(parsed.phrase);
          if (parsed.webText) setWebText(parsed.webText);
          if (parsed.cta) setCta(parsed.cta);
          
          // Completar campos del blog post
          const generatedFields = new Set();
          if (parsed.title) { setTitle(parsed.title); generatedFields.add('title'); }
          if (parsed.author) { setAuthor(parsed.author); generatedFields.add('author'); }
          if (parsed.blogDate) { setBlogDate(parsed.blogDate); generatedFields.add('blogDate'); }
          if (parsed.modalContent) { setModalContent(parsed.modalContent); generatedFields.add('modalContent'); }
          if (parsed.tags) { setTags(parsed.tags); generatedFields.add('tags'); }
          // No sobrescribir la imagen - será la composición generada automáticamente
          if (parsed.modal) { setModal(parsed.modal); generatedFields.add('modal'); }
          if (parsed.width) { setWidth(parsed.width); generatedFields.add('width'); }
          if (parsed.path) { setPath(parsed.path); generatedFields.add('path'); }
          if (parsed.url) { setUrl(parsed.url); generatedFields.add('url'); }
          if (parsed.slug) { setSlug(parsed.slug); generatedFields.add('slug'); }
          
          // Marcar campos generados por IA
          setAiGeneratedFields(generatedFields);
          
          // Contenido para redes sociales
          if (parsed.platforms) {
            if (parsed.platforms.linkedin && genLinkedin) {
              setLinkedinText(parsed.platforms.linkedin);
            }
            if (parsed.platforms.instagram && genInstagram) {
              setInstagramText(parsed.platforms.instagram);
            }
            if (parsed.platforms.twitter && genTwitter) {
              setTwitterText(parsed.platforms.twitter);
            }
          }
          
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          console.error('Raw response was:', result);
          console.error('Cleaned response was:', cleanedResponse);
          Alert.alert(
            'Error de IA', 
            'No se pudo procesar la respuesta de la IA. Se generará contenido básico.',
            [{ text: 'OK' }]
          );
          // Fallback a generación local si no se puede parsear
          generateLocalContent();
        }
      } catch (e) {
        console.warn('AI generation failed, using local fallback:', e.message);
        // Fallback a generación local
        generateLocalContent();
      }
      
      // Generar preview JSON
      const previewJson = buildPreviewJson({ 
        ...baseContext, 
        cta, 
        webText: genWeb ? webText : generateWebContent(baseContext, cta) 
      });
      setJsonPreview(previewJson);
      setShowPreview(true);
      
    } finally {
      setGenerating(false);
    }
  };

  const generateLocalContent = () => {
    // Generación local como fallback
    if (genLinkedin) setLinkedinText(generatePlatformContent('linkedin', baseContext));
    if (genInstagram) setInstagramText(generatePlatformContent('instagram', baseContext));
    if (genTwitter) setTwitterText(generatePlatformContent('twitter', baseContext));
    if (genWeb) setWebText(generateWebContent(baseContext, cta));
    
    // Si no hay frase generada, crear una local
    if (!phrase) {
      const localPhrase = generateCTA(baseContext);
      setPhrase(localPhrase);
    }
  };


  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) setImageUrl(uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) setImageUrl(uri);
    }
  };


  // Función para borrar la imagen subida
  const handleDeleteImage = async () => {
    try {
      if (!uploadedImagePath) {
        Alert.alert('Error', 'No hay imagen subida para borrar');
        return;
      }

      Alert.alert(
        'Confirmar eliminación',
        '¿Estás seguro de que quieres borrar la imagen subida?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Borrar', 
            style: 'destructive',
            onPress: async () => {
              try {
                const deleteResult = await storageService.deleteImage(uploadedImagePath);
                
                if (deleteResult.success) {
                  // Limpiar los estados
                  setImage('');
                  setUploadedImagePath(null);
                  Alert.alert('Éxito', 'Imagen borrada correctamente');
                } else {
                  Alert.alert('Error', `Error al borrar imagen: ${deleteResult.error}`);
                }
              } catch (error) {
                console.error('Error deleting image:', error);
                Alert.alert('Error', 'Error al borrar la imagen');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleDeleteImage:', error);
      Alert.alert('Error', 'Error al procesar la eliminación');
    }
  };

  // Función para guardar como borrador (incluye campos de redes sociales)
  const handleSaveDraft = async () => {
    try {
      if (!title || !author) {
        Alert.alert('Campos requeridos', 'El título y el autor son obligatorios');
        return;
      }
      setSaving(true);

      let finalImageUrl = image; // Usar la imagen actual por defecto

      // Borrar imagen anterior si existe y es de Firebase Storage
      if (image && image.includes('firebasestorage.googleapis.com')) {
        try {
          console.log('Borrando imagen anterior...');
          const urlParts = image.split('/o/');
          if (urlParts.length > 1) {
            const pathWithParams = urlParts[1].split('?')[0];
            const storagePath = decodeURIComponent(pathWithParams);
            
            const deleteResult = await storageService.deleteImage(storagePath);
            if (deleteResult.success) {
              console.log('Imagen anterior borrada correctamente');
            } else {
              console.warn('No se pudo borrar la imagen anterior:', deleteResult.error);
            }
          }
        } catch (deleteError) {
          console.warn('Error borrando imagen anterior:', deleteError);
          // Continuar aunque falle el borrado
        }
      }

      // Si hay una composición generada, capturar y subir la imagen automáticamente
      if (composeRef.current) {
        try {
          console.log('Capturando y subiendo imagen automáticamente...');
          
          let imageData;
          
          if (Platform.OS === 'web') {
            // Para web, usar dom-to-image
            const dataUrl = await domtoimage.toPng(composeRef.current, {
              quality: 1.0,
              bgcolor: '#00ca77',
              width: composeRef.current.offsetWidth,
              height: composeRef.current.offsetHeight,
              style: {
                transform: 'translate(0, 0)',
                transformOrigin: 'top left',
                position: 'relative',
                left: '0px',
                top: '0px',
                margin: '0',
                padding: '0'
              }
            });
            
            imageData = dataUrl;
          } else {
            // Para móvil, usar ViewShot
            const uri = await captureRef(composeRef, {
              format: 'png',
              quality: 0.9,
              result: 'base64'
            });
            imageData = `data:image/png;base64,${uri}`;
          }

          // Subir imagen a Firebase Storage
          try {
            const uploadResult = await storageService.uploadImage(imageData, 'blog-images');
            
            if (uploadResult.success) {
              finalImageUrl = uploadResult.url;
              setImage(uploadResult.url);
              setUploadedImagePath(uploadResult.path);
              console.log('Imagen subida automáticamente:', uploadResult.url);
            } else {
              console.warn('Error subiendo imagen automáticamente:', uploadResult.error);
              Alert.alert(
                'Error de permisos', 
                'No se pudo subir la imagen automáticamente. Por favor, sube la imagen manualmente o contacta al administrador para configurar los permisos de Firebase Storage.',
                [{ text: 'OK' }]
              );
            }
          } catch (uploadError) {
            console.warn('Error subiendo imagen automáticamente:', uploadError);
            Alert.alert(
              'Error de permisos', 
              'No se pudo subir la imagen automáticamente. Por favor, sube la imagen manualmente o contacta al administrador para configurar los permisos de Firebase Storage.',
              [{ text: 'OK' }]
            );
          }
        } catch (imageError) {
          console.warn('Error capturando imagen automáticamente:', imageError);
          // Continuar con la imagen actual si falla la captura
        }
      }

      // Crear el blog post como borrador INCLUYENDO campos de redes sociales
      const blogPostData = {
        title,
        author,
        date: blogDate,
        modalContent,
        tags,
        image: finalImageUrl,
        event,
        modal,
        width,
        path,
        url,
        slug,
        draft: true, // Marcar como borrador
        // Campos de redes sociales para poder publicar más tarde desde editar
        socialMedia: {
          linkedin: genLinkedin ? linkedinText : '',
          instagram: genInstagram ? instagramText : '',
          twitter: genTwitter ? twitterText : '',
          settings: {
            genLinkedin,
            genInstagram,
            genTwitter
          }
        }
      };

      // Crear el blog post en Firebase
      const createdPost = await blogPostsService.create(blogPostData);
      
      Alert.alert('Borrador guardado', 'El borrador se ha guardado correctamente con la información de redes sociales para poder publicar más tarde.');
      
      // Navegar inmediatamente a la gestión de blog posts
      navigation.navigate('BlogCRUD');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el borrador');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      if (!title || !author) {
        Alert.alert('Campos requeridos', 'El título y el autor son obligatorios');
        return;
      }
      setSaving(true);

      let finalImageUrl = image; // Usar la imagen actual por defecto

      // Borrar imagen anterior si existe y es de Firebase Storage
      if (image && image.includes('firebasestorage.googleapis.com')) {
        try {
          console.log('Borrando imagen anterior...');
          const urlParts = image.split('/o/');
          if (urlParts.length > 1) {
            const pathWithParams = urlParts[1].split('?')[0];
            const storagePath = decodeURIComponent(pathWithParams);
            
            const deleteResult = await storageService.deleteImage(storagePath);
            if (deleteResult.success) {
              console.log('Imagen anterior borrada correctamente');
            } else {
              console.warn('No se pudo borrar la imagen anterior:', deleteResult.error);
            }
          }
        } catch (deleteError) {
          console.warn('Error borrando imagen anterior:', deleteError);
          // Continuar aunque falle el borrado
        }
      }

      // Si hay una composición generada, capturar y subir la imagen automáticamente
      if (composeRef.current) {
        try {
          console.log('Capturando y subiendo imagen automáticamente...');
          
          let imageData;
          
          if (Platform.OS === 'web') {
            // Para web, usar dom-to-image
            const dataUrl = await domtoimage.toPng(composeRef.current, {
              quality: 1.0,
              bgcolor: '#00ca77',
              width: composeRef.current.offsetWidth,
              height: composeRef.current.offsetHeight,
              style: {
                transform: 'translate(0, 0)',
                transformOrigin: 'top left',
                position: 'relative',
                left: '0px',
                top: '0px',
                margin: '0',
                padding: '0'
              }
            });
            
            imageData = dataUrl;
          } else {
            // Para móvil, usar ViewShot
            const uri = await captureRef(composeRef, {
              format: 'png',
              quality: 0.9,
              result: 'base64'
            });
            imageData = `data:image/png;base64,${uri}`;
          }

          // Subir imagen a Firebase Storage
          try {
            const uploadResult = await storageService.uploadImage(imageData, 'blog-images');
            
            if (uploadResult.success) {
              finalImageUrl = uploadResult.url;
              setImage(uploadResult.url);
              setUploadedImagePath(uploadResult.path);
              console.log('Imagen subida automáticamente:', uploadResult.url);
            } else {
              console.warn('Error subiendo imagen automáticamente:', uploadResult.error);
              Alert.alert(
                'Error de permisos', 
                'No se pudo subir la imagen automáticamente. Por favor, sube la imagen manualmente o contacta al administrador para configurar los permisos de Firebase Storage.',
                [{ text: 'OK' }]
              );
            }
          } catch (uploadError) {
            console.warn('Error subiendo imagen automáticamente:', uploadError);
            Alert.alert(
              'Error de permisos', 
              'No se pudo subir la imagen automáticamente. Por favor, sube la imagen manualmente o contacta al administrador para configurar los permisos de Firebase Storage.',
              [{ text: 'OK' }]
            );
          }
        } catch (imageError) {
          console.warn('Error capturando imagen automáticamente:', imageError);
          // Continuar con la imagen actual si falla la captura
        }
      }

      // Crear el blog post con todos los campos de Firebase incluyendo redes sociales
      const blogPostData = {
        title,
        author,
        date: blogDate,
        modalContent,
        tags,
        image: finalImageUrl,
        event,
        modal,
        width,
        path,
        url,
        slug,
        draft: false, // Marcar como publicado
        // Campos de redes sociales
        socialMedia: {
          linkedin: genLinkedin ? linkedinText : '',
          instagram: genInstagram ? instagramText : '',
          twitter: genTwitter ? twitterText : '',
          settings: {
            genLinkedin,
            genInstagram,
            genTwitter
          }
        }
      };

      // 1. PRIMERO: Crear el blog post en Firebase
      const createdPost = await blogPostsService.create(blogPostData);
      console.log('Post creado en Firebase:', createdPost);
      
      // 2. SEGUNDO: Publicar automáticamente en redes sociales si hay contenido
      const platformsContent = {};
      
      if (connectedPlatforms.linkedin && linkedinText && genLinkedin) {
        platformsContent.linkedin = linkedinText;
      }
      
      if (connectedPlatforms.instagram && instagramText && genInstagram) {
        platformsContent.instagram = instagramText;
      }
      
      if (connectedPlatforms.twitter && twitterText && genTwitter) {
        platformsContent.twitter = twitterText;
      }
      
      let socialMediaResults = null;
      
      // Si hay contenido para publicar en redes sociales, publicar
      if (Object.keys(platformsContent).length > 0) {
        try {
          console.log('Publicando en redes sociales automáticamente...');
          // Usar la imagen de la composición o la imagen URL
          const imageToUse = finalImageUrl || imageUrl;
          
          const result = await socialMediaService.publishToMultiplePlatforms(
            platformsContent, 
            imageToUse
          );
          
          socialMediaResults = result;
          console.log('Resultado publicación redes sociales:', result);
        } catch (socialError) {
          console.warn('Error publicando en redes sociales:', socialError);
          // No fallar todo el proceso si falla la publicación en redes sociales
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
      console.error(error);
      Alert.alert('Error', 'No se pudo crear el blog post');
    } finally {
      setSaving(false);
    }
  };

  // FUNCIÓN ELIMINADA: handlePublishToSocialMedia ya no se necesita
  // porque la publicación en redes sociales ahora se hace automáticamente
  // desde handlePublish

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('ContentEditor')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Nuevo Post</Text>
          <Text style={styles.subtitle}>Crear publicación con assets y contenido por red</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {/* Imagen */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#007AFF20', borderColor: '#007AFF' }]}>
            <Ionicons name="image-outline" size={18} color="#007AFF" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Foto (URL)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryBtnText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryBtnText}>Cámara</Text>
              </TouchableOpacity>
            </View>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.preview} />
            ) : null}
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#007AFF' }]} />
        </View>

        

        {/* Localización */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#34C75920', borderColor: '#34C759' }]}>
            <Ionicons name="location-outline" size={18} color="#34C759" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Localización</Text>
            <TextInput
              style={styles.input}
              placeholder="Ciudad, País"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={location}
              onChangeText={setLocation}
            />
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#34C759' }]} />
        </View>

        {/* Fecha */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#FF9F0A20', borderColor: '#FF9F0A' }]}>
            <Ionicons name="calendar-outline" size={18} color="#FF9F0A" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Fecha</Text>
            <TouchableOpacity 
              style={styles.input} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{date || 'Seleccionar fecha'}</Text>
              <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#FF9F0A' }]} />
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={parseDate(date)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Evento */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#5856D620', borderColor: '#5856D6' }]}>
            <Ionicons name="pricetag-outline" size={18} color="#5856D6" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Lugar/Evento</Text>
            <TextInput
              style={styles.input}
              placeholder="SouthSummit, Web Summit..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={event}
              onChangeText={setEvent}
            />
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#5856D6' }]} />
        </View>

        {/* Personas */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#FF2D9220', borderColor: '#FF2D92' }]}>
            <Ionicons name="people-outline" size={18} color="#FF2D92" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Personas (separadas por coma)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre 1, Nombre 2, ..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={people}
              onChangeText={setPeople}
            />
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#FF2D92' }]} />
        </View>

        {/* Idioma */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#64D2FF20', borderColor: '#64D2FF' }]}>
            <Ionicons name="language-outline" size={18} color="#64D2FF" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Idioma</Text>
            <View style={styles.langRow}>
              {LANGUAGES.map((lng) => (
                <TouchableOpacity key={lng} style={[styles.langPill, language === lng && styles.langPillActive]} onPress={() => setLanguage(lng)}>
                  <Text style={[styles.langText, language === lng && styles.langTextActive]}>{lng.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#64D2FF' }]} />
        </View>

        

      {/* Notas */}
      <View style={styles.fieldCard}>
        <View style={[styles.iconSquare, { backgroundColor: '#B0B0B020', borderColor: '#B0B0B0' }]}>
          <Ionicons name="create-outline" size={18} color="#B0B0B0" />
        </View>
        <View style={styles.fieldContent}>
          <Text style={styles.label}>Notas</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline value={notes} onChangeText={setNotes} placeholder="Notas internas (no públicas)" placeholderTextColor="rgba(255,255,255,0.4)" />
        </View>
        <View style={[styles.cardAccent, { backgroundColor: '#B0B0B0' }]} />
      </View>

      {/* Frase + IA CTA */}
      <View style={[styles.fieldCard, { flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={[styles.iconSquare, { backgroundColor: '#30D15820', borderColor: '#30D158', marginRight: 12 }]}> 
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#30D158" />
          </View>
          <Text style={styles.label}>Frase</Text>
          <TouchableOpacity 
            style={[styles.aiBtn, generatingCTA && styles.aiBtnDisabled]} 
            onPress={handleGenerateCTA}
            disabled={generatingCTA}
          >
            {generatingCTA ? (
              <ActivityIndicator size="small" color="#30D158" />
            ) : (
              <Ionicons name="sparkles-outline" size={16} color="#30D158" />
            )}
            <Text style={styles.aiBtnText}>
              {generatingCTA ? 'Generando...' : 'IA CTA'}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Texto principal de la publicación"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={phrase}
          onChangeText={setPhrase}
          multiline
        />
      </View>

      {/* Preview del montaje */}
      {true && (
        <View style={[styles.previewCard, isTablet && styles.previewCardTablet, isMobile && styles.previewCardMobile]}>
          {/* Composición: fondo verde + recuadro blanco + foto + textos */}
          {Platform.OS === 'web' ? (
            <div 
              ref={composeRef} 
              style={{
                width: isTablet ? '800px' : isMobile ? '350px' : '1080px',
                height: isTablet ? '800px' : isMobile ? '350px' : '1080px',
                backgroundColor: '#00ca77',
                padding: isTablet ? '15px 30px 45px 30px' : isMobile ? '10px 20px 30px 20px' : '20px 40px 60px 40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                position: 'relative',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden',
                left: '0px',
                top: '0px',
                transform: 'translate(0, 0)'
              }}
            >
              <div style={{
                backgroundColor: '#2c3e50',
                padding: isTablet ? '15px 30px' : isMobile ? '10px 20px' : '20px 40px',
                borderRadius: isTablet ? '8px' : isMobile ? '6px' : '12px',
                position: 'absolute',
                top: isTablet ? '625px' : isMobile ? '475px' : '925px',
                right: isTablet ? '40px' : isMobile ? '20px' : '60px',
                zIndex: 10
              }}>
                <span style={{
                  color: '#00ca77',
                  fontSize: isTablet ? '18px' : isMobile ? '12px' : '24px',
                  fontWeight: '700',
                  letterSpacing: isTablet ? '2px' : isMobile ? '1px' : '3px',
                  fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>ASIER GONZALEZ</span>
              </div>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: isTablet ? '15px' : isMobile ? '10px' : '20px',
                padding: isTablet ? '40px' : isMobile ? '20px' : '60px',
                width: isTablet ? '600px' : isMobile ? '260px' : '800px',
                minHeight: isTablet ? '550px' : isMobile ? '250px' : '750px',
                marginTop: isTablet ? '15px' : isMobile ? '10px' : '20px',
                marginBottom: isTablet ? '30px' : isMobile ? '20px' : '40px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    style={{
                      width: '100%',
                      height: isTablet ? '400px' : isMobile ? '150px' : '600px',
                      borderRadius: isTablet ? '12px' : isMobile ? '8px' : '16px',
                      marginBottom: isTablet ? '30px' : isMobile ? '15px' : '50px',
                      objectFit: 'cover'
                    }} 
                    alt="Preview" 
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: isTablet ? '400px' : isMobile ? '150px' : '600px',
                    borderRadius: isTablet ? '12px' : isMobile ? '8px' : '16px',
                    marginBottom: isTablet ? '30px' : isMobile ? '15px' : '50px',
                    border: '2px dashed #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    color: '#666',
                    fontSize: isTablet ? '16px' : isMobile ? '12px' : '20px',
                    fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width={isTablet ? '32' : isMobile ? '24' : '40'} height={isTablet ? '32' : isMobile ? '24' : '40'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                      </svg>
                      <span>Imagen de previsualización</span>
                    </div>
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isTablet ? '18px' : isMobile ? '12px' : '24px',
                  width: '100%'
                }}>
                  {!!location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '12px' : isMobile ? '8px' : '16px' }}>
                      <div style={{ 
                        width: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        height: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#666'
                      }}>
                        <svg width={isTablet ? '20' : isMobile ? '16' : '28'} height={isTablet ? '20' : isMobile ? '16' : '28'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                      <span style={{ color: '#666', fontSize: isTablet ? '20px' : isMobile ? '14px' : '28px', fontWeight: '300', fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif', fontStyle: 'italic' }}>{location}</span>
                    </div>
                  )}
                  {!!date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '12px' : isMobile ? '8px' : '16px' }}>
                      <div style={{ 
                        width: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        height: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#666'
                      }}>
                        <svg width={isTablet ? '20' : isMobile ? '16' : '28'} height={isTablet ? '20' : isMobile ? '16' : '28'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <span style={{ color: '#666', fontSize: isTablet ? '20px' : isMobile ? '14px' : '28px', fontWeight: '300', fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif', fontStyle: 'italic' }}>{date}</span>
                    </div>
                  )}
                  {!!event && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '12px' : isMobile ? '8px' : '16px' }}>
                      <div style={{ 
                        width: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        height: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#666'
                      }}>
                        <svg width={isTablet ? '20' : isMobile ? '16' : '28'} height={isTablet ? '20' : isMobile ? '16' : '28'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z"></path>
                        </svg>
                      </div>
                      <span style={{ color: '#666', fontSize: isTablet ? '20px' : isMobile ? '14px' : '28px', fontWeight: '300', fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif', fontStyle: 'italic' }}>{event}</span>
                    </div>
                  )}
                  {!!people && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '12px' : isMobile ? '8px' : '16px' }}>
                      <div style={{ 
                        width: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        height: isTablet ? '24px' : isMobile ? '20px' : '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#666'
                      }}>
                        <svg width={isTablet ? '20' : isMobile ? '16' : '28'} height={isTablet ? '20' : isMobile ? '16' : '28'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <span style={{ color: '#666', fontSize: isTablet ? '20px' : isMobile ? '14px' : '28px', fontWeight: '300', fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif', fontStyle: 'italic' }}>{people}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                color: '#333B4D',
                fontSize: isTablet ? '28px' : isMobile ? '18px' : '40px',
                fontWeight: '300',
                fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif',
                fontStyle: 'italic',
                textAlign: 'center',
                lineHeight: isTablet ? '34px' : isMobile ? '22px' : '48px',
                marginTop: isTablet ? '0px' : isMobile ? '-10px' : '10px'
              }}>"{phrase}"</div>
            </div>
          ) : (
            <ViewShot ref={composeRef} style={[styles.composeContainer, isTablet && styles.composeContainerTablet, isMobile && styles.composeContainerMobile]} options={{ format: 'png', quality: 1 }}>
              <View style={[styles.composeBg, isTablet && styles.composeBgTablet, isMobile && styles.composeBgMobile]}>
                <View style={[styles.composeWhiteBox, isTablet && styles.composeWhiteBoxTablet, isMobile && styles.composeWhiteBoxMobile]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={[styles.composePhoto, isTablet && styles.composePhotoTablet, isMobile && styles.composePhotoMobile]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.composePhotoPlaceholder, isTablet && styles.composePhotoPlaceholderTablet, isMobile && styles.composePhotoPlaceholderMobile]}>
                      <Ionicons 
                        name="image-outline" 
                        size={isTablet ? 32 : isMobile ? 24 : 40} 
                        color="#ccc" 
                      />
                      <Text style={[styles.composePhotoPlaceholderText, isTablet && styles.composePhotoPlaceholderTextTablet, isMobile && styles.composePhotoPlaceholderTextMobile]}>
                        Imagen de previsualización
                      </Text>
                    </View>
                  )}
                  <View style={[styles.composeInfo, isTablet && styles.composeInfoTablet, isMobile && styles.composeInfoMobile]}>
                    {!!location && (
                      <View style={[styles.composeInfoItem, isTablet && styles.composeInfoItemTablet, isMobile && styles.composeInfoItemMobile]}>
                        <Ionicons name="location-outline" size={isTablet ? 20 : isMobile ? 16 : 28} color="#666" />
                        <Text style={[styles.composeInfoText, isTablet && styles.composeInfoTextTablet, isMobile && styles.composeInfoTextMobile]}>{location}</Text>
                      </View>
                    )}
                    {!!date && (
                      <View style={[styles.composeInfoItem, isTablet && styles.composeInfoItemTablet, isMobile && styles.composeInfoItemMobile]}>
                        <Ionicons name="calendar-outline" size={isTablet ? 20 : isMobile ? 16 : 28} color="#666" />
                        <Text style={[styles.composeInfoText, isTablet && styles.composeInfoTextTablet, isMobile && styles.composeInfoTextMobile]}>{date}</Text>
                      </View>
                    )}
                    {!!event && (
                      <View style={[styles.composeInfoItem, isTablet && styles.composeInfoItemTablet, isMobile && styles.composeInfoItemMobile]}>
                        <Ionicons name="pricetag-outline" size={isTablet ? 20 : isMobile ? 16 : 28} color="#666" />
                        <Text style={[styles.composeInfoText, isTablet && styles.composeInfoTextTablet, isMobile && styles.composeInfoTextMobile]}>{event}</Text>
                      </View>
                    )}
                    {!!people && (
                      <View style={[styles.composeInfoItem, isTablet && styles.composeInfoItemTablet, isMobile && styles.composeInfoItemMobile]}>
                        <Ionicons name="people-outline" size={isTablet ? 20 : isMobile ? 16 : 28} color="#666" />
                        <Text style={[styles.composeInfoText, isTablet && styles.composeInfoTextTablet, isMobile && styles.composeInfoTextMobile]}>{people}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.composeButton, isTablet && styles.composeButtonTablet, isMobile && styles.composeButtonMobile]}>
                  <Text style={[styles.composeButtonText, isTablet && styles.composeButtonTextTablet, isMobile && styles.composeButtonTextMobile]}>ASIER GONZALEZ</Text>
                </View>
                <Text style={[styles.composePhrase, isTablet && styles.composePhraseTablet, isMobile && styles.composePhraseMobile]}>"{phrase}"</Text>
              </View>
            </ViewShot>
          )}
        </View>
      )}

      {/* Toggles generación */}
      <View style={[styles.fieldCard, { marginTop: 24 }]}>
        <View style={[styles.iconSquare, { backgroundColor: '#A2845E20', borderColor: '#A2845E' }]}>
          <Ionicons name="options-outline" size={18} color="#A2845E" />
        </View>
        <View style={styles.fieldContent}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Generar Web</Text>
            <Switch value={genWeb} onValueChange={(value) => handleToggleChange('web', value)} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Generar LinkedIn</Text>
            <Switch value={genLinkedin} onValueChange={(value) => handleToggleChange('linkedin', value)} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Generar Instagram</Text>
            <Switch value={genInstagram} onValueChange={(value) => handleToggleChange('instagram', value)} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Generar Twitter</Text>
            <Switch value={genTwitter} onValueChange={(value) => handleToggleChange('twitter', value)} />
          </View>
          <TouchableOpacity 
            style={[styles.genBtn, generating && { opacity: 0.6 }]} 
            onPress={handleGenerateContents}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="flash-outline" size={16} color="#ffffff" />
            )}
            <Text style={styles.genBtnText}>
              {generating ? 'Generando...' : 'Generar contenidos'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.cardAccent, { backgroundColor: '#A2845E' }]} />
      </View>

        {/* Campos del Blog Post */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#9A7AFF20', borderColor: '#9A7AFF' }]}> 
            <Ionicons name="document-text-outline" size={18} color="#9A7AFF" />
          </View>
          <View style={styles.fieldContent}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Campos del Blog Post</Text>
              <View style={styles.labelActions}>
                <View style={[styles.draftIndicator, { backgroundColor: isDraft ? '#FF9800' : '#4CAF50' }]}>
                  <Ionicons 
                    name={isDraft ? "document-outline" : "checkmark-circle-outline"} 
                    size={14} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.draftText}>
                    {isDraft ? 'Borrador' : 'Publicado'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={() => setShowJsonModal(true)}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#9A7AFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Información básica */}
            <View style={styles.blogFieldGroup}>
              <View style={styles.fieldHeader}>
                <Text style={styles.blogFieldLabel}>Título *</Text>
                {aiGeneratedFields.has('title') && (
                  <View style={styles.aiGeneratedBadge}>
                    <Ionicons name="sparkles" size={12} color="#4CAF50" />
                    <Text style={styles.aiGeneratedText}>IA</Text>
                  </View>
                )}
              </View>
              <TextInput 
                style={styles.blogInput} 
                value={title} 
                onChangeText={setTitle} 
                placeholder="Título del post" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Autor *</Text>
              <TextInput 
                style={styles.blogInput} 
                value={author} 
                onChangeText={setAuthor} 
                placeholder="Nombre del autor" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Fecha *</Text>
              <TextInput 
                style={styles.blogInput} 
                value={blogDate} 
                onChangeText={setBlogDate} 
                placeholder="Ej: 27 February 2024" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Tags</Text>
              <TextInput 
                style={styles.blogInput} 
                value={tags} 
                onChangeText={setTags} 
                placeholder="#lorawan #tti #loriot #actility" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            {/* Contenido */}
            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Contenido modal (HTML)</Text>
              <TextInput 
                style={[styles.blogInput, styles.multiline]} 
                multiline 
                numberOfLines={6}
                value={modalContent} 
                onChangeText={setModalContent} 
                placeholder="Contenido HTML para el modal" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            {/* URLs e imágenes */}
            <View style={styles.blogFieldGroup}>
              <View style={styles.imageFieldContainer}>
                <Text style={styles.blogFieldLabel}>Imagen principal</Text>
                {uploadedImagePath && (
                  <TouchableOpacity 
                    style={styles.deleteImageButton}
                    onPress={handleDeleteImage}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                    <Text style={styles.deleteImageText}>Borrar</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput 
                style={[styles.blogInput, styles.disabledInput]} 
                value={image} 
                onChangeText={setImage} 
                placeholder="/assets/img/blog/imagen.png" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
                editable={false}
              />
              {uploadedImagePath && (
                <Text style={styles.uploadedImageInfo}>
                  ✓ Imagen subida a Firebase Storage
                </Text>
              )}
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Path</Text>
              <TextInput 
                style={styles.blogInput} 
                value={path} 
                onChangeText={setPath} 
                placeholder="/blog/lorawannetworkserver" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>URL completa</Text>
              <TextInput 
                style={styles.blogInput} 
                value={url} 
                onChangeText={setUrl} 
                placeholder="https://asiergonzalez.es/blog/lorawannetworkserver" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Slug</Text>
              <TextInput 
                style={styles.blogInput} 
                value={slug} 
                onChangeText={setSlug} 
                placeholder="a-comparative-analysis-of-lorawan-top-players-" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            {/* Configuración técnica */}
            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Event</Text>
              <TextInput 
                style={styles.blogInput} 
                value={event} 
                onChangeText={setEvent} 
                placeholder="lorawan_blog_view" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Modal</Text>
              <TextInput 
                style={styles.blogInput} 
                value={modal} 
                onChangeText={setModal} 
                placeholder="mymodal" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Width</Text>
              <TextInput 
                style={styles.blogInput} 
                value={width} 
                onChangeText={setWidth} 
                placeholder="1200px" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#9A7AFF' }]} />
        </View>

        {/* Contenidos editables */}
        {genLinkedin && (
          <View style={styles.fieldCard}>
            <View style={[styles.iconSquare, { backgroundColor: '#0A66C220', borderColor: '#0A66C2' }]}>
              <Ionicons name="logo-linkedin" size={18} color="#0A66C2" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline value={linkedinText} onChangeText={setLinkedinText} />
            </View>
            <View style={[styles.cardAccent, { backgroundColor: '#0A66C2' }]} />
          </View>
        )}
        {genInstagram && (
          <View style={styles.fieldCard}>
            <View style={[styles.iconSquare, { backgroundColor: '#FF2D9220', borderColor: '#FF2D92' }]}>
              <Ionicons name="logo-instagram" size={18} color="#FF2D92" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline value={instagramText} onChangeText={setInstagramText} />
            </View>
            <View style={[styles.cardAccent, { backgroundColor: '#FF2D92' }]} />
          </View>
        )}
        {genTwitter && (
          <View style={styles.fieldCard}>
            <View style={[styles.iconSquare, { backgroundColor: '#1DA1F220', borderColor: '#1DA1F2' }]}>
              <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.label}>Twitter</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline value={twitterText} onChangeText={setTwitterText} />
            </View>
            <View style={[styles.cardAccent, { backgroundColor: '#1DA1F2' }]} />
          </View>
        )}
      </View>



        {/* Sección de redes sociales conectadas (solo informativa) */}
        <View style={styles.socialMediaSection}>
          <View style={styles.socialMediaHeader}>
            <Text style={styles.socialMediaTitle}>Estado de Redes Sociales</Text>
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

          {(!connectedPlatforms.instagram && !connectedPlatforms.twitter && !connectedPlatforms.linkedin) && (
            <View style={styles.noConnectionsWarning}>
              <Ionicons name="warning-outline" size={20} color="#FF9800" />
              <Text style={styles.noConnectionsText}>
                No tienes redes sociales conectadas. Ve a Configuración para vincular tus cuentas.
              </Text>
              <TouchableOpacity 
                style={styles.goToSettingsBtn}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.goToSettingsBtnText}>Ir a Configuración</Text>
                <Ionicons name="arrow-forward" size={16} color="#64D2FF" />
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.socialInfoText}>
            ℹ️ Al usar "Publicar", el post se publicará tanto en la web como en las redes sociales conectadas automáticamente.
          </Text>
        </View>

        {/* Botones de acción AL FINAL */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.draftBtn, saving && { opacity: 0.6 }]} 
            onPress={handleSaveDraft} 
            disabled={saving}
          >
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.draftBtnText}>{saving ? 'Guardando...' : 'Guardar Borrador'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.publishBtn, saving && { opacity: 0.6 }]} 
            onPress={handlePublish} 
            disabled={saving}
          >
            <Ionicons name="send-outline" size={18} color="#FFFFFF" />
            <Text style={styles.publishBtnText}>{saving ? 'Publicando...' : 'Publicar en Web y Redes Sociales'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    {/* Modal Blog Post Preview */}
    {showJsonModal && (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vista Previa del Blog Post</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowJsonModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.blogPreviewContainer}>
            {jsonPreview ? (
              <View style={styles.blogPreviewContent}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>ID:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.id || 'Auto-generado'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Título:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.title || 'Sin título'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Autor:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.author || 'Asier González'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Fecha:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.date || 'Sin fecha'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Evento:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.event || 'Sin evento'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Imagen:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.image || 'Sin imagen'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>URL:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.url || 'Sin URL'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Path:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.path || 'Sin path'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Slug:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.slug || 'Sin slug'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Tags:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.tags || 'Sin tags'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Modal:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.modal || 'Sin modal'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Ancho:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.width || 'Sin ancho'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Creado:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.createdAt || 'Auto-generado'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Actualizado:</Text>
                  <Text style={styles.fieldValue}>{jsonPreview.updatedAt || 'Auto-generado'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Contenido Modal:</Text>
                  <Text style={[styles.fieldValue, styles.modalContentText]}>
                    {jsonPreview.modalContent ? 
                      (jsonPreview.modalContent.length > 200 ? 
                        jsonPreview.modalContent.substring(0, 200) + '...' : 
                        jsonPreview.modalContent
                      ) : 'Sin contenido'
                    }
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No hay datos para mostrar</Text>
            )}
          </ScrollView>
        </View>
      </View>
    )}
  </View>
  );
};

function generateCTA({ language, event, location }) {
  const map = {
    es: `Únete a la conversación en ${event || 'este evento'} (${location || 'tu ciudad'}). ¿Te apuntas?`,
    en: `Join the conversation at ${event || 'this event'} in ${location || 'your city'}. Are you in?`,
    eu: `${event || 'ekitaldia'} ${location || 'zure hiria'}-n. Zatoz?`,
    fr: `Rejoignez la conversation à ${event || 'cet événement'} à ${location || 'votre ville'}. On y va?`,
  };
  return map[language] || map.es;
}

function generateWebContent({ language, phrase, event, location }, cta) {
  const base = `${phrase}${event ? ` • ${event}` : ''}${location ? ` • ${location}` : ''}`;
  const label = language === 'es' ? 'Leer más' : 'Read more';
  return `${base}\n\n${cta ? cta + '\n\n' : ''}${label}`;
}

function buildPreviewJson({ imageUrl, location, date, event, people, language, phrase, cta, webText }) {
  return {
    imageUrl,
    location,
    date,
    event,
    people: people ? people.split(',').map(p => p.trim()).filter(Boolean) : [],
    language,
    content: {
      phrase,
      cta,
      webText,
    },
  };
}

function generatePlatformContent(platform, { language, phrase, event, location, people }) {
  const names = people
    ? people
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  const tags = names.map(n => `@${slugify(n)}`).join(' ');
  const base = `${phrase}${event ? ` • ${event}` : ''}${location ? ` • ${location}` : ''}`;
  const hash = language === 'es' ? '#startup #innovación' : '#startup #innovation';
  switch (platform) {
    case 'linkedin':
      return `${base}\n\n${tags}\n\n${hash} #leadership`;
    case 'instagram':
      return `${base}\n\n${hash} #buildinpublic #founders`;
    case 'twitter':
      return `${base} ${hash}`.slice(0, 260);
    default:
      return base;
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  grid: {
    flexDirection: 'column',
  },
  fieldCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  iconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  cardAccent: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  fieldContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  blogPreviewContainer: {
    maxHeight: 500,
  },
  blogPreviewContent: {
    padding: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  fieldLabel: {
    color: '#9A7AFF',
    fontSize: 14,
    fontWeight: '600',
    width: 120,
    marginRight: 12,
  },
  fieldValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  modalContentText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  noDataText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  preview: {
    marginTop: 10,
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  langPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 8,
    marginBottom: 6,
  },
  langPillActive: {
    backgroundColor: 'rgba(0, 202, 119, 0.15)',
    borderColor: '#00ca77',
  },
  langText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  langTextActive: {
    color: '#00ca77',
  },
  aiBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.5)',
    backgroundColor: 'rgba(48,209,88,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  aiBtnDisabled: {
    opacity: 0.6,
  },
  aiBtnText: {
    color: '#30D158',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  genBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#00ca77',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  publishBtn: {
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
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
  previewCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  previewCardTablet: {
    marginTop: 12,
    borderRadius: 8,
  },
  previewCardMobile: {
    marginTop: 8,
    borderRadius: 6,
  },
  composeContainer: {
    width: 1080,
    height: 1080,
    position: 'relative',
    alignSelf: 'center',
  },
  composeContainerTablet: {
    width: 800,
    height: 800,
  },
  composeContainerMobile: {
    width: 350,
    height: 350,
  },
  composeBg: {
    width: 1080,
    height: 1080,
    backgroundColor: '#00ca77',
    paddingTop: 20,
    paddingHorizontal: 40,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  composeBgTablet: {
    width: 800,
    height: 800,
    paddingTop: 15,
    paddingHorizontal: 30,
    paddingBottom: 45,
  },
  composeBgMobile: {
    width: 350,
    height: 350,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  composeWhiteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 60,
    width: 800,
    minHeight: 750,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
    alignItems: 'center',
  },
  composeWhiteBoxTablet: {
    borderRadius: 15,
    padding: 40,
    width: 600,
    minHeight: 550,
    marginTop: 15,
    marginBottom: 30,
  },
  composeWhiteBoxMobile: {
    borderRadius: 10,
    padding: 20,
    width: 260,
    minHeight: 250,
    marginTop: 10,
    marginBottom: 20,
  },
  composePhoto: {
    width: '100%',
    height: 600,
    borderRadius: 16,
    marginBottom: 50,
  },
  composePhotoTablet: {
    height: 400,
    borderRadius: 12,
    marginBottom: 30,
  },
  composePhotoMobile: {
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
  },
  composePhotoPlaceholder: {
    width: '100%',
    height: 600,
    borderRadius: 16,
    marginBottom: 50,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composePhotoPlaceholderTablet: {
    height: 400,
    borderRadius: 12,
    marginBottom: 30,
  },
  composePhotoPlaceholderMobile: {
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
  },
  composePhotoPlaceholderText: {
    color: '#666',
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'Satoshi-Light',
    marginTop: 8,
    textAlign: 'center',
  },
  composePhotoPlaceholderTextTablet: {
    fontSize: 16,
  },
  composePhotoPlaceholderTextMobile: {
    fontSize: 12,
  },
  composeInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  composeInfoTablet: {
    gap: 12,
  },
  composeInfoMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  composeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: '45%',
  },
  composeInfoItemTablet: {
    gap: 12,
  },
  composeInfoItemMobile: {
    gap: 8,
    flex: 0,
    minWidth: '100%',
  },
  composeInfoText: {
    color: '#666',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'Satoshi-Light',
    fontStyle: 'italic',
  },
  composeInfoTextTablet: {
    fontSize: 20,
  },
  composeInfoTextMobile: {
    fontSize: 14,
  },
  composePhrase: {
    color: '#333B4D',
    fontSize: 36,
    fontWeight: '300',
    fontFamily: 'Satoshi-Light',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 44,
    marginTop: 10,
  },
  composePhraseTablet: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 0,
  },
  composePhraseMobile: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: -10,
  },
  composeButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    position: 'absolute',
    right: 60,
    top: 930,
    zIndex: 10,
  },
  composeButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 18,
    right: 40,
  },
  composeButtonMobile: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 12,
    right: 20,
  },
  composeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'Satoshi',
  },
  composeButtonTextTablet: {
    fontSize: 14,
    letterSpacing: 1.5,
  },
  composeButtonTextMobile: {
    fontSize: 10,
    letterSpacing: 1,
  },
  composeQuote: {
    color: '#2c3e50',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: 600,
    fontFamily: 'Satoshi',
  },
  previewHero: {
    width: '100%',
    height: 220,
  },
  jsonCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
  },
  jsonTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  jsonText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  previewFrame: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewContainer: {
    backgroundColor: '#00ca77',
    padding: 20,
    alignItems: 'center',
    minHeight: 400,
    aspectRatio: 1,
  },
  previewWhiteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 350,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewPlaceholderText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  previewInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  previewInfoText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  previewButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewQuote: {
    color: '#2c3e50',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 350,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  // Estilos para campos del blog
  blogFieldGroup: {
    marginBottom: 16,
  },
  blogFieldLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  blogInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageFieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  deleteImageText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  uploadedImageInfo: {
    color: '#4CAF50',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  aiGeneratedText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  labelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  draftBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  draftBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para redes sociales
  socialMediaSection: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialMediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialMediaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
  // Estilos eliminados para botones de redes sociales que ya no se usan
  noConnectionsWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    alignItems: 'center',
  },
  noConnectionsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  goToSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 210, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.3)',
    gap: 8,
  },
  goToSettingsBtnText: {
    color: '#64D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreatePostScreen;


