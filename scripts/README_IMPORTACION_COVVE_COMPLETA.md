# 📚 Guía Completa de Importación de Covve a Firestore

Esta guía te ayudará a migrar **TODO** tu ecosistema CRM desde Covve a Firestore, incluyendo contactos, notas, recordatorios e interacciones.

---

## 🎯 ¿Qué se Importa?

El script `import_covve_full.js` importa las **4 hojas** del Excel de Covve:

| Hoja | Descripción | Firestore |
|------|-------------|-----------|
| **Relationships** | Contactos principales | `crm_contacts` (colección) |
| **Notes** | Notas de contactos | `crm_contacts/{id}/notes` (subcolección) |
| **Reminders** | Recordatorios | `crm_contacts/{id}/reminders` (subcolección) |
| **Interactions** | Historial (llamadas, reuniones) | `crm_contacts/{id}/interactions` (subcolección) |

---

## 📊 Estructura en Firestore

```
crm_contacts/ (colección)
 │
 ├── contactoID_1/ (documento)
 │    ├── name: "Juan Pérez"
 │    ├── email: "juan@example.com"
 │    ├── company: "Empresa S.L."
 │    ├── leadStatus: "hot"
 │    ├── stats: { totalNotes: 5, totalReminders: 2, totalInteractions: 12 }
 │    │
 │    ├── notes/ (subcolección)
 │    │    ├── noteID_1 → { content, date, title }
 │    │    └── noteID_2 → { content, date, title }
 │    │
 │    ├── reminders/ (subcolección)
 │    │    └── reminderID_1 → { title, dueDate, status, completed }
 │    │
 │    └── interactions/ (subcolección)
 │         ├── interactionID_1 → { type: "meeting", date, description }
 │         └── interactionID_2 → { type: "call", date, description }
 │
 └── contactoID_2/ (documento)
      └── ...
```

---

## 🔧 Configuración Inicial

### Paso 1: Obtener Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. **⚙️ Project Settings** > **Service Accounts**
4. Click **"Generate new private key"**
5. Guarda como `serviceAccountKey.json` en la raíz del proyecto:
   ```
   asiergonzalez-admin-app/
   ├── serviceAccountKey.json  ← Aquí
   ├── scripts/
   │   └── import_covve_full.js
   └── ...
   ```

⚠️ **IMPORTANTE**: Este archivo ya está en `.gitignore`. **NUNCA** lo subas a Git.

### Paso 2: Exportar desde Covve

1. Abre **Covve** (web o app)
2. Ve a **Settings** > **Export**
3. Selecciona formato **Excel (.xlsx)**
4. Descarga el archivo
5. Verifica que tenga **4 hojas**: Relationships, Notes, Reminders, Interactions

### Paso 3: Preparar el Archivo

Coloca el archivo Excel en:
```
/mnt/data/covve_export.xlsx
```

O en cualquier ubicación (luego especificarás la ruta).

---

## 🚀 Ejecutar la Importación

### Paso 1: Prueba con Dry Run

**Siempre** ejecuta primero en modo prueba para verificar que todo está correcto:

```bash
cd /Users/asiergonzalezgomez/Development/asiergonzalez-admin-app
DRY_RUN=true node scripts/import_covve_full.js
```

Esto te mostrará:
- ✅ Cuántas hojas se encontraron
- ✅ Cuántas filas hay en cada hoja
- ✅ Los nombres de las columnas disponibles
- ✅ Si hay errores de lectura

### Paso 2: Importación Real

Si todo se ve bien, ejecuta la importación real:

```bash
node scripts/import_covve_full.js
```

### Paso 3: Ruta Personalizada (Opcional)

Si tu archivo está en otra ubicación:

```bash
EXCEL_FILE_PATH="/Users/tu-usuario/Downloads/covve_export.xlsx" node scripts/import_covve_full.js
```

---

## 📋 Mapeo de Campos

### 1️⃣ Relationships → Contactos

