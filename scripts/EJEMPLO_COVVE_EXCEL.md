# 📊 Estructura Esperada del Excel de Covve

Este documento describe la estructura que el script espera del archivo Excel exportado desde Covve.

---

## 📋 Estructura Básica

El archivo Excel debe tener **una hoja** (el script lee la primera hoja automáticamente) con **columnas** que contengan los datos de los contactos.

### Ejemplo de estructura:

| First Name | Last Name | Full Name | Email | Phone | Company | Title | Notes | Date Added | Last Contact |
|------------|-----------|-----------|-------|-------|---------|-------|-------|------------|--------------|
| Juan | Pérez | Juan Pérez | juan.perez@example.com | +34 600 123 456 | Empresa S.L. | Director de Marketing | Conocido en evento networking 2024 | 2024-01-15 | 2024-09-15 |
| María | García | María García López | maria.garcia@tech.com | +34 611 234 567 | Tech Innovations | CTO | Contacto referido por Luis | 2023-11-20 | 2024-08-10 |
| Carlos | | Carlos Rodríguez | carlos.r@startup.io | +34 622 345 678 | Startup Inc | CEO | Inversor potencial | 2024-02-01 | 2024-09-20 |

---

## 🔤 Nombres de Columnas Soportados

El script es **flexible** y busca múltiples variaciones de nombres de columnas. Aquí están todas las variaciones soportadas:

### 👤 Nombre

**Variaciones soportadas:**
- `First Name`, `first_name`, `firstName`
- `Last Name`, `last_name`, `lastName`
- `Full Name`, `Name`, `name`

**Nota:** Si existe "Full Name", se usa directamente. Si no, se construye combinando "First Name" + "Last Name".

### 📧 Email

**Variaciones soportadas:**
- `Email`, `email`
- `Email Address`, `email_address`
- `Primary Email`

**Nota:** El email se usa como **ID único** del documento en Firestore.

### 📱 Teléfono

**Variaciones soportadas:**
- `Phone`, `phone`
- `Mobile`, `mobile`
- `Phone Number`
- `Primary Phone`

### 🏢 Empresa

**Variaciones soportadas:**
- `Company`, `company`
- `Organization`, `organization`

### 💼 Cargo/Posición

**Variaciones soportadas:**
- `Title`, `title`
- `Job Title`
- `Position`, `position`

### 📝 Notas

**Variaciones soportadas:**
- `Notes`, `notes`
- `Description`, `description`

### 📅 Fecha Añadida

**Variaciones soportadas:**
- `Date Added`, `date_added`
- `Created`, `created`

**Formatos soportados:**
- Fecha de Excel (número)
- Texto: `2024-01-15`, `15/01/2024`, etc.

### 📅 Último Contacto

**Variaciones soportadas:**
- `Last Contact`, `last_contact`
- `Last Contacted`
- `Last Modified`

**Formatos soportados:**
- Fecha de Excel (número)
- Texto: `2024-01-15`, `15/01/2024`, etc.

---

## ✅ Validaciones

El script aplica estas validaciones automáticamente:

1. **Contacto válido**: Debe tener al menos **nombre** o **email**
2. **Email único**: Si dos contactos tienen el mismo email, el segundo sobrescribe el primero
3. **Campos vacíos**: Se convierten a `null` (no se guarda texto vacío)
4. **Email normalizado**: Se convierte a minúsculas
5. **Texto limpio**: Se eliminan espacios al inicio y final

---

## 🎯 Campos Adicionales Generados

El script añade automáticamente estos campos:

```javascript
{
  // Campos del Excel (mapeados)
  name: "Juan Pérez",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan.perez@example.com",
  phone: "+34 600 123 456",
  company: "Empresa S.L.",
  position: "Director de Marketing",
  notes: "Conocido en evento networking 2024",
  dateAdded: 1705276800000, // timestamp
  lastContact: 1726358400000, // timestamp
  
  // Metadata automática
  source: "covve_import",
  importDate: 1696608000000, // timestamp del momento de importación
  status: "active", // active, archived, deleted
  tags: [],
  customFields: {},
  
  // CRM por defecto
  leadStatus: "cold", // cold, warm, hot, converted
  priority: "low", // low, medium, high
  nextFollowUp: null,
  dealValue: null,
  
  // Timestamps
  createdAt: 1705276800000,
  updatedAt: 1696608000000
}
```

---

## 📤 Exportar desde Covve

### Pasos para exportar:

1. Abre la app de **Covve** (web o móvil)
2. Ve a **Configuración** o **Settings**
3. Busca la opción **Export** o **Exportar contactos**
4. Selecciona formato **Excel** o **CSV**
5. Descarga el archivo
6. Si es CSV, ábrelo en Excel y guárdalo como `.xlsx`

---

## 🔍 Verificar tu Archivo Antes de Importar

Antes de ejecutar el script, verifica:

### ✅ Checklist:

- [ ] El archivo está en formato `.xlsx`
- [ ] Tiene al menos una hoja con datos
- [ ] La primera fila contiene los **nombres de las columnas**
- [ ] Hay al menos una columna de **nombre** o **email**
- [ ] Las fechas están en un formato reconocible
- [ ] No hay filas completamente vacías

### 🧪 Prueba con Dry Run

Siempre ejecuta primero en modo dry run:

```bash
DRY_RUN=true node scripts/migrateCovveContacts.js
```

Esto te mostrará:
1. Los nombres de las columnas encontradas
2. Los primeros 5 contactos mapeados
3. Si hay errores de lectura

---

## 🛠️ Si tu Archivo tiene Columnas Diferentes

Si tu archivo de Covve tiene columnas con nombres diferentes a los soportados, puedes:

### Opción 1: Renombrar en Excel (recomendado)
Simplemente renombra las columnas en Excel a uno de los nombres soportados.

### Opción 2: Modificar el Script
Edita el archivo `scripts/migrateCovveContacts.js` en la función `mapContactFields` y añade tus variaciones:

```javascript
const email = normalizeEmail(
  row['Email'] || 
  row['email'] || 
  row['Email Address'] ||
  row['TU_COLUMNA_PERSONALIZADA'] || // Añade aquí
  row['Primary Email']
);
```

---

## 📊 Ejemplo Completo con Datos Reales

```
| Full Name | Email | Phone | Company | Title | Notes |
|-----------|-------|-------|---------|-------|-------|
| Ana López | ana@startup.io | +34600111222 | Startup X | CEO | Inversora angel |
| Pedro Gómez | pedro.g@corp.com | +34611222333 | Corp Ltd | CTO | Ex-compañero |
| Laura Martín | laura.m@agency.es | +34622333444 | Agency | Designer | Freelance |
```

Este formato es **100% compatible** y se importará correctamente.

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si un contacto no tiene email?
Se genera un ID aleatorio para ese contacto en Firestore.

### ¿Puedo importar el mismo archivo varias veces?
Sí. Los contactos con email se actualizarán (no se duplicarán).

### ¿El script modifica mi archivo Excel?
No, el archivo original permanece intacto. Solo se lee.

### ¿Cuántos contactos puedo importar?
No hay límite. El script usa batches de 500 para eficiencia.

### ¿Se pueden importar fotos de perfil?
No en esta versión. Solo datos de texto.

---

¡Listo! Con esta guía deberías poder importar tus contactos sin problemas. 🚀

