import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, Image, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blogPostsService } from '../services/firestore';
import { storageService } from '../services/storage';

const { width, height } = Dimensions.get('window');

const BlogCRUDScreen = ({ navigation }) => {
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBlogPosts, setFilteredBlogPosts] = useState([]);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  useEffect(() => {
    filterBlogPosts();
  }, [searchQuery, blogPosts]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      const data = await blogPostsService.getAll();
      console.log('Blog posts loaded:', data);
      console.log('Number of posts:', data.length);
      console.log('All post IDs:', data.map(post => post.id));
      console.log('First post data:', data[0]);
      if (data[0]) {
        console.log('First post keys:', Object.keys(data[0]));
        console.log('First post title:', data[0].title);
        console.log('First post author:', data[0].author);
        console.log('First post ID:', data[0].id);
      }
      setBlogPosts(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los posts del blog');
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBlogPosts = () => {
    if (!searchQuery.trim()) {
      setFilteredBlogPosts(blogPosts);
      return;
    }

    const filtered = blogPosts.filter(post => 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.event?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.modalContent?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBlogPosts(filtered);
  };

  const handleDelete = (postId) => {
    console.log('handleDelete called with postId:', postId);
    console.log('postId type:', typeof postId);
    
    const post = blogPosts.find(p => p.id === postId);
    console.log('Post found for deletion:', post);
    setPostToDelete(post);
    setShowDeleteModal(true);
    console.log('Modal should now be visible');
  };

  const confirmDelete = () => {
    console.log('🔴 confirmDelete called!');
    console.log('postToDelete:', postToDelete);
    if (postToDelete) {
      console.log('User confirmed deletion, calling deleteBlogPost with:', postToDelete.id);
      deleteBlogPost(postToDelete.id);
      setShowDeleteModal(false);
      setPostToDelete(null);
    } else {
      console.error('❌ No postToDelete found!');
    }
  };

  const cancelDelete = () => {
    console.log('User cancelled deletion');
    setShowDeleteModal(false);
    setPostToDelete(null);
  };

  const deleteBlogPost = async (postId) => {
    try {
      console.log('deleteBlogPost called with postId:', postId);
      console.log('Current blogPosts length:', blogPosts.length);
      
      // Obtener información del post antes de borrarlo
      const postToDelete = blogPosts.find(p => p.id === postId);
      console.log('postToDelete found:', postToDelete);
      
      // Borrar el post de Firestore
      console.log('Calling blogPostsService.delete with:', postId);
      const deleteResult = await blogPostsService.delete(postId);
      console.log('blogPostsService.delete result:', deleteResult);
      
      // Si el post tiene una imagen subida a Firebase Storage, borrarla también
      if (postToDelete?.image) {
        try {
          // Verificar si la imagen es de Firebase Storage (contiene 'firebasestorage.googleapis.com')
          if (postToDelete.image.includes('firebasestorage.googleapis.com')) {
            // Extraer la ruta del storage de la URL
            const urlParts = postToDelete.image.split('/o/');
            if (urlParts.length > 1) {
              const pathWithParams = urlParts[1].split('?')[0];
              const storagePath = decodeURIComponent(pathWithParams);
              
              console.log('Borrando imagen del storage:', storagePath);
              const deleteResult = await storageService.deleteImage(storagePath);
              
              if (deleteResult.success) {
                console.log('Imagen borrada del storage correctamente');
              } else {
                console.warn('No se pudo borrar la imagen del storage:', deleteResult.error);
              }
            }
          } else {
            console.log('La imagen no es de Firebase Storage, no se borra');
          }
        } catch (imageError) {
          console.warn('Error borrando imagen del storage:', imageError);
          // No mostramos error al usuario porque el post ya se borró correctamente
        }
      }
      
      // Actualizar la lista local
      setBlogPosts(blogPosts.filter(p => p.id !== postId));
      Alert.alert('Éxito', 'Post del blog eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el post del blog');
      console.error('Error deleting blog post:', error);
    }
  };


  const BlogPostCard = ({ post }) => {
    const isTablet = screenData.width >= 768;
    const isMobile = screenData.width < 768;
    
    return (
      <View style={[
        styles.blogPostCard,
        isTablet && styles.blogPostCardTablet,
        isMobile && styles.blogPostCardMobile
      ]}>
        <View style={[
          styles.blogPostImageContainer,
          isTablet && styles.blogPostImageContainerTablet,
          isMobile && styles.blogPostImageContainerMobile
        ]}>
          {post.image ? (
            <Image source={{ uri: post.image }} style={[
              styles.blogPostImage,
              isTablet && styles.blogPostImageTablet,
              isMobile && styles.blogPostImageMobile
            ]} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="document-text-outline" size={isTablet ? 32 : 24} color="#666" />
            </View>
          )}
        </View>
        
        <View style={[
          styles.blogPostContent,
          isTablet && styles.blogPostContentTablet,
          isMobile && styles.blogPostContentMobile
        ]}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.blogPostTitle,
              isTablet && styles.blogPostTitleTablet,
              isMobile && styles.blogPostTitleMobile
            ]} numberOfLines={isTablet ? 3 : 2}>{post.title}</Text>
            <View style={[
              styles.statusBadge,
              post.draft === false ? styles.publishedBadge : styles.draftBadge
            ]}>
              <Ionicons 
                name={post.draft === false ? "checkmark-circle" : "document-outline"} 
                size={12} 
                color="#FFFFFF" 
              />
              <Text style={styles.statusText}>
                {post.draft === false ? 'Publicado' : 'Borrador'}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.blogPostSubtitle,
            isTablet && styles.blogPostSubtitleTablet,
            isMobile && styles.blogPostSubtitleMobile
          ]} numberOfLines={1}>{post.author}</Text>
          <Text style={[
            styles.blogPostContentText,
            isTablet && styles.blogPostContentTextTablet,
            isMobile && styles.blogPostContentTextMobile
          ]} numberOfLines={isTablet ? 3 : 2}>{post.event || 'Sin evento'}</Text>
          <Text style={[
            styles.blogPostTags,
            isTablet && styles.blogPostTagsTablet,
            isMobile && styles.blogPostTagsMobile
          ]} numberOfLines={1}>{post.tags}</Text>
          <Text style={[
            styles.blogPostDate,
            isTablet && styles.blogPostDateTablet,
            isMobile && styles.blogPostDateMobile
          ]}>{post.date}</Text>
        </View>

        <View style={[
          styles.blogPostActions,
          isTablet && styles.blogPostActionsTablet,
          isMobile && styles.blogPostActionsMobile
        ]}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.editButton,
              isTablet && styles.actionButtonTablet,
              isMobile && styles.actionButtonMobile
            ]}
            onPress={() => {
              console.log('Edit button pressed for post:', post);
              console.log('Post ID being passed:', post.id);
              console.log('Post ID type:', typeof post.id);
              navigation.navigate('EditBlogPost', { postId: post.id });
            }}
          >
            <Ionicons name="create-outline" size={isTablet ? 20 : 16} color="#B0B0B0" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.deleteButton,
              isTablet && styles.actionButtonTablet,
              isMobile && styles.actionButtonMobile
            ]}
            onPress={() => {
              console.log('Delete button pressed for post:', post);
              console.log('Post ID:', post.id);
              handleDelete(post.id);
            }}
          >
            <Ionicons name="trash-outline" size={isTablet ? 20 : 16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardAccent} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando posts del blog...</Text>
      </View>
    );
  }

  const isTablet = screenData.width >= 768;
  const isMobile = screenData.width < 768;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={[
        styles.scrollContent,
        isTablet && styles.scrollContentTablet,
        isMobile && styles.scrollContentMobile
      ]}>
      <View style={[
        styles.header,
        isTablet && styles.headerTablet,
        isMobile && styles.headerMobile
      ]}>
        <View style={[
          styles.headerContent,
          isTablet && styles.headerContentTablet,
          isMobile && styles.headerContentMobile
        ]}>
          <Text style={[
            styles.title,
            isTablet && styles.titleTablet,
            isMobile && styles.titleMobile
          ]}>Gestión de Blog Posts</Text>
          <Text style={[
            styles.subtitle,
            isTablet && styles.subtitleTablet,
            isMobile && styles.subtitleMobile
          ]}>{filteredBlogPosts.length} posts encontrados</Text>
        </View>
        <View style={styles.rightButtons}>
          <TouchableOpacity 
            style={[
              styles.iconHeaderButton,
              isTablet && styles.iconHeaderButtonTablet,
              isMobile && styles.iconHeaderButtonMobile
            ]}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add" size={isTablet ? 24 : 20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.iconHeaderButton,
              isTablet && styles.iconHeaderButtonTablet,
              isMobile && styles.iconHeaderButtonMobile
            ]}
            onPress={() => navigation.navigate('ContentEditor')}
          >
            <Ionicons name="arrow-back" size={isTablet ? 24 : 20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[
        styles.searchContainer,
        isTablet && styles.searchContainerTablet,
        isMobile && styles.searchContainerMobile
      ]}>
        <View style={[
          styles.searchInputContainer,
          isTablet && styles.searchInputContainerTablet,
          isMobile && styles.searchInputContainerMobile
        ]}>
          <Ionicons name="search" size={isTablet ? 24 : 20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              isTablet && styles.searchInputTablet,
              isMobile && styles.searchInputMobile
            ]}
            placeholder="Buscar posts del blog..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[
        styles.blogPostsList,
        isTablet && styles.blogPostsListTablet,
        isMobile && styles.blogPostsListMobile
      ]}>
        {filteredBlogPosts.length === 0 ? (
          <View style={[
            styles.emptyState,
            isTablet && styles.emptyStateTablet,
            isMobile && styles.emptyStateMobile
          ]}>
            <Ionicons name="document-text-outline" size={isTablet ? 64 : 48} color="#666" />
            <Text style={[
              styles.emptyTitle,
              isTablet && styles.emptyTitleTablet,
              isMobile && styles.emptyTitleMobile
            ]}>No hay posts del blog</Text>
            <Text style={[
              styles.emptyDescription,
              isTablet && styles.emptyDescriptionTablet,
              isMobile && styles.emptyDescriptionMobile
            ]}>
              {searchQuery ? 'No se encontraron posts con ese criterio' : 'Comienza creando tu primer post del blog'}
            </Text>
          </View>
        ) : (
          filteredBlogPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))
        )}
      </View>
      </ScrollView>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            isTablet && styles.modalContainerTablet,
            isMobile && styles.modalContainerMobile
          ]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={isTablet ? 32 : 24} color="#FF3B30" />
              <Text style={[
                styles.modalTitle,
                isTablet && styles.modalTitleTablet,
                isMobile && styles.modalTitleMobile
              ]}>
                Confirmar eliminación
              </Text>
            </View>
            
            <Text style={[
              styles.modalMessage,
              isTablet && styles.modalMessageTablet,
              isMobile && styles.modalMessageMobile
            ]}>
              ¿Estás seguro de que quieres eliminar este post del blog?
            </Text>
            
            {postToDelete && (
              <View style={styles.modalPostInfo}>
                <Text style={[
                  styles.modalPostTitle,
                  isTablet && styles.modalPostTitleTablet,
                  isMobile && styles.modalPostTitleMobile
                ]} numberOfLines={2}>
                  {postToDelete.title}
                </Text>
                <Text style={[
                  styles.modalPostAuthor,
                  isTablet && styles.modalPostAuthorTablet,
                  isMobile && styles.modalPostAuthorMobile
                ]}>
                  {postToDelete.author}
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.modalButton,
                  styles.cancelModalButton,
                  isTablet && styles.modalButtonTablet,
                  isMobile && styles.modalButtonMobile
                ]}
                onPress={cancelDelete}
              >
                <Text style={[
                  styles.cancelModalButtonText,
                  isTablet && styles.modalButtonTextTablet,
                  isMobile && styles.modalButtonTextMobile
                ]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton,
                  styles.deleteModalButton,
                  isTablet && styles.modalButtonTablet,
                  isMobile && styles.modalButtonMobile
                ]}
                onPress={() => {
                  console.log('🟢 Delete button in modal pressed!');
                  confirmDelete();
                }}
              >
                <Text style={[
                  styles.deleteModalButtonText,
                  isTablet && styles.modalButtonTextTablet,
                  isMobile && styles.modalButtonTextMobile
                ]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
  },
  scrollContainer: {
    flex: 1,
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
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#333b4d',
    paddingTop: 12,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#00ca77',
    borderRadius: 8,
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
  addButton: {
    backgroundColor: '#00ca77',
    borderRadius: 8,
    padding: 12,
  },
  searchContainer: {
    marginBottom: 24,
    alignItems: 'stretch',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'stretch',
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
  blogPostsList: {
    gap: 16,
    alignItems: 'stretch',
  },
  blogPostCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    width: '100%',
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
  blogPostImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  blogPostImage: {
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
  blogPostContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  blogPostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  publishedBadge: {
    backgroundColor: '#00ca77',
  },
  draftBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  blogPostSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  blogPostContent: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
    lineHeight: 16,
  },
  blogPostTags: {
    fontSize: 12,
    color: '#00ca77',
    marginBottom: 4,
  },
  blogPostDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  blogPostActions: {
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
    backgroundColor: 'rgba(176, 176, 176, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(176, 176, 176, 0.5)',
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

  // Responsive styles for tablets (768px+)
  scrollContentTablet: {
    padding: 32,
    alignSelf: 'stretch',
    width: '100%',
  },
  headerTablet: {
    marginBottom: 32,
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
  addButtonTablet: {
    padding: 16,
    borderRadius: 12,
  },
  searchContainerTablet: {
    marginBottom: 32,
  },
  searchInputContainerTablet: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  searchInputTablet: {
    fontSize: 16,
    paddingVertical: 12,
  },
  blogPostsListTablet: {
    gap: 20,
    alignItems: 'stretch',
  },
  blogPostCardTablet: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
  },
  blogPostImageContainerTablet: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  blogPostImageTablet: {
    width: '100%',
    height: '100%',
  },
  blogPostContentTablet: {
    flex: 1,
  },
  blogPostTitleTablet: {
    fontSize: 18,
    marginBottom: 6,
  },
  blogPostSubtitleTablet: {
    fontSize: 16,
    marginBottom: 6,
  },
  blogPostContentTextTablet: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
    color: '#00ca77',
  },
  blogPostTagsTablet: {
    fontSize: 14,
    marginBottom: 6,
  },
  blogPostDateTablet: {
    fontSize: 13,
  },
  blogPostActionsTablet: {
    gap: 12,
  },
  actionButtonTablet: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  emptyStateTablet: {
    paddingVertical: 64,
  },
  emptyTitleTablet: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyDescriptionTablet: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Responsive styles for mobile (< 768px)
  scrollContentMobile: {
    padding: 16,
  },
  headerMobile: {
    marginBottom: 20,
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
  addButtonMobile: {
    padding: 8,
    borderRadius: 6,
  },
  searchContainerMobile: {
    marginBottom: 20,
  },
  searchInputContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchInputMobile: {
    fontSize: 14,
    paddingVertical: 8,
  },
  blogPostsListMobile: {
    gap: 12,
    alignItems: 'stretch',
  },
  blogPostCardMobile: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  blogPostImageContainerMobile: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  blogPostImageMobile: {
    width: '100%',
    height: '100%',
  },
  blogPostContentMobile: {
    flex: 1,
  },
  blogPostTitleMobile: {
    fontSize: 14,
    marginBottom: 4,
  },
  blogPostSubtitleMobile: {
    fontSize: 12,
    marginBottom: 4,
  },
  blogPostContentTextMobile: {
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 14,
    color: '#00ca77',
  },
  blogPostTagsMobile: {
    fontSize: 11,
    marginBottom: 4,
  },
  blogPostDateMobile: {
    fontSize: 10,
  },
  blogPostActionsMobile: {
    gap: 6,
  },
  actionButtonMobile: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  emptyStateMobile: {
    paddingVertical: 32,
  },
  emptyTitleMobile: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescriptionMobile: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Modal styles
  modalOverlay: {
    ...Platform.select({
      web: {
        position: 'fixed',
      },
      default: {
        position: 'absolute',
      }
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalPostInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalPostTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalPostAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteModalButton: {
    backgroundColor: '#FF3B30',
  },
  cancelModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Responsive modal styles
  modalContainerTablet: {
    padding: 32,
    maxWidth: 500,
    borderRadius: 20,
  },
  modalTitleTablet: {
    fontSize: 24,
  },
  modalMessageTablet: {
    fontSize: 18,
    lineHeight: 26,
  },
  modalPostTitleTablet: {
    fontSize: 16,
  },
  modalPostAuthorTablet: {
    fontSize: 14,
  },
  modalButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalButtonTextTablet: {
    fontSize: 18,
  },

  modalContainerMobile: {
    padding: 20,
    maxWidth: 350,
    borderRadius: 12,
  },
  modalTitleMobile: {
    fontSize: 18,
  },
  modalMessageMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalPostTitleMobile: {
    fontSize: 13,
  },
  modalPostAuthorMobile: {
    fontSize: 11,
  },
  modalButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modalButtonTextMobile: {
    fontSize: 14,
  },
});

export default BlogCRUDScreen;
