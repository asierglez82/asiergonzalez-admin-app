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
  
  // No incluir la imagen completa en el prompt si es muy grande (base64)
  // Solo indicar si hay imagen disponible
  const imageInfo = imageUrl ? 
    (imageUrl.startsWith('data:') ? 'Imagen proporcionada (disponible para contexto visual)' : imageUrl) 
    : 'No proporcionada';
  
  return `Idioma: ${language}\n\nFoto: ${imageInfo}\nLocalización: ${location}\nFecha: ${date}\nEvento: ${event}\nPersonas: ${ppl}\n\nNotas: ${notes}\n\nFrase actual: ${phrase}\n\nTareas:\n1) Reescribe la frase (misma intención, 1-2 líneas).\n2) Escribe un texto breve para la web (70-120 palabras).\n3) Devuelve un JSON con: { phrase, webText, cta, hashtags } (máximo 2 hashtags).`;
}

export function buildComprehensivePrompt({ imageUrl, language, notes, location, date, event, people }) {
  const languageInstructions = {
    es: {
      system: "Eres un periodista profesional especializado en redacción de contenido corporativo y divulgativo. Tu trabajo es transformar notas en contenido profesional, creíble y fiel a los hechos proporcionados. NUNCA inventes información que no esté en las notas.",
      location: "una ciudad o ubicación relevante",
      event: "un evento, conferencia, o lugar de networking",
      people: "nombres de personas relevantes del ecosistema emprendedor",
      phrase: "una frase profesional y directa basada estrictamente en las notas",
      webText: "un texto periodístico para la web que expanda la información de las notas",
      cta: "una llamada a la acción natural y profesional"
    },
    en: {
      system: "You are a professional journalist specialized in corporate and informative content writing. Your job is to transform notes into professional, credible content that is faithful to the provided facts. NEVER invent information that is not in the notes.",
      location: "a relevant city or location",
      event: "an event, conference, or networking venue",
      people: "names of relevant people from the entrepreneurial ecosystem",
      phrase: "a professional and direct phrase based strictly on the notes",
      webText: "a journalistic web text that expands on the information from the notes",
      cta: "a natural and professional call to action"
    },
    eu: {
      system: "Kazetari profesional bat zara enpresa-edukiak eta dibulgazio-edukiak idazten espezializatua. Zure lana oharrak eduki profesional, sinesgarri eta emandako egitateen leial bihurtzea da. INOIZ EZ asmatu oharretan ez dagoen informaziorik.",
      location: "hiri edo kokapen garrantzitsu bat",
      event: "ekitaldi, konferentzia edo networking gune bat",
      people: "ekosistema enpresarialeko pertsona garrantzitsuen izenak",
      phrase: "oharretan oinarritutako esaldi profesional eta zuzen bat",
      webText: "oharretako informazioa zabaltzen duen web testu kazetariaritza-estilorako",
      cta: "ekintza-dei natural eta profesional bat"
    },
    fr: {
      system: "Vous êtes un journaliste professionnel spécialisé dans la rédaction de contenu corporatif et informatif. Votre travail consiste à transformer des notes en contenu professionnel, crédible et fidèle aux faits fournis. N'inventez JAMAIS d'informations qui ne figurent pas dans les notes.",
      location: "une ville ou un lieu pertinent",
      event: "un événement, une conférence ou un lieu de networking",
      people: "des noms de personnes pertinentes de l'écosystème entrepreneurial",
      phrase: "une phrase professionnelle et directe basée strictement sur les notes",
      webText: "un texte journalistique web qui développe les informations des notes",
      cta: "un appel à l'action naturel et professionnel"
    }
  };

  const instructions = languageInstructions[language] || languageInstructions.es;

  // No incluir la imagen completa en el prompt si es muy grande (base64)
  // Solo indicar si hay imagen disponible
  const imageInfo = imageUrl ? 
    (imageUrl.startsWith('data:') ? 'Imagen proporcionada (disponible para contexto visual)' : imageUrl) 
    : 'No proporcionada';

  return `${instructions.system}

Basándote ESTRICTAMENTE en la información proporcionada en las NOTAS, genera contenido periodístico profesional para un post de Asier González (emprendedor y speaker).

⚠️ ESTILO PERIODÍSTICO - REGLAS FUNDAMENTALES:
1. Escribe como un periodista profesional, NO como IA de marketing
2. Usa lenguaje directo, claro y factual
3. NO uses frases genéricas de marketing o autoayuda
4. NO uses superlativos exagerados ("increíble", "extraordinario", "revolucionario")
5. Basa TODO en hechos concretos de las NOTAS
6. Sé preciso y específico, evita generalidades
7. Mantén un tono profesional pero accesible
8. NO uses emojis ni hashtags dentro del texto (solo al final si aplica)

⚠️ CRÍTICO - IDIOMA DE SALIDA:
TODO el contenido generado (phrase, webText, cta, content, title, modalContent, tags, y textos de plataformas) DEBE estar completamente en: ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}

Las NOTAS pueden estar en cualquier idioma, pero TODO tu OUTPUT debe estar en el idioma especificado (${language}).

⚠️ FIDELIDAD A LAS NOTAS:
- USA EXCLUSIVAMENTE las NOTAS proporcionadas
- NO INVENTES información que no esté en las NOTAS
- Si las notas son breves, genera contenido breve
- Si falta información, no la supongas: déjala vacía o indica que no está disponible
- Mantén los nombres, fechas y datos exactos como aparecen en las NOTAS

INFORMACIÓN DISPONIBLE:
→ IMAGEN: ${imageInfo}
→ IDIOMA DE SALIDA: ${language} (${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'})
→ LOCALIZACIÓN: ${location || 'No especificada'}
→ FECHA: ${date || 'No especificada'}
→ EVENTO: ${event || 'No especificado'}
→ PERSONAS: ${people || 'No especificadas'}
→ NOTAS (pueden estar en otro idioma, pero genera el contenido en ${language}): ${notes || 'Ninguna'}

Genera el siguiente contenido basándote ESTRICTAMENTE en las NOTAS:

1. FRASE PRINCIPAL: ${instructions.phrase}
   - 1-2 líneas máximo
   - Basada EN LOS HECHOS de las notas, NO en frases inspiracionales genéricas
   - Directa, profesional y específica
   - Evita clichés de marketing

2. TEXTO WEB: ${instructions.webText}
   - 120-220 palabras, 2-3 párrafos breves
   - Estilo periodístico: quién, qué, cuándo, dónde, por qué
   - ⚠️ IMPORTANTE: Debe incluir etiquetas HTML para formato
   - Usa etiquetas: <p> para párrafos, <strong> para énfasis, <br> para saltos
   - Estructura HTML: <p>Párrafo 1</p><br><p>Párrafo 2</p><br><p>Párrafo 3</p>
   - Usa información CONCRETA de las notas
   - NO añadas información no presente en las notas
   - Estructura clara: contexto → desarrollo → conclusión

3. CTA: ${instructions.cta}
   - Natural y profesional, NO comercial
   - Invita a la conversación de forma genuina
   - Máximo 1 línea

4. EXTRACCIONES CONTEXTO: 
   - SOLO si puedes extraerlos con certeza de las NOTAS
   - NO supongas ni inventes datos
   - Campos: LOCATION, EVENT, PEOPLE

CONTENIDO HTML PARA QUOTE (campo "content"):
• Devuélvelo como HTML listo para incrustar, siguiendo este esquema y estilos inline:
  <div style="width: 100%;height: auto;clear: both;float: left;position: relative;padding-left: 70px;margin-top: 10px;margin-bottom: 10px;">
    <div style="position: relative;margin-bottom: 30px">
      <img style="width: 40px;height: 40px" src="/assets/img/svg/quote.svg" alt="tumb" />
    </div>
    <p style="font-size: 20px;font-style: italic;margin-bottom: 23px">[FRASE LITERAL DE LAS NOTAS]</p>
  </div>
  <br>
  <p>[PÁRRAFO 1: contexto factual, 50-90 palabras]</p><br>
  <p>[PÁRRAFO 2: desarrollo de la información, 50-90 palabras]</p><br>
  <p>[PÁRRAFO 3 opcional: conclusión o reflexión, 40-70 palabras]</p>

• Estilo periodístico, basado en HECHOS de las notas
• No uses emojis ni listas; solo párrafos narrativos
• TODO el contenido HTML debe estar en ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}

CAMPOS DEL BLOG POST:
4. TÍTULO: Título periodístico basado en las notas (máximo 60 caracteres)
   - Directo y factual, NO clickbait
   - EN ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}

5. AUTOR: "Asier González" (siempre este valor)

6. FECHA: Usa la fecha proporcionada: "${date || 'Fecha no especificada'}"

7. CONTENIDO MODAL (modalContent): Artículo periodístico completo (500-1000 palabras)
   - Estilo periodístico profesional
   - Estructura: introducción → desarrollo → conclusión
   - Basado EXCLUSIVAMENTE en las NOTAS
   - Sin información inventada o supuesta
   - EN ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}

8. TAGS: Máximo 2 hashtags específicos y relevantes (ej: "#startup #productmanagement")
   - NO uses hashtags genéricos o vagos
   - EN ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}

9-14. CAMPOS TÉCNICOS:
   - MODAL: "mymodal"
   - WIDTH: "1200px"
   - PATH: "/blog/[slug-del-titulo]"
   - URL: "https://asiergonzalez.es/blog/[slug-del-titulo]"
   - SLUG: slug generado del título (minúsculas, guiones)

15. LOCATION/EVENT/PEOPLE: Devuelve SOLO si están explícitos en las NOTAS

CONTENIDO PARA REDES SOCIALES (TODO en ${language === 'es' ? 'ESPAÑOL' : language === 'en' ? 'ENGLISH' : language === 'eu' ? 'EUSKERA' : 'FRANÇAIS'}):

→ LinkedIn: ⚠️ CRÍTICO - USA EXACTAMENTE EL MISMO CONTENIDO QUE "webText" PERO SIN HTML
   - Toma el texto completo de "webText" y REMUEVE todas las etiquetas HTML
   - El contenido textual debe ser IDÉNTICO a webText, solo quita: <p>, </p>, <br>, <strong>, </strong>, etc.
   - Mantén los saltos de línea entre párrafos (usa \n\n para separar párrafos)
   - Añade al final (en línea aparte) máximo 2 hashtags específicos
   - NO resumas, NO cambies el texto: solo elimina las etiquetas HTML
   - Formato: [Texto de webText sin HTML]\n\n[hashtags]

→ Instagram: Versión más visual y concisa del contenido
   - Basada en las notas, estilo más directo
   - Máximo 2 hashtags específicos al final
   - Tono cercano pero profesional

→ Twitter: Versión ultra-concisa
   - Máximo 260 caracteres
   - Extrae la idea central de las notas
   - Directo y factual

Devuelve un JSON con esta estructura:
{
  "phrase": "string",
  "webText": "string con HTML (ejemplo: <p>Párrafo 1</p><br><p>Párrafo 2</p>)",
  "cta": "string",
  "content": "string con HTML completo (incluye div de quote)",
  "title": "string",
  "author": "Asier González",
  "blogDate": "string",
  "modalContent": "string con HTML completo del artículo",
  "tags": "string",
  "location": "string opcional",
  "event": "string opcional",
  "people": "string opcional",
  "modal": "mymodal",
  "width": "1200px",
  "path": "string",
  "url": "string",
  "slug": "string",
  "platforms": {
    "linkedin": "string SIN HTML, mismo texto que webText pero en texto plano con \\n\\n entre párrafos + hashtags al final",
    "instagram": "string texto plano", 
    "twitter": "string texto plano"
  }
}

EJEMPLO de webText vs LinkedIn:
webText: "<p>La mesa redonda de B-Venture analizó la desinversión.</p><br><p>Los expertos coincidieron en varios puntos clave.</p>"
linkedin: "La mesa redonda de B-Venture analizó la desinversión.\n\nLos expertos coincidieron en varios puntos clave.\n\n#startups #inversión"`;
}



