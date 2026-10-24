export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const prompt = body?.prompt;
  const apiKey = process.env.GEMINI_API_KEY || body?.apiKey;

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta GEMINI_API_KEY en Vercel (Environment Variables)' });
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt en la petición' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      return res.status(response.status || 500).json({ 
        error: data.error?.message || 'Error en la respuesta de Google API' 
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Fallo de red: ${err.message}` });
  }
}