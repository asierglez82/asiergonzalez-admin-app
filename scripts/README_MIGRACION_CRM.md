# 📚 Guía de Migración de Contactos Covve a Firestore

Esta guía te ayudará a migrar tus contactos exportados desde Covve a la colección `crm_contacts` en Firestore.

---

## 📋 Requisitos Previos

1. **Node.js** instalado (versión 18 o superior)
2. **Archivo Excel** exportado desde Covve (`covve_export.xlsx`)
3. **Service Account Key** de Firebase
4. **Dependencias instaladas** (ya instaladas con npm install)

---

## 🔧 Configuración Inicial

### Paso 1: Obtener Service Account Key de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **⚙️ Project Settings** > **Service Accounts**
4. Click en **"Generate new private key"**
5. Descarga el archivo JSON
6. Guarda el archivo como `serviceAccountKey.json` en la raíz del proyecto:
   ```
   asiergonzalez-admin-app/
   ├── serviceAccountKey.json  ← Aquí
   ├── scripts/
   │   └── migrateCovveContacts.js
   └── ...
   ```

> ⚠️ **IMPORTANTE**: Nunca subas este archivo a Git. Ya está incluido en `.gitignore`.

### Paso 2: Preparar el Archivo Excel

1. Coloca tu archivo exportado de Covve en:
   ```
   /mnt/data/covve_export.xlsx
   ```
   
   O en cualquier ubicación y especifica la ruta al ejecutar el script (ver Paso 3).

---

## 🚀 Ejecutar la Migración

### Opción 1: Ejecución Básica

```bash
cd /Users/asiergonzalezgomez/Development/asiergonzalez-admin-app
node scripts/migrateCovveContacts.js
```

### Opción 2: Modo Dry Run (Prueba sin subir)

Primero, prueba el script sin subir datos reales:

```bash
DRY_RUN=true node scripts/migrateCovveContacts.js
```

Esto te mostrará:
- ✅ Si el archivo Excel se lee correctamente
- ✅ Cuántos contactos se encontraron
- ✅ Una muestra de los primeros 5 contactos mapeados
- ✅ Qué campos están disponibles en tu Excel

### Opción 3: Ruta Personalizada

Si tu archivo Excel está en otra ubicación:

```bash
EXCEL_FILE_PATH="/ruta/a/tu/archivo.xlsx" node scripts/migrateCovveContacts.js
```

### Opción 4: Colección Personalizada

Si quieres usar otra colección en Firestore:

```bash
FIRESTORE_COLLECTION="mis_contactos" node scripts/migrateCovveContacts.js
```

---

## 📊 Estructura de Datos

Cada contacto se guardará en Firestore con esta estructura:

```javascript
{
  // Información básica
  name: "Juan Pérez",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan.perez@example.com",
  phone: "+34 600 123 456",
  
  // Información profesional
  company: "Empresa S.L.",
  position: "Director de Marketing",
  
  // Notas y metadata
  notes: "Contacto de evento networking 2024",
  source: "covve_import",
  importDate: 1696608000000, // timestamp
  
  // Fechas
  dateAdded: 1690848000000, // timestamp
  lastContact: 1694438400000, // timestamp
  createdAt: 1690848000000,
  updatedAt: 1696608000000,
  
  // CRM
  status: "active",
  leadStatus: "cold", // cold, warm, hot, converted
  priority: "low", // low, medium, high
  nextFollowUp: null,
  dealValue: null,
  
  // Extras
  tags: [],
  customFields: {}
}
```

---

## 🔍 Campos Mapeados desde Covve

El script automáticamente mapea estos campos de Covve:

