
const fs = require("fs");
const code = `import React, { useState, useEffect } from "react";
import { BookOpen, Award, BarChart2, Volume2, CheckCircle, Flame, ArrowRight, Sparkles, Bookmark, RefreshCw, Layers, Eye } from "lucide-react";
import { INITIAL_READINGS, INITIAL_DICTIONARY } from "./data/readings";

export default function App() {
  const [activeTab, setActiveTab] = useState("readings");
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const [xp, setXp] = useState(() => Number(localStorage.getItem("ld_xp")) || 120);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem("ld_streak")) || 3);
  const [completedReadings, setCompletedReadings] = useState(() => JSON.parse(localStorage.getItem("ld_completed")) || []);
  const [savedWords, setSavedWords] = useState(() => JSON.parse(localStorage.getItem("ld_saved_words")) || []);
  const [readings, setReadings] = useState(() => JSON.parse(localStorage.getItem("ld_readings")) || INITIAL_READINGS);
  const [dictionary, setDictionary] = useState(() => JSON.parse(localStorage.getItem("ld_dict")) || INITIAL_DICTIONARY);

  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL");
  const [genLevel, setGenLevel] = useState("A2");
  const [genTopic, setGenTopic] = useState("");
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => { localStorage.setItem("ld_xp", xp); }, [xp]);
  useEffect(() => { localStorage.setItem("ld_streak", streak); }, [streak]);
  useEffect(() => { localStorage.setItem("ld_completed", JSON.stringify(completedReadings)); }, [completedReadings]);
  useEffect(() => { localStorage.setItem("ld_saved_words", JSON.stringify(savedWords)); }, [savedWords]);
  useEffect(() => { localStorage.setItem("ld_readings", JSON.stringify(readings)); }, [readings]);
  useEffect(() => { localStorage.setItem("ld_dict", JSON.stringify(dictionary)); }, [dictionary]);

  const speakGerman = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE"; u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.includes("de"));
      const best = voices.find(v => v.name.includes("Natural") || v.name.includes("Online") || v.name.includes("Google")) || voices[0];
      if (best) u.voice = best;
      window.speechSynthesis.speak(u);
    }
  };

  const getGenderStyle = (g = "") => {
    const s = g.toLowerCase();
    if (s.includes("masculin") || s === "der") return "bg-blue-50 border-blue-200 text-blue-900";
    if (s.includes("femenin") || s === "die") return "bg-rose-50 border-rose-200 text-rose-900";
    if (s.includes("neutr") || s === "das") return "bg-emerald-50 border-emerald-200 text-emerald-900";
    return "bg-indigo-50 border-indigo-200 text-indigo-900";
  };

  const handleWordClick = async (rawWord) => {
    const cleanKey = rawWord.toLowerCase().replace(/[.,!?;:"()«»„“]/g, "").trim();
    if (!cleanKey) return;
    speakGerman(cleanKey);
    setErrorMsg("");
    if (dictionary[cleanKey]) { setSelectedWord(dictionary[cleanKey]); return; }
    setSelectedWord({ word: rawWord, analyzing: true });
    try {
      const prompt = "Analiza la palabra alemana \\"" + rawWord + "\\" en la oracion: \\"" + selectedReading.content + "\\". Devuelve SOLO JSON: { \\"word\\": \\"\\", \\"lemma\\": \\"con articulo o infinitivo\\", \\"type\\": \\"Sustantivo|Verbo|Otro\\", \\"gender\\": \\"masculino|femenino|neutro|verbo\\", \\"meaning\\": \\"traduccion\\", \\"contextNote\\": \\"caso o tiempo verbal\\", \\"declension\\": {\\"nominativ\\":\\"\\",\\"akkusativ\\":\\"\\",\\"dativ\\":\\"\\",\\"genitiv\\":\\"\\"}, \\"conjugation\\": {\\"ich\\":\\"\\",\\"du\\":\\"\\",\\"er_sie_es\\":\\"\\",\\"wir\\":\\"\\",\\"ihr\\":\\"\\",\\"sie_Sie\\":\\"\\"}, \\"example\\": \\"\\", \\"exampleTranslation\\": \\"\\" }";
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error HTTP " + res.status);
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\\`\\`\\`json/g, "").replace(/\\`\\`\\`/g, "").trim();
      const parsed = JSON.parse(txt);
      setDictionary(p => ({ ...p, [cleanKey]: parsed }));
      setSelectedWord(parsed);
      setXp(p => p + 2);
    } catch (err) {
      setErrorMsg("Error API: " + err.message);
      setSelectedWord(null);
    }
  };

  const handleGenerateAIReading = async () => {
    setIsGeneratingReading(true);
    setErrorMsg("");
    const topics = ["Un misterio en Viena", "Tecnologia del futuro", "Costumbres en Alemania", "Senderismo en los Alpes"];
    const topic = genTopic.trim() || topics[Math.floor(Math.random() * topics.length)];
    try {
      const prompt = "Escribe una lectura en aleman nivel " + genLevel + " sobre: \\"" + topic + "\\" (aprox 80 palabras). Devuelve SOLO JSON: { \\"title\\": \\"\\", \\"category\\": \\"\\", \\"readTime\\": \\"3 min\\", \\"content\\": \\"texto en aleman\\", \\"translation\\": \\"traduccion al espanol\\" }";
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error HTTP " + res.status);
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\\`\\`\\`json/g, "").replace(/\\`\\`\\`/g, "").trim();
      const parsed = JSON.parse(txt);
      const newReading = { id: "ai-" + Date.now(), level: genLevel, title: parsed.title, category: parsed.category || "IA", readTime: "3 min", xp: 60, content: parsed.content, translation: parsed.translation };
      setReadings(p => [newReading, ...p]);
      setGenTopic("");
      setSelectedReading(newReading);
      setSelectedWord(null);
      setShowTranslation(false);
    } catch (err) {
      setErrorMsg("Error API: " + err.message);
    } finally {
      setIsGeneratingReading(false);
    }
  };

  const toggleSaveWord = (w) => {
    if (!w?.lemma) return;
    const exists = savedWords.some(x => x.lemma === w.lemma);
    setSavedWords(exists ? savedWords.filter(x => x.lemma !== w.lemma) : [w, ...savedWords]);
  };

  const completeReading = (id, reward) => {
    if (!completedReadings.includes(id)) { setCompletedReadings([...completedReadings, id]); setXp(p => p + reward); }
  };

  const filtered = selectedLevelFilter === "ALL" ? readings : readings.filter(r => r.level === selectedLevelFilter);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <header className="bg-indigo-600 text-white px-4 py-3.5 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedReading(null); setActiveTab("readings"); }}>
          <BookOpen className="w-6 h-6" />
          <h1 className="text-lg font-extrabold">LeseDeutsch</h1>
        </div>
        <div className="flex gap-2 items-center text-xs font-bold">
          <span className="bg-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-400" /> {streak}d</span>
          <span className="bg-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1"><Award className="w-3.5 h-3.5 text-yellow-300" /> {xp} XP</span>
        </div>
      </header>

      {errorMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")}>X</button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4">
        {selectedReading ? (
          <div className="bg-white rounded-2xl shadow-xs border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => { setSelectedReading(null); setSelectedWord(null); }} className="text-indigo-600 font-bold text-sm cursor-pointer">? Biblioteca</button>
              <div className="flex gap-2">
                <button onClick={() => speakGerman(selectedReading.content)} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer"><Volume2 className="w-3.5 h-3.5" /> Escuchar</button>
                <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-bold">{selectedReading.level}</span>
              </div>
            </div>
            <h2 className="text-2xl font-black">{selectedReading.title}</h2>
            <div className="text-lg leading-relaxed flex flex-wrap gap-1.5 bg-slate-50 p-5 rounded-2xl border">
              {selectedReading.content.split(" ").map((w, i) => (
                <button key={i} onClick={() => handleWordClick(w)} className="px-1.5 py-0.5 rounded-lg hover:bg-indigo-600 hover:text-white cursor-pointer font-medium">{w}</button>
              ))}
            </div>
            {selectedReading.translation && (
              <div>
                <button onClick={() => setShowTranslation(!showTranslation)} className="text-xs font-bold text-slate-500 flex items-center gap-1 cursor-pointer"><Eye className="w-4 h-4" /> {showTranslation ? "Ocultar" : "Ver traduccion"}</button>
                {showTranslation && <p className="mt-2 text-sm text-slate-600 bg-slate-100 p-4 rounded-xl italic">{selectedReading.translation}</p>}
              </div>
            )}
            {selectedWord && (
              <div className={"p-5 rounded-2xl border-2 " + getGenderStyle(selectedWord.gender)}>
                {selectedWord.analyzing ? (
                  <div className="flex items-center gap-2 py-4 font-bold text-sm"><RefreshCw className="w-4 h-4 animate-spin" /> Analizando con IA...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black bg-indigo-600 text-white px-2 py-0.5 rounded">{selectedWord.type} • {selectedWord.gender}</span>
                        <h3 className="text-2xl font-black mt-1">{selectedWord.lemma || selectedWord.word}</h3>
                        <p className="font-bold">{selectedWord.meaning}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => speakGerman(selectedWord.lemma || selectedWord.word)} className="p-2 bg-white rounded-xl"><Volume2 className="w-5 h-5 text-indigo-600" /></button>
                        <button onClick={() => toggleSaveWord(selectedWord)} className="p-2 bg-white rounded-xl"><Bookmark className="w-5 h-5 text-amber-500" /></button>
                      </div>
                    </div>
                    {selectedWord.contextNote && <p className="text-xs bg-white/70 p-2 rounded-lg"><strong>Contexto:</strong> {selectedWord.contextNote}</p>}
                    {selectedWord.declension && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-xl">
                        <div>Nom: <strong>{selectedWord.declension.nominativ}</strong></div>
                        <div>Akk: <strong>{selectedWord.declension.akkusativ}</strong></div>
                        <div>Dat: <strong>{selectedWord.declension.dativ}</strong></div>
                        <div>Gen: <strong>{selectedWord.declension.genitiv}</strong></div>
                      </div>
                    )}
                    {selectedWord.conjugation && (
                      <div className="grid grid-cols-3 gap-2 text-xs bg-white/80 p-3 rounded-xl">
                        <div>ich: <strong>{selectedWord.conjugation.ich}</strong></div>
                        <div>du: <strong>{selectedWord.conjugation.du}</strong></div>
                        <div>er/sie: <strong>{selectedWord.conjugation.er_sie_es}</strong></div>
                        <div>wir: <strong>{selectedWord.conjugation.wir}</strong></div>
                        <div>ihr: <strong>{selectedWord.conjugation.ihr}</strong></div>
                        <div>sie: <strong>{selectedWord.conjugation.sie_Sie}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => completeReading(selectedReading.id, selectedReading.xp)} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl cursor-pointer">
              {completedReadings.includes(selectedReading.id) ? "? Completada" : "Terminar lectura (+" + selectedReading.xp + " XP)"}
            </button>
          </div>
        ) : activeTab === "readings" ? (
          <div className="space-y-5">
            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md space-y-3">
              <h2 className="font-extrabold flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-300" /> Generador Automatico con IA</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={genLevel} onChange={e => setGenLevel(e.target.value)} className="bg-white text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl">
                  {["A1","A2","B1","B2","C1"].map(l => <option key={l} value={l}>Nivel {l}</option>)}
                </select>
                <input type="text" placeholder="Tema opcional..." value={genTopic} onChange={e => setGenTopic(e.target.value)} className="flex-1 bg-white/15 placeholder-indigo-200 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/25" />
                <button onClick={handleGenerateAIReading} disabled={isGeneratingReading} className="bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer">
                  {isGeneratingReading ? "Creando..." : "Generar"}
                </button>
              </div>
            </div>
            <div className="flex gap-1.5">
              {["ALL","A1","A2","B1","B2","C1"].map(l => (
                <button key={l} onClick={() => setSelectedLevelFilter(l)} className={"px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer " + (selectedLevelFilter === l ? "bg-indigo-600 text-white" : "bg-white border")}>{l === "ALL" ? "Todos" : l}</button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} onClick={() => setSelectedReading(r)} className="bg-white p-5 rounded-2xl border hover:border-indigo-400 cursor-pointer flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">{r.level}</span>
                    <h3 className="font-bold text-lg mt-1">{r.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{r.content}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "vocab" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black">Flashcards ({savedWords.length})</h2>
            {savedWords.length > 0 && (
              <div onClick={() => setIsFlipped(!isFlipped)} className="p-8 rounded-2xl border-2 bg-white text-center cursor-pointer">
                <h3 className="text-2xl font-black">{!isFlipped ? savedWords[flashcardIndex]?.lemma : savedWords[flashcardIndex]?.meaning}</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white p-4 rounded-2xl border"><p className="text-2xl font-black text-indigo-600">{xp}</p><p className="text-xs">XP</p></div>
            <div className="bg-white p-4 rounded-2xl border"><p className="text-2xl font-black text-emerald-600">{completedReadings.length}</p><p className="text-xs">Leidos</p></div>
            <div className="bg-white p-4 rounded-2xl border"><p className="text-2xl font-black text-amber-500">{Object.keys(dictionary).length}</p><p className="text-xs">Palabras</p></div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t py-2.5 px-6 flex justify-around z-50">
        <button onClick={() => { setActiveTab("readings"); setSelectedReading(null); }} className="flex flex-col items-center text-xs font-bold text-indigo-600"><BookOpen className="w-5 h-5" />Lecturas</button>
        <button onClick={() => { setActiveTab("vocab"); setSelectedReading(null); }} className="flex flex-col items-center text-xs font-bold text-slate-500"><Layers className="w-5 h-5" />Vocabulario</button>
        <button onClick={() => { setActiveTab("dashboard"); setSelectedReading(null); }} className="flex flex-col items-center text-xs font-bold text-slate-500"><BarChart2 className="w-5 h-5" />Dashboard</button>
      </nav>
    </div>
  );
};
fs.writeFileSync("src/App.jsx", code, "utf8");
console.log("App.jsx generado con éxito");

