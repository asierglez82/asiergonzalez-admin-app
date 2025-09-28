# 🤖 Guía de Despliegue - Gemini Proxy con Secret Manager

Esta guía te ayudará a desplegar la Cloud Function de Gemini que usa Secret Manager para almacenar de forma segura el API key de Gemini AI.

## 🛠️ Prerrequisitos

### 1. Google Cloud CLI y Proyecto
```bash
# Verificar gcloud CLI
gcloud --version

# Configurar proyecto activo
gcloud config set project tu-project-id

# Autenticarse
gcloud auth login
gcloud auth application-default login
```

### 2. Habilitar APIs necesarias
```bash
# Habilitar APIs requeridas
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

### 3. Obtener API Key de Gemini
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea un nuevo API key
3. Guarda el API key de forma segura

## 🚀 Desplegar la Cloud Function

### 1. Navegar al directorio
```bash
cd /Users/asiergonzalezgomez/Development/asiergonzalez-admin-app/cloud-functions/gemini-proxy
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables en index.js
Editar las líneas en `index.js`:
```javascript
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'TU-PROJECT-ID-AQUI';

// Y en corsOptions:
const corsOptions = {
  origin: ['http://localhost:3000', 'https://tu-dominio.com'], // Ajustar según tu app
  ...
};
```

### 4. Configurar Admin Secret
```bash
# Establecer variable de entorno para el admin secret
export ADMIN_SECRET="tu-admin-secret-super-seguro"
```

### 5. Desplegar las funciones
```bash
# Función principal de proxy
gcloud functions deploy gemini-proxy \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=geminiProxy \
  --trigger=https \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=120s \
  --set-env-vars="ADMIN_SECRET=tu-admin-secret-super-seguro"

# Función para configurar API key
gcloud functions deploy set-gemini-api-key \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=setGeminiApiKey \
  --trigger=https \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=60s \
  --set-env-vars="ADMIN_SECRET=tu-admin-secret-super-seguro"

# Función de health check
gcloud functions deploy gemini-health-check \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=geminiHealthCheck \
  --trigger=https \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=30s
```

### 6. Obtener las URLs desplegadas
```bash
# Ver todas las funciones
gcloud functions list --region=europe-west1 --filter="name~gemini"

# URL específica del proxy principal
gcloud functions describe gemini-proxy --region=europe-west1 --format="value(serviceConfig.uri)"
```

## 🔐 Configurar API Key en Secret Manager

### Método 1: Desde la App de Admin
1. Ve a la nueva pantalla "Gemini IA" en tu app
2. Introduce tu API key de Gemini
3. Introduce el admin secret que configuraste
4. Haz clic en "Guardar en Secret Manager"

### Método 2: Manualmente con gcloud
```bash
# Crear el secret
gcloud secrets create gemini-api-key --data-file=-
# (pega tu API key y presiona Ctrl+D)

# O desde un archivo
echo "tu-api-key-aqui" | gcloud secrets create gemini-api-key --data-file=-

# Verificar que se creó
gcloud secrets list
```

### Método 3: Con curl
```bash
# Configurar API key usando la Cloud Function
curl -X POST "https://europe-west1-tu-project-id.cloudfunctions.net/set-gemini-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "tu-api-key-de-gemini-aqui",
    "adminSecret": "tu-admin-secret-super-seguro"
  }'
```

## 🔧 Configurar la App

### 1. Variables de entorno
Actualiza tu archivo `.env`:
```env
# Habilitar servicio cloud de Gemini
EXPO_PUBLIC_USE_GEMINI_CLOUD=true

# URL de la Cloud Function
EXPO_PUBLIC_GEMINI_CLOUD_FUNCTION_URL=https://europe-west1-tu-project-id.cloudfunctions.net/gemini-proxy

# Opcional: API key local como fallback
EXPO_PUBLIC_GEMINI_API_KEY=tu-api-key-local
```

### 2. Verificar configuración
En tu app, ve a "Gemini IA" y verifica que:
- ✅ El servicio cloud está disponible
- ✅ Los tests funcionan correctamente
- ✅ El API key está configurado

## 🛡️ Seguridad y Permisos

### 1. Verificar permisos del Secret Manager
```bash
# Ver permisos del secret
gcloud secrets get-iam-policy gemini-api-key

# La Cloud Function debe tener acceso automáticamente, pero si hay problemas:
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:tu-project-id@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Restringir acceso a las funciones (Opcional)
```bash
# Remover acceso público
gcloud functions remove-iam-policy-binding gemini-proxy \
  --region=europe-west1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"

# Añadir usuarios específicos
gcloud functions add-iam-policy-binding gemini-proxy \
  --region=europe-west1 \
  --member="user:tu-email@gmail.com" \
  --role="roles/cloudfunctions.invoker"
