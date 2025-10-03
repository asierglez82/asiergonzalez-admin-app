# 🔧 Desplegar corrección de CORS para Gemini

## ❌ Problema:
La Cloud Function `geminiProxy` no permite requests desde `https://app.asiergonzalez.es` debido a configuración de CORS incorrecta.

## ✅ Solución aplicada:
He actualizado la configuración de CORS en `cloud-functions/gemini-proxy/index.js` para incluir:
- `https://app.asiergonzalez.es`

## 🚀 Pasos para desplegar:

### 1. Navegar al directorio de la Cloud Function:
```bash
cd cloud-functions/gemini-proxy
```

### 2. Desplegar la Cloud Function:
```bash
gcloud functions deploy gemini-proxy \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region europe-west1 \
  --memory 256MB \
  --timeout 60s
```

### 3. Verificar el despliegue:
```bash
gcloud functions describe gemini-proxy --region=europe-west1
```

### 4. Probar la función:
```bash
curl -X POST https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/gemini-proxy \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.asiergonzalez.es" \
  -d '{"test": "cors"}'
```

## 🔍 Verificar que funciona:

Después del despliegue, deberías poder usar Gemini desde tu aplicación en producción sin errores de CORS.

## 📋 URLs configuradas en CORS:

- ✅ `http://localhost:3000` (desarrollo)
- ✅ `http://localhost:8081` (desarrollo Expo)
- ✅ `https://app.asiergonzalez.es` (producción)
- ✅ `https://asiergonzalez.es` (dominio principal)
