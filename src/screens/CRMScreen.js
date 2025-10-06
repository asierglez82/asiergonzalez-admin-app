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
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import crmService from '../services/crmService';

const { width } = Dimensions.get('window');

const ContactCard = ({ contact, onPress, onEdit, onDelete, cardWidth }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity style={[styles.contactCard, { width: cardWidth }]} onPress={onPress}>
      <View style={styles.contactCardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
        </View>
        <View style={styles.contactCardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
            <Ionicons name="create-outline" size={18} color="#00ca77" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.contactCardContent}>
        <Text style={styles.contactCardName} numberOfLines={1}>{contact.name || 'Sin nombre'}</Text>
        {contact.position ? <Text style={styles.contactCardPosition} numberOfLines={1}>{contact.position}</Text> : null}
        {contact.company ? (
          <View style={styles.contactCardCompanyRow}>
            <Ionicons name="business-outline" size={12} color="#00ca77" />
            <Text style={styles.contactCardCompany} numberOfLines={1}>{contact.company}</Text>
          </View>
        ) : null}
        <View style={styles.contactCardDetails}>
          {contact.email ? (
            <View style={styles.contactDetailRow}>
              <Ionicons name="mail-outline" size={12} color="#8E8E93" />
              <Text style={styles.contactDetailText} numberOfLines={1}>{contact.email}</Text>
            </View>
          ) : null}
          {contact.phone ? (
            <View style={styles.contactDetailRow}>
              <Ionicons name="call-outline" size={12} color="#8E8E93" />
              <Text style={styles.contactDetailText} numberOfLines={1}>{contact.phone}</Text>
            </View>
          ) : null}
        </View>
        {contact.status ? (
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{contact.status}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardAccent} />
    </TouchableOpacity>
  );
};

const CRMScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [windowWidth, setWindowWidth] = useState(width);

  useEffect(() => {
    loadContacts();
  }, []);

  // Recargar automáticamente cuando la pantalla gana foco
  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [])
  );

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  useEffect(() => {
    const onChange = ({ window }) => setWindowWidth(window.width);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await crmService.getAllContacts('createdAt', 'desc', 200);
      setContacts(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los contactos');
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact => 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  const handleDelete = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      await crmService.deleteContact(contactToDelete.id);
      Alert.alert('Éxito', 'Contacto eliminado correctamente');
      loadContacts();
    } catch (error) {
      Alert.alert('Error', 'Error al eliminar el contacto');
      console.error('Error deleting contact:', error);
    } finally {
      setShowDeleteModal(false);
      setContactToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setContactToDelete(null);
  };

  const cardsPerRow = windowWidth < 420 ? 1 : windowWidth >= 1100 ? 3 : 2;
  const horizontalPadding = 48; // 24 + 24
  const interItemGap = 12;
  const cardWidth = (windowWidth - horizontalPadding - (cardsPerRow - 1) * interItemGap) / cardsPerRow;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando contactos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CRM - Gestión de Contactos</Text>
        <Text style={styles.subtitle}>
          {contacts.length} contacto{contacts.length !== 1 ? 's' : ''} en total
        </Text>
      </View>

      {/* Search and Actions Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar contactos..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('EditContact', { mode: 'create' })}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? 'No se encontraron contactos' : 'No hay contactos'}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery 
              ? 'Intenta con otro término de búsqueda' 
              : 'Comienza agregando tu primer contacto'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('EditContact', { mode: 'create' })}
            >
              <Text style={styles.emptyStateButtonText}>Crear Contacto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.contactsGrid}>
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              cardWidth={cardWidth}
              onPress={() => navigation.navigate('EditContact', { contactId: contact.id, mode: 'view' })}
              onEdit={() => navigation.navigate('EditContact', { contactId: contact.id, mode: 'edit' })}
              onDelete={() => handleDelete(contact.id)}
            />
          ))}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={48} color="#FF3B30" />
            </View>
            
            <Text style={styles.modalTitle}>¿Eliminar contacto?</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que deseas eliminar a {contactToDelete?.name}? 
              Esta acción eliminará también todas las notas, interacciones y recordatorios asociados.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelDelete}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalButtonTextDelete}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#333b4d',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#333b4d',
    paddingTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00ca77',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ca77',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#00ca77',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginLeft: -6,
    marginRight: -6,
  },
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  contactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ca77',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  contactCardContent: {
    gap: 6,
  },
  contactCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactCardPosition: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  contactCardCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactCardCompany: {
    fontSize: 13,
    color: '#00ca77',
    fontWeight: '500',
    marginLeft: 4,
  },
  contactCardDetails: {
    gap: 4,
    marginTop: 4,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactDetailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(0, 202, 119, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ca77',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#00ca77',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#333b4d',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#2C2C2E',
  },
  modalButtonDelete: {
    backgroundColor: '#FF3B30',
  },
  modalButtonTextCancel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDelete: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CRMScreen;

