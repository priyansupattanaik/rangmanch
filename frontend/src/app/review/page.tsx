'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Layers,
  Users,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Film,
  Shirt,
  Info,
  Sliders,
  Check,
  ArrowRight
} from 'lucide-react';
import NetflixCarousel from '@/components/NetflixCarousel';

export default function ReviewPage() {
  const router = useRouter();
  const {
    projectId,
    projectName,
    projectStatus,
    selectedCulture,
    setting,
    outputScript,
    setEntities,
    setPlanData,
    _hasHydrated,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'locations' | 'props' | 'continuity'>('scenes');
  const [scenes, setScenes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [costumes, setCostumes] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [continuityWarnings, setContinuityWarnings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charactersApproved, setCharactersApproved] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!projectId) {
      router.push('/');
      return;
    }
    loadEntities();
  }, [_hasHydrated, projectId]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await api.getEntities(projectId!);
      setScenes(data.scenes || []);
      setCharacters(data.characters || []);
      setLocations(data.locations || []);
      setCostumes(data.costumes || []);
      setProps(data.props || []);
      setContinuityWarnings(data.continuity_warnings || []);

      setEntities(data);
      if (data.characters?.length > 0 && data.characters.every((c: any) => c.approved)) {
        setCharactersApproved(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load screenplay entities.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCharacters = async () => {
    try {
      setActionLoading(true);
      await api.updateEntities(projectId!, { approve_all: true });
      setCharacters((prev) => prev.map((c) => ({ ...c, approved: true, status: 'CANONICAL' })));
      setCharactersApproved(true);
    } catch (err: any) {
      setError(err.message || 'Character approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMerge = async (charId: string) => {
    const updated = characters.map((c) =>
      c.id === charId ? { ...c, status: 'CANONICAL', merge_candidate_with: null } : c
    );
    setCharacters(updated);
    await api.updateEntities(projectId!, {
      characters: [{ id: charId, status: 'CANONICAL', merge_candidate_with: null }],
    });
  };

  const handleProceedToPlan = async () => {
    try {
      setActionLoading(true);
      // Ensure all entities are approved for Gate 1
      await api.updateEntities(projectId!, { approve_all: true });

      // Build Stage 4 Adaptation Plan
      const planRes = await api.createPlan(projectId!, {
        culture_id: selectedCulture || 'malwai',
        setting: setting || 'rural',
        output_script: outputScript || 'Devanagari',
      });

      // Fetch plan bundle and navigate to Gate 2
      const planData = await api.getPlan(projectId!);
      setPlanData(planData.plan, planData.culture_reference);

      router.push('/plan');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to advance to Gate 2 adaptation plan.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[#E50914] border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-[#E50914] font-black text-xs">
            N
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
          PARSING SLUGLINES & CLUSTERING CANONICAL ENTITIES...
        </p>
      </div>
    );
  }

  const tabs = [
    { key: 'scenes', label: 'Scenes Breakdown', count: scenes.length, icon: Film },
    { key: 'characters', label: 'Characters & Cast', count: characters.length, icon: Users },
    { key: 'locations', label: 'Locations & Sets', count: locations.length, icon: MapPin },
    { key: 'props', label: 'Props & Wardrobe', count: props.length + costumes.length, icon: Package },
    { key: 'continuity', label: 'Continuity Audit', count: continuityWarnings.length, icon: AlertTriangle, warning: continuityWarnings.length > 0 },
  ];

  return (
    <div className="space-y-8 px-2 sm:px-4">
      {/* Studio Header Billboard */}
      <section className="relative rounded-2xl bg-gradient-to-r from-black via-[#181818] to-[#202020] border border-[#2b2b2b] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] tracking-wider uppercase font-bold">
              <ShieldCheck className="w-4 h-4 text-[#E50914]" />
              <span>GATE 1: EXTRACTED SCREENPLAY ENTITY VERIFICATION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              ENTITY AUDIT & CANONICAL ROSTER
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Verify all extracted screenplay components before adaptation planning begins. Confirm character alias merges,
              inspect prop continuity chains, and certify the canonical cast roster.
            </p>
          </div>

          {/* Gate 1 Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleProceedToPlan}
              disabled={actionLoading}
              className="flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b20710] disabled:bg-[#4d1012] text-white font-extrabold text-xs tracking-wider uppercase transition-all hover:scale-105 active:scale-95 shadow-netflix-glow disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PREPARING STAGE 4 PLAN...</span>
                </>
              ) : (
                <>
                  <span>APPROVE GATE 1 & BUILD PLAN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-[#E50914]/15 border border-[#E50914] p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#E50914] mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Netflix Navigation Tabs */}
      <div className="flex border-b border-[#2d2d2d] space-x-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center space-x-2.5 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-[#E50914] text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#E50914]' : 'text-zinc-500'}`} />
              <span>{t.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  t.warning
                    ? 'bg-amber-500/20 text-amber-400'
                    : isActive
                    ? 'bg-[#E50914] text-white'
                    : 'bg-[#262626] text-zinc-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. SCENES ROW / CAROUSEL */}
      {activeTab === 'scenes' && (
        <NetflixCarousel
          title="SCREENPLAY SCENES SEQUENCE"
          subtitle="INT./EXT. SLUGLINES VERIFIED"
          count={scenes.length}
          icon={Film}
        >
          {scenes.map((sc) => {
            const charList = sc.characters_present ? JSON.parse(sc.characters_present) : [];
            return (
              <div
                key={sc.id}
                className="group relative rounded-xl bg-[#181818] border border-[#2b2b2b] hover:border-[#E50914] p-5 space-y-3.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-netflix-card flex flex-col justify-between h-full"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-[#E50914] text-white">
                        SCENE {String(sc.scene_number).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-[#282828] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {sc.int_ext} • {sc.time_of_day}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">{sc.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-wide uppercase line-clamp-1 group-hover:text-[#E50914] transition-colors">
                    {sc.slugline}
                  </h3>

                  <div className="space-y-2 text-xs text-zinc-300 bg-[#141414] p-3 rounded-lg border border-[#262626]">
                    <div className="text-[11px] text-zinc-400">
                      <span className="text-[#E50914] font-bold">MOOD:</span> {sc.mood || 'Tense'} |{' '}
                      <span className="text-[#E50914] font-bold">PURPOSE:</span>{' '}
                      <span className="text-white font-medium">{sc.dramatic_purpose || 'Narrative exposition'}</span>
                    </div>
                    <p className="text-zinc-400 text-xs italic line-clamp-3">
                      {sc.summary || sc.raw_text?.slice(0, 140) + '...'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-mono">
                    {charList.length} CHARACTERS PRESENT
                  </span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PARSED
                  </span>
                </div>
              </div>
            );
          })}
        </NetflixCarousel>
      )}

      {/* 2. CHARACTERS & CAST */}
      {activeTab === 'characters' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <p className="text-xs text-zinc-400">
              Characters extracted from dialogue speaker tags and action lines. Candidate aliases must be confirmed by human review.
            </p>

            {!charactersApproved && (
              <button
                onClick={handleApproveCharacters}
                disabled={actionLoading}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#282828] hover:bg-[#333333] border border-zinc-700 text-white text-xs font-semibold self-start sm:self-auto"
              >
                <Check className="w-3.5 h-3.5 text-[#E50914]" />
                <span>Mark All Canonical</span>
              </button>
            )}
          </div>

          <NetflixCarousel
            title="CANONICAL CAST & ALIAS CLUSTERS"
            subtitle="SECTION 8 ROSTER AUDIT"
            count={characters.length}
            icon={Users}
          >
            {characters.map((c) => {
              const aliases = c.aliases ? JSON.parse(c.aliases) : [];
              const isMerge = Boolean(c.merge_candidate_with);
              return (
                <div
                  key={c.id}
                  className={`rounded-xl bg-[#181818] border p-5 space-y-4 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between h-full ${
                    isMerge
                      ? 'border-amber-500/70 bg-amber-950/10'
                      : 'border-[#2d2d2d] hover:border-[#E50914]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400">{c.id}</span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          isMerge
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {c.status || 'CANONICAL'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white tracking-wide uppercase">
                        {c.canonical_name}
                      </h3>
                      <p className="text-xs text-[#E50914] font-medium mt-0.5">
                        Role: {c.role || 'Dramatis Personae'}
                      </p>
                    </div>

                    <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                          Detected Aliases / Speaker Tags:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {aliases.length > 0 ? (
                            aliases.map((al: string, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#262626] text-zinc-300 border border-zinc-700"
                              >
                                {al}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic">No alternative aliases</span>
                          )}
                        </div>
                      </div>

                      {c.archetype && (
                        <div className="text-[11px] text-zinc-400">
                          <span className="text-zinc-500 uppercase font-mono">Archetype:</span> {c.archetype}
                        </div>
                      )}
                    </div>
                  </div>

                  {isMerge && (
                    <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between">
                      <span className="text-[11px] text-amber-300 font-medium">Merge Candidate</span>
                      <button
                        onClick={() => handleConfirmMerge(c.id)}
                        className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-colors"
                      >
                        Confirm Canonical
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </NetflixCarousel>
        </div>
      )}

      {/* 3. LOCATIONS */}
      {activeTab === 'locations' && (
        <NetflixCarousel
          title="PRODUCTION SETS & LOCATIONS"
          subtitle="ETHNOGRAPHIC ARCHITECTURAL SETTINGS"
          count={locations.length}
          icon={MapPin}
        >
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="rounded-xl bg-[#181818] border border-[#2d2d2d] hover:border-[#E50914] p-5 space-y-3 h-full flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#E50914]">{loc.id}</span>
                  <span className="text-[10px] font-mono uppercase bg-[#282828] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                    {loc.environment || 'AUTHENTIC'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white uppercase">{loc.name}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {loc.description || 'Screenplay environment extracted for regional architectural adaptation.'}
                </p>
              </div>
            </div>
          ))}
        </NetflixCarousel>
      )}

      {/* 4. PROPS & COSTUMES */}
      {activeTab === 'props' && (
        <div className="space-y-8">
          <NetflixCarousel
            title="TRACKED SCREENPLAY PROPS"
            subtitle="PHYSICAL CONTINUITY CHAINS"
            count={props.length}
            icon={Package}
          >
            {props.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-[#181818] border border-[#2d2d2d] hover:border-[#E50914] p-4 space-y-2 h-full flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-zinc-400">{p.id}</span>
                    <Package className="w-3.5 h-3.5 text-[#E50914]" />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase">{p.name}</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Context: <span className="text-zinc-300">{p.context || p.name}</span>
                  </p>
                </div>
              </div>
            ))}
          </NetflixCarousel>

          <NetflixCarousel
            title="WARDROBE & COSTUME CONTINUITY"
            subtitle="PERIOD APPAREL SPECIFICATIONS"
            count={costumes.length}
            icon={Shirt}
          >
            {costumes.map((cos) => (
              <div
                key={cos.id}
                className="rounded-xl bg-[#181818] border border-[#2d2d2d] hover:border-[#E50914] p-4 space-y-2 h-full flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#E50914]">{cos.id}</span>
                    <Shirt className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase">{cos.name || 'Traditional Attire'}</h4>
                  <p className="text-xs text-zinc-400 mt-1">{cos.description || 'Regional attire profile'}</p>
                </div>
              </div>
            ))}
          </NetflixCarousel>
        </div>
      )}

      {/* 5. CONTINUITY AUDIT */}
      {activeTab === 'continuity' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              REAL-TIME CONTINUITY ISSUES ({continuityWarnings.length})
            </h2>
            <span className="text-xs font-mono text-zinc-400">PROP DISAPPEARANCE & WARDROBE AUDIT</span>
          </div>

          {continuityWarnings.length === 0 ? (
            <div className="bg-[#181818] border border-emerald-800/40 rounded-xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Zero Continuity Discrepancies Detected</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                All physical props and costumes maintain unbroken continuity across consecutive screenplay scenes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {continuityWarnings.map((warn, i) => (
                <div
                  key={i}
                  className="bg-[#181818] border border-amber-600/40 rounded-xl p-4 flex items-start space-x-3.5"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white uppercase">
                        {warn.entity_type} Continuity Warning
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {warn.severity || 'WARNING'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">{warn.message || warn.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