| Campo Covve | Campo Firestore | Tipo |
|-------------|-----------------|------|
| FirstName, LastName | name, firstName, lastName | string |
| Email1, Email2 | email, emails[] | string, array |
| Phone1, Phone2 | phone, phones[] | string, array |
| CompanyName | company | string |
| JobTitle | position | string |
| Tags | tags[] | array |
| GeneralNote | generalNote | string |
| LastContactedDate | lastContact | timestamp |
| CreatedDate | createdAt | timestamp |
| ContactId | covveId | string (para relacionar) |
| Address, City, Country | address, city, country | string |
| Website, LinkedIn, Twitter | website, linkedin, twitter | string |

**Campos generados automáticamente:**
```javascript
{
  source: "covve_import",
  importDate: 1696608000000,
  status: "active",
  leadStatus: "cold",
  priority: "low",
  nextFollowUp: null,
  dealValue: null,
  stats: {
    totalNotes: 0,
    totalReminders: 0,
    totalInteractions: 0
  },
  updatedAt: Date.now()
}
```

### 2️⃣ Notes → Notas

| Campo Covve | Campo Firestore |
|-------------|-----------------|
| Content, Note | content |
| Title | title |
| Date, CreatedDate | date |
| ContactEmail, ContactId | (para relacionar con contacto) |

### 3️⃣ Reminders → Recordatorios

| Campo Covve | Campo Firestore |
|-------------|-----------------|
| Title, Subject | title |
| DueDate, Date | dueDate |
| Status | status (pending/completed/cancelled) |
| Description, Notes | description |
| ContactEmail, ContactId | (para relacionar con contacto) |

**Campo calculado:**
- `completed`: `true` si `status === "completed"`

### 4️⃣ Interactions → Interacciones

| Campo Covve | Campo Firestore |
|-------------|-----------------|
| Type | type (meeting/call/email/other) |
| Date, InteractionDate | date |
| Description, Notes | description |
| Duration | duration |
| Location | location |
| Outcome | outcome |
| ContactEmail, ContactId | (para relacionar con contacto) |

---

## 🔗 Relación entre Hojas

El script relaciona automáticamente las notas, recordatorios e interacciones con sus contactos usando:

1. **Por Email**: Si la fila tiene `ContactEmail`, busca el contacto con ese email
2. **Por Covve ID**: Si la fila tiene `ContactId`, busca el contacto con ese `covveId`

Si no se encuentra el contacto, el item se marca como "huérfano" y se omite (pero se cuenta en el resumen).

---

## 📊 Salida del Script

Durante la ejecución verás:

```
======================================================================
   IMPORTACIÓN COMPLETA DE COVVE → FIRESTORE
======================================================================

✅ Firebase Admin inicializado correctamente
📖 Leyendo archivo: /mnt/data/covve_export.xlsx
📋 Hojas encontradas: Relationships, Notes, Reminders, Interactions
  ✓ Relationships: 245 filas
  ✓ Notes: 128 filas
  ✓ Reminders: 34 filas
  ✓ Interactions: 412 filas

📊 Resumen de datos encontrados:
  • Contactos: 245
  • Notas: 128
  • Recordatorios: 34
  • Interacciones: 412

📇 Importando contactos (Relationships)...
  📊 50/245 contactos procesados
  📊 100/245 contactos procesados
  ...

✅ Contactos: 245 importados, 0 omitidos, 0 errores

🔗 Índice creado: 243 emails, 245 IDs de Covve

📝 Importando notas (Notes)...
✅ Notas: 126 importadas, 2 sin contacto, 0 errores

⏰ Importando recordatorios (Reminders)...
✅ Recordatorios: 34 importados, 0 sin contacto, 0 errores

🤝 Importando interacciones (Interactions)...
✅ Interacciones: 410 importadas, 2 sin contacto, 0 errores

======================================================================
   RESUMEN FINAL
======================================================================
✅ Importación completada correctamente
📚 Colección principal: crm_contacts
📊 Total de contactos: 245

🎉 ¡Todos tus datos de Covve están ahora en Firestore!
======================================================================
```

