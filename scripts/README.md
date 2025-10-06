# 📦 Scripts de Migración e Importación

Esta carpeta contiene scripts para importar datos a tu app CRM desde diferentes fuentes.

---

## 📄 Scripts Disponibles

### 🆕 `import_covve_full.js` (RECOMENDADO)

**Importación completa de Covve** - Importa las 4 hojas del Excel:
- ✅ Relationships → Contactos
- ✅ Notes → Notas de contactos
- ✅ Reminders → Recordatorios  
- ✅ Interactions → Historial de interacciones

**Uso:**
```bash
# Prueba primero (no sube datos)
DRY_RUN=true node scripts/import_covve_full.js

# Importación real
node scripts/import_covve_full.js

# Con ruta personalizada
EXCEL_FILE_PATH="/ruta/al/archivo.xlsx" node scripts/import_covve_full.js
```

📚 **Documentación completa:** [`README_IMPORTACION_COVVE_COMPLETA.md`](./README_IMPORTACION_COVVE_COMPLETA.md)

---

### `migrateCovveContacts.js` (BÁSICO)

**Versión simple** - Solo importa contactos (hoja Relationships).

**Uso:**
```bash
node scripts/migrateCovveContacts.js
```

📚 **Documentación:** [`README_MIGRACION_CRM.md`](./README_MIGRACION_CRM.md)

---

## 🎯 ¿Cuál usar?

| Script | Cuándo usarlo |
|--------|---------------|
| **`import_covve_full.js`** | ✅ Si tienes el Excel completo de Covve con las 4 hojas |
| `migrateCovveContacts.js` | Solo si tienes únicamente contactos (sin notas/recordatorios) |

**Recomendación:** Usa `import_covve_full.js` siempre que sea posible para aprovechar toda la información.

---

## 🔧 Requisitos Previos

Antes de ejecutar cualquier script:

1. **Service Account Key de Firebase**
   - Descárgalo desde Firebase Console
   - Guárdalo como `serviceAccountKey.json` en la raíz del proyecto
   - Ver: [Guía completa](./README_IMPORTACION_COVVE_COMPLETA.md#paso-1-obtener-service-account-key)

2. **Archivo Excel de Covve**
   - Exporta desde Covve en formato Excel
   - Por defecto debe estar en: `/mnt/data/covve_export.xlsx`
   - O especifica otra ruta con `EXCEL_FILE_PATH`

3. **Dependencias instaladas**
   ```bash
   npm install
   ```

---

## 📊 Estructura de Datos Resultante

Después de ejecutar `import_covve_full.js`:

```
Firestore Database
└── crm_contacts/
     ├── juan.perez@example.com/
     │    ├── (datos del contacto)
     │    ├── notes/
     │    │    ├── note1
     │    │    └── note2
     │    ├── reminders/
     │    │    └── reminder1
     │    └── interactions/
     │         ├── interaction1
     │         └── interaction2
     │
     └── maria.garcia@tech.com/
          └── ...
```

---

## 🚀 Inicio Rápido

### Opción 1: Importación Completa (Recomendado)

```bash
# 1. Asegúrate de tener el Service Account Key
ls serviceAccountKey.json

# 2. Verifica que tienes el Excel
ls /mnt/data/covve_export.xlsx

# 3. Prueba primero en modo dry run
DRY_RUN=true node scripts/import_covve_full.js

# 4. Si todo se ve bien, ejecuta la importación real
node scripts/import_covve_full.js
```

### Opción 2: Solo Contactos

```bash
node scripts/migrateCovveContacts.js
```

---

## 📚 Documentación Adicional

- 📖 [Guía Completa de Importación](./README_IMPORTACION_COVVE_COMPLETA.md) - Todo sobre `import_covve_full.js`
- 📖 [Guía Básica de Migración](./README_MIGRACION_CRM.md) - Para `migrateCovveContacts.js`
- 📖 [Estructura del Excel de Covve](./EJEMPLO_COVVE_EXCEL.md) - Formatos y campos esperados

---

## ⚠️ Notas Importantes

### Seguridad

- ✅ `serviceAccountKey.json` está en `.gitignore` (no se subirá a Git)
- ✅ Archivos `.xlsx` también están excluidos
- ⚠️ **NUNCA** compartas tu Service Account Key

### Duplicados

- **Con email**: Los contactos con email se actualizan (no se duplican)
- **Sin email**: Se crearán nuevos documentos cada vez
- **Notas/Recordatorios/Interacciones**: Se duplicarán si ejecutas el script varias veces

**Recomendación**: Ejecuta el script solo una vez, o limpia la colección antes de re-ejecutar.

### Rendimiento

- ✅ El script usa batches para eficiencia
- ✅ Puede manejar miles de contactos
- ✅ Muestra progreso en tiempo real
- ✅ No se detiene si un item falla (continúa con los demás)

---

## 🛠️ Troubleshooting Común

### "No se encontró serviceAccountKey.json"

```bash
# Verifica que está en la raíz del proyecto
ls ../serviceAccountKey.json

# Si no existe, descárgalo desde Firebase Console
```

### "No se encontró el archivo Excel"

```bash
# Usa una ruta personalizada
EXCEL_FILE_PATH="/Users/tu-usuario/Downloads/covve_export.xlsx" node scripts/import_covve_full.js
```

### "Permission denied" en Firestore

- Verifica las reglas de seguridad de Firestore
- Asegúrate de que el Service Account Key tenga permisos

---

## 📞 Ayuda

Si tienes problemas:

1. Lee la documentación completa de cada script
2. Ejecuta en modo `DRY_RUN=true` para ver logs detallados
3. Verifica los mensajes de error en la consola
4. Revisa Firebase Console para confirmar permisos

---

## 🎉 Resultado Final

Después de la importación exitosa, tu app CRM tendrá:

- ✅ Todos tus contactos de Covve
- ✅ Notas organizadas por contacto
- ✅ Recordatorios con fechas y estados
- ✅ Historial completo de interacciones
- ✅ Estadísticas automáticas por contacto
- ✅ Búsqueda y filtros en la app
- ✅ Vista detallada con tabs (Info, Notas, Recordatorios, Interacciones)

**¡Tu CRM está listo para usar! 🚀**

