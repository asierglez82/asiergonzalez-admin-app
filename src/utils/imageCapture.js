import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Captura una imagen de un componente referenciado, asegurándose de que esté completamente renderizado
 * @param {Object} composeRef - Referencia al componente a capturar
 * @param {Object} domtoimage - Librería dom-to-image (solo para web)
 * @returns {Promise<string>} - Data URL de la imagen capturada
 */
export const captureCompose = async (composeRef, domtoimage = null) => {
  if (!composeRef || !composeRef.current) {
    throw new Error('composeRef no está disponible');
  }

  // Esperar un momento para asegurar que el DOM esté completamente renderizado
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Verificar que el elemento tenga dimensiones válidas (solo web)
  if (Platform.OS === 'web') {
    const hasValidDimensions = composeRef.current.offsetWidth > 0 && composeRef.current.offsetHeight > 0;
    console.log('Dimensiones del composeRef:', composeRef.current.offsetWidth, 'x', composeRef.current.offsetHeight);
    
    if (!hasValidDimensions) {
      console.warn('composeRef no tiene dimensiones válidas, esperando más tiempo...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar nuevamente
      const stillNoValidDimensions = composeRef.current.offsetWidth === 0 || composeRef.current.offsetHeight === 0;
      if (stillNoValidDimensions) {
        throw new Error('El elemento no tiene dimensiones válidas después de esperar');
      }
    }
  }
  
  let imageData;
  
  if (Platform.OS === 'web') {
    if (!domtoimage) {
      throw new Error('domtoimage es requerido para capturar en web');
    }
    
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
  
  return imageData;
};

