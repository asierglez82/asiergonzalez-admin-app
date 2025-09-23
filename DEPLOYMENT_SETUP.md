# 🚀 Admin App - Configuración de Despliegue Automático

Esta guía configura el despliegue automático de la aplicación admin (React Native/Expo) a Firebase Hosting en `app.asiergonzalez.es`.

## 📋 Archivos Creados

✅ Los siguientes archivos ya han sido creados:

- `firebase.json` - Configuración de Firebase Hosting para Expo
- `.firebaserc` - Vinculación al proyecto Firebase  
- `.github/workflows/firebase-hosting-admin.yml` - Workflow para deployment
- `.gitignore` - Configuración para Git

## 🔧 Configurar Secrets en GitHub

### Paso 1: Crear el Repositorio

1. **Ve a GitHub.com**
2. **New Repository** 
3. **Nombre**: `asiergonzalez-admin-app`
4. **Descripción**: "Centro de mando para gestión de contenido digital"
5. **Private** (recomendado para app admin)
6. **Create repository**

### Paso 2: Variables de Entorno Expo

En **Settings → Secrets and variables → Actions**, añade:

```
EXPO_PUBLIC_FIREBASE_API_KEY = (el mismo que REACT_APP_FIREBASE_API_KEY)
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = asiergonzalez-web-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID = asiergonzalez-web-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = asiergonzalez-web-app.appspot.com  
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 370660290
EXPO_PUBLIC_FIREBASE_APP_ID = 1:370660290:web:fa0c7f008dd970e7b5e25b
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = (el mismo que tenías)
```

### Paso 3: Secrets de Deployment

Usa los **mismos secrets** del repositorio web principal:
```
FIREBASE_SERVICE_ACCOUNT_ASIERGONZALEZ_WEB_APP = (el mismo JSON completo)
GITHUB_TOKEN = (automático)
```

## 🌐 Configurar Subdominio app.asiergonzalez.es

### Paso 1: Crear Nueva Web App en Firebase

1. **Firebase Console** → Tu proyecto
2. **Configuración del proyecto** → **General**
3. **Tus aplicaciones** → **Agregar aplicación** → **Web**
4. **Nombre**: `asiergonzalez-admin`
5. **NO marques** "Configurar Firebase Hosting"
6. **Registrar aplicación**

### Paso 2: Configurar Hosting para Admin

1. **Firebase Console** → **Hosting**
2. **Pestaña "Dominios"**
3. **Agregar dominio personalizado**
4. **Dominio**: `app.asiergonzalez.es`

Firebase te dará los registros DNS necesarios.

### Paso 3: Configurar DNS

En tu proveedor de dominios, añade:

```
Tipo: CNAME
Nombre: app
Valor: asiergonzalez-web-app.web.app  
TTL: 3600
```

O los registros A que Firebase te proporcione.

## 🔄 Proceso de Deployment

### Automático:
- **Push a `main`** → Despliega admin app a `app.asiergonzalez.es`
- **Pull Request** → Crea preview temporal

### Build Process:
1. **Setup Node.js 20**
2. **Install Expo CLI**
3. **Install dependencies** (`npm ci`)
4. **Export for web** (`expo export --platform web`)
5. **Deploy to Firebase** Hosting

## 🎯 URLs Finales

- **Sitio Web Principal**: `https://asiergonzalez.es`
- **Centro de Mando Admin**: `https://app.asiergonzalez.es`

## 🧪 Probar el Setup

1. **Build local**:
```bash
npx expo export --platform web --output-dir dist
npx serve dist
```

2. **Verificar que funciona en**: `http://localhost:3000`

## ⚡ Características del Admin App

- **React Native/Expo** para web y móvil
- **Firebase Authentication** con `hola@asiergonzalez.es`
- **Dashboard** con métricas en tiempo real
- **Conexión** a las mismas colecciones que el sitio web
- **Editor de contenido** (próximo)
- **CRM integrado** (próximo)

## 🔐 Seguridad

- **Repositorio privado** para proteger lógica admin
- **Autenticación requerida** para acceso
- **Solo admins autorizados** pueden usar la aplicación
- **Mismo backend seguro** que el sitio principal

## 🚨 Troubleshooting

### Error: "Expo command not found"
- GitHub Actions instala Expo CLI automáticamente
- Para local: `npm install -g @expo/cli`

### Error: "Environment variables not loaded"
- Verifica que todos los secrets EXPO_PUBLIC_* estén configurados
- Asegúrate de usar los mismos valores que el sitio web

### Error: "Build fails"
- Verifica que el código funciona localmente primero
- Revisa los logs en GitHub Actions

---

**💡 Tip**: La admin app usa el **mismo backend Firebase** que el sitio web, por lo que todos los datos están sincronizados automáticamente.
