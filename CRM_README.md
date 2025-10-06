# CRM - Sistema de Gestión de Contactos

## Descripción

Sistema completo de CRM (Customer Relationship Management) integrado en la aplicación administrativa de asiergonzalez. Permite gestionar contactos con sus respectivas notas, interacciones y recordatorios.

## Características Principales

### 1. Gestión de Contactos

- **Listado de contactos**: Vista en grid con información resumida
- **Búsqueda**: Búsqueda en tiempo real por nombre, email, empresa, teléfono o cargo
- **Crear contacto**: Formulario completo para agregar nuevos contactos
- **Editar contacto**: Modificación de información existente
- **Eliminar contacto**: Con confirmación y eliminación en cascada de subcolecciones

### 2. Información del Contacto

Cada contacto puede almacenar:

- **Información Básica**:
  - Nombre (obligatorio)
  - Email (obligatorio)
  - Teléfono
  - Estado (Lead, Prospect, Client, Inactive)

- **Información Profesional**:
  - Empresa
  - Cargo
  - Dirección
  - Sitio web

- **Redes Sociales**:
  - LinkedIn
  - Twitter

- **Notas generales**: Campo de texto libre para notas sobre el contacto

### 3. Subcolecciones

#### Notas
- Título y contenido
- Fecha de creación automática
- Editar y eliminar notas
- Ordenadas por fecha descendente

#### Interacciones
- Tipos: Call, Email, Meeting, Note
- Fecha de la interacción
- Descripción detallada
- Icono visual según el tipo
- Editar y eliminar interacciones
- Ordenadas por fecha descendente

#### Recordatorios
- Título (obligatorio)
- Fecha de vencimiento (obligatoria)
- Descripción opcional
- Estado completado/pendiente
- Toggle rápido para marcar como completado
- Editar y eliminar recordatorios
- Ordenados por fecha de vencimiento ascendente

## Estructura de Datos en Firestore

```
crm_contacts/
  {contactId}/
    - name: string
    - email: string
    - phone: string
    - company: string
    - position: string
    - status: string
    - notes: string
    - address: string
    - website: string
    - linkedin: string
    - twitter: string
    - createdAt: timestamp
    - updatedAt: timestamp
    
    notes/
      {noteId}/
        - title: string
        - content: string
        - createdAt: timestamp
        - updatedAt: timestamp
    
    interactions/
      {interactionId}/
        - type: string (call|email|meeting|note)
        - date: string (YYYY-MM-DD)
        - description: string
        - createdAt: timestamp
        - updatedAt: timestamp
    
    reminders/
      {reminderId}/
        - title: string
        - description: string
        - dueDate: string (YYYY-MM-DD)
        - completed: boolean
        - createdAt: timestamp
        - updatedAt: timestamp
```

## Navegación

1. **CRMScreen**: Pantalla principal con listado de contactos
   - Accesible desde el menú lateral (Sidebar)
   - Quick Action: botón en el sidebar

2. **EditContactScreen**: Pantalla de edición/creación
   - Modo crear: `navigation.navigate('EditContact', { mode: 'create' })`
   - Modo editar: `navigation.navigate('EditContact', { contactId: id, mode: 'edit' })`

## Servicios

### crmService.js

Métodos disponibles:

**Contactos principales:**
- `createContact(data)`
- `getAllContacts(orderByField, orderDirection, limitCount)`
- `getContactById(id)`
- `updateContact(id, data)`
- `deleteContact(id)`
- `searchContacts(field, operator, value, limitCount)`

**Notas:**
- `getNotes(contactId)`
- `createNote(contactId, noteData)`
- `updateNote(contactId, noteId, noteData)`
- `deleteNote(contactId, noteId)`

**Interacciones:**
- `getInteractions(contactId)`
- `createInteraction(contactId, interactionData)`
- `updateInteraction(contactId, interactionId, interactionData)`
- `deleteInteraction(contactId, interactionId)`

**Recordatorios:**
- `getReminders(contactId)`
- `createReminder(contactId, reminderData)`
- `updateReminder(contactId, reminderId, reminderData)`
- `deleteReminder(contactId, reminderId)`

## Características de UI/UX

- **Diseño responsive**: Se adapta a diferentes tamaños de pantalla
- **Tabs intuitivas**: Separación clara entre información y subcolecciones
- **Modales**: Para editar notas, interacciones y recordatorios
- **Estados vacíos**: Mensajes informativos cuando no hay datos
- **Confirmación de eliminación**: Modal de confirmación para eliminar contactos
- **Badges de estado**: Colores visuales según el estado del contacto
- **Iconos contextuales**: Representación visual de tipos de interacciones
- **Loading states**: Indicadores de carga durante operaciones
- **Avatar con iniciales**: Generación automática de avatares coloridos

## Colores de Estado

- **Lead**: Naranja (#FF9F0A)
- **Prospect**: Azul (#007AFF)
- **Client**: Verde (#34C759)
- **Inactive**: Gris (#8E8E93)

## Uso

1. Accede al CRM desde el menú lateral
2. Busca contactos existentes o crea uno nuevo
3. Haz clic en un contacto para ver/editar detalles
4. Usa las tabs para gestionar notas, interacciones y recordatorios
5. Guarda cambios con el botón "Guardar"

## Notas Técnicas

- Las fechas se almacenan como strings en formato ISO (YYYY-MM-DD)
- Los timestamps de creación/actualización usan `serverTimestamp()` de Firestore
- La eliminación de un contacto NO elimina automáticamente las subcolecciones (considera implementar Cloud Functions para limpieza)
- Las subcolecciones se cargan bajo demanda al cambiar de tab

