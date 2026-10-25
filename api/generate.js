export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const prompt = body?.prompt;
  const apiKey = process.env.GEMINI_API_KEY || body?.apiKey;

  if (!apiKey || !prompt) {
    return res.status(400).json({ error: 'Falta API Key o prompt' });
  }

  const callModel = async (modelName) => {
    const cleanModel = modelName.replace('models/', '');
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7
          }
        })
      }
    );
    const data = await r.json();
    return { ok: r.ok && !data.error, status: r.status, data };
  };

  try {
    // 1. Llamada directa sin espera al modelo real activo
    let result = await callModel('gemini-2.0-flash');

    // 2. Fallback solo en caso de emergencia futura
    if (!result.ok) {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listRes.json();
      const availableFlash = listData.models?.find(m =>
        m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')
      );
      if (availableFlash) {
        result = await callModel(availableFlash.name);
      }
    }

    if (!result.ok) {
      return res.status(result.status || 500).json({
        error: result.data?.error?.message || 'Error en Google API'
      });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: `Fallo de red: ${err.message}` });
  }
}
