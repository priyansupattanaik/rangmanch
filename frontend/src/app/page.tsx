'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import { Upload, FileText, ArrowRight, ShieldCheck, Sparkles, AlertCircle, BookOpen } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { setProjectInfo, setCultureConfig } = useProjectStore();

  const [cultures, setCultures] = useState<any[]>([]);
  const [selectedCultureId, setSelectedCultureId] = useState('malwai');
  const [secondCultureId, setSecondCultureId] = useState('');
  const [setting, setSetting] = useState<'rural' | 'urban'>('rural');
  const [outputScript, setOutputScript] = useState<'Devanagari' | 'Latin'>('Devanagari');
  
  const [projectName, setProjectName] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default sample screenplay to make testing instant
  const sampleScreenplay = `INT. HAVELI COURTYARD - MORNING

The neem tree casts long shadows across the sandstone courtyard.
Amar enters with a sealed envelope.

AMAR:
Good morning father. The dispatch from the registry arrived before dawn.

RAM SINGH:
(without looking up from his accounts)
Place it on the wooden table, elder son. Some envelopes carry only debts of honor.

AMAR:
The inspector demands an answer by noon.

RAM SINGH:
A man does not trade his ancestors' name for an inspector's haste.`;

  useEffect(() => {
    api.getCultures()
      .then((data) => {
        if (data && data.length > 0) {
          setCultures(data);
          setSelectedCultureId(data[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch cultures, using defaults:', err);
        // Fallback default cultures
        setCultures([
          {
            id: 'malwai',
            name: 'Malwai',
            region: 'Madhya Pradesh — Malwa plateau',
            dialect_notes: 'Blend of Hindi and Rajasthani with sa softener.',
            architecture: 'Sandstone haveli, open courtyard (aangan), neem tree centre',
            greetings: 'Ram Ram sa',
          },
          {
            id: 'mewari',
            name: 'Mewari',
            region: 'Rajasthan — Mewar division (Udaipur, Chittorgarh)',
            dialect_notes: 'Rajasthani Mewar lineage with hukum and glottal markers.',
            architecture: 'Whitewashed stone courtyard palace, jharokha balconies',
            greetings: 'Khamma Ghani',
          },
          {
            id: 'majhi',
            name: 'Majhi',
            region: 'Punjab — central belt (Amritsar, Gurdaspur)',
            dialect_notes: 'Tonal Punjabi with warm colloquial idioms.',
            architecture: 'Red brick kothi, deorhi vestibule, baithak',
            greetings: 'Sat Sri Akal',
          },
        ]);
      });
  }, []);

  const currentCulture = cultures.find((c) => c.id === selectedCultureId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const content = selectedFile ? '' : (rawText || sampleScreenplay);

    if (!selectedFile && !content.trim()) {
      setError('Please provide screenplay text or upload a file.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('raw_screenplay', content);
      }
      formData.append('name', projectName || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'The Haveli Protocol'));

      // 1. Create Project
      const project = await api.createProject(formData);
      setProjectInfo({ id: project.id, name: project.name, status: project.status });

      // Save culture config
      setCultureConfig({
        selectedCulture: selectedCultureId,
        secondCulture: secondCultureId || null,
        setting,
        outputScript,
      });

      // 2. Automatically Run Stage 1 & 2 Extraction
      await api.extractProject(project.id);

      // 3. Navigate to Gate 1 Review
      router.push('/review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono mb-1">
          <Sparkles className="w-4 h-4" />
          <span>STAGE 0: INGESTION & GROUNDING</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          RANGMANCH <span className="text-zinc-500 font-normal text-xl">| Script Adaptation Studio</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Transmute dramatic screenplays across regional Indian traditions with verified dialectology and zero cultural hallucination.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-700/60 p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Upload / Screenplay */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Screenplay Ingestion</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setRawText(sampleScreenplay);
                setProjectName('The Haveli Protocol');
                setSelectedFile(null);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-mono"
            >
              Load Sample Screenplay
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Project Name (Optional)</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. The Haveli Protocol (SC01-03)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Drag & Drop File */}
          <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl p-4 text-center cursor-pointer relative bg-zinc-950/50">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  setRawText('');
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
            <p className="text-xs text-zinc-300 font-medium">
              {selectedFile ? selectedFile.name : 'Drag & drop screenplay (PDF, DOCX, or TXT)'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Supports standard Hollywood & Indian draft layouts</p>
          </div>

          <div className="text-center text-xs text-zinc-500 font-mono">— OR PASTE TEXT BELOW —</div>

          <div>
            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setSelectedFile(null);
              }}
              placeholder={`INT. HAVELI COURTYARD - MORNING\n\nAmar enters with a letter...\n\nAMAR:\nGood morning father.`}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Right Panel: Cultural Grounding */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Target Cultural Grounding</span>
            </h2>

            {/* Culture Select */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Primary Regional Culture <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCultureId}
                onChange={(e) => setSelectedCultureId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {cultures.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id} — {c.region}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional second culture for parallel adaptation */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Parallel Culture (Optional Comparison)
              </label>
              <select
                value={secondCultureId}
                onChange={(e) => setSecondCultureId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">None (Single Culture Mode)</option>
                {cultures
                  .filter((c) => c.id !== selectedCultureId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id} — {c.region}
                    </option>
                  ))}
              </select>
            </div>

            {/* Cultural Preview Box */}
            {currentCulture && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                  <span>DIALECT DETAILS</span>
                  <span className="text-amber-400">{currentCulture.greetings}</span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">{currentCulture.dialect_notes}</p>
                <div className="text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2">
                  <span className="text-zinc-500 font-medium">Architecture: </span>
                  {currentCulture.architecture}
                </div>
              </div>
            )}

            {/* Setting Toggle: Rural / Urban */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Setting Ambiance</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSetting('rural')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    setting === 'rural'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  🌾 Rural Ancestral
                </button>
                <button
                  type="button"
                  onClick={() => setSetting('urban')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    setting === 'urban'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  🏙️ Urban Contemporary
                </button>
              </div>
            </div>

            {/* Output Script */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Output Script</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputScript('Devanagari')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    outputScript === 'Devanagari'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  देवनागरी (Devanagari)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputScript('Latin')}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    outputScript === 'Latin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  Latin / Romanized
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-sm flex items-center justify-center space-x-2 transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Extracting & Grounding...' : 'Extract & Analyse'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Prime Rule Card */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-200/90">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Ground Truth Guarantee</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Cultural adaptation uses a curated reference set. Uncertain cultural decisions will be flagged for your review. No facts are ever invented.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
