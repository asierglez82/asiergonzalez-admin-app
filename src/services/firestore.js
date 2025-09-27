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

// Mismas colecciones que en el sitio web
export const COLLECTIONS = {
  BLOG_POSTS: "blogPosts",
  INFOGRAPHIC_POSTS: "infographicPosts", 
  CONFERENCES: "conferences",
  PROJECTS: "projects",
  VIDEOS: "videos",
  PODCAST_PODS: "podcastPods",
  BOOKS: "books",
  QUOTES: "quotes",
  TALKS: "talks",
  PERSONAL_INFO: "personal_info",
  SERVICES: "services",
  TESTIMONIALS: "testimonials",
  CONTACTS: "contacts", // Para CRM
  IDEAS: "ideas", // Para banco de ideas
  USERS: "users" // Para admin users
};

// Servicio genérico para CRUD operations
class FirestoreService {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  // Crear documento
  async create(data) {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, this.collectionName), docData);
    return { id: docRef.id, ...docData };
  }

  // Obtener todos los documentos
  async getAll(orderByField = 'createdAt', orderDirection = 'desc', limitCount = null) {
    let q = query(
      collection(db, this.collectionName),
      orderBy(orderByField, orderDirection)
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Remover el campo 'id' hardcodeado si existe y usar el ID real del documento
      const { id: hardcodedId, ...cleanData } = data;
      return {
        id: doc.id, // ID real del documento de Firestore
        ...cleanData
      };
    });
  }

  // Obtener por ID
  async getById(id) {
    // Convertir ID a string para evitar errores de Firestore
    const stringId = String(id);
    const docRef = doc(db, this.collectionName, stringId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Remover el campo 'id' hardcodeado si existe y usar el ID real del documento
      const { id: hardcodedId, ...cleanData } = data;
      return { 
        id: docSnap.id, // ID real del documento de Firestore
        ...cleanData 
      };
    } else {
      throw new Error(`Document with id ${stringId} not found`);
    }
  }

  // Actualizar documento
  async update(id, data) {
    // Convertir ID a string para evitar errores de Firestore
    const stringId = String(id);
    const docRef = doc(db, this.collectionName, stringId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { id: stringId, ...updateData };
  }

  // Eliminar documento
  async delete(id) {
    // Convertir ID a string para evitar errores de Firestore
    const stringId = String(id);
    const docRef = doc(db, this.collectionName, stringId);
    await deleteDoc(docRef);
    return { success: true, id: stringId };
  }

  // Buscar documentos
  async search(field, operator, value, limitCount = 20) {
    const q = query(
      collection(db, this.collectionName),
      where(field, operator, value),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Remover el campo 'id' hardcodeado si existe y usar el ID real del documento
      const { id: hardcodedId, ...cleanData } = data;
      return {
        id: doc.id, // ID real del documento de Firestore
        ...cleanData
      };
    });
  }
}

// Servicios específicos para cada colección
export const blogPostsService = new FirestoreService(COLLECTIONS.BLOG_POSTS);
export const infographicsService = new FirestoreService(COLLECTIONS.INFOGRAPHIC_POSTS);
export const conferencesService = new FirestoreService(COLLECTIONS.CONFERENCES);
export const projectsService = new FirestoreService(COLLECTIONS.PROJECTS);
export const videosService = new FirestoreService(COLLECTIONS.VIDEOS);
export const podcastService = new FirestoreService(COLLECTIONS.PODCAST_PODS);
export const booksService = new FirestoreService(COLLECTIONS.BOOKS);
export const quotesService = new FirestoreService(COLLECTIONS.QUOTES);
export const talksService = new FirestoreService(COLLECTIONS.TALKS);
export const contactsService = new FirestoreService(COLLECTIONS.CONTACTS);
export const ideasService = new FirestoreService(COLLECTIONS.IDEAS);

// Función utilitaria para limpiar objetos
export const cleanObject = (obj) => {
  const cleaned = {};
  for (const [key, value] in Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Función para generar slugs
export const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[áàäâå]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-|-$/g, '');
};


