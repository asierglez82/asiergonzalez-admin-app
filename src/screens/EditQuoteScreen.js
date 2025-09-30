import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { quotesService } from '../services/firestore';
import socialMediaService from '../config/socialMediaConfig';
import { storageService } from '../services/storage';

const { width } = Dimensions.get('window');

const EditQuoteScreen = ({ navigation, route }) => {
  const { quoteId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [quote, setQuote] = useState(null);
  const [isDraft, setIsDraft] = useState(true);

  const [formData, setFormData] = useState({
    author: '',
    category: '',
    content: '', // HTML
    date: '',
    event: '',
    image: '',
    path: '',
    slug: '',
    url: '',
    tags: '',
    where: ''
  });

  const [connectedPlatforms, setConnectedPlatforms] = useState({ instagram: false, twitter: false, linkedin: false });
  const [socialMediaData, setSocialMediaData] = useState({ linkedin: '', instagram: '', twitter: '', settings: { genLinkedin: true, genInstagram: true, genTwitter: false } });
  const [publishedStatus, setPublishedStatus] = useState({ linkedin: false, instagram: false, twitter: false });
  const [publishing, setPublishing] = useState({ linkedin: false, instagram: false, twitter: false });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreenData(window));
    return () => sub?.remove();
  }, []);

  const loadConnectedPlatforms = async () => {
    try {
      const platforms = await socialMediaService.getConnectedPlatforms();
      setConnectedPlatforms(platforms);
    } catch (e) {
      console.warn('Error loading platforms', e);
    }
  };

  useEffect(() => { loadConnectedPlatforms(); }, []);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const data = await quotesService.getById(quoteId);
      setQuote(data);
      setFormData({
        author: data.author || '',
        category: data.category || '',
        content: data.content || '',
        date: data.date || '',
        event: data.event || '',
        image: data.image || '',
        path: data.path || '',
        slug: data.slug || '',
        url: data.url || '',
        tags: data.tags || '',
        where: data.where || ''
      });
      setIsDraft(data?.social?.draft !== false && data?.draft !== false);
      if (data.socialMedia) {
        setSocialMediaData({
          linkedin: data.socialMedia.linkedin || '',
          instagram: data.socialMedia.instagram || '',
          twitter: data.socialMedia.twitter || '',
          settings: {
            genLinkedin: data.socialMedia.settings?.genLinkedin !== false,
            genInstagram: data.socialMedia.settings?.genInstagram !== false,
            genTwitter: data.socialMedia.settings?.genTwitter || false,
          },
        });
        // Importante: los flags pueden venir como string "false" desde Firestore.
        // Solo considerar publicado si el valor es estrictamente true.
        setPublishedStatus({
          linkedin: data.socialMedia?.published?.linkedin === true,
          instagram: data.socialMedia?.published?.instagram === true,
          twitter: data.socialMedia?.published?.twitter === true,
        });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar la quote');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quoteId) loadQuote(); else { Alert.alert('Error', 'Falta ID'); navigation.goBack(); }
  }, [quoteId]);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleBack = () => navigation.navigate('QuotesCRUD');

  // Asegurar URL pública de imagen: si no es http(s), subir a Storage (quotes-images)
  const ensurePublicImageUrl = async (imageUrl) => {
    try {
      if (!imageUrl) return '';
      if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
      const upload = await storageService.uploadImage(imageUrl, 'quotes-images');
      return upload?.success ? upload.url : '';
    } catch (e) {
      return '';
    }
  };

  const handleCancel = () => {
    if (!quote) return;
    setFormData({
      author: quote.author || '',
      category: quote.category || '',
      content: quote.content || '',
      date: quote.date || '',
      event: quote.event || '',
      image: quote.image || '',
      path: quote.path || '',
      slug: quote.slug || '',
      url: quote.url || '',
      tags: quote.tags || '',
      where: quote.where || ''
    });
    setIsDraft(quote?.social?.draft !== false && quote?.draft !== false);
    if (quote.socialMedia) {
      setSocialMediaData({
        linkedin: quote.socialMedia.linkedin || '',
        instagram: quote.socialMedia.instagram || '',
        twitter: quote.socialMedia.twitter || '',
        settings: {
          genLinkedin: quote.socialMedia.settings?.genLinkedin !== false,
          genInstagram: quote.socialMedia.settings?.genInstagram !== false,
          genTwitter: quote.socialMedia.settings?.genTwitter || false,
        },
      });
      setPublishedStatus({
        linkedin: quote.socialMedia?.published?.linkedin === true,
        instagram: quote.socialMedia?.published?.instagram === true,
        twitter: quote.socialMedia?.published?.twitter === true,
      });
    }
    Alert.alert('Cambios deshechos', 'Se han restaurado los valores originales de la quote');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.author.trim()) { Alert.alert('Error', 'El autor es requerido'); return; }
      const updateData = {
        ...formData,
        draft: isDraft,
        updatedAt: new Date(),
        socialMedia: { ...socialMediaData, published: publishedStatus },
      };
      await quotesService.update(quoteId, updateData);
      Alert.alert('Éxito', 'Quote actualizada', [{ text: 'OK', onPress: () => navigation.navigate('QuotesCRUD') }]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar la quote');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      if (!formData.author.trim()) { Alert.alert('Error', 'El autor es requerido'); return; }
      const updateData = {
        ...formData,
        draft: false,
        updatedAt: new Date(),
        socialMedia: { ...socialMediaData, published: publishedStatus },
      };
      await quotesService.update(quoteId, updateData);

      const platformsContent = {};
      if (connectedPlatforms.linkedin && socialMediaData.linkedin && socialMediaData.settings.genLinkedin) platformsContent.linkedin = socialMediaData.linkedin;
      if (connectedPlatforms.instagram && socialMediaData.instagram && socialMediaData.settings.genInstagram) platformsContent.instagram = socialMediaData.instagram;
      if (connectedPlatforms.twitter && socialMediaData.twitter && socialMediaData.settings.genTwitter) platformsContent.twitter = socialMediaData.twitter;
      let result = null;
      if (Object.keys(platformsContent).length > 0) {
        try { result = await socialMediaService.publishToMultiplePlatforms(platformsContent, formData.image); } catch {}
      }
      Alert.alert('Publicación completada', 'Quote publicada correctamente' + (result?.success ? ' y publicada en redes' : ''), [{ text: 'OK', onPress: () => navigation.navigate('QuotesCRUD') }]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo publicar la quote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando quote...</Text>
      </View>
    );
  }

  const isTablet = screenData.width >= 768;
  const isMobile = screenData.width < 768;

  return (
    <View style={styles.container}>
      <View style={[styles.header, isTablet && styles.headerTablet, isMobile && styles.headerMobile]}>
        <View style={[styles.headerContent, isTablet && styles.headerContentTablet, isMobile && styles.headerContentMobile]}>
          <Text style={[styles.title, isTablet && styles.titleTablet, isMobile && styles.titleMobile]}>Editar Quote</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet, isMobile && styles.subtitleMobile]}>Modifica los campos de la quote</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={[styles.cancelButton, isTablet && styles.cancelButtonTablet, isMobile && styles.cancelButtonMobile]} onPress={handleCancel}>
            <Ionicons name="arrow-undo" size={isTablet ? 28 : 24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, isTablet && styles.saveButtonTablet, isMobile && styles.saveButtonMobile, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark" size={isTablet ? 28 : 24} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconHeaderButton, isTablet && styles.iconHeaderButtonTablet, isMobile && styles.iconHeaderButtonMobile]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={isTablet ? 24 : 20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet, isMobile && styles.scrollContentMobile]}>
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>Información Básica</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Autor *</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.author} onChangeText={(v)=>handleInputChange('author', v)} placeholder="Autor" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Fecha</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.date} onChangeText={(v)=>handleInputChange('date', v)} placeholder="Ej: 2024" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Lugar/Evento</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.where} onChangeText={(v)=>handleInputChange('where', v)} placeholder="Ej: Madrid · South Summit" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Categoría</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.category} onChangeText={(v)=>handleInputChange('category', v)} placeholder="Ej: Innovación" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Tags</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.tags} onChangeText={(v)=>handleInputChange('tags', v)} placeholder="Ej: #data #ai" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, isTablet && styles.toggleLabelTablet, isMobile && styles.toggleLabelMobile]}>Estado</Text>
              <View style={styles.toggleContainer}>
                <Text style={[styles.toggleText, isDraft && styles.toggleTextActive]}>Borrador</Text>
                <Switch value={!isDraft} onValueChange={(v)=>setIsDraft(!v)} trackColor={{ false: '#FF9800', true: '#4CAF50' }} thumbColor={'#FFFFFF'} />
                <Text style={[styles.toggleText, !isDraft && styles.toggleTextActive]}>Publicado</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardAccent} />
        </View>

        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>Contenido HTML</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Contenido</Text>
            <TextInput style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]} value={formData.content} onChangeText={(v)=>handleInputChange('content', v)} placeholder="HTML de la quote" placeholderTextColor="rgba(255,255,255,0.5)" multiline numberOfLines={10} />
          </View>
          <View style={styles.cardAccent} />
        </View>

        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>URLs e Imágenes</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Imagen</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.image} onChangeText={(v)=>handleInputChange('image', v)} placeholder="URL imagen" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Slug</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.slug} onChangeText={(v)=>handleInputChange('slug', v)} placeholder="slug-unico" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>Path</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.path} onChangeText={(v)=>handleInputChange('path', v)} placeholder="/contenthub/quotes/slug" placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet, isMobile && styles.labelMobile]}>URL</Text>
            <TextInput style={[styles.input, isTablet && styles.inputTablet, isMobile && styles.inputMobile]} value={formData.url} onChangeText={(v)=>handleInputChange('url', v)} placeholder="https://..." placeholderTextColor="rgba(255,255,255,0.5)" />
          </View>
          <View style={styles.cardAccent} />
        </View>

        {/* Sección de redes sociales (replicada de EditBlogPostScreen) */}
        <View style={[styles.section, isTablet && styles.sectionTablet, isMobile && styles.sectionMobile]}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, isMobile && styles.sectionTitleMobile]}>Redes Sociales</Text>

          <View style={styles.socialMediaHeader}>
            <Text style={styles.socialMediaSubtitle}>Estado de plataformas conectadas</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadConnectedPlatforms}>
              <Ionicons name="refresh-outline" size={20} color="#64D2FF" />
            </TouchableOpacity>
          </View>

          <View style={styles.connectedPlatforms}>
            <View style={[styles.platformIndicator, connectedPlatforms.instagram && styles.platformConnected]}>
              <Ionicons name="logo-instagram" size={20} color={connectedPlatforms.instagram ? '#FF2D92' : 'rgba(255,255,255,0.3)'} />
              <Text style={[styles.platformText, connectedPlatforms.instagram && styles.platformTextConnected]}>Instagram</Text>
              {connectedPlatforms.instagram && (<Ionicons name="checkmark-circle" size={16} color="#00ca77" />)}
            </View>
            <View style={[styles.platformIndicator, connectedPlatforms.twitter && styles.platformConnected]}>
              <Ionicons name="logo-twitter" size={20} color={connectedPlatforms.twitter ? '#1DA1F2' : 'rgba(255,255,255,0.3)'} />
              <Text style={[styles.platformText, connectedPlatforms.twitter && styles.platformTextConnected]}>Twitter/X</Text>
              {connectedPlatforms.twitter && (<Ionicons name="checkmark-circle" size={16} color="#00ca77" />)}
            </View>
            <View style={[styles.platformIndicator, connectedPlatforms.linkedin && styles.platformConnected]}>
              <Ionicons name="logo-linkedin" size={20} color={connectedPlatforms.linkedin ? '#0A66C2' : 'rgba(255,255,255,0.3)'} />
              <Text style={[styles.platformText, connectedPlatforms.linkedin && styles.platformTextConnected]}>LinkedIn</Text>
              {connectedPlatforms.linkedin && (<Ionicons name="checkmark-circle" size={16} color="#00ca77" />)}
            </View>
          </View>

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
                    style={[
                      styles.postBtn,
                      (publishedStatus.linkedin || publishing.linkedin || !socialMediaData.linkedin?.trim()) && styles.postBtnDisabled
                    ]}
                    onPress={async () => {
                      try {
                        setPublishing(prev => ({ ...prev, linkedin: true }));
                        const publicImageUrl = await ensurePublicImageUrl(formData.image);
                        const res = await socialMediaService.publishToLinkedIn(socialMediaData.linkedin, publicImageUrl);
                        if (res?.success === true) {
                          setPublishedStatus(prev => ({ ...prev, linkedin: true }));
                          Alert.alert('Éxito', 'Publicado en LinkedIn');
                        } else {
                          const errorMsg = res?.error || '';
                          const isDuplicate = errorMsg.includes('DUPLICATE_POST') || errorMsg.includes('Duplicate post');
                          if (isDuplicate) {
                            Alert.alert('Contenido duplicado', 'LinkedIn no permite publicar el mismo contenido dos veces. Por favor, modifica el texto antes de publicar.');
                          } else {
                            const details = typeof res === 'object' ? JSON.stringify(res) : (res || '');
                            Alert.alert('Error', `No se pudo publicar en LinkedIn. ${res?.error || details}`);
                          }
                        }
                      } catch (err) {
                        const isDuplicate = err?.message?.includes('DUPLICATE_POST') || err?.message?.includes('Duplicate post');
                        if (isDuplicate) {
                          Alert.alert('Contenido duplicado', 'LinkedIn no permite publicar el mismo contenido dos veces. Por favor, modifica el texto antes de publicar.');
                        } else {
                          Alert.alert('Error', `Fallo publicando en LinkedIn: ${err?.message || err}`);
                        }
                      } finally {
                        setPublishing(prev => ({ ...prev, linkedin: false }));
                      }
                    }}
                    disabled={publishedStatus.linkedin || publishing.linkedin || !socialMediaData.linkedin?.trim()}
                  >
                    {publishing.linkedin ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.postBtnText}>
                      {publishedStatus.linkedin ? 'Publicado' : publishing.linkedin ? 'Publicando...' : 'Publicar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.linkedin}
                onChangeText={(value) => setSocialMediaData(prev => ({ ...prev, linkedin: value }))}
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
                    style={[styles.postBtn, (publishedStatus.instagram || publishing.instagram || !socialMediaData.instagram?.trim()) && styles.postBtnDisabled]}
                    onPress={async () => {
                      try {
                        setPublishing(prev => ({ ...prev, instagram: true }));
                        const publicImageUrl = await ensurePublicImageUrl(formData.image);
                        const res = await socialMediaService.publishToInstagram(socialMediaData.instagram, publicImageUrl);
                        if (res?.success === true) {
                          setPublishedStatus(prev => ({ ...prev, instagram: true }));
                          Alert.alert('Éxito', 'Publicado en Instagram');
                        } else {
                          const details = typeof res === 'object' ? JSON.stringify(res) : (res || '');
                          Alert.alert('Error', `No se pudo publicar en Instagram. ${res?.error || details}`);
                        }
                      } catch (err) {
                        Alert.alert('Error', `Fallo publicando en Instagram: ${err?.message || err}`);
                      } finally {
                        setPublishing(prev => ({ ...prev, instagram: false }));
                      }
                    }}
                    disabled={publishedStatus.instagram || publishing.instagram || !socialMediaData.instagram?.trim()}
                  >
                    {publishing.instagram ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.postBtnText}>{publishedStatus.instagram ? 'Publicado' : publishing.instagram ? 'Publicando...' : 'Publicar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.instagram}
                onChangeText={(value) => setSocialMediaData(prev => ({ ...prev, instagram: value }))}
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
                    style={[styles.postBtn, (publishedStatus.twitter || publishing.twitter || !socialMediaData.twitter?.trim()) && styles.postBtnDisabled]}
                    onPress={async () => {
                      try {
                        setPublishing(prev => ({ ...prev, twitter: true }));
                        const res = await socialMediaService.publishToTwitter(socialMediaData.twitter);
                        if (res?.success === true) {
                          setPublishedStatus(prev => ({ ...prev, twitter: true }));
                          Alert.alert('Éxito', 'Publicado en Twitter/X');
                        } else {
                          const details = typeof res === 'object' ? JSON.stringify(res) : (res || '');
                          Alert.alert('Error', `No se pudo publicar en Twitter/X. ${res?.error || details}`);
                        }
                      } catch (err) {
                        Alert.alert('Error', `Fallo publicando en Twitter/X: ${err?.message || err}`);
                      } finally {
                        setPublishing(prev => ({ ...prev, twitter: false }));
                      }
                    }}
                    disabled={publishedStatus.twitter || publishing.twitter || !socialMediaData.twitter?.trim()}
                  >
                    {publishing.twitter ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.postBtnText}>{publishedStatus.twitter ? 'Publicado' : publishing.twitter ? 'Publicando...' : 'Publicar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.textArea, isTablet && styles.textAreaTablet, isMobile && styles.textAreaMobile]}
                value={socialMediaData.twitter}
                onChangeText={(value) => setSocialMediaData(prev => ({ ...prev, twitter: value }))}
                placeholder="Contenido para Twitter/X"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={4}
              />
            </View>
          )}
          <View style={styles.cardAccent} />
        </View>

        {/* Botón global de publicar eliminado; publicación por red se gestiona arriba */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333b4d' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333b4d' },
  loadingText: { color: '#FFFFFF', marginTop: 16, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  headerContent: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#00ca77', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconHeaderButton: { padding: 10, backgroundColor: '#00ca77', borderRadius: 8 },
  cancelButton: { backgroundColor: '#FF9800', borderRadius: 8, padding: 10 },
  saveButton: { backgroundColor: '#00ca77', borderRadius: 8, padding: 10 },
  saveButtonDisabled: { backgroundColor: 'rgba(0, 202, 119, 0.5)' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  section: { marginBottom: 32, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  cardAccent: { position: 'absolute', right: 0, top: 8, bottom: 8, width: 3, backgroundColor: '#00ca77', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#00ca77', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '500', color: '#FFFFFF', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  textArea: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', minHeight: 120, textAlignVertical: 'top' },
  toggleGroup: { marginTop: 10, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginHorizontal: 8 },
  toggleTextActive: { color: '#FFFFFF', fontWeight: '600' },
  actionButtons: { flexDirection: 'column', gap: 12, marginTop: 24, marginBottom: 20, paddingHorizontal: 24 },
  publishButton: { backgroundColor: '#ff6b6b', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  publishButtonDisabled: { backgroundColor: 'rgba(255,107,107,0.5)' },
  publishButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  // Social styles
  socialMediaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  socialMediaSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' },
  refreshButton: { padding: 8 },
  connectedPlatforms: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  platformIndicator: { flexDirection: 'column', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', minWidth: 80 },
  platformConnected: { backgroundColor: 'rgba(0, 202, 119, 0.1)', borderColor: 'rgba(0, 202, 119, 0.3)' },
  platformText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 6, textAlign: 'center' },
  platformTextConnected: { color: '#FFFFFF', fontWeight: '600' },
  socialFieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  socialActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  publishedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00ca77', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  publishedChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  postBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00ca77', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  postBtnDisabled: { opacity: 0.6 },
  postBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  // Responsive shortcuts
  headerTablet: { paddingHorizontal: 32, paddingVertical: 20 },
  headerMobile: { paddingHorizontal: 16, paddingVertical: 12 },
  headerContentTablet: { flex: 1 },
  headerContentMobile: { flex: 1 },
  titleTablet: { fontSize: 32 },
  titleMobile: { fontSize: 20 },
  labelTablet: { fontSize: 18 },
  labelMobile: { fontSize: 14 },
  inputTablet: { paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, borderRadius: 12 },
  inputMobile: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderRadius: 6 },
  sectionTablet: { marginBottom: 40 },
  sectionMobile: { marginBottom: 24 },
  sectionTitleTablet: { fontSize: 24, marginBottom: 24 },
  sectionTitleMobile: { fontSize: 18, marginBottom: 16 },
  textAreaTablet: { paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, borderRadius: 12, minHeight: 140 },
  textAreaMobile: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderRadius: 6, minHeight: 90 },
});

export default EditQuoteScreen;


