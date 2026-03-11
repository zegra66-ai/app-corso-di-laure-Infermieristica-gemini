import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  ClipboardCheck, 
  FileText, 
  Download, 
  User, 
  Calendar, 
  MessageSquare,
  Star,
  ChevronRight,
  ShieldCheck,
  Heart,
  Loader2,
  AlertCircle,
  Mail
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Year, Evaluation } from './types';
import { COMPETENCIES, STUDENTS_BY_YEAR } from './constants';
import { getAIFeedback } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedYear, setSelectedYear] = useState<Year>(Year.FIRST);
  const [studentName, setStudentName] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [department, setDepartment] = useState('');
  const [directorNotes, setDirectorNotes] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentCompetencies = useMemo(() => COMPETENCIES[selectedYear], [selectedYear]);

  const categories = useMemo(() => {
    const cats = new Set(currentCompetencies.map(c => c.category));
    return Array.from(cats);
  }, [currentCompetencies]);

  const filteredCompetencies = useMemo(() => {
    if (!selectedCategory) return currentCompetencies;
    return currentCompetencies.filter(c => c.category === selectedCategory);
  }, [currentCompetencies, selectedCategory]);

  const averageScore = useMemo(() => {
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) return "0.00";
    const sum = scoreValues.reduce((a, b) => a + b, 0);
    return (sum / scoreValues.length).toFixed(2);
  }, [scores]);

  const weightedGrade30 = useMemo(() => {
    // Scale 1-5 to 18-30
    // 1 -> 18 (or less, but let's say 1 is 12, 3 is 18, 5 is 30)
    // Simple linear: grade = 18 + (avg - 3) * (12 / 2) if avg >= 3
    const avg = parseFloat(averageScore);
    if (avg === 0) return 0;
    const grade = (avg / 5) * 30;
    return Math.round(grade);
  }, [averageScore]);

  const handleScoreChange = (id: string, score: number) => {
    setScores(prev => ({ ...prev, [id]: score }));
  };

  const isFormValid = useMemo(() => {
    return studentName && tutorName && currentCompetencies.every(c => scores[c.id]);
  }, [studentName, tutorName, currentCompetencies, scores]);

  const generateAIReport = async () => {
    if (!isFormValid) return;
    
    setIsGeneratingAI(true);
    setError(null);
    try {
      const evaluation: Evaluation = {
        studentName,
        tutorName,
        department,
        directorNotes,
        year: selectedYear,
        scores,
        notes,
        date: new Date().toLocaleDateString('it-IT'),
      };
      const feedback = await getAIFeedback(evaluation);
      setAiFeedback(feedback);
    } catch (err) {
      setError("Errore durante la generazione del feedback AI. Riprova.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [20, 83, 45]; // Dark Green

    // Header
    doc.setFillColor(240, 249, 244);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(20, 83, 45);
    doc.text("Report Valutazione Tirocinio", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Università del Salento - Corso di Laurea in Infermieristica`, 105, 30, { align: 'center' });

    // Info Section
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Studente: ${studentName}`, 20, 50);
    doc.text(`Tutor: ${tutorName}`, 20, 57);
    doc.text(`Reparto: ${department}`, 20, 64);
    doc.text(`Anno: ${selectedYear}`, 140, 50);
    doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 140, 57);

    // Stats
    doc.setFontSize(11);
    doc.text(`Media Valutazioni: ${averageScore}/5`, 20, 65);
    doc.text(`Voto Proposto: ${weightedGrade30}/30`, 140, 65);

    // Competencies Table
    const tableData = currentCompetencies.map(c => [
      c.category,
      c.description,
      scores[c.id] || '-'
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Categoria', 'Competenza', 'Punteggio (1-5)']],
      body: tableData,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Notes
    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.text("Note del Tutor", 20, finalY);
    doc.setFontSize(11);
    doc.setTextColor(0);
    const splitNotes = doc.splitTextToSize(notes || "Nessuna nota aggiuntiva.", 170);
    doc.text(splitNotes, 20, finalY + 7);
    
    finalY += (splitNotes.length * 7) + 10;

    // Director Notes
    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.text("Note al Direttore ADP", 20, finalY);
    doc.setFontSize(11);
    doc.setTextColor(0);
    const splitDirectorNotes = doc.splitTextToSize(directorNotes || "Nessuna nota aggiuntiva.", 170);
    doc.text(splitDirectorNotes, 20, finalY + 7);

    // AI Feedback if available
    if (aiFeedback) {
      const aiY = finalY + (splitDirectorNotes.length * 7) + 15;
      if (aiY > 250) doc.addPage();
      
      const currentY = aiY > 250 ? 20 : aiY;

      doc.setFontSize(14);
      doc.setTextColor(20, 83, 45);
      doc.text("Analisi AI (Criteri Fondazione Panico & UniSalento)", 20, currentY);
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      const feedbackText = `Feedback: ${aiFeedback.overallFeedback}\n\nRiflessione Etica: ${aiFeedback.ethicalReflection}\n\nVoto Suggerito AI: ${aiFeedback.gradeSuggestion}/30`;
      const splitFeedback = doc.splitTextToSize(feedbackText, 170);
      doc.text(splitFeedback, 20, currentY + 7);
    }

    doc.save(`Valutazione_${studentName.replace(/\s+/g, '_')}.pdf`);
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`Valutazione Tirocinio - ${studentName} - ${selectedYear}`);
    const body = encodeURIComponent(
      `Report Valutazione Tirocinio\n` +
      `---------------------------\n` +
      `Studente: ${studentName}\n` +
      `Tutor: ${tutorName}\n` +
      `Reparto: ${department}\n` +
      `Anno: ${selectedYear}\n` +
      `Data: ${new Date().toLocaleDateString('it-IT')}\n\n` +
      `Media Valutazioni: ${averageScore}/5\n` +
      `Voto Proposto: ${weightedGrade30}/30\n\n` +
      `Note del Tutor: ${notes || "Nessuna nota."}\n` +
      `Note al Direttore ADP: ${directorNotes || "Nessuna nota."}`
    );
    window.location.href = `mailto:polodidatticoformativo@piafondazionepanico.it?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-emerald-900">Corso di Laurea Infermieristica</h1>
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Valutazione Clinica</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-600" /> UniSalento</span>
            <span className="flex items-center gap-1.5"><Heart size={16} className="text-rose-500" /> Pia Fondazione Panico</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Config & Info */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} /> Anagrafica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">STUDENTE</label>
                  {STUDENTS_BY_YEAR[selectedYear].length > 0 ? (
                    <select
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none"
                    >
                      <option value="">Seleziona uno studente</option>
                      {STUDENTS_BY_YEAR[selectedYear].map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Nome e Cognome"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">TUTOR</label>
                  <input 
                    type="text" 
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    placeholder="Nome del Tutor"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">REPARTO/SERVIZIO</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Reparto o servizio"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={14} /> Percorso Formativo
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(Year).map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setScores({});
                      setAiFeedback(null);
                      setSelectedCategory(null);
                      setStudentName('');
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      selectedYear === year 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {year}
                    {selectedYear === year && <ChevronRight size={16} />}
                  </button>
                ))}
              </div>
            </section>

            {aiFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-900 text-white p-6 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Star className="text-yellow-400 fill-yellow-400" size={20} />
                  <h3 className="font-bold text-lg">Voto Suggerito</h3>
                </div>
                <div className="text-5xl font-black mb-2">{aiFeedback.gradeSuggestion}<span className="text-xl opacity-60">/30</span></div>
                <p className="text-xs text-emerald-200 leading-relaxed italic">
                  Basato su criteri tecnici UniSalento e valori etici Marcelline.
                </p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Checklist & Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Media Checklist</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-900">{averageScore}</span>
                  <span className="text-sm font-medium text-gray-400">/ 5</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(parseFloat(averageScore) / 5) * 100}%` }}
                    className="bg-emerald-500 h-full"
                  />
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Voto Proposto</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-900">{weightedGrade30}</span>
                  <span className="text-sm font-medium text-gray-400">/ 30</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(weightedGrade30 / 30) * 100}%` }}
                    className="bg-emerald-600 h-full"
                  />
                </div>
              </div>
            </div>

            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <ClipboardCheck className="text-emerald-600" /> Checklist Competenze
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
                      !selectedCategory 
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "bg-white border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-600"
                    )}
                  >
                    Tutte
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
                        selectedCategory === cat
                          ? "bg-emerald-600 border-emerald-600 text-white" 
                          : "bg-white border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-600"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                {filteredCompetencies.map((comp, idx) => (
                  <div key={comp.id} className="group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 block">
                          {comp.category}
                        </span>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          {comp.description}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleScoreChange(comp.id, num)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                              scores[comp.id] === num
                                ? "bg-emerald-600 border-emerald-600 text-white scale-110 shadow-lg shadow-emerald-100"
                                : "bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    {idx < filteredCompetencies.length - 1 && (
                      <div className="h-px bg-gray-100 w-full mt-6" />
                    )}
                  </div>
                ))}
                {filteredCompetencies.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm italic">Nessuna competenza trovata in questa categoria.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                <MessageSquare className="text-emerald-600" /> Osservazioni del Tutor
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inserisci commenti sull'attitudine, l'etica e le capacità relazionali dello studente..."
                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none text-sm mb-6"
              />

              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                <ShieldCheck className="text-emerald-600" /> Note al Direttore ADP
              </h2>
              <textarea
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                placeholder="Note del Direttore delle Attività Teorico Pratiche..."
                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none text-sm"
              />
            </section>

            {/* AI Feedback Display */}
            <AnimatePresence>
              {aiFeedback && (
                <motion.section 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 overflow-hidden"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                    <FileText className="text-emerald-600" /> Analisi Professionale AI
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Feedback Complessivo</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{aiFeedback.overallFeedback}</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Heart size={12} /> Dimensione Etico-Umanistica (Fondazione Panico)
                      </h4>
                      <p className="text-sm text-rose-900 leading-relaxed italic">{aiFeedback.ethicalReflection}</p>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={generateAIReport}
                disabled={!isFormValid || isGeneratingAI}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                  isFormValid && !isGeneratingAI
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                )}
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                    <Star size={18} />
                    Genera Analisi AI
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowFinalReport(true)}
                disabled={!isFormValid}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all border-2",
                  isFormValid
                    ? "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    : "border-gray-200 text-gray-300 cursor-not-allowed"
                )}
              >
                <FileText size={18} />
                Genera Report Finale
              </button>

              <button
                onClick={downloadPDF}
                disabled={!isFormValid}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all bg-gray-900 text-white hover:bg-black shadow-lg",
                  isFormValid
                    ? "opacity-100"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <Download size={18} />
                PDF
              </button>

              <button
                onClick={sendEmail}
                disabled={!isFormValid}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-lg",
                  isFormValid
                    ? "opacity-100"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <Mail size={18} />
                Invia Email
              </button>
            </div>

            {/* Final Report Modal */}
            <AnimatePresence>
              {showFinalReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900">Riepilogo Finale Tirocinio</h2>
                        <p className="text-sm text-gray-500">Documento di sintesi per l'archiviazione</p>
                      </div>
                      <button 
                        onClick={() => setShowFinalReport(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <AlertCircle size={24} className="rotate-45 text-gray-400" />
                      </button>
                    </div>

                    <div className="space-y-8 text-sm text-gray-800">
                      <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-6">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Studente</p>
                          <p className="font-bold text-lg">{studentName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Anno di Corso</p>
                          <p className="font-bold text-lg">{selectedYear}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Tutor Clinico</p>
                          <p className="font-bold">{tutorName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Reparto/Servizio</p>
                          <p className="font-bold">{department}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Data Valutazione</p>
                          <p className="font-bold">{new Date().toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>

                      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex justify-around text-center">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Media Checklist</p>
                          <p className="text-3xl font-black text-emerald-900">{averageScore}</p>
                        </div>
                        <div className="w-px bg-emerald-200" />
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Voto Proposto</p>
                          <p className="text-3xl font-black text-emerald-900">{weightedGrade30}/30</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-3">Note del Tutor</h3>
                        <p className="bg-gray-50 p-4 rounded-xl border border-gray-100 italic">{notes || "Nessuna nota."}</p>
                      </div>

                      <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-3">Note al Direttore ADP</h3>
                        <p className="bg-gray-50 p-4 rounded-xl border border-gray-100 italic">{directorNotes || "Nessuna nota."}</p>
                      </div>

                      {aiFeedback && (
                        <div className="space-y-4">
                          <h3 className="font-black text-emerald-600 uppercase tracking-widest text-xs">Analisi AI Consolidata</h3>
                          <div className="space-y-4 border-l-4 border-emerald-500 pl-6 py-2">
                            <p><strong>Feedback:</strong> {aiFeedback.overallFeedback}</p>
                            <p><strong>Etica:</strong> {aiFeedback.ethicalReflection}</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-8 flex gap-4">
                        <button 
                          onClick={() => window.print()}
                          className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
                        >
                          Stampa Documento
                        </button>
                        <button 
                          onClick={downloadPDF}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Salva come PDF
                        </button>
                        <button 
                          onClick={sendEmail}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                          Invia via Email
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 text-sm font-medium bg-rose-50 p-4 rounded-xl border border-rose-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {!isFormValid && (
              <p className="text-center text-xs text-gray-400 font-medium">
                * Completa tutti i campi e valuta tutte le competenze per sbloccare i report.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 font-medium mb-4">
          Sistema di Valutazione Accademica Rigorosa v1.0
        </p>
        <div className="flex items-center justify-center gap-8 opacity-30 grayscale">
          <img src="https://picsum.photos/seed/unisalento/100/40" alt="UniSalento Logo" className="h-8" referrerPolicy="no-referrer" />
          <img src="https://picsum.photos/seed/fondazionepanico/100/40" alt="Pia Fondazione Panico Logo" className="h-8" referrerPolicy="no-referrer" />
        </div>
      </footer>
    </div>
  );
}