---

## 🎯 Qué Hace el Script

### Proceso Completo

1. ✅ **Valida** el Service Account Key
2. ✅ **Lee** las 4 hojas del Excel
3. ✅ **Mapea** cada contacto al esquema de Firestore
4. ✅ **Importa** todos los contactos a `crm_contacts`
5. ✅ **Crea un índice** de contactos por email y Covve ID
6. ✅ **Relaciona** cada nota con su contacto y la guarda en subcolección
7. ✅ **Relaciona** cada recordatorio con su contacto
8. ✅ **Relaciona** cada interacción con su contacto
9. ✅ **Actualiza** contadores en cada contacto (`stats.totalNotes`, etc.)
10. ✅ **Actualiza** `lastContact` con la interacción más reciente
11. ✅ **Actualiza** `nextFollowUp` con el recordatorio pendiente más próximo

### Inteligencia del Script

- **Previene duplicados**: Usa el email como ID único
- **Maneja huérfanos**: Items sin contacto se reportan pero no bloquean la importación
- **Actualiza estadísticas**: Cada contacto sabe cuántas notas/recordatorios/interacciones tiene
- **Flexible con columnas**: Busca múltiples variaciones de nombres de columnas
- **Robusto**: Si un item falla, continúa con los demás

---

## 🎨 Usar los Datos en la App

Una vez importados, la pantalla CRM mostrará:

### Vista de Lista
- ✅ Todos los contactos con badges de estado (cold/warm/hot/converted)
- ✅ Mini-contadores de notas, recordatorios e interacciones
- ✅ Búsqueda por nombre, email, empresa, posición
- ✅ Filtros por estado de lead

### Vista de Detalle (Modal)
- ✅ **Tab Info**: Información completa del contacto
- ✅ **Tab Notas**: Todas las notas del contacto
- ✅ **Tab Recordatorios**: Recordatorios con estado (completado/pendiente)
- ✅ **Tab Interacciones**: Historial de reuniones, llamadas, emails

### Estadísticas
- 📊 Total de contactos
- 📊 Leads calientes, tibios, fríos, convertidos
- 📊 Total de notas en todos los contactos
- 📊 Total de interacciones registradas

---

## 🔍 Verificar en Firebase Console

Para confirmar que todo se importó:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database**
4. Busca la colección `crm_contacts`
5. Abre un documento
6. Deberías ver las subcolecciones: `notes`, `reminders`, `interactions`

---

## ⚠️ Notas Importantes

### IDs de Documentos

- **Contactos con email**: ID = email sanitizado (ej: `juan.perez@example.com`)
- **Contactos sin email**: ID = aleatorio generado por Firestore

### Ejecutar Múltiples Veces

- ✅ **Contactos con email**: Se actualizarán (no se duplicarán)
- ⚠️ **Contactos sin email**: Se duplicarán
- ⚠️ **Notas/Reminders/Interactions**: Se duplicarán si ejecutas varias veces

**Recomendación**: Solo ejecuta el script una vez, o borra la colección antes de re-ejecutar.

### Campos Vacíos

Los campos vacíos se guardan como `null` (no como strings vacíos).

---

## 🛠️ Troubleshooting

### Error: "No se encontró serviceAccountKey.json"

**Solución**: Descarga el Service Account Key desde Firebase Console (ver Paso 1).

### Error: "No se encontró el archivo Excel"

**Solución**: Verifica la ruta o usa `EXCEL_FILE_PATH` para especificar otra ubicación.

### Muchos items "sin contacto" (huérfanos)

**Posibles causas**:
1. Las hojas Notes/Reminders/Interactions no tienen columnas de email o ID
2. Los emails no coinciden exactamente (mayúsculas/minúsculas)

**Solución**: Abre el Excel y verifica que las hojas tengan columnas como `ContactEmail` o `ContactId`.

### Las columnas no se mapean correctamente

