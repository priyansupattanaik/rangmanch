'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Edit3,
  BookOpen,
  ArrowRight,
  Flame,
  Check,
  X,
  FileText,
  Sliders
} from 'lucide-react';

export default function PlanPage() {
  const router = useRouter();
  const { projectId, plan, cultureReference, setPlanData, setAdaptedScenes, _hasHydrated } = useProjectStore();

  const [currentPlan, setCurrentPlan] = useState<any>(plan);
  const [cultureRef, setCultureRef] = useState<any>(cultureReference);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'decisions' | 'culture_dossier' | 'human_review'>('decisions');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Override modal state
  const [editingDecision, setEditingDecision] = useState<any | null>(null);
  const [customProposed, setCustomProposed] = useState('');

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!projectId) {
      router.push('/');
      return;
    }
    loadPlan();
  }, [_hasHydrated, projectId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const data = await api.getPlan(projectId!);
      setCurrentPlan(data.plan);
      setCultureRef(data.culture_reference);
      setDecisions(data.plan.decisions || []);
      setPlanData(data.plan, data.culture_reference);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve adaptation plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (d: any) => {
    setEditingDecision(d);
    setCustomProposed(d.proposed);
  };

  const handleSaveOverride = () => {
    if (!editingDecision) return;
    const updated = decisions.map((d) =>
      d.id === editingDecision.id
        ? {
            ...d,
            proposed: customProposed.trim(),
            confidence: 'HIGH',
            human_review: false,
            reason: `Human approved override: "${customProposed.trim()}"`,
          }
        : d
    );
    setDecisions(updated);
    setEditingDecision(null);
  };

  const handleApprovePlan = async () => {
    try {
      setActionLoading(true);
      // 1. Approve Gate 2 with any modified decisions
      await api.approvePlan(projectId!, { decisions });

      // 2. Execute Stage 6 & 7 Dialogue Adaptation & Independent Verifier
      await api.runAdaptation(projectId!);

      // 3. Load adapted scenes and route to /adapt
      const adaptedData = await api.getAdapted(projectId!);
      setAdaptedScenes(adaptedData);

      router.push('/adapt');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to approve Gate 2 plan and run adaptation.');
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
          DERIVING SECTION 8 GROUNDED ADAPTATION DECISIONS...
        </p>
      </div>
    );
  }

  const lowConfidenceCount = decisions.filter((d) => d.confidence === 'LOW' || d.human_review).length;

  return (
    <div className="space-y-8 px-2 sm:px-4">
      {/* Billboard Banner */}
      <section className="relative rounded-2xl bg-gradient-to-r from-black via-[#181818] to-[#202020] border border-[#2b2b2b] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] uppercase tracking-wider font-bold">
              <Compass className="w-4 h-4 text-[#E50914]" />
              <span>GATE 2: CULTURAL EVIDENCE AUDIT & CANONICAL DECISION TABLE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              ADAPTATION BLUEPRINT — {currentPlan?.culture_id?.toUpperCase()}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Every adaptation decision is derived from validated ethnographic records in <code className="text-[#E50914]">cultures.json</code>.
              Inspect citations, resolve low-confidence terms, and authorize Gate 2 to proceed to screenplay adaptation.
            </p>
          </div>

          {/* Gate 2 Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleApprovePlan}
              disabled={actionLoading}
              className="flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b20710] disabled:bg-[#4d1012] text-white font-extrabold text-xs tracking-wider uppercase transition-all hover:scale-105 active:scale-95 shadow-netflix-glow disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>TRANSLATING & VERIFYING SCENES...</span>
                </>
              ) : (
                <>
                  <span>APPROVE GATE 2 & ADAPT DIALOGUE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-[#E50914]/15 border border-[#E50914] p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#E50914] mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#2d2d2d] space-x-2">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'decisions'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Decisions Table ({decisions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('human_review')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'human_review'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Human Review Queue ({lowConfidenceCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('culture_dossier')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'culture_dossier'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cultural Reference Lore ({currentPlan?.culture_id?.toUpperCase()})</span>
        </button>
      </div>

      {/* TAB 1: DECISIONS TABLE & EVIDENCE CARDS */}
      {activeTab === 'decisions' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              GROUNDED CULTURAL ADAPTATION DECISIONS
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              ZERO HALLUCINATION CITATIONS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decisions.map((d) => {
              const isHigh = d.confidence === 'HIGH';
              return (
                <div
                  key={d.id}
                  className={`rounded-xl bg-[#181818] border p-5 space-y-4 transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between ${
                    isHigh ? 'border-[#2d2d2d] hover:border-zinc-500' : 'border-amber-500/60 bg-amber-950/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-zinc-400">{d.id}</span>
                        <span className="text-[10px] font-mono uppercase bg-[#262626] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                          {d.element}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          isHigh
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {d.confidence} CONFIDENCE
                      </span>
                    </div>

                    {/* Original vs Proposed */}
                    <div className="grid grid-cols-2 gap-3 bg-[#141414] p-3 rounded-lg border border-[#262626]">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                          Screenplay Original:
                        </span>
                        <p className="text-xs font-medium text-zinc-300 mt-0.5">{d.original}</p>
                      </div>
                      <div className="border-l border-zinc-800 pl-3">
                        <span className="text-[10px] uppercase font-mono text-[#E50914] block font-bold">
                          Adapted Cultural Replacement:
                        </span>
                        <p className="text-xs font-bold text-white mt-0.5">{d.proposed}</p>
                      </div>
                    </div>

                    {/* Evidence Quote */}
                    <div className="space-y-1 text-xs">
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-1">
                        <span className="text-zinc-500 font-mono">Reference Field:</span>
                        <code className="text-[#E50914] font-mono text-[11px] bg-[#222222] px-1.5 py-0.5 rounded">
                          {d.evidence_field}
                        </code>
                      </div>
                      <p className="text-zinc-400 text-xs italic">{d.reason}</p>
                    </div>
                  </div>

                  {/* Override Button */}
                  <div className="pt-3 border-t border-[#262626] flex items-center justify-end">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#262626] hover:bg-[#333333] text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-[#E50914]" />
                      <span>Override Term</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: HUMAN REVIEW QUEUE */}
      {activeTab === 'human_review' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              ITEMS FLAGGED FOR HUMAN INTERVENTION ({lowConfidenceCount})
            </h2>
          </div>

          {lowConfidenceCount === 0 ? (
            <div className="bg-[#181818] border border-emerald-800/40 rounded-xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">All Decisions Grounded with High Confidence</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No cultural hallucination warnings or ambiguous terms were flagged in the plan derivation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions
                .filter((d) => d.confidence === 'LOW' || d.human_review)
                .map((d) => (
                  <div
                    key={d.id}
                    className="bg-[#181818] border border-amber-500/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-amber-400">{d.id}</span>
                        <span className="text-xs font-bold text-white uppercase">{d.element}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          NEEDS HUMAN REVIEW
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        Original: <span className="text-white font-semibold">{d.original}</span> &rarr; Proposed:{' '}
                        <span className="text-amber-300 font-bold">{d.proposed}</span>
                      </p>
                      <p className="text-xs text-zinc-400">{d.reason}</p>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold uppercase transition-colors flex-shrink-0"
                    >
                      Resolve Decision
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CULTURE DOSSIER */}
      {activeTab === 'culture_dossier' && cultureRef && (
        <section className="space-y-6">
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-xl p-6 space-y-5">
            <div>
              <span className="text-xs font-mono text-[#E50914] uppercase font-bold">ETHNOGRAPHIC PROFILE</span>
              <h2 className="text-2xl font-black text-white uppercase mt-1">{cultureRef.name} Lore Reference</h2>
              <p className="text-xs text-zinc-400 mt-1">{cultureRef.region}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800 text-xs">
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Dialectology Notes
                  </h4>
                  <p className="text-zinc-300 leading-relaxed">{cultureRef.dialect_notes}</p>
                </div>

                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Kinship Nomenclature
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
                    {cultureRef.kinship_terms &&
                      Object.entries(cultureRef.kinship_terms).map(([k, v]: any) => (
                        <div key={k} className="bg-[#141414] p-2 rounded border border-[#262626]">
                          <span className="text-zinc-500 text-[10px] block">{k}</span>
                          <span className="text-white font-bold">{v}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Traditional Architecture & Environment
                  </h4>
                  <p className="text-zinc-300 leading-relaxed">{cultureRef.architecture}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Common Regional Idioms & Proverbs
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-zinc-300 mt-1">
                    {cultureRef.common_idioms?.map((idm: string, i: number) => (
                      <li key={i}>{idm}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Cultural Taboos
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-red-300 mt-1">
                    {cultureRef.taboos?.map((tb: string, i: number) => (
                      <li key={i}>{tb}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-white uppercase font-mono text-[11px] text-[#E50914] mb-1">
                    Signature Regional Cuisine
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cultureRef.food?.map((fd: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#262626] text-zinc-300 font-mono text-[10px] border border-zinc-700"
                      >
                        {fd}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* OVERRIDE MODAL */}
      {editingDecision && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase">Override Cultural Decision</h3>
              <button
                onClick={() => setEditingDecision(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 font-mono text-[10px] uppercase block">Original Term:</span>
                <p className="text-sm font-semibold text-zinc-200">{editingDecision.original}</p>
              </div>

              <div>
                <label className="text-zinc-400 font-mono text-[10px] uppercase block mb-1">
                  Proposed Cultural Replacement:
                </label>
                <input
                  type="text"
                  value={customProposed}
                  onChange={(e) => setCustomProposed(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333333] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                <span className="text-zinc-500 font-mono text-[10px] uppercase block">Reference Field:</span>
                <code className="text-[#E50914] font-mono text-[11px]">{editingDecision.evidence_field}</code>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setEditingDecision(null)}
                className="px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-lg bg-[#E50914] hover:bg-[#b20710] text-white text-xs font-bold uppercase shadow-netflix-glow"
              >
                Save & Verify Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
