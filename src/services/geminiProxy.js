const GEMINI_CLOUD_FUNCTION_URL = process.env.EXPO_PUBLIC_GEMINI_CLOUD_FUNCTION_URL || 'https://europe-west1-asiergonzalez-web-app.cloudfunctions.net/geminiProxy';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export async function generateJsonOrText(prompt, model = DEFAULT_MODEL) {
  const body = {
    prompt: String(prompt || ''),
    model: model
  };
  
  const res = await fetch(GEMINI_CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini proxy error (${res.status}): ${err}`);
  }
  if (!contentType.includes('application/json')) {
    const html = await res.text();
    throw new Error('Proxy devolvió HTML/Texto no JSON: ' + html.slice(0, 200));
  }
  
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Error en la respuesta del proxy');
  }
  
  return data.data.text;
}

export async function generateSmart(prompt, opts = {}) {
  // 1) Intentar proxy
  try {
    return await generateJsonOrText(prompt, opts.model || DEFAULT_MODEL);
  } catch (proxyErr) {
    // 2) Fallback a API directa si hay clave
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw proxyErr;
    const model = opts.directModel || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: String(prompt || '') }]}]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini direct error (${res.status}): ${text}`);
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p?.text || '').join('\n').trim();
  }
}


