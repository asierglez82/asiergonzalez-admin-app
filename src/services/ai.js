export async function generateWithGemini(prompt, system = '') {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta EXPO_PUBLIC_GEMINI_API_KEY');
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
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
  return `Idioma: ${language}\n\nFoto: ${imageUrl}\nLocalización: ${location}\nFecha: ${date}\nEvento: ${event}\nPersonas: ${ppl}\n\nNotas: ${notes}\n\nFrase actual: ${phrase}\n\nTareas:\n1) Reescribe la frase (misma intención, 1-2 líneas).\n2) Escribe un texto breve para la web (70-120 palabras).\n3) Devuelve un JSON con: { phrase, webText, cta, hashtags }.`;
}

export function buildComprehensivePrompt({ imageUrl, language, notes }) {
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

Basándote en la imagen proporcionada y las notas, genera contenido completo para un post de Asier González (emprendedor y speaker).

IMAGEN: ${imageUrl || 'No proporcionada'}
IDIOMA: ${language}
NOTAS: ${notes || 'Ninguna'}

Genera el siguiente contenido:

1. LOCALIZACIÓN: ${instructions.location} (ej: "Madrid, España", "San Francisco, USA")
2. EVENTO: ${instructions.event} (ej: "South Summit", "Web Summit", "TechCrunch Disrupt")
3. PERSONAS: ${instructions.people} (ej: "María García, Carlos López, Ana Martín")
4. FRASE PRINCIPAL: ${instructions.phrase} (1-2 líneas, inspiradora y profesional)
5. TEXTO WEB: ${instructions.webText} (70-120 palabras, expande la frase principal)
6. CTA: ${instructions.cta} (invita a la conversación)

CAMPOS DEL BLOG POST:
7. TÍTULO: Un título atractivo para el blog post (máximo 60 caracteres)
8. AUTOR: "Asier González" (siempre este valor)
9. FECHA: Fecha actual en formato "DD Month YYYY" (ej: "15 January 2024")
10. CONTENIDO MODAL: Contenido HTML completo del blog post (500-1000 palabras)
11. TAGS: Hashtags relevantes separados por espacios (ej: "#startup #innovación #leadership")
12. IMAGEN: Ruta de imagen del blog (ej: "/assets/img/blog/titulo-del-post.png")
13. MODAL: "mymodal" (siempre este valor)
14. WIDTH: "1200px" (siempre este valor)
15. PATH: Ruta del blog post (ej: "/blog/titulo-del-post")
16. URL: URL completa del blog post (ej: "https://asiergonzalez.es/blog/titulo-del-post")
17. SLUG: Slug del blog post (ej: "titulo-del-post")

Para cada red social, adapta el contenido:
- LinkedIn: Profesional, con hashtags relevantes (#startup #innovación #leadership)
- Instagram: Más visual, con hashtags (#startup #buildinpublic #founders)
- Twitter: Conciso, máximo 260 caracteres

Devuelve un JSON con esta estructura:
{
  "location": "string",
  "event": "string", 
  "people": "string",
  "phrase": "string",
  "webText": "string",
  "cta": "string",
  "title": "string",
  "author": "Asier González",
  "blogDate": "string",
  "modalContent": "string",
  "tags": "string",
  "image": "string",
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



