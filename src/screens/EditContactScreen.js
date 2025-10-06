import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import crmService from '../services/crmService';

const EditContactScreen = ({ navigation, route }) => {
  const { contactId, mode } = route.params || {};
  const isEditMode = mode === 'edit' && contactId;
  const isViewMode = mode === 'view' && contactId;
  const isCreateMode = mode === 'create';

  // Contact data
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'lead',
    notes: '',
    address: '',
    website: '',
    linkedin: '',
    twitter: ''
  });

  // Tabs and subcollections
  const [activeTab, setActiveTab] = useState('info');
  const [notes, setNotes] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loadingSubcollections, setLoadingSubcollections] = useState(false);

  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states for modals
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [interactionForm, setInteractionForm] = useState({ type: 'call', date: '', description: '' });
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', dueDate: '', completed: false });

  useEffect(() => {
    if (isEditMode || isViewMode) {
      loadContact();
    }
  }, [contactId]);

  useEffect(() => {
    if ((isEditMode || isViewMode) && activeTab !== 'info') {
      loadSubcollectionData();
    }
  }, [activeTab, contactId]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const data = await crmService.getContactById(contactId);
      setContact(data);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar el contacto');
      console.error('Error loading contact:', error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadSubcollectionData = async () => {
    if (!contactId) return;

    try {
      setLoadingSubcollections(true);
      
      if (activeTab === 'notes') {
        const notesData = await crmService.getNotes(contactId);
        setNotes(notesData);
      } else if (activeTab === 'interactions') {
        const interactionsData = await crmService.getInteractions(contactId);
        setInteractions(interactionsData);
      } else if (activeTab === 'reminders') {
        const remindersData = await crmService.getReminders(contactId);
        setReminders(remindersData);
      }
    } catch (error) {
      console.error('Error loading subcollection:', error);
    } finally {
      setLoadingSubcollections(false);
    }
  };

  const handleSaveContact = async () => {
    // Validación básica
    if (!contact.name?.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!contact.email?.trim()) {
      Alert.alert('Error', 'El email es obligatorio');
      return;
    }

    try {
      setSaving(true);
      
      if (isEditMode) {
        await crmService.updateContact(contactId, contact);
        Alert.alert('Éxito', 'Contacto actualizado correctamente');
      } else {
        await crmService.createContact(contact);
        Alert.alert('Éxito', 'Contacto creado correctamente');
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Error al guardar el contacto');
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  // ========== NOTAS ==========
  const handleAddNote = () => {
    setEditingItem(null);
    setNoteForm({ title: '', content: '' });
    setShowNoteModal(true);
  };

  const handleEditNote = (note) => {
    setEditingItem(note);
    setNoteForm({ title: note.title || '', content: note.content || '' });
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title?.trim() || !noteForm.content?.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      if (editingItem) {
        await crmService.updateNote(contactId, editingItem.id, noteForm);
      } else {
        await crmService.createNote(contactId, noteForm);
      }
      
      setShowNoteModal(false);
      loadSubcollectionData();
    } catch (error) {
      Alert.alert('Error', 'Error al guardar la nota');
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmService.deleteNote(contactId, noteId);
              loadSubcollectionData();
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar la nota');
            }
          }
        }
      ]
    );
  };

  // ========== INTERACCIONES ==========
  const handleAddInteraction = () => {
    setEditingItem(null);
    const today = new Date().toISOString().split('T')[0];
    setInteractionForm({ type: 'call', date: today, description: '' });
    setShowInteractionModal(true);
  };

  const handleEditInteraction = (interaction) => {
    setEditingItem(interaction);
    setInteractionForm({
      type: interaction.type || 'call',
      date: interaction.date || '',
      description: interaction.description || ''
    });
    setShowInteractionModal(true);
  };

  const handleSaveInteraction = async () => {
    if (!interactionForm.date?.trim() || !interactionForm.description?.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      if (editingItem) {
        await crmService.updateInteraction(contactId, editingItem.id, interactionForm);
      } else {
        await crmService.createInteraction(contactId, interactionForm);
      }
      
      setShowInteractionModal(false);
      loadSubcollectionData();
    } catch (error) {
      Alert.alert('Error', 'Error al guardar la interacción');
      console.error('Error saving interaction:', error);
    }
  };

  const handleDeleteInteraction = async (interactionId) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar esta interacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmService.deleteInteraction(contactId, interactionId);
              loadSubcollectionData();
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar la interacción');
            }
          }
        }
      ]
    );
  };

  // ========== RECORDATORIOS ==========
  const handleAddReminder = () => {
    setEditingItem(null);
    const today = new Date().toISOString().split('T')[0];
    setReminderForm({ title: '', description: '', dueDate: today, completed: false });
    setShowReminderModal(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingItem(reminder);
    setReminderForm({
      title: reminder.title || '',
      description: reminder.description || '',
      dueDate: reminder.dueDate || '',
      completed: reminder.completed || false
    });
    setShowReminderModal(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderForm.title?.trim() || !reminderForm.dueDate?.trim()) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }

    try {
      if (editingItem) {
        await crmService.updateReminder(contactId, editingItem.id, reminderForm);
      } else {
        await crmService.createReminder(contactId, reminderForm);
      }
      
      setShowReminderModal(false);
      loadSubcollectionData();
    } catch (error) {
      Alert.alert('Error', 'Error al guardar el recordatorio');
      console.error('Error saving reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar este recordatorio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await crmService.deleteReminder(contactId, reminderId);
              loadSubcollectionData();
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar el recordatorio');
            }
          }
        }
      ]
    );
  };

  const handleToggleReminderComplete = async (reminder) => {
    try {
      await crmService.updateReminder(contactId, reminder.id, {
        ...reminder,
        completed: !reminder.completed
      });
      loadSubcollectionData();
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el recordatorio');
    }
  };

  const getInteractionIcon = (type) => {
    switch(type) {
      case 'call': return 'call';
      case 'email': return 'mail';
      case 'meeting': return 'people';
      case 'note': return 'document-text';
      default: return 'chatbox';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ca77" />
        <Text style={styles.loadingText}>Cargando contacto...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('CRM')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isViewMode ? 'Información del Contacto' : isEditMode ? 'Editar Contacto' : 'Nuevo Contacto'}
        </Text>
        {!isViewMode && (
          <TouchableOpacity 
            onPress={handleSaveContact}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        )}
        {isViewMode && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('EditContact', { contactId, mode: 'edit' })}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons 
            name="person-outline" 
            size={20} 
            color={activeTab === 'info' ? '#00ca77' : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
            Información
          </Text>
        </TouchableOpacity>

        {(isEditMode || isViewMode) && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
              onPress={() => setActiveTab('notes')}
            >
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color={activeTab === 'notes' ? '#00ca77' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
                Notas ({notes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'interactions' && styles.tabActive]}
              onPress={() => setActiveTab('interactions')}
            >
              <Ionicons 
                name="chatbubbles-outline" 
                size={20} 
                color={activeTab === 'interactions' ? '#00ca77' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'interactions' && styles.tabTextActive]}>
                Interacciones ({interactions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'reminders' && styles.tabActive]}
              onPress={() => setActiveTab('reminders')}
            >
              <Ionicons 
                name="notifications-outline" 
                size={20} 
                color={activeTab === 'reminders' ? '#00ca77' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'reminders' && styles.tabTextActive]}>
                Recordatorios ({reminders.length})
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'info' && (
          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Básica</Text>
              <View style={styles.cardAccent} />
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={contact.name}
                  onChangeText={(text) => setContact({ ...contact, name: text })}
                  placeholder="Nombre completo"
                  placeholderTextColor="#8E8E93"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={contact.email}
                  onChangeText={(text) => setContact({ ...contact, email: text })}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#8E8E93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={contact.phone}
                  onChangeText={(text) => setContact({ ...contact, phone: text })}
                  placeholder="+34 600 000 000"
                  placeholderTextColor="#8E8E93"
                  keyboardType="phone-pad"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado</Text>
                <View style={styles.statusButtons}>
                  {['lead', 'prospect', 'client', 'inactive'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        contact.status === status && styles.statusButtonActive
                      ]}
                      onPress={() => !isViewMode && setContact({ ...contact, status })}
                      disabled={isViewMode}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        contact.status === status && styles.statusButtonTextActive
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Profesional</Text>
              <View style={styles.cardAccent} />
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Empresa</Text>
                <TextInput
                  style={styles.input}
                  value={contact.company}
                  onChangeText={(text) => setContact({ ...contact, company: text })}
                  placeholder="Nombre de la empresa"
                  placeholderTextColor="#8E8E93"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cargo</Text>
                <TextInput
                  style={styles.input}
                  value={contact.position}
                  onChangeText={(text) => setContact({ ...contact, position: text })}
                  placeholder="CEO, Director, etc."
                  placeholderTextColor="#8E8E93"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  value={contact.address}
                  onChangeText={(text) => setContact({ ...contact, address: text })}
                  placeholder="Dirección completa"
                  placeholderTextColor="#8E8E93"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sitio web</Text>
                <TextInput
                  style={styles.input}
                  value={contact.website}
                  onChangeText={(text) => setContact({ ...contact, website: text })}
                  placeholder="https://ejemplo.com"
                  placeholderTextColor="#8E8E93"
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!isViewMode}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Redes Sociales</Text>
              <View style={styles.cardAccent} />
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={styles.input}
                  value={contact.linkedin}
                  onChangeText={(text) => setContact({ ...contact, linkedin: text })}
                  placeholder="https://linkedin.com/in/usuario"
                  placeholderTextColor="#8E8E93"
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!isViewMode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Twitter</Text>
                <TextInput
                  style={styles.input}
                  value={contact.twitter}
                  onChangeText={(text) => setContact({ ...contact, twitter: text })}
                  placeholder="@usuario"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  editable={!isViewMode}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas</Text>
              <View style={styles.cardAccent} />
              
              <View style={styles.formGroup}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={contact.notes}
                  onChangeText={(text) => setContact({ ...contact, notes: text })}
                  placeholder="Notas adicionales sobre el contacto..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isViewMode}
                />
              </View>
            </View>
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.subcollectionContainer}>
            <View style={styles.subcollectionHeader}>
              <Text style={styles.subcollectionTitle}>Notas</Text>
              {!isViewMode && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Nueva Nota</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingSubcollections ? (
              <ActivityIndicator size="small" color="#00ca77" style={{ marginTop: 20 }} />
            ) : notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No hay notas</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteContent}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.noteText}>{note.content}</Text>
                      <Text style={styles.noteDate}>
                        {note.createdAt?.toDate ? formatDate(note.createdAt.toDate()) : ''}
                      </Text>
                    </View>
                    {!isViewMode && (
                      <View style={styles.noteActions}>
                        <TouchableOpacity onPress={() => handleEditNote(note)} style={styles.iconButton}>
                          <Ionicons name="create-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteNote(note.id)} style={styles.iconButton}>
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'interactions' && (
          <View style={styles.subcollectionContainer}>
            <View style={styles.subcollectionHeader}>
              <Text style={styles.subcollectionTitle}>Interacciones</Text>
              {!isViewMode && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddInteraction}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Nueva Interacción</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingSubcollections ? (
              <ActivityIndicator size="small" color="#00ca77" style={{ marginTop: 20 }} />
            ) : interactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No hay interacciones</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {interactions.map((interaction) => (
                  <View key={interaction.id} style={styles.interactionCard}>
                    <View style={styles.interactionIcon}>
                      <Ionicons 
                        name={getInteractionIcon(interaction.type)} 
                        size={24} 
                        color="#00ca77" 
                      />
                    </View>
                    <View style={styles.interactionContent}>
                      <View style={styles.interactionHeader}>
                        <Text style={styles.interactionType}>
                          {interaction.type?.charAt(0).toUpperCase() + interaction.type?.slice(1)}
                        </Text>
                        <Text style={styles.interactionDate}>
                          {formatDate(interaction.date)}
                        </Text>
                      </View>
                      <Text style={styles.interactionDescription}>{interaction.description}</Text>
                    </View>
                    {!isViewMode && (
                      <View style={styles.interactionActions}>
                        <TouchableOpacity onPress={() => handleEditInteraction(interaction)} style={styles.iconButton}>
                          <Ionicons name="create-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteInteraction(interaction.id)} style={styles.iconButton}>
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'reminders' && (
          <View style={styles.subcollectionContainer}>
            <View style={styles.subcollectionHeader}>
              <Text style={styles.subcollectionTitle}>Recordatorios</Text>
              {!isViewMode && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddReminder}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Nuevo Recordatorio</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingSubcollections ? (
              <ActivityIndicator size="small" color="#00ca77" style={{ marginTop: 20 }} />
            ) : reminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No hay recordatorios</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {reminders.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderCard}>
                    <TouchableOpacity 
                      onPress={() => !isViewMode && handleToggleReminderComplete(reminder)}
                      style={styles.reminderCheckbox}
                      disabled={isViewMode}
                    >
                      <Ionicons 
                        name={reminder.completed ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={reminder.completed ? "#34C759" : "#8E8E93"} 
                      />
                    </TouchableOpacity>
                    <View style={styles.reminderContent}>
                      <Text style={[
                        styles.reminderTitle,
                        reminder.completed && styles.reminderTitleCompleted
                      ]}>
                        {reminder.title}
                      </Text>
                      {reminder.description && (
                        <Text style={styles.reminderDescription}>{reminder.description}</Text>
                      )}
                      <Text style={styles.reminderDate}>
                        Vencimiento: {formatDate(reminder.dueDate)}
                      </Text>
                    </View>
                    {!isViewMode && (
                      <View style={styles.reminderActions}>
                        <TouchableOpacity onPress={() => handleEditReminder(reminder)} style={styles.iconButton}>
                          <Ionicons name="create-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteReminder(reminder.id)} style={styles.iconButton}>
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal para Notas */}
      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Nota' : 'Nueva Nota'}
              </Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={noteForm.title}
                  onChangeText={(text) => setNoteForm({ ...noteForm, title: text })}
                  placeholder="Título de la nota"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Contenido *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={noteForm.content}
                  onChangeText={(text) => setNoteForm({ ...noteForm, content: text })}
                  placeholder="Escribe el contenido de la nota..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveNote}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Interacciones */}
      <Modal
        visible={showInteractionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInteractionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Interacción' : 'Nueva Interacción'}
              </Text>
              <TouchableOpacity onPress={() => setShowInteractionModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo *</Text>
                <View style={styles.typeButtons}>
                  {['call', 'email', 'meeting', 'note'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        interactionForm.type === type && styles.typeButtonActive
                      ]}
                      onPress={() => setInteractionForm({ ...interactionForm, type })}
                    >
                      <Ionicons 
                        name={getInteractionIcon(type)} 
                        size={20} 
                        color={interactionForm.type === type ? '#FFFFFF' : '#8E8E93'} 
                      />
                      <Text style={[
                        styles.typeButtonText,
                        interactionForm.type === type && styles.typeButtonTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fecha *</Text>
                <TextInput
                  style={styles.input}
                  value={interactionForm.date}
                  onChangeText={(text) => setInteractionForm({ ...interactionForm, date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={interactionForm.description}
                  onChangeText={(text) => setInteractionForm({ ...interactionForm, description: text })}
                  placeholder="Describe la interacción..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowInteractionModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveInteraction}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Recordatorios */}
      <Modal
        visible={showReminderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
              </Text>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={reminderForm.title}
                  onChangeText={(text) => setReminderForm({ ...reminderForm, title: text })}
                  placeholder="Título del recordatorio"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fecha de vencimiento *</Text>
                <TextInput
                  style={styles.input}
                  value={reminderForm.dueDate}
                  onChangeText={(text) => setReminderForm({ ...reminderForm, dueDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reminderForm.description}
                  onChangeText={(text) => setReminderForm({ ...reminderForm, description: text })}
                  placeholder="Descripción adicional..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setReminderForm({ ...reminderForm, completed: !reminderForm.completed })}
              >
                <Ionicons 
                  name={reminderForm.completed ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={reminderForm.completed ? "#34C759" : "#8E8E93"} 
                />
                <Text style={styles.checkboxLabel}>Completado</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowReminderModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveReminder}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#333b4d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#333b4d',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ca77',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#00ca77',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ca77',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    minWidth: 80,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#333b4d',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00ca77',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#00ca77',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    gap: 16,
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
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: 'rgba(0, 202, 119, 0.2)',
    borderColor: '#00ca77',
    borderWidth: 2,
  },
  statusButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#00ca77',
    fontWeight: '600',
  },
  subcollectionContainer: {
    gap: 16,
  },
  subcollectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subcollectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ca77',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  itemsList: {
    gap: 12,
  },
  noteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#5C5C5E',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
  },
  interactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  interactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 202, 119, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionContent: {
    flex: 1,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  interactionDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  interactionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  interactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  reminderCheckbox: {
    paddingTop: 2,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  reminderTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
  reminderDate: {
    fontSize: 12,
    color: '#5C5C5E',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#333b4d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#00ca77',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
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
  modalButtonSave: {
    backgroundColor: '#00ca77',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditContactScreen;

