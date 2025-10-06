/**
 * Script de Migración de Contactos de Covve a Firestore
 * ======================================================
 * 
 * Este script lee el archivo Excel exportado desde Covve y sube
 * los contactos a la colección 'crm_contacts' en Firestore.
 * 
 * INSTRUCCIONES DE USO:
 * ---------------------
 * 1. Descarga tu Service Account Key desde Firebase Console:
 *    - Ve a: Project Settings > Service Accounts
 *    - Click en "Generate new private key"
 *    - Guarda el archivo como 'serviceAccountKey.json' en la raíz del proyecto
 * 
 * 2. Coloca el archivo Excel de Covve en: /mnt/data/covve_export.xlsx
 * 
 * 3. Ejecuta el script:
 *    node scripts/migrateCovveContacts.js
 * 
 * VARIABLES DE ENTORNO OPCIONALES:
 * --------------------------------
 * - EXCEL_FILE_PATH: Ruta al archivo Excel (por defecto: /mnt/data/covve_export.xlsx)
 * - FIRESTORE_COLLECTION: Nombre de la colección (por defecto: crm_contacts)
 * - DRY_RUN: Si es 'true', solo muestra los datos sin subirlos (por defecto: false)
 */

const admin = require('firebase-admin');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuración
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH || '/mnt/data/covve_export.xlsx';
const FIRESTORE_COLLECTION = process.env.FIRESTORE_COLLECTION || 'crm_contacts';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Colores para logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
      log('Por favor, descarga tu Service Account Key desde Firebase Console:', 'yellow');
      log('  1. Ve a: Project Settings > Service Accounts', 'yellow');
      log('  2. Click en "Generate new private key"', 'yellow');
      log('  3. Guarda el archivo como "serviceAccountKey.json" en la raíz del proyecto', 'yellow');
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

// Normalizar y limpiar texto
function cleanText(text) {
  if (!text) return null;
  const cleaned = String(text).trim();
  return cleaned === '' ? null : cleaned;
}

// Normalizar email
function normalizeEmail(email) {
  if (!email) return null;
  const cleaned = cleanText(email);
  if (!cleaned) return null;
  return cleaned.toLowerCase();
}

