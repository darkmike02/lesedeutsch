import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, BarChart2, Volume2, CheckCircle, Flame, 
  ArrowRight, Sparkles, Bookmark, RefreshCw, Layers, Eye
} from 'lucide-react';
import { INITIAL_READINGS, INITIAL_DICTIONARY } from './data/readings';

export default function App() {
  const [activeTab, setActiveTab] = useState('readings');
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // Progreso y persistencia local
  const [xp, setXp] = useState(() => Number(localStorage.getItem('ld_xp')) || 120);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('ld_streak')) || 3);
  const [completedReadings, setCompletedReadings] = useState(() => JSON.parse(localStorage.getItem('ld_completed')) || []);
  const [savedWords, setSavedWords] = useState(() => JSON.parse(localStorage.getItem('ld_saved_words')) || []);
  const [readings, setReadings] = useState(() => JSON.parse(localStorage.getItem('ld_readings')) || INITIAL_READINGS);
  const [dictionary, setDictionary] = useState(() => JSON.parse(localStorage.getItem('ld_dict')) || INITIAL_DICTIONARY);

  // Estados de IA y UI
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL');
  const [genLevel, setGenLevel] = useState('A2');
  const [genTopic, setGenTopic] = useState('');
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Flashcards
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => { localStorage.setItem('ld_xp', xp); }, [xp]);
  useEffect(() => { localStorage.setItem('ld_streak', streak); }, [streak]);
  useEffect(() => { localStorage.setItem('ld_completed', JSON.stringify(completedReadings)); }, [completedReadings]);
  useEffect(() => { localStorage.setItem('ld_saved_words', JSON.stringify(savedWords)); }, [savedWords]);
  useEffect(() => { localStorage.setItem('ld_readings', JSON.stringify(readings)); }, [readings]);
  useEffect(() => { localStorage.setItem('ld_dict', JSON.stringify(dictionary)); }, [dictionary]);

  // Pronunciación neuronal en alemán
  const speakGerman = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.includes('de'));
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

  // 1. Analizar palabra mediante el servidor seguro en Vercel (/api/generate)
  const handleWordClick = async (rawWord) => {
    const cleanKey = rawWord.toLowerCase().replace(/[.,!?;:"()«»„“]/g, '').trim();
    if (!cleanKey) return;

    speakGerman(cleanKey);
    setErrorMsg('');

    if (dictionary[cleanKey]) {
      setSelectedWord(dictionary[cleanKey]);
      return;
    }

    setSelectedWord({ word: rawWord, analyzing: true });

    try {
      const prompt = `Analiza la palabra alemana "${rawWord}" dentro del contexto de esta oración: "${selectedReading.content}".
Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni formato extra) con esta estructura exacta:
{
  "word": "palabra limpia",
  "lemma": "forma base con artículo si es sustantivo (ej. der Tisch) o infinitivo si es verbo",
  "type": "Sustantivo | Verbo | Adjetivo | Adverbio | Preposición",
  "gender": "masculino | femenino | neutro | verbo | otro",
  "article": "der | die | das | ''",
  "plural": "forma plural si es sustantivo o ''",
  "meaning": "traducción clara al español",
  "contextNote": "breve explicación de en qué caso o tiempo verbal está en esta oración",
  "declension": { "nominativ": "...", "akkusativ": "...", "dativ": "...", "genitiv": "..." },
  "conjugation": { "ich": "...", "du": "...", "er_sie_es": "...", "wir": "...", "ihr": "...", "sie_Sie": "...", "praeteritum": "...", "perfekt": "..." },
  "example": "oración de ejemplo sencilla en alemán",
  "exampleTranslation": "traducción del ejemplo al español"
}
Nota: Si NO es sustantivo, pon "declension": null. Si NO es verbo, pon "conjugation": null.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) throw new Error('Respuesta vacía de Gemini');
      textContent = textContent.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(textContent);
      setDictionary(prev => ({ ...prev, [cleanKey]: parsed }));
      setSelectedWord(parsed);
      setXp(prev => prev + 2);
    } catch (err) {
      setErrorMsg(`Error API: ${err.message}`);
      setSelectedWord(null);
    }
  };

  // 2. Generar lectura automática mediante el servidor seguro en Vercel (/api/generate)
  const handleGenerateAIReading = async () => {
    setIsGeneratingReading(true);
    setErrorMsg('');

    const topics = ['Un misterio en Viena', 'Tecnología del futuro', 'Costumbres en Alemania', 'Un día de senderismo en los Alpes', 'Filosofía cotidiana', 'Cocina tradicional'];
    const chosenTopic = genTopic.trim() || topics[Math.floor(Math.random() * topics.length)];

    const levelInstructions = {
      'A1': 'Oraciones cortas en Präsens, vocabulario básico cotidiano (aprox 50 palabras).',
      'A2': 'Usa Perfekt, preposiciones comunes y conectores como weil, dass, wenn (aprox 70 palabras).',
      'B1': 'Incluye Präteritum, oraciones de relativo (Relativsätze) y verbos reflexivos (aprox 90 palabras).',
      'B2': 'Usa voz pasiva (Passiv), Konjunktiv II, conectores dobles y vocabulario avanzado (aprox 110 palabras).',
      'C1': 'Usa estilo académico/literario, Konjunktiv I, estructuras nominales avanzadas (aprox 130 palabras).'
    };

    try {
      const prompt = `Escribe una lectura original en alemán de nivel MCER ${genLevel} sobre el tema: "${chosenTopic}".
Requisitos gramaticales: ${levelInstructions[genLevel]}.
Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown) con este formato exacto:
{
  "title": "Título atractivo en alemán",
  "category": "Categoría en español",
  "readTime": "3 min",
  "content": "Texto completo en alemán...",
  "translation": "Traducción completa al español..."
}`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) throw new Error('Respuesta vacía de Gemini');
      textContent = textContent.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(textContent);
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
      setErrorMsg(`Error API: ${err.message}`);
    } finally {
      setIsGeneratingReading(false);
    }
  };

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
        </div>
      </header>

      {/* ERRORES */}
      {errorMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium flex justify-between items-center shadow-sm">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold ml-2">✕</button>
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      <main className="max-w-2xl mx-auto p-4">
        {selectedReading ? (
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
                    className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-full cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Escuchar texto
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

              {/* TEXTO INTERACTIVO */}
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

              {/* TRADUCCIÓN */}
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

              {/* INSPECTOR GRAMATICAL */}
              {selectedWord && (
                <div className={`mt-6 p-5 rounded-2xl border-2 transition-all shadow-md ${getGenderStyle(selectedWord.gender)}`}>
                  {selectedWord.analyzing ? (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-900">Analizando con IA...</span>
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
                          >
                            <Volume2 className="w-5 h-5 text-indigo-600" />
                          </button>
                          <button 
                            onClick={() => toggleSaveWord(selectedWord)}
                            className={`p-2.5 rounded-xl shadow-xs transition-transform cursor-pointer ${
                              savedWords.some(w => w.lemma === selectedWord.lemma) ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'
                            }`}
                          >
                            <Bookmark className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {selectedWord.contextNote && (
                        <div className="mt-3 text-xs bg-white/70 p-2.5 rounded-xl border border-current/10 font-medium">
                          <strong>En esta frase:</strong> {selectedWord.contextNote}
                        </div>
                      )}

                      {selectedWord.declension && (
                        <div className="mt-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider mb-2 opacity-80">Declinación (4 Casos):</p>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-white/85 p-3 rounded-xl border border-current/10">
                            <div><span className="font-bold text-slate-500">Nominativ:</span> <strong>{selectedWord.declension.nominativ}</strong></div>
                            <div><span className="font-bold text-slate-500">Akkusativ:</span> <strong>{selectedWord.declension.akkusativ}</strong></div>
                            <div><span className="font-bold text-slate-500">Dativ:</span> <strong>{selectedWord.declension.dativ}</strong></div>
                            <div><span className="font-bold text-slate-500">Genitiv:</span> <strong>{selectedWord.declension.genitiv}</strong></div>
                          </div>
                        </div>
                      )}

                      {selectedWord.conjugation && (
                        <div className="mt-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider mb-2 opacity-80">Conjugación:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/85 p-3 rounded-xl border border-current/10">
                            <div><span className="text-slate-500">ich:</span> <strong>{selectedWord.conjugation.ich}</strong></div>
                            <div><span class