**Solución**: Ejecuta en modo dry run y revisa los nombres de las columnas que muestra el script. Luego edita el script en las funciones `mapContact`, `mapNote`, etc. para añadir tus variaciones.

### Error de permisos en Firestore

**Solución**: 
1. Verifica que el Service Account Key tenga permisos de escritura
2. Revisa las reglas de seguridad de Firestore
3. Para desarrollo, puedes usar reglas permisivas temporalmente:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📈 Próximos Pasos

Una vez importados tus datos:

1. ✅ **Explora** la pantalla CRM en tu app
2. ✅ **Verifica** que los datos se vean correctamente
3. ✅ **Clasifica** tus leads (cold → warm → hot → converted)
4. ✅ **Añade** nuevas notas y recordatorios
5. ✅ **Registra** nuevas interacciones
6. ✅ **Implementa** búsqueda avanzada y filtros
7. ✅ **Añade** funcionalidad de exportación
8. ✅ **Integra** con calendario para recordatorios
9. ✅ **Crea** dashboard con métricas de pipeline

---

## 🎓 Ejemplos de Uso

### Buscar contactos de una empresa específica

```javascript
const q = query(
  collection(db, 'crm_contacts'),
  where('company', '==', 'Startup Inc'),
  where('status', '==', 'active')
);
```

### Obtener todos los leads calientes

```javascript
const q = query(
  collection(db, 'crm_contacts'),
  where('leadStatus', '==', 'hot'),
  where('status', '==', 'active')
);
```

### Añadir una nota a un contacto

```javascript
const noteRef = collection(db, 'crm_contacts', contactId, 'notes');
await addDoc(noteRef, {
  content: "Reunión muy productiva",
  title: "Reunión Q1 2025",
  date: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// Actualizar contador
await updateDoc(doc(db, 'crm_contacts', contactId), {
  'stats.totalNotes': increment(1),
  updatedAt: Date.now()
});
```

### Registrar una interacción

```javascript
const interactionRef = collection(db, 'crm_contacts', contactId, 'interactions');
await addDoc(interactionRef, {
  type: 'meeting',
  date: Date.now(),
  description: 'Presentación de producto',
  duration: '45 minutos',
  location: 'Oficina cliente',
  outcome: 'Interesado en demo',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// Actualizar último contacto
await updateDoc(doc(db, 'crm_contacts', contactId), {
  'stats.totalInteractions': increment(1),
  lastContact: Date.now(),
  updatedAt: Date.now()
});
```

---

## 🔐 Seguridad

### Archivos a NO subir a Git

Ya están en `.gitignore`:
- ✅ `serviceAccountKey.json`
- ✅ `*.xlsx`, `*.xls`
- ✅ `covve_export.*`
- ✅ `/mnt/data/`

### Reglas de Firestore Recomendadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados
    match /crm_contacts/{contactId} {
      allow read, write: if request.auth != null;
      
      // Subcolecciones heredan la misma regla
      match /notes/{noteId} {
        allow read, write: if request.auth != null;
      }
      match /reminders/{reminderId} {
        allow read, write: if request.auth != null;
      }
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 📞 Soporte

Si encuentras problemas:

1. ✅ Ejecuta en modo `DRY_RUN=true` para ver logs detallados
2. ✅ Verifica la consola de Firebase para errores de permisos
3. ✅ Revisa que las columnas del Excel coincidan con las esperadas
4. ✅ Asegúrate de que el Service Account Key sea válido

---

## 🎉 ¡Listo!

Ahora tienes un **CRM completo** con:
- ✅ 245 contactos (o los que tengas)
- ✅ Todas tus notas organizadas por contacto
- ✅ Recordatorios con fechas y estados
- ✅ Historial completo de interacciones
- ✅ Estadísticas y métricas en tiempo real
- ✅ Búsqueda y filtros avanzados
- ✅ Vista detallada con tabs

**¡Tu CRM de Covve ahora vive en tu app! 🚀**

