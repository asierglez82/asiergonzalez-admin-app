/**
 * Script de Importación Completa de Covve a Firestore
 * ====================================================
 * 
 * Este script importa todas las hojas del Excel de Covve:
 * - Relationships → contactos principales
 * - Notes → notas de contactos
 * - Reminders → recordatorios
 * - Interactions → historial de interacciones
 * 
 * ESTRUCTURA EN FIRESTORE:
 * crm_contacts (colección)
 *  └── contactoID (doc)
 *       ├── datos del contacto
 *       ├── notes (subcolección)
 *       ├── reminders (subcolección)
 *       └── interactions (subcolección)
 * 
 * INSTRUCCIONES DE USO:
 * ---------------------
 * 1. Descarga tu Service Account Key desde Firebase Console
 * 2. Guárdalo como 'serviceAccountKey.json' en la raíz del proyecto
 * 3. Coloca el archivo Excel de Covve en: /mnt/data/covve_export.xlsx
 * 4. Ejecuta: node scripts/import_covve_full.js
 * 
 * OPCIONES:
 * ---------
 * DRY_RUN=true          - Solo muestra datos sin subirlos
 * EXCEL_FILE_PATH=path  - Ruta personalizada al Excel
 */

const admin = require('firebase-admin');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuración
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH || '/mnt/data/covve_export.xlsx';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Colores para logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Inicializar Firebase Admin
function initializeFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      log('❌ ERROR: No se encontró el archivo serviceAccountKey.json', 'red');
      log('Por favor, descarga tu Service Account Key desde Firebase Console', 'yellow');
      process.exit(1);
    }

    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    log('✅ Firebase Admin inicializado correctamente', 'green');
    return admin.firestore();
  } catch (error) {
    log(`❌ Error inicializando Firebase: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Utilidades
function cleanText(text) {
  if (!text) return null;
  const cleaned = String(text).trim();
  return cleaned === '' ? null : cleaned;
}

function normalizeEmail(email) {
  if (!email) return null;
  const cleaned = cleanText(email);
  if (!cleaned) return null;
  return cleaned.toLowerCase();
}

function excelDateToTimestamp(excelDate) {
  if (!excelDate) return null;
  
  try {
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      return new Date(date.y, date.m - 1, date.d).getTime();
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
}

function sanitizeDocId(text) {
  if (!text) return null;
  return String(text)
    .toLowerCase()
    .replace(/[^a-zA-Z0-9@._-]/g, '_')
    .substring(0, 1500); // Firestore doc ID limit
}

// Leer todas las hojas del Excel
function readAllSheets(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ ERROR: No se encontró el archivo: ${filePath}`, 'red');
      process.exit(1);
    }

    log(`📖 Leyendo archivo: ${filePath}`, 'blue');
    const workbook = XLSX.readFile(filePath);
    
    log(`📋 Hojas encontradas: ${workbook.SheetNames.join(', ')}`, 'cyan');
    
    const sheets = {};
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      sheets[sheetName] = data;
      log(`  ✓ ${sheetName}: ${data.length} filas`, 'green');
    });
    
    return sheets;
  } catch (error) {
    log(`❌ Error leyendo el archivo Excel: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Mapear contacto desde hoja Relationships
function mapContact(row) {
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
  
  // ID de Covve para relacionar con otras hojas
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
    covveId: covveId, // Para relacionar con notes/reminders/interactions
    source: 'covve_import',
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
    
    // Estadísticas (se llenarán al importar interactions)
    stats: {
      totalNotes: 0,
      totalReminders: 0,
      totalInteractions: 0
    }
  };
}

// Mapear nota
function mapNote(row) {
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
  
  return {
    content: content || 'Nota sin contenido',
    title: title,
    date: date,
    contactEmail: contactEmail,
    contactId: contactId,
    createdAt: date,
    updatedAt: Date.now(),
    source: 'covve_import'
  };
}

// Mapear recordatorio
function mapReminder(row) {
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
    row['email']
  );
  
  const contactId = cleanText(
    row['ContactId'] || 
    row['ContactID'] ||
    row['ID']
  );
  
  return {
    title: title || 'Recordatorio sin título',
    dueDate: dueDate || Date.now(),
    status: status.toLowerCase(), // pending, completed, cancelled
    description: description,
    contactEmail: contactEmail,
    contactId: contactId,
    completed: status.toLowerCase() === 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'covve_import'
  };
}

// Mapear interacción
function mapInteraction(row) {
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
    row['email']
  );
  
  const contactId = cleanText(
    row['ContactId'] || 
    row['ContactID'] ||
    row['ID']
  );
  
  return {
    type: type.toLowerCase(), // meeting, call, email, other
    date: date,
    description: description || 'Interacción sin descripción',
    duration: duration,
    location: location,
    outcome: outcome,
    contactEmail: contactEmail,
    contactId: contactId,
    createdAt: date,
    updatedAt: Date.now(),
    source: 'covve_import'
  };
}

// Crear índice de contactos por email y covveId
function createContactIndex(contacts) {
  const byEmail = new Map();
  const byCovveId = new Map();
  
  contacts.forEach(contact => {
    if (contact.email) {
      byEmail.set(contact.email, contact.firestoreId);
    }
    if (contact.covveId) {
      byCovveId.set(contact.covveId, contact.firestoreId);
    }
  });
  
  return { byEmail, byCovveId };
}

// Encontrar ID de Firestore del contacto
function findContactFirestoreId(item, index) {
  // Intentar por email primero
  if (item.contactEmail && index.byEmail.has(item.contactEmail)) {
    return index.byEmail.get(item.contactEmail);
  }
  
  // Intentar por covveId
  if (item.contactId && index.byCovveId.has(item.contactId)) {
    return index.byCovveId.get(item.contactId);
  }
  
  return null;
}

// Importar contactos
async function importContacts(db, relationships) {
  log('\n📇 Importando contactos (Relationships)...', 'blue');
  
  const contacts = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < relationships.length; i++) {
    try {
      const contact = mapContact(relationships[i]);
      
      if (!contact.name && !contact.email) {
        skippedCount++;
        continue;
      }
      
      // Generar ID de Firestore
      let firestoreId;
      if (contact.email) {
        firestoreId = sanitizeDocId(contact.email);
      } else {
        firestoreId = db.collection('crm_contacts').doc().id;
      }
      
      contact.firestoreId = firestoreId;
      contacts.push(contact);
      
      if (!DRY_RUN) {
        await db.collection('crm_contacts').doc(firestoreId).set(contact, { merge: true });
      }
      
      successCount++;
      
      if (successCount % 50 === 0) {
        log(`  📊 ${successCount}/${relationships.length} contactos procesados`, 'cyan');
      }
      
    } catch (error) {
      errorCount++;
      log(`  ❌ Error en contacto ${i + 1}: ${error.message}`, 'red');
    }
  }
  
  log(`\n✅ Contactos: ${successCount} importados, ${skippedCount} omitidos, ${errorCount} errores`, 'green');
  return contacts;
}

// Importar notas
async function importNotes(db, notes, contactIndex) {
  log('\n📝 Importando notas (Notes)...', 'blue');
  
  let successCount = 0;
  let errorCount = 0;
  let orphanCount = 0;
  
  for (let i = 0; i < notes.length; i++) {
    try {
      const note = mapNote(notes[i]);
      const contactId = findContactFirestoreId(note, contactIndex);
      
      if (!contactId) {
        orphanCount++;
        continue;
      }
      
      if (!DRY_RUN) {
        const noteRef = db
          .collection('crm_contacts')
          .doc(contactId)
          .collection('notes')
          .doc();
        
        await noteRef.set(note);
        
        // Actualizar contador en contacto
        await db.collection('crm_contacts').doc(contactId).update({
          'stats.totalNotes': admin.firestore.FieldValue.increment(1),
          updatedAt: Date.now()
        });
      }
      
      successCount++;
      
    } catch (error) {
      errorCount++;
      log(`  ❌ Error en nota ${i + 1}: ${error.message}`, 'red');
    }
  }
  
  log(`✅ Notas: ${successCount} importadas, ${orphanCount} sin contacto, ${errorCount} errores`, 'green');
}

// Importar recordatorios
async function importReminders(db, reminders, contactIndex) {
  log('\n⏰ Importando recordatorios (Reminders)...', 'blue');
  
  let successCount = 0;
  let errorCount = 0;
  let orphanCount = 0;
  
  for (let i = 0; i < reminders.length; i++) {
    try {
      const reminder = mapReminder(reminders[i]);
      const contactId = findContactFirestoreId(reminder, contactIndex);
      
      if (!contactId) {
        orphanCount++;
        continue;
      }
      
      if (!DRY_RUN) {
        const reminderRef = db
          .collection('crm_contacts')
          .doc(contactId)
          .collection('reminders')
          .doc();
        
        await reminderRef.set(reminder);
        
        // Actualizar contador y próximo follow-up si es pendiente
        const updates = {
          'stats.totalReminders': admin.firestore.FieldValue.increment(1),
          updatedAt: Date.now()
        };
        
        if (reminder.status === 'pending' && reminder.dueDate) {
          updates.nextFollowUp = reminder.dueDate;
        }
        
        await db.collection('crm_contacts').doc(contactId).update(updates);
      }
      
      successCount++;
      
    } catch (error) {
      errorCount++;
      log(`  ❌ Error en recordatorio ${i + 1}: ${error.message}`, 'red');
    }
  }
  
  log(`✅ Recordatorios: ${successCount} importados, ${orphanCount} sin contacto, ${errorCount} errores`, 'green');
}

// Importar interacciones
async function importInteractions(db, interactions, contactIndex) {
  log('\n🤝 Importando interacciones (Interactions)...', 'blue');
  
  let successCount = 0;
  let errorCount = 0;
  let orphanCount = 0;
  
  for (let i = 0; i < interactions.length; i++) {
    try {
      const interaction = mapInteraction(interactions[i]);
      const contactId = findContactFirestoreId(interaction, contactIndex);
      
      if (!contactId) {
        orphanCount++;
        continue;
      }
      
      if (!DRY_RUN) {
        const interactionRef = db
          .collection('crm_contacts')
          .doc(contactId)
          .collection('interactions')
          .doc();
        
        await interactionRef.set(interaction);
        
        // Actualizar contador y último contacto
        await db.collection('crm_contacts').doc(contactId).update({
          'stats.totalInteractions': admin.firestore.FieldValue.increment(1),
          lastContact: interaction.date,
          updatedAt: Date.now()
        });
      }
      
      successCount++;
      
    } catch (error) {
      errorCount++;
      log(`  ❌ Error en interacción ${i + 1}: ${error.message}`, 'red');
    }
  }
  
  log(`✅ Interacciones: ${successCount} importadas, ${orphanCount} sin contacto, ${errorCount} errores`, 'green');
}

// Función principal
async function main() {
  log('\n' + '='.repeat(70), 'cyan');
  log('   IMPORTACIÓN COMPLETA DE COVVE → FIRESTORE', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
  
  if (DRY_RUN) {
    log('⚠️  MODO DRY RUN - No se subirán datos reales\n', 'yellow');
  }
  
  // Inicializar Firebase
  const db = initializeFirebase();
  
  // Leer todas las hojas
  const sheets = readAllSheets(EXCEL_FILE_PATH);
  
  // Identificar las hojas (flexible con nombres)
  const relationships = sheets['Relationships'] || sheets['relationships'] || sheets['Contacts'] || [];
  const notes = sheets['Notes'] || sheets['notes'] || [];
  const reminders = sheets['Reminders'] || sheets['reminders'] || [];
  const interactions = sheets['Interactions'] || sheets['interactions'] || [];
  
  log('\n📊 Resumen de datos encontrados:', 'cyan');
  log(`  • Contactos: ${relationships.length}`, 'white');
  log(`  • Notas: ${notes.length}`, 'white');
  log(`  • Recordatorios: ${reminders.length}`, 'white');
  log(`  • Interacciones: ${interactions.length}`, 'white');
  
  // Mostrar muestra de campos
  if (relationships.length > 0) {
    log('\n📋 Campos en Relationships:', 'cyan');
    console.log('  ', Object.keys(relationships[0]).join(', '));
  }
  
  // Importar contactos primero
  const contacts = await importContacts(db, relationships);
  
  // Crear índice para relacionar
  const contactIndex = createContactIndex(contacts);
  log(`\n🔗 Índice creado: ${contactIndex.byEmail.size} emails, ${contactIndex.byCovveId.size} IDs de Covve`, 'cyan');
  
  // Importar notas, recordatorios e interacciones
  if (notes.length > 0) {
    await importNotes(db, notes, contactIndex);
  }
  
  if (reminders.length > 0) {
    await importReminders(db, reminders, contactIndex);
  }
  
  if (interactions.length > 0) {
    await importInteractions(db, interactions, contactIndex);
  }
  
  // Resumen final
  log('\n' + '='.repeat(70), 'cyan');
  log('   RESUMEN FINAL', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`✅ Importación completada correctamente`, 'green');
  log(`📚 Colección principal: crm_contacts`, 'blue');
  log(`📊 Total de contactos: ${contacts.length}`, 'blue');
  
  if (DRY_RUN) {
    log('\n⚠️  MODO DRY RUN - No se subieron datos reales', 'yellow');
    log('Para subir los datos, ejecuta sin DRY_RUN=true', 'yellow');
  } else {
    log('\n🎉 ¡Todos tus datos de Covve están ahora en Firestore!', 'green');
  }
  
  log('\n' + '='.repeat(70) + '\n', 'cyan');
}

// Ejecutar
main().catch(error => {
  log(`\n❌ ERROR FATAL: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