| Campo Covve | Campo Firestore | Notas |
|-------------|-----------------|-------|
| First Name, first_name | firstName | |
| Last Name, last_name | lastName | |
| Full Name, Name | name | Prioriza este campo |
| Email, email, Primary Email | email | Usado como ID único |
| Phone, Mobile, Primary Phone | phone | |
| Company, Organization | company | |
| Title, Job Title, Position | position | |
| Notes, Description | notes | |
| Date Added, Created | dateAdded | Convertido a timestamp |
| Last Contact, Last Modified | lastContact | Convertido a timestamp |

> 💡 El script es flexible y busca múltiples variaciones de nombres de columnas.

---

## 📝 Qué Hace el Script

1. ✅ **Valida** que exista el Service Account Key
2. ✅ **Lee** el archivo Excel
3. ✅ **Muestra** los campos disponibles en tu archivo
4. ✅ **Mapea** cada contacto al esquema de Firestore
5. ✅ **Valida** que cada contacto tenga al menos nombre o email
6. ✅ **Usa el email como ID** del documento (único)
7. ✅ **Sube en batches** de 500 para eficiencia
8. ✅ **Genera logs** detallados del progreso
9. ✅ **Maneja errores** sin detener la migración completa

---

## 🎯 Resultados Esperados

Al finalizar verás un resumen como este:

```
==========================================================
   RESUMEN DE MIGRACIÓN
==========================================================
✅ Contactos procesados exitosamente: 245
⚠️  Contactos omitidos: 3
❌ Errores: 0
📊 Total de filas en archivo: 248
📚 Colección de Firestore: crm_contacts

✅ ¡Migración completada!
==========================================================
```

---

## ⚠️ Notas Importantes

### Contactos Duplicados

- Si ejecutas el script múltiples veces, los contactos con **email** se actualizarán (no se duplicarán)
- Contactos sin email podrían duplicarse si ejecutas el script varias veces

### ID de Documentos

- Contactos **con email**: el ID será el email sanitizado (ej: `juan.perez@example.com`)
- Contactos **sin email**: se genera un ID aleatorio

### Campos Vacíos

- Los campos vacíos o con solo espacios se guardan como `null`
- Contactos sin nombre ni email se omiten automáticamente

---

## 🔧 Troubleshooting

### Error: "No se encontró el archivo serviceAccountKey.json"

**Solución**: Descarga el Service Account Key (ver Paso 1) y colócalo en la raíz del proyecto.

### Error: "No se encontró el archivo: /mnt/data/covve_export.xlsx"

**Solución**: 
1. Verifica que el archivo existe en esa ruta
2. O especifica otra ruta: `EXCEL_FILE_PATH="/tu/ruta" node scripts/migrateCovveContacts.js`

### Error: "Permission denied" o problemas de Firestore

**Solución**: 
1. Verifica que el Service Account Key tenga permisos de escritura
2. Revisa las reglas de seguridad de Firestore

### Los campos no se mapean correctamente

**Solución**: 
1. Ejecuta primero en modo dry run: `DRY_RUN=true node scripts/migrateCovveContacts.js`
2. Revisa los nombres de las columnas que muestra el script
3. Modifica el script si tus columnas tienen nombres diferentes

---

## 🎨 Próximos Pasos

Una vez migrados los contactos:

1. ✅ Verifica en Firebase Console que los datos se subieron correctamente
2. ✅ Actualiza `CRMScreen.js` para mostrar los contactos
3. ✅ Implementa funcionalidad CRUD en la app
4. ✅ Añade búsqueda y filtros
5. ✅ Implementa seguimiento de leads

---

## 📞 Soporte

Si tienes problemas con la migración, revisa:

1. Los logs del script (son muy detallados)
2. La consola de Firebase para ver si hay reglas de seguridad bloqueando
3. Que las dependencias estén instaladas: `npm install`

---

## 🔐 Seguridad

⚠️ **NUNCA** subas a Git:
- `serviceAccountKey.json`
- Archivos con datos personales de contactos

Estos archivos ya están en `.gitignore`.

---

¡Listo! 🎉 Tus contactos de Covve ahora estarán en Firestore y listos para usar en tu CRM.

