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
import { quotesService } from '../services/firestore';
import { storageService } from '../services/storage';
import socialMediaService from '../config/socialMediaConfig';
import { buildRichQuoteHtml } from '../utils/richQuoteHtml';

// Import dom-to-image solo para web
let domtoimage;
if (Platform.OS === 'web') {
  domtoimage = require('dom-to-image');
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isMobile = width < 768;
 
const LANGUAGES = ['es', 'en', 'eu', 'fr'];

const CreateQuoteScreen = ({ navigation }) => {
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

  // Campos específicos de quotes (basados en Firebase)
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => {
    const today = new Date();
    return today.getFullYear().toString();
  });
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [path, setPath] = useState('');
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [where, setWhere] = useState('');

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

  const baseContext = useMemo(() => ({ imageUrl, location, date, event, people, language, phrase }), [imageUrl, location, date, event, people, language, phrase]);

  // Sufijo único corto basado en timestamp
  const uniqueSuffix = () => {
    const ts = Date.now().toString(36);
    return ts.slice(-6);
  };

  // Función para generar slug automáticamente (añade sufijo para evitar colisiones)
  const generateSlug = (author) => {
    if (!author) return '';
    const base = author
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
    return `https://asiergonzalez.es/contenthub/quotes/${slug}`;
  };

  // Función para generar path automáticamente
  const generatePath = (slug) => {
    if (!slug) return '';
    return `/contenthub/quotes/${slug}`;
  };

  // Generar automáticamente slug, URL y path cuando cambie el autor
  useEffect(() => {
    if (author) {
      const newSlug = generateSlug(author);
      setSlug(newSlug);
      setUrl(generateUrl(newSlug));
      setPath(generatePath(newSlug));
    }
  }, [author]);

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
          date: quoteDate,
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
          // No modificar la frase ya que es una cita literal
          if (parsed.webText) setWebText(parsed.webText);
          if (parsed.cta) setCta(parsed.cta);
          
          // Completar campos de la quote
          const generatedFields = new Set();
          // 1) Autor debe ser el mismo que Personas
          if (people && people.trim()) {
            // tomar el primer nombre si vienen varios separados por coma
            const firstPerson = people.split(',')[0].trim();
            setAuthor(firstPerson);
            generatedFields.add('author');
          } else if (parsed.author) {
            setAuthor(parsed.author);
            generatedFields.add('author');
          }
          // 2) Completar categoría de la cita
          if (parsed.category) {
            setCategory(parsed.category);
            generatedFields.add('category');
          } else if (!category) {
            setCategory('General');
            generatedFields.add('category');
          }
          // 4) Generar contenido HTML con formato de referencia si no viene o es demasiado corto
          if (parsed.content && parsed.content.length > 120) {
            setContent(parsed.content);
            generatedFields.add('content');
          } else {
            const quoteHtml = buildRichQuoteHtml(phrase, language);
            setContent(quoteHtml);
            generatedFields.add('content');
          }
          if (parsed.tags) { setTags(parsed.tags); generatedFields.add('tags'); }
          // 3) Where = lugar/evento
          if (parsed.where) {
            setWhere(parsed.where);
            generatedFields.add('where');
          } else {
            const loc = (location || '').trim();
            const ev = (event || '').trim();
            const same = loc && ev && loc.toLowerCase() === ev.toLowerCase();
            const whereValue = same ? (loc || ev) : `${loc}${loc && ev ? ' · ' : ''}${ev}`;
            if (whereValue) {
              setWhere(whereValue);
              generatedFields.add('where');
            }
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
      // 5) Slug/Path/URL únicos basados en autor actualizado
      if (author) {
        const newSlug = generateSlug(author);
        setSlug(newSlug);
        setUrl(generateUrl(newSlug));
        setPath(generatePath(newSlug));
      }

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
    // 1) Autor = Personas
    if (people && people.trim()) {
      const firstPerson = people.split(',')[0].trim();
      setAuthor(firstPerson);
    }
    // 2) Categoría por defecto si falta
    if (!category) setCategory('General');
    // 3) Where = lugar/evento
    const loc = (location || '').trim();
    const ev = (event || '').trim();
    const same = loc && ev && loc.toLowerCase() === ev.toLowerCase();
    const whereValue = same ? (loc || ev) : `${loc}${loc && ev ? ' · ' : ''}${ev}`;
    if (whereValue) setWhere(whereValue);
    // 4) HTML de contenido con formato de referencia enriquecido
    if (!content || content.length < 120) {
      const quoteHtml = buildRichQuoteHtml(phrase, language);
      setContent(quoteHtml);
    }
    // 5) Slug/Path/URL únicos
    if (author) {
      const newSlug = generateSlug(author);
      setSlug(newSlug);
      setUrl(generateUrl(newSlug));
      setPath(generatePath(newSlug));
    }

    if (genLinkedin) setLinkedinText(generatePlatformContent('linkedin', baseContext));
    if (genInstagram) setInstagramText(generatePlatformContent('instagram', baseContext));
    if (genTwitter) setTwitterText(generatePlatformContent('twitter', baseContext));
    if (genWeb) setWebText(generateWebContent(baseContext, cta));
    
    // No modificar la frase ya que es una cita literal
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
      if (!author || !category) {
        Alert.alert('Campos requeridos', 'El autor y la categoría son obligatorios');
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
            await ensureImageLoaded(imageDataUrl || imageUrl);
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
                padding: '0',
                filter: 'none',
                opacity: 1
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
            const uploadResult = await storageService.uploadImage(imageData, 'quotes-images');
            
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

      // Crear la quote como borrador INCLUYENDO campos de redes sociales
      const quoteData = {
        author,
        category,
        content,
        date: quoteDate,
        event: `quote_${slug}_view`,
        id: Date.now(), // ID temporal
        image: finalImageUrl,
        path,
        slug,
        tags,
        url,
        where,
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

      // Crear la quote en Firebase
      const createdQuote = await quotesService.create(quoteData);
      
      Alert.alert('Borrador guardado', 'El borrador se ha guardado correctamente con la información de redes sociales para poder publicar más tarde.');
      
      // Navegar inmediatamente a la gestión de quotes
      navigation.navigate('QuotesCRUD');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el borrador');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      if (!author || !category) {
        Alert.alert('Campos requeridos', 'El autor y la categoría son obligatorios');
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
            await ensureImageLoaded(imageDataUrl || imageUrl);
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
                padding: '0',
                filter: 'none',
                opacity: 1
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
            const uploadResult = await storageService.uploadImage(imageData, 'quotes-images');
            
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

      // Crear la quote con todos los campos de Firebase incluyendo redes sociales
      const quoteData = {
        author,
        category,
        content,
        date: quoteDate,
        event: `quote_${slug}_view`,
        id: Date.now(), // ID temporal
        image: finalImageUrl,
        path,
        slug,
        tags,
        url,
        where,
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

      // 1. PRIMERO: Crear la quote en Firebase
      const createdQuote = await quotesService.create(quoteData);
      console.log('Quote creada en Firebase:', createdQuote);
      
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
      const webMessage = 'Quote publicada en la web correctamente.';
      let socialMessage = '';
      
      if (socialMediaResults && socialMediaResults.success) {
        const { successful, total, failed } = socialMediaResults.summary;
        socialMessage = ` También publicada en ${successful} de ${total} redes sociales.`;
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
        [{ text: 'OK', onPress: () => navigation.navigate('QuotesCRUD') }]
      );
      
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo crear la quote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: '#00ca77' }]}>Nueva Quote</Text>
          <Text style={styles.subtitle}>Crear quote con assets y contenido por red</Text>
        </View>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('ContentEditor')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {/* Imagen */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="image-outline" size={18} color="#ffffff" />
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
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Localización */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="location-outline" size={18} color="#ffffff" />
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
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Fecha */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="calendar-outline" size={18} color="#ffffff" />
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
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
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
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="pricetag-outline" size={18} color="#ffffff" />
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
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Personas */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="people-outline" size={18} color="#ffffff" />
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
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Idioma */}
        <View style={styles.fieldCard}>
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

        {/* Notas */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
            <Ionicons name="create-outline" size={18} color="#ffffff" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.label}>Notas</Text>
            <TextInput style={[styles.input, styles.multiline]} multiline value={notes} onChangeText={setNotes} placeholder="Notas internas (no públicas)" placeholderTextColor="rgba(255,255,255,0.4)" />
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Frase */}
        <View style={[styles.fieldCard, { flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }] }>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77', marginRight: 12 }]}> 
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
            </View>
            <Text style={styles.label}>Frase (Cita literal)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Cita literal de la persona"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={phrase}
            onChangeText={setPhrase}
            multiline
          />
        </View>

        {/* Preview del montaje - COMPOSICIÓN ESPECIAL PARA QUOTES */}
        {true && (
          <View style={[styles.previewCard, isTablet && styles.previewCardTablet, isMobile && styles.previewCardMobile]}>
            {/* Composición: fondo verde + imagen de fondo + textos */}
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
                {/* Imagen de fondo que ocupa todo el ancho y alto */}
                {imageUrl ? (
                  <img 
                    src={imageDataUrl || imageUrl} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 1
                    }} 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    alt="Background" 
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f8f9fa',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                
                {/* Sin overlay oscuro: fondo limpio */}
                
                {/* Personas - Centrado debajo de la foto */}
                {people && (
                  <div style={{
                    position: 'absolute',
                    bottom: isTablet ? '60px' : isMobile ? '40px' : '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                    color: '#FFFFFF',
                    fontSize: isTablet ? '18px' : isMobile ? '14px' : '24px',
                    fontWeight: '600',
                    fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif',
                    textAlign: 'center',
                    letterSpacing: '1px'
                  }}>
                    {people.toUpperCase()}
                  </div>
                )}
                
                {/* Contenido de texto superpuesto */}
                <div style={{
                  position: 'relative',
                  zIndex: 3,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: isTablet ? '40px' : isMobile ? '20px' : '60px'
                }}>
                  {/* Icono de comillas - posicionado al 20% superior */}
                  <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <span
                      style={{
                        color: '#e8e8e8',
                        fontSize: isTablet ? '360px' : isMobile ? '240px' : '540px',
                        lineHeight: isTablet ? '360px' : isMobile ? '240px' : '540px',
                        fontWeight: 800,
                        fontFamily: 'Georgia, Times, "Times New Roman", serif',
                        letterSpacing: 0,
                        display: 'inline-block'
                      }}
                    >
                      ”
                    </span>
                  </div>
                  
                  {/* Quote principal - centrado vertical sin mover icono ni autor */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      color: '#e8e8e8',
                      fontSize: isTablet ? '48px' : isMobile ? '32px' : '76px',
                      fontWeight: '300',
                      fontFamily: 'Satoshi-Light, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      lineHeight: isTablet ? '60px' : isMobile ? '40px' : '90px',
                      maxWidth: '90%',
                      marginTop: '90px'
                    }}>
                      “{phrase}”
                    </div>
                  </div>
                  
                  {/* Autor oculto en composición web según solicitud */}
                  {/* Evento/Lugar debajo de Personas (web) */}
                  {(location || event) && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 3,
                      color: '#e8e8e8',
                      fontSize: isTablet ? '16px' : isMobile ? '12px' : '20px',
                      fontWeight: '400',
                      fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, sans-serif',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {(() => {
                        const loc = (location || '').trim();
                        const ev = (event || '').trim();
                        if (!loc && !ev) return '';
                        const same = loc.toLowerCase() === ev.toLowerCase();
                        const inner = same ? (loc || ev) : `${loc}${loc && ev ? ' · ' : ''}${ev}`;
                        return `- ${inner} -`;
                      })()}
                    </div>
                  )}
                  
                  {/* Categoría oculta en composición web según solicitud */}
                </div>
              </div>
            ) : (
              <ViewShot ref={composeRef} style={[styles.composeContainer, isTablet && styles.composeContainerTablet, isMobile && styles.composeContainerMobile]} options={{ format: 'png', quality: 1 }}>
                <View style={[styles.composeBg, isTablet && styles.composeBgTablet, isMobile && styles.composeBgMobile]}>
                  {/* Imagen de fondo que ocupa todo el espacio */}
                  {imageUrl ? (
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={[styles.composeBackgroundImage, isTablet && styles.composeBackgroundImageTablet, isMobile && styles.composeBackgroundImageMobile]} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={[styles.composeBackgroundPlaceholder, isTablet && styles.composeBackgroundPlaceholderTablet, isMobile && styles.composeBackgroundPlaceholderMobile]}>
                      <Ionicons 
                        name="image-outline" 
                        size={isTablet ? 32 : isMobile ? 24 : 40} 
                        color="#ccc" 
                      />
                      <Text style={[styles.composeBackgroundPlaceholderText, isTablet && styles.composeBackgroundPlaceholderTextTablet, isMobile && styles.composeBackgroundPlaceholderTextMobile]}>
                        Imagen de previsualización
                      </Text>
                    </View>
                  )}
                  
                  {/* Sin overlay oscuro: fondo limpio */}
                  
                  {/* Personas - Centrado debajo de la foto */}
                  {people && (
                    <View style={[styles.composePeopleContainer, isTablet && styles.composePeopleContainerTablet, isMobile && styles.composePeopleContainerMobile]}>
                      <Text style={[styles.composePeople, isTablet && styles.composePeopleTablet, isMobile && styles.composePeopleMobile]}>
                        {people.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  
                  {/* Contenido de texto */}
                  <View style={[styles.composeContent, isTablet && styles.composeContentTablet, isMobile && styles.composeContentMobile]}>
                    {/* Icono de comillas */}
                    <View style={[styles.quoteIconContainer, isTablet && styles.quoteIconContainerTablet, isMobile && styles.quoteIconContainerMobile]}>
                      <Text
                        style={{
                          color: '#e8e8e8',
                          fontSize: isTablet ? 360 : isMobile ? 240 : 540,
                          lineHeight: isTablet ? 360 : isMobile ? 240 : 540,
                          fontWeight: '800',
                          fontFamily: 'Georgia',
                          letterSpacing: 0
                        }}
                      >
                        ”
                      </Text>
                    </View>
                    
                    {/* Quote principal - centrado vertical sin mover icono ni autor */}
                    <View style={[styles.composeQuoteOverlay, isTablet && styles.composeQuoteOverlayTablet, isMobile && styles.composeQuoteOverlayMobile]} pointerEvents="none">
                      <Text style={[styles.composeQuote, isTablet && styles.composeQuoteTablet, isMobile && styles.composeQuoteMobile]}>
                        “{phrase}”
                      </Text>
                    </View>
                    {/* Autor oculto en composición móvil/tablet según solicitud */}
                    {(location || event) && (
                      <View style={[styles.composeEventContainer, isTablet && styles.composeEventContainerTablet, isMobile && styles.composeEventContainerMobile]}>
                        <Text style={[styles.composeEvent, isTablet && styles.composeEventTablet, isMobile && styles.composeEventMobile]}>
                        {(() => {
                          const loc = (location || '').trim();
                          const ev = (event || '').trim();
                          if (!loc && !ev) return '';
                          const same = loc.toLowerCase() === ev.toLowerCase();
                          const inner = same ? (loc || ev) : `${loc}${loc && ev ? ' · ' : ''}${ev}`;
                          return `- ${inner} -`;
                        })()}
                        </Text>
                      </View>
                    )}
                    {/* Categoría oculta en composición móvil/tablet según solicitud */}
                  </View>
                </View>
              </ViewShot>
            )}
          </View>
        )}

        {/* Toggles generación */}
        <View style={[styles.fieldCard, { marginTop: 24 }]}>
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

        {/* Campos de la Quote */}
        <View style={styles.fieldCard}>
          <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}> 
            <Ionicons name="document-text-outline" size={18} color="#ffffff" />
          </View>
          <View style={styles.fieldContent}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Campos de la Quote</Text>
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
                <Text style={styles.blogFieldLabel}>Autor *</Text>
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
                placeholder="Alicia Asín · CEO Libelium" 
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
                placeholder="Data Control" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Fecha</Text>
              <TextInput 
                style={styles.blogInput} 
                value={quoteDate} 
                onChangeText={setQuoteDate} 
                placeholder="2024" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Tags</Text>
              <TextInput 
                style={styles.blogInput} 
                value={tags} 
                onChangeText={setTags} 
                placeholder="#aliciaasin #data #innovation" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Where</Text>
              <TextInput 
                style={styles.blogInput} 
                value={where} 
                onChangeText={setWhere} 
                placeholder="Toma el control de Tus Datos · 2024" 
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
                placeholder="Contenido HTML para la quote" 
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
                placeholder="/assets/quotes/11.png" 
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
                placeholder="/contenthub/quotes/aliciaasin" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>URL completa</Text>
              <TextInput 
                style={styles.blogInput} 
                value={url} 
                onChangeText={setUrl} 
                placeholder="https://asiergonzalez.es/contenthub/quotes/aliciaasin" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Slug</Text>
              <TextInput 
                style={styles.blogInput} 
                value={slug} 
                onChangeText={setSlug} 
                placeholder="quote-11" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>

            {/* Configuración técnica */}
            <View style={styles.blogFieldGroup}>
              <Text style={styles.blogFieldLabel}>Event</Text>
              <TextInput 
                style={styles.blogInput} 
                value={`quote_${slug}_view`} 
                onChangeText={() => {}} 
                placeholder="aliciaasin_quotes_view" 
                placeholderTextColor="rgba(255,255,255,0.4)" 
                editable={false}
              />
            </View>
          </View>
          <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
        </View>

        {/* Contenidos editables */}
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
          ℹ️ Al usar "Publicar", la quote se publicará tanto en la web como en las redes sociales conectadas automáticamente.
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
    backgroundColor: '#00ca77',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBtnDisabled: {
    opacity: 0.6,
  },
  aiBtnText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 14,
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
  // Estilos específicos para quotes - imagen de fondo
  composeBackgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  composeBackgroundImageTablet: {
    width: '100%',
    height: '100%',
  },
  composeBackgroundImageMobile: {
    width: '100%',
    height: '100%',
  },
  composeBackgroundPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  composeBackgroundPlaceholderTablet: {
    width: '100%',
    height: '100%',
  },
  composeBackgroundPlaceholderMobile: {
    width: '100%',
    height: '100%',
  },
  composeBackgroundPlaceholderText: {
    color: '#666',
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'Satoshi-Light',
    marginTop: 8,
    textAlign: 'center',
  },
  composeBackgroundPlaceholderTextTablet: {
    fontSize: 16,
  },
  composeBackgroundPlaceholderTextMobile: {
    fontSize: 12,
  },
  composeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 2,
  },
  composeOverlayTablet: {
    width: '100%',
    height: '100%',
  },
  composeOverlayMobile: {
    width: '100%',
    height: '100%',
  },
  composeContent: {
    position: 'relative',
    zIndex: 3,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  composeContentTablet: {
    padding: 40,
  },
  composeContentMobile: {
    padding: 20,
  },
  // Overlay para centrar verticalmente solo la frase, sin afectar icono ni autor
  composeQuoteOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    transform: [{ translateY: 80 }],
  },
  composeQuoteOverlayTablet: {
    paddingHorizontal: 40,
    transform: [{ translateY: 80 }],
  },
  composeQuoteOverlayMobile: {
    paddingHorizontal: 20,
    transform: [{ translateY: 80 }],
  },
  quoteIconContainer: {
    position: 'absolute',
    top: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  quoteIconContainerTablet: {
    top: '10%',
  },
  quoteIconContainerMobile: {
    top: '10%',
  },
  composeQuote: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '300',
    fontFamily: 'Satoshi-Light',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 90,
    marginBottom: 0,
    maxWidth: '90%',
  },
  composeQuoteTablet: {
    fontSize: 48,
    lineHeight: 60,
    marginBottom: 0,
  },
  composeQuoteMobile: {
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 0,
  },
  composeAuthor: {
    color: '#e8e8e8',
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    marginBottom: 15,
  },
  composeAuthorTablet: {
    fontSize: 20,
    marginBottom: 10,
  },
  composeAuthorMobile: {
    fontSize: 14,
    marginBottom: 8,
  },
  composeEvent: {
    color: '#e8e8e8',
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  composeEventTablet: {
    fontSize: 16,
  },
  composeEventMobile: {
    fontSize: 12,
  },
  composeCategory: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'Satoshi',
    textAlign: 'center',
  },
  composeCategoryTablet: {
    fontSize: 16,
  },
  composeCategoryMobile: {
    fontSize: 12,
  },
  composePeopleContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  composePeopleContainerTablet: {
    bottom: 60,
  },
  composePeopleContainerMobile: {
    bottom: 40,
  },
  composePeople: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Satoshi',
    textAlign: 'center',
    letterSpacing: 1,
    // sin sombras: texto plano
  },
  composePeopleTablet: {
    fontSize: 18,
  },
  composePeopleMobile: {
    fontSize: 14,
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

export default CreateQuoteScreen;
