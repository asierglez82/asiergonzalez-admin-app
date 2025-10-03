# 🔗 Configuración de Redirect URI para LinkedIn

## ❌ Problema actual:
LinkedIn está rechazando la autorización porque el redirect URI no coincide con los registrados en la app de LinkedIn.

## ✅ Solución:

### 1. Ir a LinkedIn Developer Console
- Ve a: https://www.linkedin.com/developers/
- Selecciona tu app de LinkedIn

### 2. Configurar Redirect URIs
En la sección "Auth" → "OAuth 2.0 settings", añade estas URLs:

**Para desarrollo:**
```
http://localhost:8081/auth/linkedin/callback/
```

**Para producción:**
```
https://tu-dominio.com/auth/linkedin/callback/
```

### 3. Verificar Client ID y Secret
Asegúrate de que:
- **Client ID:** `77nofg3l51f0kb` (debe coincidir con el código)
- **Client Secret:** Esté configurado en Google Secret Manager

### 4. Configurar en Google Secret Manager
```bash
# Verificar que existan los secretos
gcloud secrets versions access latest --secret="linkedin-client-id"
gcloud secrets versions access latest --secret="linkedin-client-secret"

# Si no existen, crearlos
gcloud secrets create linkedin-client-id --data-file=- <<< "77nofg3l51f0kb"
gcloud secrets create linkedin-client-secret --data-file=- <<< "tu_client_secret_real"
```

### 5. Verificar configuración de producción
En tu archivo `.env` de producción:
```bash
EXPO_PUBLIC_USE_CLOUD_STORAGE=true
EXPO_PUBLIC_ENABLE_CLOUD_PUBLISH=true
EXPO_PUBLIC_CLOUD_FUNCTION_URL=https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/social-credentials
```

## 🔍 URLs que debe tener registradas LinkedIn:

1. `http://localhost:8081/auth/linkedin/callback/` (desarrollo)
2. `https://tu-dominio-real.com/auth/linkedin/callback/` (producción)

## ⚠️ Notas importantes:

- LinkedIn es **muy estricto** con los redirect URIs
- Deben coincidir **exactamente** (incluyendo la barra final)
- No uses `localhost` en producción
- El dominio debe ser HTTPS en producción
