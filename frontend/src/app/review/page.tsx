'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Layers, Users, MapPin, Package, AlertTriangle, CheckCircle,
  ArrowRight, Edit2, Check, RefreshCw
} from 'lucide-react';

export default function ReviewPage() {
  const router = useRouter();
  const {
    projectId, projectName, projectStatus,
    selectedCulture, setting, outputScript,
    setEntities, setPlanData,
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

  // Approvals tracker
  const [charactersApproved, setCharactersApproved] = useState(false);
  const [scenesApproved, setScenesApproved] = useState(false);

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }

    loadEntities();
  }, [projectId]);

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
      if (data.characters?.every((c: any) => c.approved)) {
        setCharactersApproved(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load entities');
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
      setError(err.message || 'Approval failed');
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
      // Ensure all entities are approved
      await api.updateEntities(projectId!, { approve_all: true });

      // Generate Stage 4 Adaptation Plan
      const planRes = await api.createPlan(projectId!, {
        culture_id: selectedCulture || 'malwai',
        setting: setting || 'rural',
        output_script: outputScript || 'Devanagari',
      });

      const fullPlan = await api.getPlan(projectId!);
      setPlanData(fullPlan.plan, fullPlan.culture_reference);

      router.push('/plan');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to build adaptation plan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading extracted scenes & canonical entities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>GATE 1: CANONICAL ENTITY RESOLUTION</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Scene & Entity Extraction Review
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Project: <span className="text-zinc-200 font-semibold">{projectName}</span> | Status:{' '}
            <span className="text-amber-400 font-mono uppercase">{projectStatus || 'EXTRACTED'}</span> | Scenes:{' '}
            <span className="text-zinc-200 font-semibold">{scenes.length}</span>
          </p>
        </div>

        <button
          onClick={handleProceedToPlan}
          disabled={actionLoading}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs transition-transform active:scale-95 disabled:opacity-50"
        >
          <span>Approve All & Build Adaptation Plan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-700/60 p-4 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-2 text-xs">
        <button
          onClick={() => setActiveTab('scenes')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'scenes'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Scenes ({scenes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'characters'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Characters ({characters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'locations'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Locations ({locations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('props')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'props'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Props ({props.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('continuity')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'continuity'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Continuity & Warnings ({continuityWarnings.length})</span>
        </button>
      </div>

      {/* Tab 1: Scenes */}
      {activeTab === 'scenes' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Int/Ext</th>
                  <th className="p-3.5">Location ID</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Mood</th>
                  <th className="p-3.5">Dramatic Purpose</th>
                  <th className="p-3.5">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {scenes.map((sc) => (
                  <tr key={sc.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-amber-400 font-bold">{sc.id}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                        {sc.int_ext}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-400">{sc.location_id}</td>
                    <td className="p-3.5 capitalize">{sc.time_of_day}</td>
                    <td className="p-3.5 text-zinc-200">{sc.mood}</td>
                    <td className="p-3.5 text-zinc-300 max-w-xs">{sc.dramatic_purpose}</td>
                    <td className="p-3.5 text-zinc-400 truncate max-w-sm">{sc.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Characters */}
      {activeTab === 'characters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-zinc-400">
              Review canonical IDs and resolve any flagged <span className="text-amber-400 font-mono">MERGE_CANDIDATE</span> aliases.
            </p>
            <button
              onClick={handleApproveCharacters}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve All Characters</span>
            </button>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3.5">Canonical ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Aliases (Merged)</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {characters.map((char) => {
                  const aliases = JSON.parse(char.aliases || '[]');
                  const isCandidate = char.status === 'MERGE_CANDIDATE';
                  return (
                    <tr
                      key={char.id}
                      className={isCandidate ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-zinc-800/40'}
                    >
                      <td className="p-3.5 font-mono text-amber-400 font-bold">{char.id}</td>
                      <td className="p-3.5 font-semibold text-white">{char.canonical_name}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {aliases.map((a: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-300">
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-zinc-400">{char.role}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            isCandidate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {char.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isCandidate ? (
                          <button
                            onClick={() => handleConfirmMerge(char.id)}
                            className="px-2 py-1 bg-amber-500 text-black font-semibold rounded text-[11px] hover:bg-amber-400"
                          >
                            Confirm Canonical
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-[11px] font-mono">Approved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Locations */}
      {activeTab === 'locations' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Canonical Name</th>
                <th className="p-3.5">Aliases</th>
                <th className="p-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-zinc-800/40">
                  <td className="p-3.5 font-mono text-amber-400">{loc.id}</td>
                  <td className="p-3.5 font-semibold text-white">{loc.canonical_name}</td>
                  <td className="p-3.5 text-zinc-400">{loc.aliases}</td>
                  <td className="p-3.5 text-zinc-400">{loc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Props */}
      {activeTab === 'props' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Prop ID</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Last Seen Scene</th>
                <th className="p-3.5">Holder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {props.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40">
                  <td className="p-3.5 font-mono text-amber-400">{p.id}</td>
                  <td className="p-3.5 font-semibold text-white">{p.name}</td>
                  <td className="p-3.5 font-mono text-zinc-300">{p.last_seen_scene}</td>
                  <td className="p-3.5 text-zinc-400">{p.holder_character_id || 'Environmental'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Continuity */}
      {activeTab === 'continuity' && (
        <div className="space-y-3">
          {continuityWarnings.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-200 font-semibold">Zero Continuity Errors Detected</p>
              <p className="text-xs text-zinc-500 mt-1">All prop transitions and scene chains are fully balanced.</p>
            </div>
          ) : (
            continuityWarnings.map((w, i) => (
              <div
                key={i}
                className="bg-amber-950/20 border border-amber-600/30 p-3.5 rounded-xl flex items-start space-x-3 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-300 font-mono text-[11px] uppercase">
                    {w.type} ({w.severity})
                  </div>
                  <p className="text-zinc-300">{w.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
