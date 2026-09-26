'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Play,
  Info,
  Sparkles,
  Upload,
  FileText,
  ShieldCheck,
  Flame,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Film,
  Compass,
  Award,
  BookOpen
} from 'lucide-react';
import NetflixCarousel from '@/components/NetflixCarousel';

export default function HomePage() {
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

  // Curated sample screenplay for rapid one-click demo
  const sampleScreenplay = `INT. HAVELI COURTYARD - MORNING

The neem tree casts sharp shadows across the sandstone courtyard.
Amar enters holding an ancestral silver seal and a registered notice.
Ram Singh sits at the carved accounts table checking land revenue files.

AMAR:
Good morning father. The tehsildar's messenger reached our gate at dawn.

RAM SINGH:
(without looking up from his ledger)
Place it on the desk, elder son. Some envelopes carry only debts of honor.

AMAR:
They demand our attendance before the district magistrate before noon.

RAM SINGH:
A family that built these archways does not bow to revenue clerks before breakfast. Let Kaka Sa assemble the council.`;

  useEffect(() => {
    api.getCultures()
      .then((data) => {
        if (data && data.length > 0) {
          setCultures(data);
          setSelectedCultureId(data[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not load cultures from API, using curated defaults:', err);
        setCultures([
          {
            id: 'malwai',
            name: 'Malwai',
            region: 'Madhya Pradesh — Malwa plateau (Ujjain, Indore, Dewas)',
            dialect_notes: 'Blend of Hindi and Rajasthani with sa honorific and distinctive verb endings.',
            architecture: 'Sandstone haveli, open courtyard (aangan), carved wooden lintels, neem tree center',
            greetings: 'Ram Ram sa',
            typical_wardrobe_male: 'Dhoti-kurta, angarkha, pagdi for elders',
            typical_wardrobe_female: 'Lehenga-choli, cotton odhni with gota border, silver borla',
            food: ['baati-churma', 'dal-bafla', 'poha-jalebi'],
            kinship_terms: { father: 'bapuji', mother: 'maaji', elder_brother: 'bhaiya sa' }
          },
          {
            id: 'mewari',
            name: 'Mewari',
            region: 'Rajasthan — Mewar division (Udaipur, Chittorgarh, Rajsamand)',
            dialect_notes: 'Chivalric Rajasthani dialect with glottal emphasis, using re and hukum.',
            architecture: 'Whitewashed stone courtyard palace, jharokha balconies, marble chhatris',
            greetings: 'Khamma Ghani',
            typical_wardrobe_male: 'Tailored achkan or angarkhi, Mewari saffron pagri, kamarbandh',
            typical_wardrobe_female: 'Ghoonghat covered lehenga, kanchli-kurti, silver rakhdi',
            food: ['laal maas', 'dal baati churma', 'gatte ki sabzi'],
            kinship_terms: { father: 'daata', mother: 'maji sa', elder_brother: 'banna sa' }
          },
          {
            id: 'majhi',
            name: 'Majhi',
            region: 'Punjab — central belt (Amritsar, Gurdaspur, Tarn Taran)',
            dialect_notes: 'Prestigious central Punjabi dialect with tonal pitch accents and hearty idioms.',
            architecture: 'Red brick kothi or ancestral haveli, expansive front deorhi, wide baithak',
            greetings: 'Sat Sri Akal',
            typical_wardrobe_male: 'Kurta-pyjama, phulkari vest, Majha pointed pagg, jutti',
            typical_wardrobe_female: 'Salwar-kameez, embroidered phulkari dupatta, golden jhumkas',
            food: ['makki di roti te sarson da saag', 'amritsari kulcha', 'sweet lassi'],
            kinship_terms: { father: 'bapu ji', mother: 'bebe ji', elder_brother: 'veera' }
          }
        ]);
      });
  }, []);

  const handleStartProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const content = selectedFile ? '' : (rawText || sampleScreenplay);

    if (!selectedFile && !content.trim()) {
      setError('Please enter screenplay text or select a screenplay file to ingest.');
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
      formData.append(
        'name',
        projectName.trim() ||
          (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'The Haveli Protocol')
      );

      // 1. Create Project
      const project = await api.createProject(formData);
      setProjectInfo({ id: project.id, name: project.name, status: project.status });

      // Save culture configuration
      setCultureConfig({
        selectedCulture: selectedCultureId,
        secondCulture: secondCultureId || null,
        setting,
        outputScript,
      });

      // 2. Run Stage 1 & 2 Extraction & Normalization
      await api.extractProject(project.id);

      // 3. Advance to Gate 1
      router.push('/review');
    } catch (err: any) {
      console.error('Ingestion failed:', err);
      setError(err.message || 'Screenplay ingestion failed. Ensure backend service is reachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillSample = () => {
    setRawText(sampleScreenplay);
    setProjectName('The Haveli Protocol (Sample)');
  };

  return (
    <div className="space-y-12">
      {/* 1. NETFLIX HERO BILLBOARD BANNER */}
      <section className="relative w-full min-h-[520px] md:min-h-[580px] rounded-2xl overflow-hidden bg-gradient-to-r from-black via-[#141414] to-[#1e1e1e] border border-[#262626] shadow-2xl flex flex-col justify-end p-6 md:p-12">
        {/* Cinematic Backdrop Pattern & Glow */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#E50914_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#E50914]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />

        {/* Billboard Foreground Content */}
        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Netflix Originals Eyebrow */}
          <div className="flex items-center space-x-2">
            <span className="text-[#E50914] font-black text-sm tracking-widest uppercase">
              RANGMANCH ORIGINAL STUDIO
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-xs uppercase font-mono tracking-wider text-zinc-400">
              TRIPLE-GATE ENGINE
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-none drop-shadow-md">
            THE STAGE <span className="text-[#E50914] font-serif">रंगमंच</span>
          </h1>

          {/* Logline */}
          <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed max-w-2xl">
            Transmute dramatic screenplays across regional Indian dialects, kinship hierarchies, architecture,
            and wardrobes. Curated reference grounding with zero cultural hallucinations.
          </p>

          {/* Netflix Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#E50914] text-white font-bold tracking-wider text-[11px]">
              CANONICAL
            </span>
            <span className="px-2 py-0.5 rounded bg-[#262626] text-emerald-400 font-semibold border border-emerald-500/30">
              99% CULTURAL ACCURACY
            </span>
            <span className="px-2 py-0.5 rounded bg-[#262626] text-zinc-300 font-mono border border-zinc-700">
              U/A 16+
            </span>
            <span className="px-2 py-0.5 rounded bg-[#262626] text-zinc-300 font-mono border border-zinc-700">
              4K ULTRA HD
            </span>
            <span className="px-2 py-0.5 rounded bg-[#262626] text-zinc-300 font-mono border border-zinc-700">
              MALWAI • MEWARI • MAJHI
            </span>
          </div>

          {/* Netflix Call to Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#ingest-studio"
              className="flex items-center space-x-2 px-6 py-3 rounded-md bg-white hover:bg-zinc-200 text-black font-extrabold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>START PRODUCTION</span>
            </a>

            <button
              type="button"
              onClick={handleFillSample}
              className="flex items-center space-x-2 px-5 py-3 rounded-md bg-[#333333]/80 hover:bg-[#444444] text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 border border-white/10"
            >
              <Info className="w-4 h-4 text-zinc-300" />
              <span>LOAD SAMPLE SCRIPT</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. NETFLIX HORIZONTAL ROW: CHOOSE CULTURAL TRADITION */}
      <section className="px-2 sm:px-4">
        <NetflixCarousel
          title="SELECT TARGET REGIONAL CULTURE"
          subtitle={`${cultures.length} CANONICAL DIALECTS LOADED`}
          count={cultures.length}
          icon={Flame}
        >
          {cultures.map((c) => {
            const isSelected = c.id === selectedCultureId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCultureId(c.id)}
                className={`group relative rounded-xl p-5 cursor-pointer transition-all duration-300 bg-[#181818] border h-full flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#E50914] shadow-netflix-glow ring-2 ring-[#E50914]/50 scale-[1.02]'
                    : 'border-[#2d2d2d] hover:border-zinc-500 hover:scale-[1.01]'
                }`}
              >
                <div>
                  {/* Header Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E50914]" />
                      <span className="text-xs font-mono uppercase tracking-widest text-[#E50914] font-bold">
                        {c.id.toUpperCase()}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-[#E50914] text-white uppercase">
                        ACTIVE TARGET
                      </span>
                    )}
                  </div>

                  {/* Culture Name & Region */}
                  <h3 className="text-2xl font-black text-white tracking-wide uppercase mb-1">
                    {c.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mb-3 line-clamp-1">
                    {c.region}
                  </p>

                  {/* Dialect & Lore Snippets */}
                  <div className="space-y-2 text-xs text-zinc-300 border-t border-zinc-800 pt-3">
                    <div className="flex items-start space-x-2">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold w-16 flex-shrink-0">
                        Greeting:
                      </span>
                      <span className="text-white font-semibold">{c.greetings}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold w-16 flex-shrink-0">
                        Setting:
                      </span>
                      <span className="text-zinc-300 line-clamp-1">{c.architecture}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold w-16 flex-shrink-0">
                        Wardrobe:
                      </span>
                      <span className="text-zinc-300 line-clamp-1">
                        {c.typical_wardrobe_male || c.typical_wardrobe_female || 'Regional attire'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Indicators */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>5.1 SURROUND</span>
                  <span className="text-[#E50914] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {isSelected ? 'SELECTED' : 'SELECT CANON'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </NetflixCarousel>
      </section>

      {/* 3. SCREENPLAY INGESTION STUDIO */}
      <section id="ingest-studio" className="px-2 sm:px-4 space-y-6">
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] uppercase mb-1">
            <Film className="w-4 h-4" />
            <span>STAGE 0: SCRIPT INGESTION & PIPELINE CONFIGURATION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
            SCREENPLAY ADAPTATION DESK
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Upload screenplay documents or paste dialogue directly. INT./EXT. headers, character speaking tags,
            and physical props are deterministically extracted.
          </p>
        </div>

        {error && (
          <div className="bg-[#E50914]/15 border border-[#E50914] p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#E50914] mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleStartProduction} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Screenplay Text / Upload */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Production Project Title
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., The Haveli Protocol — Episode 1"
                  className="w-full bg-[#181818] border border-[#333333] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Screenplay Text (INT./EXT. Sluglines, Action, Dialogue)
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="text-xs text-[#E50914] hover:underline font-mono"
                  >
                    Load Sample Script
                  </button>
                </div>
                <textarea
                  rows={13}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste standard screenplay scene here:&#10;&#10;INT. HAVELI COURTYARD - MORNING&#10;&#10;Amar enters holding the deed...&#10;&#10;AMAR:&#10;Good morning father..."
                  className="w-full bg-[#181818] border border-[#333333] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-lg p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none transition-all resize-y leading-relaxed"
                />
              </div>

              {/* File Attachment Alternative */}
              <div className="bg-[#181818] border border-dashed border-[#333333] hover:border-[#E50914]/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-[#222222] text-[#E50914]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Attach Screenplay Document</p>
                    <p className="text-[11px] text-zinc-400">Supports .txt, .pdf, .docx screenplay formats</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt,.pdf,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-white border border-[#404040] transition-colors text-center w-full sm:w-auto"
                  >
                    {selectedFile ? selectedFile.name : 'Select File'}
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-zinc-400 hover:text-red-400 font-mono"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Production Config & Prime Rules */}
            <div className="space-y-4">
              <div className="bg-[#181818] border border-[#2d2d2d] rounded-xl p-5 space-y-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-[#E50914]" />
                  <span>Production Configuration</span>
                </h3>

                {/* Setting toggle */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Atmospheric Setting
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSetting('rural')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        setting === 'rural'
                          ? 'bg-[#E50914] text-white shadow-netflix-glow'
                          : 'bg-[#222222] text-zinc-400 hover:text-white border border-[#333333]'
                      }`}
                    >
                      Rural Ancestral
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetting('urban')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        setting === 'urban'
                          ? 'bg-[#E50914] text-white shadow-netflix-glow'
                          : 'bg-[#222222] text-zinc-400 hover:text-white border border-[#333333]'
                      }`}
                    >
                      Urban Township
                    </button>
                  </div>
                </div>

                {/* Output script toggle */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Dialogue Output Orthography
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOutputScript('Devanagari')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        outputScript === 'Devanagari'
                          ? 'bg-[#E50914] text-white shadow-netflix-glow'
                          : 'bg-[#222222] text-zinc-400 hover:text-white border border-[#333333]'
                      }`}
                    >
                      Devanagari (देवनागरी)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputScript('Latin')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        outputScript === 'Latin'
                          ? 'bg-[#E50914] text-white shadow-netflix-glow'
                          : 'bg-[#222222] text-zinc-400 hover:text-white border border-[#333333]'
                      }`}
                    >
                      Latin Translit
                    </button>
                  </div>
                </div>

                {/* Secondary Culture Isolation Guard */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Secondary Culture (Strictly Isolated)
                  </label>
                  <select
                    value={secondCultureId}
                    onChange={(e) => setSecondCultureId(e.target.value)}
                    className="w-full bg-[#222222] border border-[#333333] rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-[#E50914]"
                  >
                    <option value="">None (Single Culture Adaptation)</option>
                    {cultures
                      .filter((c) => c.id !== selectedCultureId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — Parallel Unshared State
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Zero cross-contamination: Separate isolated states are maintained.
                  </p>
                </div>
              </div>

              {/* Netflix Studio Anti-Hallucination Prime Rules Card */}
              <div className="bg-[#181818] border border-[#2d2d2d] rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Section 8 Prime Directives</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-[#E50914] font-bold">•</span>
                    <span>Every cultural substitution must cite an exact path in <code className="text-[#E50914] font-mono">cultures.json</code>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#E50914] font-bold">•</span>
                    <span>Unknown or ambiguous facts are demoted to <span className="text-amber-400 font-bold">LOW confidence</span> requiring human review.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#E50914] font-bold">•</span>
                    <span>3 mandatory human approval gates before generating visuals or final packaging.</span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl bg-[#E50914] hover:bg-[#b20710] disabled:bg-[#591013] text-white font-black text-sm tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-netflix-glow disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>EXTRACTING & RESOLVING ENTITIES...</span>
                  </>
                ) : (
                  <>
                    <span>INGEST & ENTER GATE 1 REVIEW</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 4. NETFLIX STUDIO FEATURE HIGHLIGHTS */}
      <section className="border-t border-zinc-800 pt-8 px-2 sm:px-4 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#E50914]">
          STUDIO CAPABILITIES & ARCHITECTURE
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-[#E50914]">01 / EXTRACTOR</span>
            <h4 className="text-sm font-bold text-white uppercase">Deterministic Extraction</h4>
            <p className="text-xs text-zinc-400">
              Regex slugline parsing captures INT/EXT scenes, characters, and physical props with alias clustering.
            </p>
          </div>

          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-[#E50914]">02 / EVIDENCE AUDIT</span>
            <h4 className="text-sm font-bold text-white uppercase">Canonical Grounding</h4>
            <p className="text-xs text-zinc-400">
              Strict derivation against Malwai, Mewari, and Majhi ethnographic references. Never guesses or invents.
            </p>
          </div>

          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-[#E50914]">03 / INDEPENDENT VERIFIER</span>
            <h4 className="text-sm font-bold text-white uppercase">7 Quality Checks</h4>
            <p className="text-xs text-zinc-400">
              Automatic rejection of relationship hierarchy reversals, foreign cultural mixing, and reading speed limits.
            </p>
          </div>

          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-[#E50914]">04 / VISUAL BIBLE</span>
            <h4 className="text-sm font-bold text-white uppercase">Production Synthesis</h4>
            <p className="text-xs text-zinc-400">
              Generates photorealistic character lookbooks, costume plates, and scene keyframes strictly grounded in decisions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
