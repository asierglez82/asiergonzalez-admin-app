# 📋 Guía de Despliegue - Social Credentials Manager

Esta guía te ayudará a desplegar la Cloud Function para manejar credenciales de redes sociales usando Google Cloud Functions (2ª generación) y Secret Manager.

## 🛠️ Prerrequisitos

### 1. Google Cloud CLI
```bash
# Instalar gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Verificar instalación
gcloud --version
```

### 2. Proyecto de Google Cloud
```bash
# Crear proyecto (opcional)
gcloud projects create tu-project-id --name="Social Media Manager"

# Configurar proyecto activo
gcloud config set project tu-project-id

# Autenticarse
gcloud auth login
gcloud auth application-default login
```

### 3. Habilitar APIs necesarias
```bash
# Habilitar Cloud Functions, Secret Manager, y Cloud Build
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## 🚀 Desplegar la Cloud Function

### 1. Navegar al directorio
```bash
cd /Users/asiergonzalezgomez/Development/asiergonzalez-admin-app/cloud-functions/social-credentials
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar el proyecto en index.js
Editar la línea en `index.js`:
```javascript
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'TU-PROJECT-ID-AQUI';
```

### 4. Desplegar la función
```bash
# Desplegar función principal
gcloud functions deploy social-credentials \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=socialCredentials \
  --trigger=https \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=60s

# Desplegar función de health check
gcloud functions deploy health-check \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=healthCheck \
  --trigger=https \
  --allow-unauthenticated \
  --memory=128MB \
  --timeout=30s
```

### 5. Obtener las URLs
```bash
# Ver las funciones desplegadas
gcloud functions list --region=europe-west1

# Obtener URL específica
gcloud functions describe social-credentials --region=europe-west1 --format="value(serviceConfig.uri)"
```

## 🔧 Configurar la App

### 1. Variables de entorno
Crear `.env` en el directorio raíz de tu app:
```env
EXPO_PUBLIC_CLOUD_FUNCTION_URL=https://europe-west1-tu-project-id.cloudfunctions.net/social-credentials
```

### 2. Cambiar a Cloud Service
En tu app, actualiza las importaciones para usar el servicio de la nube:

```javascript
// Cambiar esta línea:
import { socialMediaService } from '../services/socialMedia';

// Por esta:
import { socialMediaCloudService as socialMediaService } from '../services/socialMediaCloud';
```

## 🔒 Configurar Permisos (Opcional)

Si quieres restringir el acceso a la función:

### 1. Remover acceso público
```bash
gcloud functions remove-iam-policy-binding social-credentials \
  --region=europe-west1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"
```

### 2. Añadir usuarios específicos
```bash
gcloud functions add-iam-policy-binding social-credentials \
  --region=europe-west1 \
  --member="user:tu-email@gmail.com" \
  --role="roles/cloudfunctions.invoker"
```

### 3. Usar Service Account en la app
```bash
# Crear service account
gcloud iam service-accounts create social-media-app \
  --display-name="Social Media App"

# Dar permisos
gcloud functions add-iam-policy-binding social-credentials \
  --region=europe-west1 \
  --member="serviceAccount:social-media-app@tu-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"

# Crear clave
gcloud iam service-accounts keys create key.json \
  --iam-account=social-media-app@tu-project-id.iam.gserviceaccount.com
```

## 📊 Monitoreo

### 1. Ver logs
```bash
# Logs en tiempo real
gcloud functions logs read social-credentials --region=europe-west1 --follow

# Logs de los últimos 30 minutos
gcloud functions logs read social-credentials --region=europe-west1 --limit=50
```

### 2. Métricas en Google Cloud Console
- Ve a [Cloud Functions](https://console.cloud.google.com/functions/list)
- Selecciona tu función
- Pestaña "Metrics" para ver uso y rendimiento

## 🛡️ Seguridad

### 1. Secrets en Secret Manager
Los secretos se crean automáticamente con el formato:
- `social-{userId}-instagram`
- `social-{userId}-twitter` 
- `social-{userId}-linkedin`

### 2. Ver secretos
```bash
# Listar todos los secretos
gcloud secrets list

# Ver versiones de un secreto
gcloud secrets versions list social-user_demo-instagram

# Acceder a un secreto (solo para debug)
gcloud secrets versions access latest --secret="social-user_demo-instagram"
```

### 3. Permisos de Secret Manager
La Cloud Function automáticamente tiene permisos para crear/leer/eliminar secretos en tu proyecto.

## 🧪 Testing

### 1. Test básico con curl
```bash
# Health check
curl "https://europe-west1-tu-project-id.cloudfunctions.net/health-check"

# Obtener credenciales (debería devolver connected: false para usuario nuevo)
curl "https://europe-west1-tu-project-id.cloudfunctions.net/social-credentials?userId=test-user"

# Guardar credenciales de prueba
curl -X POST "https://europe-west1-tu-project-id.cloudfunctions.net/social-credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "platform": "instagram",
    "credentials": {
      "accessToken": "test-token",
      "userId": "test-user-id",
      "connected": true
    }
  }'
```

### 2. Test desde la app
La app automáticamente hará los requests a la Cloud Function una vez configurada la variable de entorno.

## 💰 Costos

### Estimación mensual (uso moderado):
- **Cloud Functions**: ~$0.50/mes (10,000 requests)
- **Secret Manager**: ~$2.00/mes (10 secretos, 1000 accesos)
- **Cloud Build**: Gratis (120 builds/día)

### Optimizar costos:
- Usar memoria mínima (128MB para health check, 256MB para función principal)
- Timeout bajo (30-60 segundos)
- Región cercana a usuarios (europe-west1 para Europa)

## 🔄 Actualizaciones

Para actualizar la función:
```bash
cd cloud-functions/social-credentials
npm install  # Si hay nuevas dependencias
gcloud functions deploy social-credentials --gen2 --runtime=nodejs20 --region=europe-west1 --source=. --entry-point=socialCredentials --trigger=https --allow-unauthenticated
```

## ❓ Troubleshooting

### Error: Permission denied
```bash
# Verificar permisos
gcloud projects get-iam-policy tu-project-id

# Añadir rol de editor si es necesario
gcloud projects add-iam-policy-binding tu-project-id \
  --member="user:tu-email@gmail.com" \
  --role="roles/editor"
```

### Error: API not enabled
```bash
# Habilitar todas las APIs necesarias
gcloud services enable cloudfunctions.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com
```

### Función no responde
- Verificar logs: `gcloud functions logs read social-credentials --region=europe-west1`
- Verificar configuración de CORS en index.js
- Verificar URL en variables de entorno de la app

---

¡Tu Cloud Function estará lista para manejar credenciales de forma segura! 🚀