// Convertir fecha de Excel a timestamp
function excelDateToTimestamp(excelDate) {
  if (!excelDate) return null;
  
  try {
    // Si es un número (fecha de Excel)
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      return new Date(date.y, date.m - 1, date.d).getTime();
    }
    
    // Si es una cadena de texto
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

// Mapear campos de Covve a nuestro esquema
function mapContactFields(row) {
  // Covve típicamente exporta estos campos (pueden variar):
  // First Name, Last Name, Company, Title, Email, Phone, Notes, etc.
  
  const firstName = cleanText(row['First Name'] || row['first_name'] || row['firstName'] || '');
  const lastName = cleanText(row['Last Name'] || row['last_name'] || row['lastName'] || '');
  const fullName = cleanText(row['Full Name'] || row['Name'] || row['name'] || '');
  
  // Construir nombre completo
  let displayName = fullName;
  if (!displayName && (firstName || lastName)) {
    displayName = [firstName, lastName].filter(Boolean).join(' ');
  }
  
  const email = normalizeEmail(
    row['Email'] || 
    row['email'] || 
    row['Email Address'] || 
    row['email_address'] ||
    row['Primary Email']
  );
  
  const phone = cleanText(
    row['Phone'] || 
    row['phone'] || 
    row['Mobile'] || 
    row['mobile'] ||
    row['Phone Number'] ||
    row['Primary Phone']
  );
  
  const company = cleanText(
    row['Company'] || 
    row['company'] || 
    row['Organization'] || 
    row['organization']
  );
  
  const position = cleanText(
    row['Title'] || 
    row['title'] || 
    row['Job Title'] || 
    row['Position'] || 
    row['position']
  );
  
  const notes = cleanText(
    row['Notes'] || 
    row['notes'] || 
    row['Description'] || 
    row['description']
  );
  
  const dateAdded = excelDateToTimestamp(
    row['Date Added'] || 
    row['date_added'] || 
    row['Created'] || 
    row['created']
  );
  
  const lastContact = excelDateToTimestamp(
    row['Last Contact'] || 
    row['last_contact'] || 
    row['Last Contacted'] || 
    row['Last Modified']
  );
  
  return {
    name: displayName || 'Sin nombre',
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    company: company,
    position: position,
    notes: notes,
    dateAdded: dateAdded || Date.now(),
    lastContact: lastContact,
    
    // Metadata
    source: 'covve_import',
    importDate: Date.now(),
    status: 'active', // active, archived, deleted
    tags: [],
    customFields: {},
    
    // CRM específico
    leadStatus: 'cold', // cold, warm, hot, converted
    priority: 'low', // low, medium, high
    nextFollowUp: null,
    dealValue: null,
    
    // Timestamps
    createdAt: dateAdded || Date.now(),
    updatedAt: Date.now(),
  };
}

// Leer archivo Excel
function readExcelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ ERROR: No se encontró el archivo: ${filePath}`, 'red');
      log('Por favor, asegúrate de que el archivo existe en la ruta especificada.', 'yellow');
      process.exit(1);
    }

    log(`📖 Leyendo archivo: ${filePath}`, 'blue');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    log(`📋 Hoja de cálculo: ${sheetName}`, 'cyan');
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    log(`✅ Se encontraron ${data.length} filas en el archivo`, 'green');
    return data;
  } catch (error) {
    log(`❌ Error leyendo el archivo Excel: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Subir contactos a Firestore
async function uploadContactsToFirestore(db, contacts) {
  log(`\n🚀 Iniciando carga de ${contacts.length} contactos a Firestore...`, 'blue');
  
  if (DRY_RUN) {
    log('⚠️  MODO DRY RUN - No se subirán datos reales', 'yellow');
  }
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500; // Firestore límite de batch
  
  for (let i = 0; i < contacts.length; i++) {
    try {
      const contact = mapContactFields(contacts[i]);
      
      // Validar que tenga al menos nombre o email
      if (!contact.name && !contact.email) {
        log(`⚠️  Contacto ${i + 1} omitido: no tiene nombre ni email`, 'yellow');
        skippedCount++;
        continue;
      }
      
      // Usar email como ID si existe, sino generar uno
      let docId;
      if (contact.email) {
        // Sanitizar email para usarlo como ID
        docId = contact.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
      } else {
        docId = db.collection(FIRESTORE_COLLECTION).doc().id;
      }
      
      if (!DRY_RUN) {
        const docRef = db.collection(FIRESTORE_COLLECTION).doc(docId);
        batch.set(docRef, contact, { merge: true });
        batchCount++;
        
        // Ejecutar batch si alcanzamos el límite
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          log(`✅ Batch de ${batchCount} contactos subido`, 'green');
          batchCount = 0;
        }
      } else {
        // En modo dry run, solo mostrar los primeros 5
        if (successCount < 5) {
          log(`\n📝 Contacto ${i + 1}:`, 'cyan');
          console.log(JSON.stringify(contact, null, 2));
        }
      }
      
      successCount++;
      
      // Mostrar progreso cada 50 contactos
      if (successCount % 50 === 0) {
        log(`📊 Progreso: ${successCount}/${contacts.length} contactos procesados`, 'blue');
      }
      
    } catch (error) {
      errorCount++;
      const errorMsg = `Error en contacto ${i + 1}: ${error.message}`;
      errors.push(errorMsg);
      log(`❌ ${errorMsg}`, 'red');
    }
  }
  
  // Ejecutar el último batch si queda algo
  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    log(`✅ Último batch de ${batchCount} contactos subido`, 'green');
  }
  
  return { successCount, errorCount, skippedCount, errors };
}

// Función principal
async function main() {
  log('\n==========================================================', 'cyan');
  log('   MIGRACIÓN DE CONTACTOS COVVE → FIRESTORE', 'cyan');
  log('==========================================================\n', 'cyan');
  
  // Inicializar Firebase
  const db = initializeFirebase();
  
  // Leer archivo Excel
  const rawContacts = readExcelFile(EXCEL_FILE_PATH);
  
  // Mostrar muestra de campos disponibles
  if (rawContacts.length > 0) {
    log('\n📋 Campos disponibles en el Excel:', 'cyan');
    console.log(Object.keys(rawContacts[0]));
  }
  
  // Subir contactos
  const result = await uploadContactsToFirestore(db, rawContacts);
  
  // Resumen final
  log('\n==========================================================', 'cyan');
  log('   RESUMEN DE MIGRACIÓN', 'cyan');
  log('==========================================================', 'cyan');
  log(`✅ Contactos procesados exitosamente: ${result.successCount}`, 'green');
  log(`⚠️  Contactos omitidos: ${result.skippedCount}`, 'yellow');
  log(`❌ Errores: ${result.errorCount}`, result.errorCount > 0 ? 'red' : 'green');
  log(`📊 Total de filas en archivo: ${rawContacts.length}`, 'blue');
  log(`📚 Colección de Firestore: ${FIRESTORE_COLLECTION}`, 'blue');
  
  if (result.errors.length > 0) {
    log('\n❌ Detalles de errores:', 'red');
    result.errors.forEach(error => log(`  - ${error}`, 'red'));
  }
  
  if (DRY_RUN) {
    log('\n⚠️  MODO DRY RUN - No se subieron datos reales', 'yellow');
    log('Para subir los datos realmente, ejecuta sin DRY_RUN=true', 'yellow');
  } else {
    log('\n✅ ¡Migración completada!', 'green');
  }
  
  log('\n==========================================================\n', 'cyan');
}

// Ejecutar script
main().catch(error => {
  log(`\n❌ ERROR FATAL: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

