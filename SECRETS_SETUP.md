# 🔐 GitHub Secrets Configuration

Una vez que hayas creado el repositorio, configura estos secrets en:
**Settings → Secrets and variables → Actions → New repository secret**

## 📱 Variables de Entorno Expo

```
Name: EXPO_PUBLIC_FIREBASE_API_KEY
Value: [MISMO valor que REACT_APP_FIREBASE_API_KEY del otro repo]

Name: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN  
Value: asiergonzalez-web-app.firebaseapp.com

Name: EXPO_PUBLIC_FIREBASE_PROJECT_ID
Value: asiergonzalez-web-app

Name: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: asiergonzalez-web-app.appspot.com

Name: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 370660290

Name: EXPO_PUBLIC_FIREBASE_APP_ID
Value: [El nuevo APP_ID que te dé Firebase para la admin app]

Name: EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
Value: [MISMO valor que el sitio web]
```

## 🔧 Secrets de Deployment

```
Name: FIREBASE_SERVICE_ACCOUNT_ASIERGONZALEZ_WEB_APP
Value: [MISMO JSON completo que usas en el otro repositorio]

GITHUB_TOKEN se crea automáticamente ✅
```

## 🎯 Lista de Verificación

- [ ] Repositorio creado en GitHub
- [ ] Código subido con `git push -u origin main`  
- [ ] Nueva Web App creada en Firebase Console
- [ ] Todos los secrets EXPO_PUBLIC_* configurados
- [ ] Secret de FIREBASE_SERVICE_ACCOUNT configurado
- [ ] Subdominio `app.asiergonzalez.es` configurado en Firebase
- [ ] Workflow ejecutado exitosamente
- [ ] Admin app funcionando en `https://app.asiergonzalez.es`

## 🚨 Importante

El **APP_ID será diferente** al del sitio web principal, pero todo lo demás (API_KEY, PROJECT_ID, etc.) será **exactamente igual** porque usan el mismo proyecto Firebase.
