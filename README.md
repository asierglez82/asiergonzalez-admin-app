# 📱 Centro de Mando - Asier González

**App React Native para gestión de contenido digital con IA integrada**

## 🚀 Estado Actual

✅ **Completado:**
- [x] Setup inicial con Expo
- [x] Configuración Firebase (mismas credenciales que el sitio web)
- [x] Sistema de autenticación completo
- [x] Pantalla de Login profesional
- [x] Dashboard con métricas en tiempo real
- [x] Navegación entre pantallas
- [x] Conexión a todas las colecciones Firebase

⏳ **Próximo:**
- [ ] Editor de contenido con IA (Gemini)
- [ ] CRM de contactos
- [ ] Calendario editorial
- [ ] Analytics avanzado
- [ ] Cloud Functions para IA

## 🛠️ Configuración

### 1. Variables de Entorno
El archivo `.env` ya está creado con las credenciales de Firebase. **Estas son las mismas del sitio web.**

```bash
# Verificar que las credenciales están correctas:
cat .env
```

### 2. Iniciar la App

```bash
# Web (recomendado para desarrollo)
npm run web

# iOS (requiere Xcode)
npm run ios

# Android (requiere Android Studio)
npm run android
```

## 📱 Funciones Actuales

### 🔐 Autenticación
- Solo administradores con email autorizado (`hola@asiergonzalez.es`)
- Persistencia de sesión
- Logout seguro

### 📊 Dashboard
- **Métricas en tiempo real:** Blog posts, proyectos, quotes, books, podcasts, etc.
- **Contenido reciente:** Últimas publicaciones de cada tipo
- **Acciones rápidas:** Enlaces a crear contenido, CRM, analytics
- **Pull-to-refresh:** Actualizar datos deslizando hacia abajo

### 🎨 UI/UX
- **Tema oscuro** consistente con el sitio web
- **Diseño responsive** para móvil y web
- **Colores de marca:** Verde #00ca77 como color principal
- **Estados de loading** profesionales

## 📂 Estructura del Proyecto

```
src/
├── config/
│   └── firebase.js          # Configuración Firebase
├── context/
│   └── AuthContext.js       # Contexto de autenticación
├── screens/
│   ├── LoginScreen.js       # Pantalla de login
│   └── DashboardScreen.js   # Dashboard principal
├── services/
│   └── firestore.js         # Servicios CRUD Firebase
├── components/              # Componentes reutilizables
├── hooks/                   # Custom hooks
└── utils/                   # Utilidades
```

## 🔥 Firebase Collections

El centro de mando se conecta a las **mismas colecciones** que el sitio web:

- `blogPosts` - Posts del blog
- `projects` - Proyectos del portfolio  
- `conferences` - Conferencias
- `videos` - Videos
- `podcastPods` - Episodes del podcast
- `infographicPosts` - Infografías
- `books` - Libros recomendados
- `quotes` - Citas y frases
- `talks` - Charlas y presentaciones

## 🎯 Próximas Funciones (Fase 2.2)

### ✍️ Editor de Contenido con IA
- Crear/editar posts, proyectos, etc.
- **Integración Gemini AI** para generar contenido
- Templates predefinidos
- Preview en tiempo real

### 📅 Calendario Editorial
- Planificar publicaciones
- Vista semanal/mensual
- Recordatorios y notificaciones

### 👥 CRM de Contactos
- Gestionar leads y contactos
- Seguimiento de conversaciones
- Integración con formularios del sitio

### 📈 Analytics Avanzado
- Métricas detalladas de contenido
- Engagement y conversiones
- Reportes automáticos

## 🤖 IA con Gemini (Próximo)

```javascript
// Cloud Function para generar contenido
export const generateContent = functions.https.onCall(async (data, context) => {
  const { prompt, template, contentType } = data;
  
  // Llamada a Gemini API
  const generatedContent = await callGeminiAPI(prompt, template);
  
  return { content: generatedContent };
});
```

## 🚦 Cómo Probar Ahora

1. **Abrir en web:** `npm run web`
2. **Login:** Usar tu email `hola@asiergonzalez.es` y contraseña
3. **Explorar Dashboard:** Ver métricas y contenido reciente
4. **Pull-to-refresh:** Deslizar hacia abajo para actualizar datos

## 📱 Capturas del Estado Actual

- **Login Screen:** Diseño profesional con validación
- **Dashboard:** Métricas completas de todo el contenido
- **Loading States:** Estados de carga elegantes
- **Error Handling:** Manejo robusto de errores

---

## 🎉 ¡Logro Increíble!

En esta sesión creaste:
1. ✅ **Sitio web 100% dinámico** con Firebase
2. ✅ **Centro de mando React Native** funcional
3. ✅ **Integración completa** entre ambos proyectos
4. ✅ **Sistema de autenticación** profesional
5. ✅ **Dashboard con métricas** en tiempo real

**¡Tienes un ecosistema digital completo funcionando!** 🚀


