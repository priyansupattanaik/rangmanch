'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Compass, CheckCircle2, AlertCircle, HelpCircle,
  ArrowRight, ShieldCheck, RefreshCw, Edit3, BookOpen
} from 'lucide-react';

export default function PlanPage() {
  const router = useRouter();
  const { projectId, plan, cultureReference, setPlanData, setAdaptedScenes } = useProjectStore();

  const [currentPlan, setCurrentPlan] = useState<any>(plan);
  const [cultureRef, setCultureRef] = useState<any>(cultureReference);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal / inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }
    loadPlan();
  }, [projectId]);

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
      setError(err.message || 'Failed to fetch adaptation plan');
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideDecision = (id: string, newProposed: string) => {
    const updated = decisions.map((d) =>
      d.id === id ? { ...d, proposed: newProposed, confidence: 'HIGH', human_review: false } : d
    );
    setDecisions(updated);
    setEditingId(null);
  };

  const handleApprovePlan = async () => {
    try {
      setActionLoading(true);
      // 1. Approve Gate 2
      await api.approvePlan(projectId!, { decisions });

      // 2. Run Dialogue Adaptation (Stage 6 + 7)
      await api.runAdaptation(projectId!);

      // 3. Load adapted scenes and route to /adapt
      const adaptedData = await api.getAdapted(projectId!);
      setAdaptedScenes(adaptedData);

      router.push('/adapt');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to approve plan and execute adaptation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading grounded adaptation plan decisions...</p>
      </div>
    );
  }

  const humanReviewItems = decisions.filter((d) => d.human_review || d.confidence === 'LOW');

  return (
    <div className="space-y-6">
      {/* Header with Culture Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>GATE 2: ADAPTATION PLAN & EVIDENCE AUDIT</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Cultural Decision Table
          </h1>
          <div className="flex items-center space-x-2 mt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              {cultureRef?.name || currentPlan?.culture_id} — {cultureRef?.region} — {currentPlan?.setting?.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Script: {currentPlan?.output_script}
            </span>
          </div>
        </div>

        <button
          onClick={handleApprovePlan}
          disabled={actionLoading}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs transition-transform active:scale-95 disabled:opacity-50"
        >
          <span>{actionLoading ? 'Adapting Screenplay...' : 'Approve Plan & Adapt Screenplay'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-700/60 p-4 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Human Review Banner if items pending */}
      {humanReviewItems.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-700/50 p-4 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Human Review Attention Queue ({humanReviewItems.length} items require confirmation)</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            The prime rules state: If the system cannot find a verified cultural fact in the reference, it must request human decision instead of inventing.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Decision Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Element</th>
                    <th className="p-3.5">Original</th>
                    <th className="p-3.5">Proposed Adaptation</th>
                    <th className="p-3.5">Evidence (cultures.json)</th>
                    <th className="p-3.5">Confidence</th>
                    <th className="p-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {decisions.map((dec) => {
                    const isLow = dec.confidence === 'LOW' || dec.human_review;
                    const isMed = dec.confidence === 'MEDIUM';

                    let rowStyle = 'hover:bg-zinc-800/40';
                    if (isLow) rowStyle = 'bg-red-950/20 hover:bg-red-950/30';
                    else if (isMed) rowStyle = 'bg-amber-950/20 hover:bg-amber-950/30';

                    return (
                      <tr key={dec.id} className={rowStyle}>
                        <td className="p-3.5 font-mono text-zinc-400 font-medium capitalize">
                          {dec.element.replace('_', ' ')}
                        </td>
                        <td className="p-3.5 text-zinc-400">{dec.original}</td>
                        <td className="p-3.5 font-semibold text-white">
                          {editingId === dec.id ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-zinc-950 border border-amber-500 rounded px-2 py-0.5 text-xs text-white"
                              />
                              <button
                                onClick={() => handleOverrideDecision(dec.id, editValue)}
                                className="px-2 py-0.5 bg-amber-500 text-black rounded text-[10px] font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>{dec.proposed}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-amber-400/90">
                          {dec.evidence_field}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              isLow
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : isMed
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {dec.confidence}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              setEditingId(dec.id);
                              setEditValue(dec.proposed);
                            }}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            title="Override decision"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel: Culture Reference Sheet */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Grounded Reference Sheet</span>
            </h3>

            {cultureRef ? (
              <div className="space-y-3 text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Greetings</span>
                  <span className="font-semibold text-amber-300">{cultureRef.greetings}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Honorifics</span>
                  <span className="text-zinc-200">{cultureRef.honorifics}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Architecture & Setting</span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">{cultureRef.architecture}</p>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Traditional Wardrobe</span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">
                    {cultureRef.typical_wardrobe_male_or_female || cultureRef.typical_wardrobe_male}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Kinship Terms</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {Object.entries(cultureRef.kinship_terms || {}).map(([k, v]) => (
                      <div key={k} className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                        <span className="text-zinc-500 block text-[9px] uppercase">{k.replace('_', ' ')}</span>
                        <span className="font-semibold text-zinc-200">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Ethnographic Note</span>
                  <p className="text-[10px] text-zinc-400 italic mt-0.5">{cultureRef.confidence_note}</p>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500">No culture reference loaded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
