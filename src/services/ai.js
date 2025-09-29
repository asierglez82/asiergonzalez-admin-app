export async function generateWithGemini(prompt, system = '') {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta EXPO_PUBLIC_GEMINI_API_KEY');
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }]}],
    systemInstruction: system ? { role: 'system', parts: [{ text: system }] } : undefined,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Gemini error: ' + text);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

export function buildPrompt({ imageUrl, location, date, event, people, language, notes, phrase }) {
  const ppl = people ? people.split(',').map(p => p.trim()).filter(Boolean).join(', ') : 'N/A';
  return `Idioma: ${language}\n\nFoto: ${imageUrl}\nLocalización: ${location}\nFecha: ${date}\nEvento: ${event}\nPersonas: ${ppl}\n\nNotas: ${notes}\n\nFrase actual: ${phrase}\n\nTareas:\n1) Reescribe la frase (misma intención, 1-2 líneas).\n2) Escribe un texto breve para la web (70-120 palabras).\n3) Devuelve un JSON con: { phrase, webText, cta, hashtags } (máximo 2 hashtags).`;
}

export function buildComprehensivePrompt({ imageUrl, language, notes, location, date, event, people }) {
  const languageInstructions = {
    es: {
      system: "Eres un asistente de marketing digital especializado en crear contenido para redes sociales y web. Genera contenido profesional y atractivo en español.",
      location: "una ciudad o ubicación relevante",
      event: "un evento, conferencia, o lugar de networking",
      people: "nombres de personas relevantes del ecosistema emprendedor",
      phrase: "una frase inspiradora sobre emprendimiento, innovación o liderazgo",
      webText: "un texto para la web que expanda la frase principal",
      cta: "una llamada a la acción para unirte a la conversación"
    },
    en: {
      system: "You are a digital marketing assistant specialized in creating content for social media and web. Generate professional and engaging content in English.",
      location: "a relevant city or location",
      event: "an event, conference, or networking venue",
      people: "names of relevant people from the entrepreneurial ecosystem",
      phrase: "an inspiring phrase about entrepreneurship, innovation or leadership",
      webText: "a web text that expands on the main phrase",
      cta: "a call to action to join the conversation"
    },
    eu: {
      system: "Marketing digitaleko laguntzaile bat zara sare sozialetarako eta weberako edukiak sortzen espezializatua. Euskera profesional eta erakargarrian edukiak sortu.",
      location: "hiri edo kokapen garrantzitsu bat",
      event: "ekitaldi, konferentzia edo networking gune bat",
      people: "ekosistema enpresarialeko pertsona garrantzitsuen izenak",
      phrase: "enpresaritzari, berrikuntzari edo lidergotzari buruzko esaldi inspiratzaile bat",
      webText: "esaldi nagusia zabaltzen duen web testu bat",
      cta: "elkarrizketan parte hartzera gonbidatzen duen ekintza-deia"
    },
    fr: {
      system: "Vous êtes un assistant marketing digital spécialisé dans la création de contenu pour les réseaux sociaux et le web. Générez du contenu professionnel et engageant en français.",
      location: "une ville ou un lieu pertinent",
      event: "un événement, une conférence ou un lieu de networking",
      people: "des noms de personnes pertinentes de l'écosystème entrepreneurial",
      phrase: "une phrase inspirante sur l'entrepreneuriat, l'innovation ou le leadership",
      webText: "un texte web qui développe la phrase principale",
      cta: "un appel à l'action pour rejoindre la conversation"
    }
  };

  const instructions = languageInstructions[language] || languageInstructions.es;

  return `${instructions.system}

Basándote en la información proporcionada, genera contenido completo para un post de Asier González (emprendedor y speaker).

IMPORTANTE: No uses emojis en el contenido generado, solo texto profesional.

INFORMACIÓN DISPONIBLE:
→ IMAGEN: ${imageUrl || 'No proporcionada'}
→ IDIOMA: ${language}
→ LOCALIZACIÓN: ${location || 'No especificada'}
→ FECHA: ${date || 'No especificada'}
→ EVENTO: ${event || 'No especificado'}
→ PERSONAS: ${people || 'No especificadas'}
→ NOTAS: ${notes || 'Ninguna'}

Genera el siguiente contenido basándote en la información proporcionada:

1. FRASE PRINCIPAL: ${instructions.phrase} (1-2 líneas, inspiradora y profesional)
2. TEXTO WEB: ${instructions.webText} (70-120 palabras, expande la frase principal)
3. CTA: ${instructions.cta} (invita a la conversación)

CAMPOS DEL BLOG POST:
4. TÍTULO: Un título atractivo para el blog post (máximo 60 caracteres)
5. AUTOR: "Asier González" (siempre este valor)
6. FECHA: Usa la fecha proporcionada: "${date || 'Fecha no especificada'}"
7. CONTENIDO MODAL: Contenido HTML completo del blog post (500-1000 palabras)
8. TAGS: Máximo 2 hashtags relevantes separados por espacios (ej: "#startup #innovación")
9. IMAGEN: La imagen será la composición generada automáticamente
10. MODAL: "mymodal" (siempre este valor)
11. WIDTH: "1200px" (siempre este valor)
12. PATH: Ruta del blog post (ej: "/blog/titulo-del-post")
13. URL: URL completa del blog post (ej: "https://asiergonzalez.es/blog/titulo-del-post")
14. SLUG: Slug del blog post (ej: "titulo-del-post")

Para cada red social, adapta el contenido:
→ LinkedIn: Profesional, con máximo 2 hashtags relevantes (#startup #innovación)
→ Instagram: Más visual, con máximo 2 hashtags (#startup #buildinpublic)
→ Twitter: Conciso, máximo 260 caracteres

Devuelve un JSON con esta estructura:
{
  "phrase": "string",
  "webText": "string",
  "cta": "string",
  "title": "string",
  "author": "Asier González",
  "blogDate": "string",
  "modalContent": "string",
  "tags": "string",
  "modal": "mymodal",
  "width": "1200px",
  "path": "string",
  "url": "string",
  "slug": "string",
  "platforms": {
    "linkedin": "string",
    "instagram": "string", 
    "twitter": "string"
  }
}`;
}