```

### 3. Configurar autenticación con Service Account
```bash
# Crear service account específico
gcloud iam service-accounts create gemini-app-service \
  --display-name="Gemini App Service Account"

# Dar permisos necesarios
gcloud functions add-iam-policy-binding gemini-proxy \
  --region=europe-west1 \
  --member="serviceAccount:gemini-app-service@tu-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"

# Crear clave JSON
gcloud iam service-accounts keys create gemini-service-key.json \
  --iam-account=gemini-app-service@tu-project-id.iam.gserviceaccount.com
```

## 📊 Monitoreo y Logs

### 1. Ver logs en tiempo real
```bash
# Logs de la función principal
gcloud functions logs read gemini-proxy --region=europe-west1 --follow

# Logs de configuración de API key
gcloud functions logs read set-gemini-api-key --region=europe-west1 --follow

# Filtrar por errores
gcloud functions logs read gemini-proxy --region=europe-west1 --filter="severity=ERROR"
```

### 2. Métricas en Cloud Console
- Ve a [Cloud Functions](https://console.cloud.google.com/functions/list)
- Selecciona `gemini-proxy`
- Pestaña "Metrics" para ver:
  - Invocaciones por minuto
  - Duración de ejecución
  - Errores
  - Uso de memoria

### 3. Monitoring de Secret Manager
```bash
# Ver accesos al secret
gcloud logging read "resource.type=gce_instance AND protoPayload.serviceName=secretmanager.googleapis.com"

# Alertas (opcional)
gcloud alpha monitoring policies create --policy-from-file=gemini-alerts.yaml
```

## 🧪 Testing Completo

### 1. Test básico de la función
```bash
# Health check
curl "https://europe-west1-tu-project-id.cloudfunctions.net/gemini-health-check"

# Test de generación
curl -X POST "https://europe-west1-tu-project-id.cloudfunctions.net/gemini-proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hola, ¿cómo estás?",
    "model": "gemini-2.5-flash"
  }'
```

### 2. Test desde la app
1. Ve a "Gemini IA" → Test de servicios
2. Crea un nuevo post y usa la generación de IA
3. Verifica que funciona correctamente

### 3. Test de fallback
1. Temporalmente deshabilita la Cloud Function
2. Verifica que la app hace fallback al servicio local
3. Reactiva la Cloud Function

## 🔄 Actualizaciones

### Para actualizar la función:
```bash
cd cloud-functions/gemini-proxy
npm install  # Si hay nuevas dependencias

# Redesplegar
gcloud functions deploy gemini-proxy \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=. \
  --entry-point=geminiProxy \
  --trigger=https \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=120s \
  --set-env-vars="ADMIN_SECRET=tu-admin-secret-super-seguro"
```

### Para rotar el API key:
```bash
# Crear nueva versión del secret
echo "nuevo-api-key" | gcloud secrets versions add gemini-api-key --data-file=-

# O desde la app usando la función setGeminiApiKey
```

## 💰 Optimización de Costos

### Configuración recomendada:
- **Memoria**: 512MB para la función principal, 256MB para auxiliares
- **Timeout**: 120s para generación, 30-60s para auxiliares
- **Región**: europe-west1 (más barata para Europa)
- **Cache**: Habilitado en la app (2 minutos por defecto)

### Estimación de costos mensual:
- **Cloud Functions**: ~$1-3 (10,000 requests)
- **Secret Manager**: ~$0.50 (1 secret, 1000 accesos)
- **Gemini API**: Variable según uso (ver pricing de Google AI)

## ❓ Troubleshooting

### Error: Permission denied
```bash
# Verificar permisos
gcloud projects get-iam-policy tu-project-id

# Añadir permisos si es necesario
gcloud projects add-iam-policy-binding tu-project-id \
  --member="user:tu-email@gmail.com" \
  --role="roles/cloudfunctions.developer"
```

### Error: Secret not found
```bash
# Verificar que existe
gcloud secrets list

# Recrear si es necesario
gcloud secrets create gemini-api-key --data-file=-
```

### Error: Function timeout
- Aumenta el timeout en el comando de despliegue
- Verifica la latencia de la API de Gemini
- Considera usar modelos más rápidos (gemini-2.5-flash-lite)

### Función no responde
- Verificar logs: `gcloud functions logs read gemini-proxy --region=europe-west1`
- Verificar CORS en index.js
- Verificar URLs en variables de entorno de la app

---

## 🎉 ¡Completado!

Tu Cloud Function de Gemini con Secret Manager está lista. Ahora tienes:

✅ **API key seguro** en Google Secret Manager  
✅ **Cloud Function de 2ª generación** con proxy inteligente  
✅ **Fallback automático** si la nube falla  
✅ **Cache y optimizaciones** para reducir costos  
✅ **Monitoreo completo** con logs y métricas  
✅ **Configuración desde la app** de admin  

¡El API key de Gemini nunca más estará expuesto en tu código cliente! 🔒
