import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, BarChart2, Volume2, CheckCircle, Flame, 
  ArrowRight, Sparkles, Bookmark, Settings, RefreshCw, 
  Key, HelpCircle, Check, Layers, Eye
} from 'lucide-react';
import { INITIAL_READINGS, INITIAL_DICTIONARY } from './data/readings';

export default function App() {
  // Navegación y vista actual
  const [activeTab, setActiveTab] = useState('readings');
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // Persistencia del progreso del usuario
  const [xp, setXp] = useState(() => Number(localStorage.getItem('ld_xp')) || 120);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('ld_streak')) || 3);
  const [completedReadings, setCompletedReadings] = useState(() => JSON.parse(localStorage.getItem('ld_completed')) || []);
  const [savedWords, setSavedWords] = useState(() => JSON.parse(localStorage.getItem('ld_saved_words')) || []);
  const [readings, setReadings] = useState(() => JSON.parse(localStorage.getItem('ld_readings')) || INITIAL_READINGS);
  const [dictionary, setDictionary] = useState(() => JSON.parse(localStorage.getItem('ld_dict')) || INITIAL_DICTIONARY);

  // Configuración de API Key para IA en vivo
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ld_gemini_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  // Estados de Generación IA y Análisis
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL');
  const [genLevel, setGenLevel] = useState('A2');
  const [genTopic, setGenTopic] = useState('');
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);
  const [isAnalyzingWord, setIsAnalyzingWord] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de Flashcards
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Guardar automáticamente en el celular/laptop
  useEffect(() => { localStorage.setItem('ld_xp', xp); }, [xp]);
  useEffect(() => { localStorage.setItem('ld_streak', streak); }, [streak]);
  useEffect(() => { localStorage.setItem('ld_completed', JSON.stringify(completedReadings)); }, [completedReadings]);
  useEffect(() => { localStorage.setItem('ld_saved_words', JSON.stringify(savedWords)); }, [savedWords]);
  useEffect(() => { localStorage.setItem('ld_readings', JSON.stringify(readings)); }, [readings]);
  useEffect(() => { localStorage.setItem('ld_dict', JSON.stringify(dictionary)); }, [dictionary]);
  useEffect(() => { localStorage.setItem('ld_gemini_key', apiKey); }, [apiKey]);

  // Pronunciación nativa en alemán (Text-to-Speech del navegador/celular)
  // Pronunciación mejorada: prioriza voces Neuronales / Naturales sobre las robóticas
  const speakGerman = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.includes('de'));

      // Busca voces neuronales (Katja/Conrad Natural en Edge o Google Deutsch en Chrome)
      const bestVoice = 
        germanVoices.find(v => v.name.includes('Natural')) ||
        germanVoices.find(v => v.name.includes('Online')) ||
        germanVoices.find(v => v.name.includes('Google')) ||
        germanVoices.find(v => v.name.includes('Premium')) ||
        germanVoices[0];

      if (bestVoice) utterance.voice = bestVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Colores según el género gramatical en alemán
  const getGenderStyle = (gender) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('masculin') || g === 'der') return 'bg-blue-50 border-blue-200 text-blue-900';
    if (g.includes('femenin') || g === 'die') return 'bg-rose-50 border-rose-200 text-rose-900';
    if (g.includes('neutr') || g === 'das') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    if (g.includes('verb')) return 'bg-amber-50 border-amber-200 text-amber-900';
    return 'bg-indigo-50 border-indigo-200 text-indigo-900';
  };

  const getBadgeStyle = (gender) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('masculin') || g === 'der') return 'bg-blue-600 text-white';
    if (g.includes('femenin') || g === 'die') return 'bg-rose-600 text-white';
    if (g.includes('neutr') || g === 'das') return 'bg-emerald-600 text-white';
    if (g.includes('verb')) return 'bg-amber-600 text-white';
    return 'bg-indigo-600 text-white';
  };

  // 1. Analizar cualquier palabra al tocarla (Diccionario Local + Gemini IA)
  const handleWordClick = async (rawWord) => {
    const cleanKey = rawWord.toLowerCase().replace(/[.,!?;:"()«»„“]/g, '').trim();
    if (!cleanKey) return;

    speakGerman(cleanKey);
    setErrorMsg('');

    // Si ya está en memoria caché, mostrar al instante
    if (dictionary[cleanKey]) {
      setSelectedWord(dictionary[cleanKey]);
      return;
    }

    // Si no hay API Key configurada, pedirla amablemente
    if (!apiKey) {
      setSelectedWord({
        word: rawWord.replace(/[.,!?;:"()]/g, ''),
        lemma: rawWord.replace(/[.,!?;:"()]/g, ''),
        type: 'Requiere IA Activa',
        gender: 'indeterminado',
        meaning: 'Configura tu API Key gratuita arriba a la derecha (⚙️) para analizar cualquier palabra en tiempo real.',
        contextNote: 'Una vez activada la llave de Gemini, verás aquí su declinación, género o conjugación exacta.',
        example: selectedReading?.content.split('.')[0] + '.',
        exampleTranslation: ''
      });
      return;
    }

    // Llamar a Gemini para análisis gramatical profundo
    setIsAnalyzingWord(true);
    setSelectedWord({ word: rawWord, analyzing: true });

    try {
      const prompt = `Analiza la palabra alemana "${rawWord}" dentro del contexto de esta oración: "${selectedReading.content}".
Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown) con esta estructura exacta:
{
  "word": "palabra limpia",
  "lemma": "forma base con artículo si es sustantivo (ej. der Tisch, die Lampe, das Buch) o infinitivo si es verbo",
  "type": "Sustantivo | Verbo | Adjetivo | Adverbio | Preposición",
  "gender": "masculino | femenino | neutro | verbo | otro",
  "article": "der | die | das | ''",
  "plural": "forma plural si es sustantivo o ''",
  "meaning": "traducción clara al español",
  "contextNote": "breve explicación de en qué caso (Nominativ, Akkusativ, Dativ, Genitiv) o tiempo verbal está en esta oración y por qué",
  "declension": { "nominativ": "...", "akkusativ": "...", "dativ": "...", "genitiv": "..." },
  "conjugation": { "ich": "...", "du": "...", "er_sie_es": "...", "wir": "...", "ihr": "...", "sie_Sie": "...", "praeteritum": "...", "perfekt": "..." },
  "example": "una oración de ejemplo sencilla en alemán usando la palabra",
  "exampleTranslation": "traducción del ejemplo al español"
}
Nota: Si NO es sustantivo, pon "declension": null. Si NO es verbo, pon "conjugation": null.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      setDictionary(prev => ({ ...prev, [cleanKey]: parsed }));
      setSelectedWord(parsed);
      setXp(prev => prev + 2); // +2 XP por investigar vocabulario
    } catch (err) {
      setErrorMsg('No se pudo analizar la palabra. Verifica tu API Key en el ícono de engrane ⚙️.');
      setSelectedWord(null);
    } finally {
      setIsAnalyzingWord(false);
    }
  };

  // 2. Generar una lectura completamente nueva según el nivel (A1 - C1)
  const handleGenerateAIReading = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsGeneratingReading(true);
    setErrorMsg('');

    const topics = ['Un misterio en Viena', 'Tecnología del futuro', 'Costumbres en Alemania', 'Un día de senderismo en los Alpes', 'Filosofía cotidiana', 'Cocina tradicional'];
    const chosenTopic = genTopic.trim() || topics[Math.floor(Math.random() * topics.length)];

    const levelInstructions = {
      'A1': 'Oraciones cortas en Präsens, vocabulario básico cotidiano (aprox 50 palabras).',
      'A2': 'Usa Perfekt, preposiciones comunes y conectores como weil, dass, wenn (aprox 70 palabras).',
      'B1': 'Incluye Präteritum, oraciones de relativo (Relativsätze) y verbos reflexivos (aprox 90 palabras).',
      'B2': 'Usa voz pasiva (Passiv), Konjunktiv II, conectores dobles (zwar... aber) y vocabulario rico (aprox 110 palabras).',
      'C1': 'Usa estilo académico/literario, Konjunktiv I (estilo indirecto), estructuras nominales y preposiciones de Genitiv como infolge, anhand (aprox 130 palabras).'
    };

    try {
      const prompt = `Escribe una lectura original e interesante en alemán de nivel MCER ${genLevel} sobre el tema: "${chosenTopic}".
Requisitos gramaticales: ${levelInstructions[genLevel]}.
Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{
  "title": "Título atractivo en alemán",
  "category": "Categoría en español (ej. Cultura, Ciencia, Vida Diaria)",
  "readTime": "3 min",
  "content": "Texto completo en alemán...",
  "translation": "Traducción completa al español del texto..."
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      const xpMap = { 'A1': 35, 'A2': 50, 'B1': 75, 'B2': 100, 'C1': 140 };

      const newReading = {
        id: 'ai-' + Date.now(),
        level: genLevel,
        title: parsed.title,
        category: parsed.category || 'Generada con IA',
        readTime: parsed.readTime || '4 min',
        xp: xpMap[genLevel] || 60,
        content: parsed.content,
        translation: parsed.translation
      };

      setReadings(prev => [newReading, ...prev]);
      setGenTopic('');
      setSelectedReading(newReading);
      setSelectedWord(null);
      setShowTranslation(false);
    } catch (err) {
      setErrorMsg('Error al generar la lectura. Revisa tu conexión o tu API Key en Configuración (⚙️).');
    } finally {
      setIsGeneratingReading(false);
    }
  };

  // Guardar palabra en el banco personal de vocabulario
  const toggleSaveWord = (wordObj) => {
    if (!wordObj || !wordObj.lemma) return;
    const exists = savedWords.some(w => w.lemma === wordObj.lemma);
    if (exists) {
      setSavedWords(savedWords.filter(w => w.lemma !== wordObj.lemma));
    } else {
      setSavedWords([{ ...wordObj, savedAt: new Date().toLocaleDateString() }, ...savedWords]);
      setXp(prev => prev + 5);
    }
  };

  const completeReading = (id, rewardXp) => {
    if (!completedReadings.includes(id)) {
      setCompletedReadings([...completedReadings, id]);
      setXp(prev => prev + rewardXp);
    }
  };

  const filteredReadings = selectedLevelFilter === 'ALL' 
    ? readings 
    : readings.filter(r => r.level === selectedLevelFilter);

  const userLevelNumber = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* BARRA SUPERIOR */}
      <header className="bg-indigo-600 text-white px-4 py-3.5 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => { setSelectedReading(null); setActiveTab('readings'); }}
        >
          <div className="bg-white/15 p-1.5 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-none tracking-tight">LeseDeutsch</h1>
            <span className="text-[10px] text-indigo-200 font-medium">A1 – C1 Interactive Reader</span>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className="flex items-center gap-1 bg-indigo-700/90 px-2.5 py-1 rounded-full text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {streak}d
          </span>
          <span className="flex items-center gap-1 bg-indigo-700/90 px-2.5 py-1 rounded-full text-xs font-bold">
            <Award className="w-3.5 h-3.5 text-yellow-300" /> {xp} XP
          </span>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${apiKey ? 'bg-indigo-700 text-emerald-300' : 'bg-amber-500 text-white animate-pulse'}`}
            title="Configurar IA (Gemini API Key)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MODAL DE CONFIGURACIÓN DE LLAVE IA */}
      {showSettings && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" /> Motor de Inteligencia Artificial (Gemini)
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cerrar ✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pega tu clave gratuita de <strong>Google AI Studio</strong> para que la aplicación genere lecturas nuevas ilimitadas de nivel A1 a C1 y analice la declinación o conjugación de cualquier palabra alemana al instante.
            </p>
            <div className="flex gap-2">
              <input 
                type="password"
                placeholder="Pega aquí tu API Key (AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value.trim())}
                className="flex-1 p-2.5 text-sm border border-slate-300 rounded-xl focus:outline-indigo-600"
              />
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Guardar
              </button>
            </div>
            {apiKey && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Llave guardada en este dispositivo. ¡Listo para generar y analizar!
              </p>
            )}
          </div>
        </div>
      )}

      {/* MENSAJES DE ERROR */}
      {errorMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold ml-2">✕</button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-2xl mx-auto p-4">
        {selectedReading ? (
          /* ==========================================
             VISTA DEL LECTOR INTERACTIVO
             ========================================== */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => { setSelectedReading(null); setSelectedWord(null); setShowTranslation(false); }}
                  className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline cursor-pointer"
                >
                  ← Biblioteca
                </button>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => speakGerman(selectedReading.content)}
                    className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Escuchar todo
                  </button>
                  <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-extrabold">
                    {selectedReading.level}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900">{selectedReading.title}</h2>
              <p className="text-xs text-slate-400 mt-1 mb-5">
                {selectedReading.category} • {selectedReading.readTime} • Toca cualquier palabra para ver su gramática
              </p>

              {/* TEXTO INTERACTIVO PALABRA POR PALABRA */}
              <div className="text-lg leading-relaxed text-slate-800 flex flex-wrap gap-x-1.5 gap-y-2.5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                {selectedReading.content.split(' ').map((word, index) => {
                  const cleanW = word.toLowerCase().replace(/[.,!?;:"()]/g, '').trim();
                  const isSaved = savedWords.some(sw => sw.word?.toLowerCase() === cleanW);
                  return (
                    <button
                      key={index}
                      onClick={() => handleWordClick(word)}
                      className={`px-1.5 py-0.5 rounded-lg transition-all cursor-pointer text-left font-medium ${
                        isSaved 
                          ? 'bg-amber-100 text-amber-900 underline decoration-amber-400' 
                          : 'hover:bg-indigo-600 hover:text-white active:scale-95'
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>

              {/* BOTÓN PARA MOSTRAR TRADUCCIÓN COMPLETA */}
              {selectedReading.translation && (
                <div className="mt-4">
                  <button 
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    {showTranslation ? 'Ocultar traducción al español' : 'Ver traducción completa al español'}
                  </button>
                  {showTranslation && (
                    <p className="mt-2 text-sm text-slate-600 bg-slate-100 p-4 rounded-xl italic leading-relaxed">
                      {selectedReading.translation}
                    </p>
                  )}
                </div>
              )}

              {/* INSPECTOR GRAMATICAL EN TIEMPO REAL */}
              {selectedWord && (
                <div className={`mt-6 p-5 rounded-2xl border-2 transition-all shadow-md ${getGenderStyle(selectedWord.gender)}`}>
                  {selectedWord.analyzing ? (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-900">Analizando declinación, género y contexto con IA...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black ${getBadgeStyle(selectedWord.gender)}`}>
                              {selectedWord.type || 'Palabra'} {selectedWord.gender && selectedWord.gender !== 'verbo' ? `• ${selectedWord.gender}` : ''}
                            </span>
                            {selectedWord.plural && (
                              <span className="text-xs opacity-75 font-semibold">Plural: {selectedWord.plural}</span>
                            )}
                          </div>
                          <h3 className="text-2xl font-black mt-1">{selectedWord.lemma || selectedWord.word}</h3>
                          <p className="text-base font-bold opacity-90">{selectedWord.meaning}</p>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => speakGerman(selectedWord.lemma || selectedWord.word)}
                            className="p-2.5 bg-white rounded-xl shadow-xs hover:scale-105 transition-transform cursor-pointer"
                            title="Escuchar pronunciación"
                          >
                            <Volume2 className="w-5 h-5 text-indigo-600" />
                          </button>
                          <button 
                            onClick={() => toggleSaveWord(selectedWord)}
                            className={`p-2.5 rounded-xl shadow-xs transition-transform cursor-pointer ${
                              savedWords.some(w => w.lemma === selectedWord.lemma)
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-600 hover:text-amber-600'
                            }`}
                            title="Guardar en mi vocabulario"
                          >
                            <Bookmark className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Nota de uso en la oración actual */}
                      {selectedWord.contextNote && (
                        <div className="mt-3 text-xs bg-white/70 p-2.5 rounded-xl border border-current/10 font-medium">
                          <strong>En esta frase:</strong> {selectedWord.contextNote}
                        </div>
                      )}

                      {/* TABLA DE DECLINACIÓN (SI ES SUSTANTIVO) */}
                      {selectedWord.declension && (
                        <div className="mt-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider mb-2 opacity-80">Tabla de Declinación (4 Casos):</p>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-white/85 p-3 rounded-xl border border-current/10">
                            <div><span className="font-bold text-slate-500">Nominativ:</span> <span className="font-bold">{selectedWord.declension.nominativ}</span></div>
                            <div><span className="font-bold text-slate-500">Akkusativ:</span> <span className="font-bold">{selectedWord.declension.akkusativ}</span></div>
                            <div><span className="font-bold text-slate-500">Dativ:</span> <span className="font-bold">{selectedWord.declension.dativ}</span></div>
                            <div><span className="font-bold text-slate-500">Genitiv:</span> <span className="font-bold">{selectedWord.declension.genitiv}</span></div>
                          </div>
                        </div>
                      )}

                      {/* TABLA DE CONJUGACIÓN (SI ES VERBO) */}
                      {selectedWord.conjugation && (
                        <div className="mt-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider mb-2 opacity-80">Conjugación Verbal (Präsens & Pasado):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/85 p-3 rounded-xl border border-current/10">
                            <div><span className="text-slate-500">ich:</span> <strong>{selectedWord.conjugation.ich}</strong></div>
                            <div><span className="text-slate-500">du:</span> <strong>{selectedWord.conjugation.du}</strong></div>
                            <div><span className="text-slate-500">er/sie/es:</span> <strong>{selectedWord.conjugation.er_sie_es}</strong></div>
                            <div><span className="text-slate-500">wir:</span> <strong>{selectedWord.conjugation.wir}</strong></div>
                            <div><span className="text-slate-500">ihr:</span> <strong>{selectedWord.conjugation.ihr}</strong></div>
                            <div><span className="text-slate-500">sie/Sie:</span> <strong>{selectedWord.conjugation.sie_Sie}</strong></div>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs bg-white/85 px-3 py-2 rounded-xl border border-current/10">
                            <div><span className="text-slate-500 font-semibold">Präteritum:</span> <strong>{selectedWord.conjugation.praeteritum}</strong></div>
                            <div><span className="text-slate-500 font-semibold">Perfekt:</span> <strong>{selectedWord.conjugation.perfekt}</strong></div>
                          </div>
                        </div>
                      )}

                      {/* EJEMPLO DE USO */}
                      {selectedWord.example && (
                        <div className="mt-4 pt-3 border-t border-current/10 text-xs space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            Ejemplo: <span className="italic font-semibold">"{selectedWord.example}"</span>
                          </p>
                          {selectedWord.exampleTranslation && (
                            <p className="opacity-75">{selectedWord.exampleTranslation}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* BOTÓN DE COMPLETAR LECTURA */}
              <button
                onClick={() => completeReading(selectedReading.id, selectedReading.xp)}
                disabled={completedReadings.includes(selectedReading.id)}
                className={`mt-6 w-full font-bold py-3.5 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 ${
                  completedReadings.includes(selectedReading.id) 
                    ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                <CheckCircle className="w-5 h-5" /> 
                {completedReadings.includes(selectedReading.id) 
                  ? '¡Lectura Completada!' 
                  : `Terminar lectura y reclamar +${selectedReading.xp} XP`}
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================
             VISTAS PRINCIPALES (LECTURAS / VOCABULARIO / DASHBOARD)
             ========================================== */
          <div>
            {activeTab === 'readings' && (
              <div className="space-y-5">
                {/* TARJETA GENERADORA DE LECTURAS AUTOMÁTICAS CON IA */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 rounded-2xl shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <h2 className="font-extrabold text-base">Generador Automático de Lecturas</h2>
                  </div>
                  <p className="text-xs text-indigo-100 mb-4">
                    Elige tu nivel y escribe un tema (o déjalo en blanco para un tema sorpresa). La IA creará una lectura nueva adaptada a ti.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      value={genLevel}
                      onChange={e => setGenLevel(e.target.value)}
                      className="bg-white/15 text-white font-bold text-xs px-3 py-2.5 rounded-xl border border-white/25 focus:outline-none"
                    >
                      <option value="A1" className="text-slate-900">Nivel A1 (Principiante)</option>
                      <option value="A2" className="text-slate-900">Nivel A2 (Elemental)</option>
                      <option value="B1" className="text-slate-900">Nivel B1 (Intermedio)</option>
                      <option value="B2" className="text-slate-900">Nivel B2 (Avanzado)</option>
                      <option value="C1" className="text-slate-900">Nivel C1 (Dominio)</option>
                    </select>
                    <input 
                      type="text"
                      placeholder="Tema opcional (ej. Viaje a Berlín, Fútbol, Ciencia...)"
                      value={genTopic}
                      onChange={e => setGenTopic(e.target.value)}
                      className="flex-1 bg-white/15 placeholder-indigo-200 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/25 focus:outline-none"
                    />
                    <button
                      onClick={handleGenerateAIReading}
                      disabled={isGeneratingReading}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingReading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Creando...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generar Lectura</>
                      )}
                    </button>
                  </div>
                </div>

                {/* FILTRO POR NIVELES */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedLevelFilter(lvl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          selectedLevelFilter === lvl 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl === 'ALL' ? 'Todos' : lvl}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">{filteredReadings.length} textos</span>
                </div>

                {/* LISTA DE LECTURAS */}
                <div className="space-y-3">
                  {filteredReadings.map((reading) => (
                    <div 
                      key={reading.id}
                      onClick={() => { setSelectedReading(reading); setSelectedWord(null); setShowTranslation(false); }}
                      className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div className="pr-3">
                        <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                            reading.level === 'C1' ? 'bg-purple-100 text-purple-700' :
                            reading.level === 'B2' ? 'bg-blue-100 text-blue-700' :
                            reading.level === 'B1' ? 'bg-teal-100 text-teal-700' :
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            {reading.level}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{reading.category} • {reading.readTime} • +{reading.xp} XP</span>
                          {completedReadings.includes(reading.id) && (
                            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">✓ Leída</span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{reading.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">{reading.content}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==========================================
               PESTAÑA DE VOCABULARIO Y FLASHCARDS
               ========================================== */}
            {activeTab === 'vocab' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-900">Mi Vocabulario & Flashcards</h2>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                    {savedWords.length} guardadas
                  </span>
                </div>

                {savedWords.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                    <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">Aún no has guardado palabras</p>
                    <p className="text-xs text-slate-500">
                      Mientras lees un texto, toca cualquier palabra y presiona el ícono de marcador para guardarla en tus Flashcards de repaso.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MODO FLASHCARD INTERACTIVA */}
                    <div 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`p-8 rounded-2xl border-2 shadow-sm cursor-pointer transition-all text-center min-h-[210px] flex flex-col justify-center items-center ${
                        isFlipped ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-900 border-indigo-200'
                      }`}
                    >
                      <span className="text-[11px] uppercase tracking-wider opacity-60 font-bold mb-2">
                        Tarjeta {flashcardIndex + 1} de {savedWords.length} (Toca para voltear)
                      </span>
                      {!isFlipped ? (
                        <>
                          <h3 className="text-3xl font-black">{savedWords[flashcardIndex]?.lemma}</h3>
                          <span className="mt-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">
                            {savedWords[flashcardIndex]?.type} • {savedWords[flashcardIndex]?.gender}
                          </span>
                        </>
                      ) : (
                        <>
                          <h3 className="text-2xl font-extrabold text-amber-300">{savedWords[flashcardIndex]?.meaning}</h3>
                          {savedWords[flashcardIndex]?.example && (
                            <p className="text-xs mt-3 italic text-indigo-100">"{savedWords[flashcardIndex]?.example}"</p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex justify-between gap-3">
                      <button
                        onClick={() => { setIsFlipped(false); setFlashcardIndex((prev) => (prev - 1 + savedWords.length) % savedWords.length); }}
                        className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => speakGerman(savedWords[flashcardIndex]?.lemma)}
                        className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" /> Pronunciar
                      </button>
                      <button
                        onClick={() => { setIsFlipped(false); setFlashcardIndex((prev) => (prev + 1) % savedWords.length); }}
                        className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                      >
                        Siguiente →
                      </button>
                    </div>

                    {/* LISTA DE PALABRAS GUARDADAS */}
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Lista completa</h3>
                      {savedWords.map((item, idx) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900">{item.lemma}</span>
                            <span className="text-slate-400 mx-2">•</span>
                            <span className="text-sm text-indigo-600 font-semibold">{item.meaning}</span>
                          </div>
                          <button 
                            onClick={() => speakGerman(item.lemma)}
                            className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==========================================
               PESTAÑA DE DASHBOARD PROGRESIVO
               ========================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                <h2 className="text-xl font-black text-slate-900">Tu Avance Progresivo</h2>

                {/* BARRA DE NIVEL DEL ESTUDIANTE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-indigo-600">Nivel de Estudiante {userLevelNumber}</span>
                    <span className="text-xs font-bold text-slate-400">{levelProgress} / 100 XP para Nivel {userLevelNumber + 1}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${levelProgress}%` }}></div>
                  </div>
                </div>

                {/* MÉTRICAS PRINCIPALES */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                    <p className="text-2xl font-black text-indigo-600">{xp}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">Experiencia (XP)</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                    <p className="text-2xl font-black text-emerald-600">{completedReadings.length}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">Textos Leídos</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                    <p className="text-2xl font-black text-amber-500">{ Object.keys(dictionary).length }</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">Palabras Exploradas</p>
                  </div>
                </div>

                {/* PROGRESO POR NIVEL MCER (A1 - C1) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 mb-4 text-sm">Dominio de Lecturas por Nivel (MCER)</h3>
                  <div className="space-y-3">
                    {['A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => {
                      const totalLvl = readings.filter(r => r.level === lvl).length;
                      const doneLvl = completedReadings.filter(id => readings.find(r => r.id === id)?.level === lvl).length;
                      const pct = totalLvl > 0 ? Math.round((doneLvl / totalLvl) * 100) : 0;
                      return (
                        <div key={lvl} className="flex items-center justify-between text-xs">
                          <span className="font-extrabold w-8 text-slate-700">{lvl}</span>
                          <div className="flex-1 mx-3 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-slate-500 font-bold w-12 text-right">{doneLvl}/{totalLvl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MENÚ DE NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2.5 px-6 flex justify-around shadow-lg z-50">
        <button 
          onClick={() => { setActiveTab('readings'); setSelectedReading(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'readings' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px]">Lecturas</span>
        </button>
        <button 
          onClick={() => { setActiveTab('vocab'); setSelectedReading(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'vocab' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px]">Vocabulario ({savedWords.length})</span>
        </button>
        <button 
          onClick={() => { setActiveTab('dashboard'); setSelectedReading(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[11px]">Dashboard</span>
        </button>
      </nav>
    </div>
  );
}