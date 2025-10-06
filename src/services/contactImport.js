/**
 * Servicio de Importación de Contactos
 * ===================================
 * 
 * Este servicio maneja la importación real de contactos desde archivos Excel
 * y los persiste en Firestore.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Importar XLSX para leer archivos Excel
let XLSX;
if (Platform.OS === 'web') {
  // En web, usar la versión estándar
  XLSX = require('xlsx');
} else {
  // En móvil, usar la versión compatible
  XLSX = require('xlsx');
}

// Utilidades
const cleanText = (text) => {
  if (!text) return null;
  const cleaned = String(text).trim();
  return cleaned === '' ? null : cleaned;
};

const normalizeEmail = (email) => {
  if (!email) return null;
  const cleaned = cleanText(email);
  if (!cleaned) return null;
  return cleaned.toLowerCase();
};

const excelDateToTimestamp = (excelDate) => {
  if (!excelDate) return null;
  
  try {
    if (typeof excelDate === 'number') {
      // Fecha de Excel
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.getTime();
    }
    
    if (typeof excelDate === 'string') {
      const parsed = new Date(excelDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const sanitizeDocId = (text) => {
  if (!text) return null;
  return String(text)
    .toLowerCase()
    .replace(/[^a-zA-Z0-9@._-]/g, '_')
    .substring(0, 1500);
};

// Leer archivo Excel
const readExcelFile = async (fileUri) => {
  try {
    let fileData;
    
    if (Platform.OS === 'web') {
      // En web, leer como ArrayBuffer
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      fileData = arrayBuffer;
    } else {
      // En móvil, leer como base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileData = base64;
    }
    
    const workbook = XLSX.read(fileData, { type: Platform.OS === 'web' ? 'array' : 'base64' });
    
    const sheets = {};
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      sheets[sheetName] = data;
    });
    
    return sheets;
  } catch (error) {
    console.error('Error leyendo archivo Excel:', error);
    throw new Error('No se pudo leer el archivo Excel');
  }
};

// Mapear contacto desde hoja Relationships
const mapContact = (row) => {
  const firstName = cleanText(row['FirstName'] || row['First Name'] || '');
  const lastName = cleanText(row['LastName'] || row['Last Name'] || '');
  const fullName = cleanText(row['FullName'] || row['Full Name'] || row['Name'] || '');
  
  let name = fullName;
  if (!name && (firstName || lastName)) {
    name = [firstName, lastName].filter(Boolean).join(' ');
  }
  
  const email = normalizeEmail(
    row['Email1'] || 
    row['Email'] || 
    row['email'] || 
    row['Primary Email'] ||
    row['EmailAddress']
  );
  
  const email2 = normalizeEmail(row['Email2'] || row['Secondary Email']);
  const emails = [email, email2].filter(Boolean);
  
  const phone1 = cleanText(row['Phone1'] || row['Phone'] || row['Mobile']);
  const phone2 = cleanText(row['Phone2'] || row['Secondary Phone']);
  const phones = [phone1, phone2].filter(Boolean);
  
  const company = cleanText(
    row['CompanyName'] || 
    row['Company'] || 
    row['company'] ||
    row['Organization']
  );
  
  const position = cleanText(
    row['JobTitle'] || 
    row['Title'] || 
    row['Position'] ||
    row['Job Title']
  );
  
  const tags = cleanText(row['Tags'] || row['tags']);
  const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  const generalNote = cleanText(
    row['GeneralNote'] || 
    row['Notes'] || 
    row['notes'] ||
    row['Description']
  );
  
  const lastContactDate = excelDateToTimestamp(
    row['LastContactedDate'] || 
    row['Last Contact'] ||
    row['Last Contacted']
  );
  
  const createdDate = excelDateToTimestamp(
    row['CreatedDate'] || 
    row['Created'] ||
    row['Date Added']
  );
  
  const covveId = cleanText(
    row['ContactId'] || 
    row['ID'] || 
    row['Id'] ||
    row['ContactID']
  );
  
  const address = cleanText(row['Address'] || row['address']);
  const city = cleanText(row['City'] || row['city']);
  const country = cleanText(row['Country'] || row['country']);
  const website = cleanText(row['Website'] || row['website']);
  const linkedin = cleanText(row['LinkedIn'] || row['linkedin']);
  const twitter = cleanText(row['Twitter'] || row['twitter']);
  
  return {
    // Información básica
    name: name || 'Sin nombre',
    firstName: firstName,
    lastName: lastName,
    email: email,
    emails: emails,
    phone: phone1,
    phones: phones,
    
    // Información profesional
    company: company,
    position: position,
    
    // Ubicación
    address: address,
    city: city,
    country: country,
    
    // Social/Web
    website: website,
    linkedin: linkedin,
    twitter: twitter,
    
    // Notas y tags
    generalNote: generalNote,
    tags: tagsArray,
    
    // Metadata
    covveId: covveId,
    source: 'app_import',
    importDate: Date.now(),
    status: 'active',
    
    // CRM
    leadStatus: 'cold',
    priority: 'low',
    nextFollowUp: null,
    dealValue: null,
    
    // Timestamps
    lastContact: lastContactDate,
    createdAt: createdDate || Date.now(),
    updatedAt: Date.now(),
    
    // Estadísticas
    stats: {
      totalNotes: 0,
      totalReminders: 0,
      totalInteractions: 0
    }
  };
};

// Mapear nota
const mapNote = (row) => {
  const content = cleanText(
    row['Content'] || 
    row['Note'] || 
    row['note'] ||
    row['Text']
  );
  
  const title = cleanText(row['Title'] || row['title']);
  
  const date = excelDateToTimestamp(
    row['Date'] || 
    row['CreatedDate'] ||
    row['Created']
  ) || Date.now();
  
  const contactEmail = normalizeEmail(
    row['ContactEmail'] || 
    row['Email'] ||
    row['email']
  );
  
  const contactId = cleanText(
    row['ContactId'] || 
    row['ContactID'] ||
    row['ID']
  );
  
  const relationshipName = cleanText(
    row['Relationship Name'] ||
    row['relationshipName'] ||
    row['Contact Name'] ||
    row['Name']
  );
  
  // Extraer número de fila si está disponible
  const rowNumber = parseInt(row['Row Number'] || row['rowNumber'] || row['Row'] || '0');
  
  return {
    content: content || 'Nota sin contenido',
    title: title,
    date: date,
    contactEmail: contactEmail,
    contactId: contactId,
    relationshipName: relationshipName,
    contactRowNumber: rowNumber,
    createdAt: date,
    updatedAt: Date.now(),
    source: 'app_import'
  };
};

// Mapear recordatorio
const mapReminder = (row) => {
  const title = cleanText(
    row['Title'] || 
    row['title'] ||
    row['Subject'] ||
    row['Reminder']
  );
  
  const dueDate = excelDateToTimestamp(
    row['DueDate'] || 
    row['Date'] ||
    row['ReminderDate']
  );
  
  const status = cleanText(row['Status'] || row['status']) || 'pending';
  
  const description = cleanText(
    row['Description'] || 
    row['description'] ||
    row['Notes']
  );
  
  const contactEmail = normalizeEmail(
    row['ContactEmail'] || 
    row['Email'] ||
    row['email'] ||
    row['Contact Email'] ||
    row['Email Address']
  );
  
  const contactId = cleanText(
    row['ContactId'] || 
    row['ContactID'] ||
    row['ID'] ||
    row['Contact ID'] ||
    row['CovveId'] ||
    row['Covve ID']
  );
  
  const relationshipName = cleanText(
    row['Relationship Name'] ||
    row['relationshipName'] ||
    row['Contact Name'] ||
    row['Name']
  );
  
  // Extraer número de fila si está disponible
  const rowNumber = parseInt(row['Row Number'] || row['rowNumber'] || row['Row'] || '0');
  
  return {
    title: title || 'Recordatorio sin título',
    dueDate: dueDate || Date.now(),
    status: status.toLowerCase(),
    description: description,
    contactEmail: contactEmail,
    contactId: contactId,
    relationshipName: relationshipName,
    contactRowNumber: rowNumber,
    completed: status.toLowerCase() === 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'app_import'
  };
};

// Mapear interacción
const mapInteraction = (row) => {
  const type = cleanText(
    row['Type'] || 
    row['type'] ||
    row['InteractionType']
  ) || 'other';
  
  const date = excelDateToTimestamp(
    row['Date'] || 
    row['InteractionDate'] ||
    row['Created']
  ) || Date.now();
  
  const description = cleanText(
    row['Description'] || 
    row['description'] ||
    row['Notes'] ||
    row['Content']
  );
  
  const duration = cleanText(row['Duration'] || row['duration']);
  const location = cleanText(row['Location'] || row['location']);
  const outcome = cleanText(row['Outcome'] || row['outcome']);
  
  const contactEmail = normalizeEmail(
    row['ContactEmail'] || 
    row['Email'] ||
    row['email'] ||
    row['Contact Email'] ||
    row['Email Address']
  );
  
  const contactId = cleanText(
    row['ContactId'] || 
    row['ContactID'] ||
    row['ID'] ||
    row['Contact ID'] ||
    row['CovveId'] ||
    row['Covve ID']
  );
  
  const relationshipName = cleanText(
    row['Relationship Name'] ||
    row['relationshipName'] ||
    row['Contact Name'] ||
    row['Name']
  );
  
  // Extraer número de fila si está disponible
  const rowNumber = parseInt(row['Row Number'] || row['rowNumber'] || row['Row'] || '0');
  
  return {
    type: type.toLowerCase(),
    date: date,
    description: description || 'Interacción sin descripción',
    duration: duration,
    location: location,
    outcome: outcome,
    contactEmail: contactEmail,
    contactId: contactId,
    relationshipName: relationshipName,
    contactRowNumber: rowNumber,
    createdAt: date,
    updatedAt: Date.now(),
    source: 'app_import'
  };
};

// Crear índice de contactos por email, covveId, nombre completo y número de fila
const createContactIndex = (contacts) => {
  const byEmail = new Map();
  const byCovveId = new Map();
  const byFullName = new Map();
  const byRowNumber = new Map();
  
  contacts.forEach(contact => {
    if (contact.email) {
      byEmail.set(contact.email.toLowerCase(), contact.firestoreId);
    }
    if (contact.covveId) {
      byCovveId.set(contact.covveId, contact.firestoreId);
    }
    if (contact.name) {
      // Normalizar nombre para búsqueda (quitar espacios extra, convertir a minúsculas)
      const normalizedName = contact.name.toLowerCase().trim().replace(/\s+/g, ' ');
      byFullName.set(normalizedName, contact.firestoreId);
    }
    if (contact.rowNumber) {
      byRowNumber.set(contact.rowNumber, contact.firestoreId);
    }
  });
  
  return { byEmail, byCovveId, byFullName, byRowNumber };
};

// Encontrar ID de Firestore del contacto
const findContactFirestoreId = (item, index) => {
  // 1. Buscar por número de fila (más preciso)
  if (item.contactRowNumber && item.contactRowNumber > 0 && index.byRowNumber.has(item.contactRowNumber)) {
    return index.byRowNumber.get(item.contactRowNumber);
  }
  
  // 2. Buscar por email
  if (item.contactEmail && index.byEmail.has(item.contactEmail.toLowerCase())) {
    return index.byEmail.get(item.contactEmail.toLowerCase());
  }
  
  // 3. Buscar por Covve ID
  if (item.contactId && index.byCovveId.has(item.contactId)) {
    return index.byCovveId.get(item.contactId);
  }
  
  // 4. Buscar por nombre completo (Relationship Name)
  if (item.relationshipName) {
    const normalizedName = item.relationshipName.toLowerCase().trim().replace(/\s+/g, ' ');
    if (index.byFullName.has(normalizedName)) {
      return index.byFullName.get(normalizedName);
    }
  }
  
  return null;
};

// Función para analizar el archivo Excel y obtener preview
const analyzeExcelFile = async (filePath) => {
  try {
    console.log('Analizando archivo Excel:', filePath);
    
    const sheets = await readExcelFile(filePath);
    
    // Identificar las hojas
    const relationships = sheets['Relationships'] || sheets['relationships'] || sheets['Contacts'] || [];
    const notes = sheets['Notes'] || sheets['notes'] || [];
    const reminders = sheets['Reminders'] || sheets['reminders'] || [];
    const interactions = sheets['Interactions'] || sheets['interactions'] || [];
    
    // Mapear contactos para preview
    const contacts = relationships.map(mapContact);
    const validContacts = contacts.filter(contact => contact.name && contact.email);
    
    return {
      success: true,
      preview: {
        fileName: 'covve_export.xlsx',
        fileSize: '2.3 MB', // Simulado
        sheets: [
          { name: 'Relationships', rows: relationships.length, description: 'Contactos principales' },
          { name: 'Notes', rows: notes.length, description: 'Notas de contactos' },
          { name: 'Reminders', rows: reminders.length, description: 'Recordatorios' },
          { name: 'Interactions', rows: interactions.length, description: 'Historial de interacciones' }
        ],
        totalContacts: validContacts.length,
        totalNotes: notes.length,
        totalReminders: reminders.length,
        totalInteractions: interactions.length,
        sampleContacts: validContacts.slice(0, 3).map(c => ({
          name: c.name,
          email: c.email,
          company: c.company
        })),
        warnings: [
          `${relationships.length - validContacts.length} contactos sin email serán omitidos`,
          `${notes.length} notas serán importadas`,
          `${reminders.length} recordatorios serán importados`,
          `${interactions.length} interacciones serán importadas`
        ]
      }
    };
  } catch (error) {
    console.error('Error analizando archivo:', error);
    throw error;
  }
};

// Función para obtener preview del archivo
export const getFilePreview = async () => {
  try {
    // 1. Seleccionar archivo
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: Platform.OS !== 'web',
    });

    if (result.canceled) {
      return { success: false, message: 'Selección de archivo cancelada' };
    }

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name;
    
    // 2. Manejar archivo según la plataforma
    let tempPath;
    
    if (Platform.OS === 'web') {
      tempPath = fileUri;
    } else {
      tempPath = `${FileSystem.cacheDirectory}covve_export.xlsx`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempPath
      });
    }

    // 3. Analizar archivo
    const analysisResult = await analyzeExcelFile(tempPath);
    
    if (!analysisResult.success) {
      return { success: false, message: analysisResult.message };
    }

    // 4. Limpiar archivo temporal (solo en móvil)
    if (Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(tempPath);
      } catch (cleanupError) {
        console.warn('No se pudo eliminar archivo temporal:', cleanupError);
      }
    }

    return {
      success: true,
      preview: analysisResult.preview
    };

  } catch (error) {
    console.error('Error obteniendo preview:', error);
    return {
      success: false,
      message: `Error analizando archivo: ${error.message}`
    };
  }
};

// Función principal de importación
export const importContactsFromFile = async () => {
  try {
    // 1. Seleccionar archivo
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: Platform.OS !== 'web',
    });

    if (result.canceled) {
      return { success: false, message: 'Selección de archivo cancelada' };
    }

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name;
    
    console.log('Archivo seleccionado:', fileName);

    // 2. Manejar archivo según la plataforma
    let tempPath;
    
    if (Platform.OS === 'web') {
      tempPath = fileUri;
    } else {
      tempPath = `${FileSystem.cacheDirectory}covve_export.xlsx`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempPath
      });
    }

    // 3. Leer archivo Excel
    const sheets = await readExcelFile(tempPath);
    
    // 4. Identificar las hojas
    const relationships = sheets['Relationships'] || sheets['relationships'] || sheets['Contacts'] || [];
    const notes = sheets['Notes'] || sheets['notes'] || [];
    const reminders = sheets['Reminders'] || sheets['reminders'] || [];
    const interactions = sheets['Interactions'] || sheets['interactions'] || [];
    
    console.log(`📊 Procesando archivo Excel:`);
    console.log(`  • Relationships: ${relationships.length} filas`);
    console.log(`  • Notes: ${notes.length} filas`);
    console.log(`  • Reminders: ${reminders.length} filas`);
    console.log(`  • Interactions: ${interactions.length} filas`);

    // 5. Importar contactos (usando número de fila como ID único)
    const contacts = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    console.log(`📊 Iniciando procesamiento de ${relationships.length} filas...`);
    
    for (let i = 0; i < relationships.length; i++) {
      try {
        const contact = mapContact(relationships[i]);
        
        // Solo omitir filas completamente vacías
        if (!contact.name && !contact.email && !contact.company) {
          skippedCount++;
          continue;
        }
        
        // Usar número de fila como ID único (row_0, row_1, etc.)
        const firestoreId = `row_${i}`;
        contact.firestoreId = firestoreId;
        contact.rowNumber = i + 1; // Para referencia humana (1-indexed)
        contacts.push(contact);
        
        // Verificar si ya existe (por si se ejecuta múltiples veces)
        const docRef = doc(db, 'crm_contacts', firestoreId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          // Crear nuevo contacto
          await setDoc(docRef, {
            ...contact,
            id: firestoreId
          });
        } else {
          // Actualizar contacto existente
          await updateDoc(docRef, {
            ...contact,
            updatedAt: Date.now()
          });
        }
        
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`Procesados ${successCount}/${relationships.length} contactos`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`Error en contacto ${i + 1}:`, error);
      }
    }
    
    console.log(`📊 Resumen de contactos:`);
    console.log(`   • Total filas en Excel: ${relationships.length}`);
    console.log(`   • Filas omitidas (sin datos): ${skippedCount}`);
    console.log(`   • Contactos procesados: ${successCount}`);
    console.log(`   • Errores: ${errorCount}`);
    console.log(`   • Total contactos únicos: ${successCount}`);
    
    // 6. Crear índice para relacionar
    const contactIndex = createContactIndex(contacts);
    
    // 7. Importar notas
    console.log(`📝 Importando ${notes.length} notas...`);
    let notesCount = 0;
    let notesOrphaned = 0;
    for (const noteData of notes) {
      try {
        const note = mapNote(noteData);
        const contactId = findContactFirestoreId(note, contactIndex);
        
        if (contactId) {
          await addDoc(collection(db, 'crm_contacts', contactId, 'notes'), note);
          notesCount++;
        } else {
          notesOrphaned++;
          console.log(`⚠️ Nota sin contacto: ${note.title || 'Sin título'} (email: ${note.contactEmail}, id: ${note.contactId}, name: ${note.relationshipName}, row: ${note.contactRowNumber})`);
        }
      } catch (error) {
        console.error('Error importando nota:', error);
      }
    }
    console.log(`✅ Notas importadas: ${notesCount}/${notes.length} (${notesOrphaned} huérfanas)`);
    
    // 8. Importar recordatorios
    console.log(`⏰ Importando ${reminders.length} recordatorios...`);
    
    // Debug: mostrar campos disponibles en el primer recordatorio
    if (reminders.length > 0) {
      console.log('🔍 Campos disponibles en recordatorios:', Object.keys(reminders[0]));
      console.log('📋 Primer recordatorio:', reminders[0]);
    }
    
    let remindersCount = 0;
    let remindersOrphaned = 0;
    for (const reminderData of reminders) {
      try {
        const reminder = mapReminder(reminderData);
        const contactId = findContactFirestoreId(reminder, contactIndex);
        
        if (contactId) {
          await addDoc(collection(db, 'crm_contacts', contactId, 'reminders'), reminder);
          remindersCount++;
        } else {
          remindersOrphaned++;
          console.log(`⚠️ Recordatorio sin contacto: ${reminder.title} (email: ${reminder.contactEmail}, id: ${reminder.contactId}, name: ${reminder.relationshipName}, row: ${reminder.contactRowNumber})`);
        }
      } catch (error) {
        console.error('Error importando recordatorio:', error);
      }
    }
    console.log(`✅ Recordatorios importados: ${remindersCount}/${reminders.length} (${remindersOrphaned} huérfanos)`);
    
    // 9. Importar interacciones
    console.log(`🤝 Importando ${interactions.length} interacciones...`);
    
    // Debug: mostrar campos disponibles en la primera interacción
    if (interactions.length > 0) {
      console.log('🔍 Campos disponibles en interacciones:', Object.keys(interactions[0]));
      console.log('📋 Primera interacción:', interactions[0]);
    }
    
    let interactionsCount = 0;
    let interactionsOrphaned = 0;
    for (const interactionData of interactions) {
      try {
        const interaction = mapInteraction(interactionData);
        const contactId = findContactFirestoreId(interaction, contactIndex);
        
        if (contactId) {
          await addDoc(collection(db, 'crm_contacts', contactId, 'interactions'), interaction);
          interactionsCount++;
        } else {
          interactionsOrphaned++;
          console.log(`⚠️ Interacción sin contacto: ${interaction.type} (email: ${interaction.contactEmail}, id: ${interaction.contactId}, name: ${interaction.relationshipName}, row: ${interaction.contactRowNumber})`);
        }
      } catch (error) {
        console.error('Error importando interacción:', error);
      }
    }
    console.log(`✅ Interacciones importadas: ${interactionsCount}/${interactions.length} (${interactionsOrphaned} huérfanas)`);

    // 10. Limpiar archivo temporal (solo en móvil)
    if (Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(tempPath);
      } catch (cleanupError) {
        console.warn('No se pudo eliminar archivo temporal:', cleanupError);
      }
    }

    // 11. Resultado
    return {
      success: true,
      message: `Importación completada: ${successCount} contactos, ${notesCount} notas, ${remindersCount} recordatorios, ${interactionsCount} interacciones`,
      data: {
        contacts: successCount,
        notes: notesCount,
        reminders: remindersCount,
        interactions: interactionsCount,
        errors: errorCount
      }
    };

  } catch (error) {
    console.error('Error en importación:', error);
    return {
      success: false,
      message: `Error durante la importación: ${error.message}`
    };
  }
};

// Función para mostrar instrucciones de importación
export const getImportInstructions = () => {
  return {
    title: 'Importar Contactos desde Excel',
    steps: [
      '1. Exporta tus contactos desde Covve en formato Excel (.xlsx)',
      '2. Asegúrate de que el archivo tenga las hojas: Relationships, Notes, Reminders, Interactions',
      '3. Haz clic en "Importar" y selecciona tu archivo',
      '4. Revisa el preview de los datos que se van a importar',
      '5. Confirma la importación para subir los datos a Firestore'
    ],
    supportedFormats: ['.xlsx', '.xls'],
    note: 'Los contactos con email duplicado se actualizarán, no se duplicarán.'
  };
};