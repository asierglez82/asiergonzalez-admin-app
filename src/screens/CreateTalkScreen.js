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
import { talksService } from '../services/firestore';
import { storageService } from '../services/storage';
import socialMediaService from '../config/socialMediaConfig';

// Importar imagen de cabecera como en CreatePostScreen y helper para web
const talkImage = require('../../assets/talk.png');

const getImageSource = (imageSource) => {
  if (Platform.OS === 'web') {
    if (typeof imageSource === 'string') {
      return imageSource;
    }
    if (imageSource && typeof imageSource === 'object') {
      return imageSource.default || imageSource.uri || imageSource;
    }
  }
  return imageSource;
};

// Import dom-to-image solo para web
let domtoimage;
if (Platform.OS === 'web') {
  domtoimage = require('dom-to-image');
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isMobile = width < 768;
 
const LANGUAGES = ['es', 'en', 'eu', 'fr'];

const CreateTalkScreen = ({ navigation }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [language, setLanguage] = useState('es');
  const [notes, setNotes] = useState('');

  // Campos específicos de talks (basados en Firebase)
  const [author, setAuthor] = useState('');
  const [buy, setBuy] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [path, setPath] = useState('');
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');

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
  const [webText, setWebText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [jsonPreview, setJsonPreview] = useState(null);
  const composeRef = React.useRef(null);
  const [exporting, setExporting] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedImagePath, setUploadedImagePath] = useState(null);
  // Para web: convertir imágenes remotas a dataURL y evitar problemas CORS en la captura
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState(new Set());
  const [isDraft, setIsDraft] = useState(true);
  
  // Estados para redes sociales conectadas
  const [connectedPlatforms, setConnectedPlatforms] = useState({
    instagram: false,
    twitter: false,
    linkedin: false
  });

  const baseContext = useMemo(() => ({ imageUrl, language, notes }), [imageUrl, language, notes]);

  // Sufijo único corto basado en timestamp
  const uniqueSuffix = () => {
    const ts = Date.now().toString(36);
    return ts.slice(-6);
  };

  // Función para generar slug automáticamente (añade sufijo para evitar colisiones)
  const generateSlug = (title) => {
    if (!title) return '';
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return `${base}-${uniqueSuffix()}`;
  };

  // Función para generar URL automáticamente
  const generateUrl = (slug) => {
    if (!slug) return '';
    return `https://asiergonzalez.es/contenthub/talk/${slug}`;
  };

  // Función para generar path automáticamente
  const generatePath = (slug) => {
    if (!slug) return '';
    return `/contenthub/talk/${slug}`;
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

  // Función para limpiar la respuesta de la IA y extraer JSON
  const cleanAIResponse = (response) => {
    // Buscar JSON en la respuesta, puede estar envuelto en markdown
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/```\s*([\s\S]*?)\s*```/) ||
                     response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return jsonMatch[1]?.trim() || jsonMatch[0]?.trim();
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
        const prompt = `Genera contenido para una charla/talk con los siguientes datos:
- Imagen: ${image || imageUrl}
- Título: ${title}
- Ponente: ${author}
- Idioma: ${language}
- Notas: ${notes}

IMPORTANTE: 
- Los campos título y ponente son fijos y NO deben ser generados ni modificados. La categoría SÍ debe ser generada por la IA.
- NO uses emojis en ninguna de las respuestas.

Devuelve un JSON con estos campos:
{
  "category": "categoría de la charla (ej: Product Management, Technology, Leadership, etc.)",
  "content": "HTML completo de la descripción de la charla con formato (h6, p, ul, li, strong, em)",
  "tags": "hashtags relevantes",
  "webText": "texto para web",
  "cta": "call to action",
  "platforms": {
    "linkedin": "contenido para LinkedIn",
    "instagram": "contenido para Instagram",
    "twitter": "contenido para Twitter"
  }
}`;
        
        const result = await geminiService.generateSmart(prompt);
        console.log('Raw AI response:', result);
        
        try {
          const cleanedResponse = cleanAIResponse(result);
          console.log('Cleaned AI response:', cleanedResponse);
          const parsed = JSON.parse(cleanedResponse);
          
          // Rellenar campos de contenido con la IA
          const generatedFields = new Set();
          
          if (parsed.category) {
            setCategory(parsed.category);
            generatedFields.add('category');
          }
          
          if (parsed.content) {
            setContent(parsed.content);
            generatedFields.add('content');
          }
          
          if (parsed.tags) {
            setTags(parsed.tags);
            generatedFields.add('tags');
          }
          
          if (parsed.webText) {
            setWebText(parsed.webText);
            generatedFields.add('webText');
          }
          
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
      
    } finally {
      setGenerating(false);
    }
  };

  const generateLocalContent = () => {
    // Generación local como fallback
    // NO generamos título ni ponente ya que son campos fijos
    // La categoría se genera por IA, no aquí
    if (!content) {
      setContent(`<h6>Charla: <em>${title || '[Título de la charla]'}</em></h6><br><p>Descripción de la charla ${title || '[Título de la charla]'} por ${author || '[Ponente]'}</p>`);
    }
    if (!tags) {
      setTags('#talk #speaking');
    }

    if (genLinkedin) setLinkedinText(`Charla: "${title || '[Título de la charla]'}" por ${author || '[Ponente]'}. #talk #speaking`);
    if (genInstagram) setInstagramText(`"${title || '[Título de la charla]'}" por ${author || '[Ponente]'} #talk #speaking`);
    if (genTwitter) setTwitterText(`Charla: "${title || '[Título de la charla]'}" por ${author || '[Ponente]'}`);
    if (genWeb) setWebText(`Descubre mi charla "${title || '[Título de la charla]'}"`);
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

  // Convertir imagen remota a dataURL en web para asegurar que dom-to-image la incluya
  useEffect(() => {
    const toDataUrl = async (url) => {
      try {
        if (!url) { setImageDataUrl(null); return; }
        if (url.startsWith('data:')) { setImageDataUrl(url); return; }
        if (Platform.OS !== 'web') { setImageDataUrl(null); return; }
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const reader = new FileReader();
        return await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('No se pudo convertir la imagen a dataURL:', e?.message || e);
        return null;
      }
    };
    let active = true;
    (async () => {
      const dataUrl = await toDataUrl(imageUrl);
      if (active) setImageDataUrl(dataUrl);
    })();
    return () => { active = false; };
  }, [imageUrl]);

  // Asegurar que la imagen esté cargada antes de capturar (web)
  const ensureImageLoaded = async (src) => {
    try {
      if (!src || Platform.OS !== 'web') return;
      if (src.startsWith('data:')) return; // dataURL no necesita decode
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => resolve();
        img.onerror = () => resolve(); // no bloquear captura si falla
        img.src = src;
      });
    } catch (_) {
      // Ignorar errores, seguimos con la captura
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

  // Función para guardar como borrador
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

      // Si hay una imagen URL, capturar y subir la imagen automáticamente
      if (imageUrl) {
        try {
          console.log('Subiendo imagen de book automáticamente...');
          
          // Subir imagen a Firebase Storage
          try {
            const uploadResult = await storageService.uploadImage(imageUrl, 'books-images');
            
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
          console.warn('Error procesando imagen automáticamente:', imageError);
          // Continuar con la imagen actual si falla el procesamiento
        }
      }

      // Crear la talk como borrador INCLUYENDO campos de redes sociales
      const talkData = {
        author,
        buy,
        category,
        content,
        event: `${slug}_talk_view`,
        id: Date.now(), // ID temporal
        image: finalImageUrl,
        path,
        slug,
        tags,
        title,
        url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      // Crear la talk en Firebase
      const createdTalk = await talksService.create(talkData);
      
      Alert.alert('Borrador guardado', 'El borrador se ha guardado correctamente con la información de redes sociales para poder publicar más tarde.');
      
      // Navegar inmediatamente a la gestión de talks
      navigation.navigate('TalksCRUD');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el borrador de la talk');
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

      // Si hay una imagen URL, subir la imagen automáticamente
      if (imageUrl) {
        try {
          console.log('Subiendo imagen de book automáticamente...');
          
          // Subir imagen a Firebase Storage
          try {
            const uploadResult = await storageService.uploadImage(imageUrl, 'books-images');
            
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
          console.warn('Error procesando imagen automáticamente:', imageError);
          // Continuar con la imagen actual si falla el procesamiento
        }
      }

      // Crear la talk con todos los campos de Firebase incluyendo redes sociales
      const talkData = {
        author,
        buy,
        category,
        content,
        event: `${slug}_talk_view`,
        id: Date.now(), // ID temporal
        image: finalImageUrl,
        path,
        slug,
        tags,
        title,
        url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      // 1. PRIMERO: Crear la talk en Firebase
      const createdTalk = await talksService.create(talkData);
      console.log('Talk creada en Firebase:', createdTalk);
      
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
          // Usar la imagen final
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
      const webMessage = 'Talk publicada en la web correctamente.';
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
        [{ text: 'OK', onPress: () => navigation.navigate('TalksCRUD') }]
      );
      
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo crear la talk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: '#00ca77' }]}>Nueva Talk</Text>
              <Text style={styles.subtitle}>Crear charla con assets y contenido por red</Text>
            </View>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.navigate('ContentEditor')}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            <View style={styles.fieldCard}>
              {/* Imagen */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="image-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>Imagen de la Talk (URL)</Text>
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
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            <View style={styles.fieldCard}>
              {/* Idioma */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="language-outline" size={18} color="#ffffff" />
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
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            <View style={styles.fieldCard}>
              {/* Título del Libro */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="book-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>Título de la Talk</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cómo construir productos digitales exitosos"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            <View style={styles.fieldCard}>
              {/* Autor del Libro */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="person-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>Ponente</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Asier González"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={author}
                  onChangeText={setAuthor}
                />
              </View>
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            <View style={styles.fieldCard}>
              {/* Notas */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="create-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>Notas</Text>
                <TextInput style={[styles.input, styles.multiline]} multiline value={notes} onChangeText={setNotes} placeholder="Notas internas sobre el libro (no públicas)" placeholderTextColor="rgba(255,255,255,0.4)" />
              </View>
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            {imageUrl && (
              <View style={[styles.previewCard, isTablet && styles.previewCardTablet, isMobile && styles.previewCardMobile]}>
                {/* Preview de la talk - Composición: imagen de la talk con información */}
                {Platform.OS === 'web' ? (
                  <div 
                    ref={composeRef} 
                    style={{
                      width: isTablet ? '800px' : isMobile ? '350px' : '1080px',
                      height: isTablet ? '800px' : isMobile ? '350px' : '1080px',
                      backgroundColor: '#00ca77',
                      padding: isTablet ? '30px' : isMobile ? '20px' : '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      margin: '0 auto',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      left: '0px',
                      top: '0px',
                      transform: 'translate(0, 0)'
                    }}
                  >
                    {/* Imagen de cabecera (patrón CreatePostScreen) */}
                    <img 
                      src={getImageSource(talkImage)}
                      style={{
                        position: 'absolute',
                        top: 'calc(50% + 30px)',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '75%',
                        height: '75%',
                        objectFit: 'contain',
                        zIndex: 1
                      }}
                      alt="Background"
                    />
                    
                    {/* Imagen de la talk centrada */}
                    <img 
                      src={imageDataUrl || imageUrl} 
                      style={{
                        width: isTablet ? '400px' : isMobile ? '280px' : '600px',
                        height: isTablet ? '225px' : isMobile ? '157px' : '337px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        marginTop: isTablet ? '-250px' : isMobile ? '-230px' : '-270px',
                        zIndex: 2
                      }} 
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      alt="Talk Image" 
                    />
                    
                    {/* Título en la parte superior */}
                    {title && (
                      <div style={{
                        position: 'absolute',
                        top: isTablet ? '60px' : isMobile ? '50px' : '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#333b4d',
                        fontSize: isTablet ? '28px' : isMobile ? '20px' : '36px',
                        fontWeight: '700',
                        fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                        zIndex: 3
                      }}>
                        {title}
                      </div>
                    )}
                    
                    {/* Ponente */}
                    {author && (
                      <div style={{
                        position: 'absolute',
                        bottom: isTablet ? '245px' : isMobile ? '235px' : '265px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#333b4d',
                        fontSize: isTablet ? '20px' : isMobile ? '16px' : '24px',
                        fontWeight: '600',
                        fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        zIndex: 3
                      }}>
                        {author}
                      </div>
                    )}
                    
                    {/* Categoría */}
                    {category && (
                      <div style={{
                        marginTop: isTablet ? '12px' : isMobile ? '8px' : '16px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: isTablet ? '16px' : isMobile ? '14px' : '18px',
                        fontWeight: '400',
                        fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                      }}>
                        {category}
                      </div>
                    )}
                  </div>
                ) : (
                  <ViewShot ref={composeRef} style={[styles.composeContainer, isTablet && styles.composeContainerTablet, isMobile && styles.composeContainerMobile]} options={{ format: 'png', quality: 1 }}>
                    <View style={[styles.composeBg, isTablet && styles.composeBgTablet, isMobile && styles.composeBgMobile]}>
                      {/* Imagen de cabecera (patrón CreatePostScreen) */}
                      <Image 
                        source={talkImage}
                        style={styles.backgroundTalkImage}
                        resizeMode="cover"
                      />
                      
                      {/* Imagen de la talk centrada */}
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={[styles.talkImage, isTablet && styles.talkImageTablet, isMobile && styles.talkImageMobile]} 
                        resizeMode="contain" 
                      />
                      
                      {/* Título debajo de la imagen */}
                      {title && (
                        <Text style={[styles.composeTitle, isTablet && styles.composeTitleTablet, isMobile && styles.composeTitleMobile]}>
                          {title}
                        </Text>
                      )}
                      
                      {/* Ponente */}
                      {author && (
                        <Text style={[styles.composeAuthor, isTablet && styles.composeAuthorTablet, isMobile && styles.composeAuthorMobile]}>
                          {author}
                        </Text>
                      )}
                      
                      {/* Categoría */}
                      {category && (
                        <Text style={[styles.composeCategory, isTablet && styles.composeCategoryTablet, isMobile && styles.composeCategoryMobile]}>
                          {category}
                        </Text>
                      )}
                    </View>
                  </ViewShot>
                )}
              </View>
            )}

            <View style={[styles.fieldCard, { marginTop: 24 }]}>
              {/* Toggles generación */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                <Ionicons name="options-outline" size={18} color="#ffffff" />
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
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            <View style={styles.fieldCard}>
              {/* Campos de la Talk */}
              <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}> 
                <Ionicons name="mic-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.fieldContent}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Campos de la Talk</Text>
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
                      <Ionicons name="information-circle-outline" size={20} color="#00ca77" />
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
                    placeholder="Product Manager - Survival Guide" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.blogFieldLabel}>Ponente *</Text>
                    {aiGeneratedFields.has('author') && (
                      <View style={styles.aiGeneratedBadge}>
                        <Ionicons name="sparkles" size={12} color="#4CAF50" />
                        <Text style={styles.aiGeneratedText}>IA</Text>
                      </View>
                    )}
                  </View>
                  <TextInput 
                    style={styles.blogInput} 
                    value={author} 
                    onChangeText={setAuthor} 
                    placeholder="Asier González" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.blogFieldLabel}>Categoría *</Text>
                    {aiGeneratedFields.has('category') && (
                      <View style={styles.aiGeneratedBadge}>
                        <Ionicons name="sparkles" size={12} color="#4CAF50" />
                        <Text style={styles.aiGeneratedText}>IA</Text>
                      </View>
                    )}
                  </View>
                  <TextInput 
                    style={styles.blogInput} 
                    value={category} 
                    onChangeText={setCategory} 
                    placeholder="Product Management, Technology" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <Text style={styles.blogFieldLabel}>Tags</Text>
                  <TextInput 
                    style={styles.blogInput} 
                    value={tags} 
                    onChangeText={setTags} 
                    placeholder="#productmanagement #talk #leadership" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <Text style={styles.blogFieldLabel}>Link de la charla</Text>
                  <TextInput 
                    style={styles.blogInput} 
                    value={buy} 
                    onChangeText={setBuy} 
                    placeholder="https://youtube.com/watch?v=..." 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                {/* Contenido */}
                <View style={styles.blogFieldGroup}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.blogFieldLabel}>Contenido (HTML)</Text>
                    {aiGeneratedFields.has('content') && (
                      <View style={styles.aiGeneratedBadge}>
                        <Ionicons name="sparkles" size={12} color="#4CAF50" />
                        <Text style={styles.aiGeneratedText}>IA</Text>
                      </View>
                    )}
                  </View>
                  <TextInput 
                    style={[styles.blogInput, styles.multiline]} 
                    multiline 
                    numberOfLines={6}
                    value={content} 
                    onChangeText={setContent} 
                    placeholder="Contenido HTML para la descripción de la charla" 
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
                    placeholder="/assets/talks/productmanagementtalk.png" 
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
                    placeholder="/contenthub/talk/productmanagementtalk" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <Text style={styles.blogFieldLabel}>URL completa</Text>
                  <TextInput 
                    style={styles.blogInput} 
                    value={url} 
                    onChangeText={setUrl} 
                    placeholder="https://asiergonzalez.es/contenthub/talk/productmanagementtalk" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                <View style={styles.blogFieldGroup}>
                  <Text style={styles.blogFieldLabel}>Slug</Text>
                  <TextInput 
                    style={styles.blogInput} 
                    value={slug} 
                    onChangeText={setSlug} 
                    placeholder="product-management-talk" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                  />
                </View>

                {/* Configuración técnica */}
                <View style={styles.blogFieldGroup}>
                  <Text style={styles.blogFieldLabel}>Event</Text>
                  <TextInput 
                    style={styles.blogInput} 
                    value={`${slug}_talk_view`} 
                    onChangeText={() => {}} 
                    placeholder="productmanagementtalk_talk_view" 
                    placeholderTextColor="rgba(255,255,255,0.4)" 
                    editable={false}
                  />
                </View>
              </View>
              <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
            </View>

            {genLinkedin && (
              <View style={styles.fieldCard}>
                <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                  <Ionicons name="logo-linkedin" size={18} color="#ffffff" />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.label}>LinkedIn</Text>
                  <TextInput style={[styles.input, styles.multiline]} multiline value={linkedinText} onChangeText={setLinkedinText} />
                </View>
                <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
              </View>
            )}
            {genInstagram && (
              <View style={styles.fieldCard}>
                <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                  <Ionicons name="logo-instagram" size={18} color="#ffffff" />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.label}>Instagram</Text>
                  <TextInput style={[styles.input, styles.multiline]} multiline value={instagramText} onChangeText={setInstagramText} />
                </View>
                <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
              </View>
            )}
            {genTwitter && (
              <View style={styles.fieldCard}>
                <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
                  <Ionicons name="logo-twitter" size={18} color="#ffffff" />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.label}>Twitter</Text>
                  <TextInput style={[styles.input, styles.multiline]} multiline value={twitterText} onChangeText={setTwitterText} />
                </View>
                <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
              </View>
            )}
          </View>

          <View style={styles.socialMediaSection}>
            {/* Sección de redes sociales conectadas (solo informativa) */}
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
                {connectedPlatforms.instagram ? (
                  <View style={styles.platformIconCircle}>
                    <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons name="logo-instagram" size={20} color="rgba(255,255,255,0.3)" />
                )}
                <Text style={[styles.platformText, connectedPlatforms.instagram && styles.platformTextConnected]}>
                  Instagram
                </Text>
                {connectedPlatforms.instagram && (
                  <Ionicons name="checkmark-circle" size={16} color="#00ca77" />
                )}
              </View>
              
              <View style={[styles.platformIndicator, connectedPlatforms.twitter && styles.platformConnected]}>
                {connectedPlatforms.twitter ? (
                  <View style={styles.platformIconCircle}>
                    <Ionicons name="logo-twitter" size={18} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons name="logo-twitter" size={20} color="rgba(255,255,255,0.3)" />
                )}
                <Text style={[styles.platformText, connectedPlatforms.twitter && styles.platformTextConnected]}>
                  Twitter/X
                </Text>
                {connectedPlatforms.twitter && (
                  <Ionicons name="checkmark-circle" size={16} color="#00ca77" />
                )}
              </View>
              
              <View style={[styles.platformIndicator, connectedPlatforms.linkedin && styles.platformConnected]}>
                {connectedPlatforms.linkedin ? (
                  <View style={styles.platformIconCircle}>
                    <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons name="logo-linkedin" size={20} color="rgba(255,255,255,0.3)" />
                )}
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
              ℹ️ Al usar "Publicar", el book se publicará tanto en la web como en las redes sociales conectadas automáticamente.
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {/* Botones de acción AL FINAL */}
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
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#333b4d',
    paddingTop: 12,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#00ca77',
    borderRadius: 8,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
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
    backgroundColor: '#00ca77',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
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
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundTalkImage: {
    position: 'absolute',
    top: 'calc(12.5% + 30px)',
    left: '12.5%',
    width: '75%',
    height: '75%',
    zIndex: 1,
  },
  composeBgTablet: {
    width: 800,
    height: 800,
    paddingTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  composeBgMobile: {
    width: 350,
    height: 350,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  talkImage: {
    width: 600,
    height: 337,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20,
    marginTop: -270,
  },
  talkImageTablet: {
    width: 400,
    height: 225,
    marginTop: -250,
  },
  talkImageMobile: {
    width: 280,
    height: 157,
    marginTop: -230,
  },
  composeTitle: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    color: '#333b4d',
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    alignSelf: 'center',
    textTransform: 'uppercase',
    zIndex: 3,
    numberOfLines: 1,
  },
  composeTitleTablet: {
    fontSize: 28,
    top: 60,
  },
  composeTitleMobile: {
    fontSize: 20,
    top: 50,
  },
  composeAuthor: {
    position: 'absolute',
    bottom: 265,
    left: 0,
    right: 0,
    color: '#333b4d',
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    alignSelf: 'center',
    zIndex: 3,
    numberOfLines: 1,
  },
  composeAuthorTablet: {
    fontSize: 20,
    bottom: 245,
  },
  composeAuthorMobile: {
    fontSize: 16,
    bottom: 235,
  },
  composeCategory: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 16,
  },
  composeCategoryTablet: {
    fontSize: 16,
    marginTop: 12,
  },
  composeCategoryMobile: {
    fontSize: 14,
    marginTop: 8,
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
    backgroundColor: '#00ca77',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  draftBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
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
    color: '#00ca77',
  },
  refreshButton: {
    padding: 8,
  },
  connectedPlatforms: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  platformIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00ca77',
    alignItems: 'center',
    justifyContent: 'center',
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

export default CreateTalkScreen;

