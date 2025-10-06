import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebase";

const CRM_COLLECTION = "crm_contacts";
const SUBCOLLECTIONS = {
  NOTES: "notes",
  INTERACTIONS: "interactions",
  REMINDERS: "reminders"
};

// Servicio para la colección principal de contactos
class CRMService {
  // Crear contacto
  async createContact(data) {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, CRM_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  }

  // Obtener todos los contactos
  async getAllContacts(orderByField = 'createdAt', orderDirection = 'desc', limitCount = null) {
    let q = query(
      collection(db, CRM_COLLECTION),
      orderBy(orderByField, orderDirection)
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { id: hardcodedId, ...cleanData } = data;
      return {
        id: doc.id,
        ...cleanData
      };
    });
  }

  // Obtener contacto por ID
  async getContactById(id) {
    const stringId = String(id);
    const docRef = doc(db, CRM_COLLECTION, stringId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const { id: hardcodedId, ...cleanData } = data;
      return { 
        id: docSnap.id,
        ...cleanData 
      };
    } else {
      throw new Error(`Contact with id ${stringId} not found`);
    }
  }

  // Actualizar contacto
  async updateContact(id, data) {
    const stringId = String(id);
    const docRef = doc(db, CRM_COLLECTION, stringId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { id: stringId, ...updateData };
  }

  // Eliminar contacto
  async deleteContact(id) {
    const stringId = String(id);
    const docRef = doc(db, CRM_COLLECTION, stringId);
    await deleteDoc(docRef);
    return { success: true, id: stringId };
  }

  // Buscar contactos
  async searchContacts(field, operator, value, limitCount = 20) {
    const q = query(
      collection(db, CRM_COLLECTION),
      where(field, operator, value),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const { id: hardcodedId, ...cleanData } = data;
      return {
        id: doc.id,
        ...cleanData
      };
    });
  }

  // ========== MÉTODOS PARA SUBCOLECCIONES ==========

  // NOTAS
  async getNotes(contactId) {
    const notesRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.NOTES);
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async createNote(contactId, noteData) {
    const notesRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.NOTES);
    const docData = {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notesRef, docData);
    return { id: docRef.id, ...docData };
  }

  async updateNote(contactId, noteId, noteData) {
    const noteRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.NOTES, String(noteId));
    const updateData = {
      ...noteData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(noteRef, updateData);
    return { id: noteId, ...updateData };
  }

  async deleteNote(contactId, noteId) {
    const noteRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.NOTES, String(noteId));
    await deleteDoc(noteRef);
    return { success: true, id: noteId };
  }

  // INTERACCIONES
  async getInteractions(contactId) {
    const interactionsRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.INTERACTIONS);
    const q = query(interactionsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async createInteraction(contactId, interactionData) {
    const interactionsRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.INTERACTIONS);
    const docData = {
      ...interactionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(interactionsRef, docData);
    return { id: docRef.id, ...docData };
  }

  async updateInteraction(contactId, interactionId, interactionData) {
    const interactionRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.INTERACTIONS, String(interactionId));
    const updateData = {
      ...interactionData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(interactionRef, updateData);
    return { id: interactionId, ...updateData };
  }

  async deleteInteraction(contactId, interactionId) {
    const interactionRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.INTERACTIONS, String(interactionId));
    await deleteDoc(interactionRef);
    return { success: true, id: interactionId };
  }

  // RECORDATORIOS
  async getReminders(contactId) {
    const remindersRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.REMINDERS);
    const q = query(remindersRef, orderBy('dueDate', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async createReminder(contactId, reminderData) {
    const remindersRef = collection(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.REMINDERS);
    const docData = {
      ...reminderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(remindersRef, docData);
    return { id: docRef.id, ...docData };
  }

  async updateReminder(contactId, reminderId, reminderData) {
    const reminderRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.REMINDERS, String(reminderId));
    const updateData = {
      ...reminderData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(reminderRef, updateData);
    return { id: reminderId, ...updateData };
  }

  async deleteReminder(contactId, reminderId) {
    const reminderRef = doc(db, CRM_COLLECTION, String(contactId), SUBCOLLECTIONS.REMINDERS, String(reminderId));
    await deleteDoc(reminderRef);
    return { success: true, id: reminderId };
  }
}

export const crmService = new CRMService();
export default crmService;

