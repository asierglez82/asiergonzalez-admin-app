import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../config/firebase';

// Servicio para manejar archivos en Firebase Storage
class StorageService {
  constructor() {
    this.storage = storage;
  }

  // Subir imagen y obtener URL
  async uploadImage(file, path = 'blog-images') {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = `blog-${timestamp}.png`;
      const fullPath = `${path}/${fileName}`;
      
      // Crear referencia al archivo
      const imageRef = ref(this.storage, fullPath);
      
      // Convertir blob a bytes si es necesario
      let fileData;
      if (file instanceof Blob) {
        fileData = file;
      } else if (typeof file === 'string') {
        // Si es una URL, convertir a blob
        const response = await fetch(file);
        fileData = await response.blob();
      } else {
        throw new Error('Formato de archivo no soportado');
      }
      
      // Subir archivo
      const snapshot = await uploadBytes(imageRef, fileData);
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        path: fullPath,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Subir imagen desde base64
  async uploadImageFromBase64(base64Data, path = 'blog-images') {
    try {
      // Convertir base64 a blob
      const response = await fetch(base64Data);
      const blob = await response.blob();
      
      return await this.uploadImage(blob, path);
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar imagen
  async deleteImage(imagePath) {
    try {
      const imageRef = ref(this.storage, imagePath);
      await deleteObject(imageRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar nombre de archivo único
  generateFileName(prefix = 'image', extension = 'png') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}.${extension}`;
  }
}

export const storageService = new StorageService();
export default storageService;

