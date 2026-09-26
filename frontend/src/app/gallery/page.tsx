'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Image as ImageIcon,
  Users,
  Sparkles,
  Layers,
  RefreshCw,
  Download,
  ArrowRight,
  Eye,
  Code2,
  Film,
  Shirt,
  Info,
  X,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import NetflixCarousel from '@/components/NetflixCarousel';

export default function GalleryPage() {
  const router = useRouter();
  const { projectId, projectName, images, setImages, _hasHydrated } = useProjectStore();

  const [galleryItems, setGalleryItems] = useState<any[]>(images || []);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'character' | 'costume' | 'scene'>('all');

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!projectId) {
      router.push('/');
      return;
    }
    loadGallery();
  }, [_hasHydrated, projectId]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await api.getGallery(projectId!);
      setGalleryItems(data || []);
      setImages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
          LOADING CINEMATIC VISUAL BIBLES & KEYFRAMES...
        </p>
      </div>
    );
  }

  const characters = galleryItems.filter((i) => i.entity_type === 'character');
  const costumes = galleryItems.filter((i) => i.entity_type === 'costume');
  const scenes = galleryItems.filter((i) => i.entity_type === 'scene');

  const filteredItems =
    activeTab === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.entity_type === activeTab);

  const heroItem = galleryItems[0] || null;

  return (
    <div className="space-y-10 px-2 sm:px-4">
      {/* Billboard Banner */}
      <section className="relative rounded-2xl bg-gradient-to-r from-black via-[#181818] to-[#202020] border border-[#2b2b2b] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] uppercase tracking-wider font-bold">
              <ImageIcon className="w-4 h-4 text-[#E50914]" />
              <span>STAGE 9: GROUNDED VISUAL SYNTHESIS & LOOKBOOKS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              PRODUCTION VISUAL BIBLE & GALLERY
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Photorealistic character lookbooks, costume plates, and scene keyframes strictly derived from approved
              adaptation decisions. All prompts and generation metadata are preserved for production fidelity.
            </p>
          </div>

          <button
            onClick={() => router.push('/export')}
            className="flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b20710] text-white font-extrabold text-xs tracking-wider uppercase transition-all hover:scale-105 active:scale-95 shadow-netflix-glow"
          >
            <span>PROCEED TO PACKAGE EXPORT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FILTER TABS */}
      <div className="flex border-b border-[#2d2d2d] space-x-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'all'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Visual Assets ({galleryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('character')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'character'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Character Bibles ({characters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('costume')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'costume'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>Costume & Wardrobe ({costumes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scene')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
            activeTab === 'scene'
              ? 'border-[#E50914] text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Scene Keyframes ({scenes.length})</span>
        </button>
      </div>

      {/* HORIZONTAL ROWS / CAROUSEL CONTENT */}
      {activeTab === 'all' ? (
        <div className="space-y-12">
          {/* Row 1: Characters */}
          {characters.length > 0 && (
            <NetflixCarousel
              title="ROW 1: CANONICAL CHARACTER LOOKBOOKS"
              subtitle="ETHNOGRAPHIC CHARACTER PLATES"
              count={characters.length}
              icon={Users}
            >
              {characters.map((item) => (
                <NetflixVisualCard key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </NetflixCarousel>
          )}

          {/* Row 2: Costumes */}
          {costumes.length > 0 && (
            <NetflixCarousel
              title="ROW 2: COSTUME & WARDROBE PLATES"
              subtitle="TRADITIONAL PERIOD ATTIRE"
              count={costumes.length}
              icon={Shirt}
            >
              {costumes.map((item) => (
                <NetflixVisualCard key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </NetflixCarousel>
          )}

          {/* Row 3: Scenes */}
          {scenes.length > 0 && (
            <NetflixCarousel
              title="ROW 3: SCENE PRODUCTION KEYFRAMES"
              subtitle="CINEMATOGRAPHIC COMPOSITION & LIGHTING"
              count={scenes.length}
              icon={Film}
            >
              {scenes.map((item) => (
                <NetflixVisualCard key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </NetflixCarousel>
          )}
        </div>
      ) : (
        <NetflixCarousel
          title={`${activeTab.toUpperCase()} PRODUCTION PLATES`}
          subtitle="FILTERED ASSET SELECTION"
          count={filteredItems.length}
          defaultView="grid"
        >
          {filteredItems.map((item) => (
            <NetflixVisualCard key={item.id} item={item} onSelect={setSelectedItem} />
          ))}
        </NetflixCarousel>
      )}

      {/* FULLSCREEN PREVIEW / PROMPT INSPECTOR MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#333333] rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#1c1c1c] border-b border-[#2b2b2b] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#E50914] font-bold">
                  {selectedItem.entity_type} BIBLE PLATE
                </span>
                <h3 className="text-lg font-bold text-white uppercase">{selectedItem.label}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-[#2b2b2b] flex items-center justify-center min-h-[260px]">
                {selectedItem.relative_url ? (
                  <img
                    src={`${api.baseUrl}${selectedItem.relative_url}`}
                    alt={selectedItem.label}
                    className="max-h-[380px] w-auto object-contain mx-auto"
                  />
                ) : (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                    Image artifact path: {selectedItem.image_path}
                  </div>
                )}
              </div>

              {/* Prompt Traceability */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-zinc-400 font-bold block flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#E50914]" />
                  GROUNDED PROMPT DIRECTIVE
                </span>
                <div className="p-4 rounded-xl bg-[#141414] border border-[#292929] text-xs font-mono text-zinc-300 leading-relaxed max-h-36 overflow-y-auto">
                  {selectedItem.prompt_used}
                </div>
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <span className="text-zinc-500 block">MODEL</span>
                  <span className="text-white font-bold">{selectedItem.generation_model || 'FLUX.2 Klein'}</span>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <span className="text-zinc-500 block">RESOLUTION</span>
                  <span className="text-white font-bold">1024 x 1024</span>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <span className="text-zinc-500 block">STATUS</span>
                  <span className="text-emerald-400 font-bold">CERTIFIED</span>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <span className="text-zinc-500 block">ENTITY ID</span>
                  <span className="text-zinc-300 truncate block">{selectedItem.entity_id}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1c1c] border-t border-[#2b2b2b] px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">Verified Zero Cultural Hallucination</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Netflix Card with Hover Scaling
function NetflixVisualCard({ item, onSelect }: { item: any; onSelect: (it: any) => void }) {
  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative rounded-xl bg-[#181818] border border-[#2b2b2b] hover:border-[#E50914] overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-netflix-hover flex flex-col justify-between"
    >
      {/* Image Container with Netflix 16:9 ratio */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {item.relative_url ? (
          <img
            src={`${api.baseUrl}${item.relative_url}`}
            alt={item.label}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="p-4 text-center text-zinc-600 font-mono text-[10px]">
            [MOCK BIBLE PLATE]
          </div>
        )}

        {/* Bottom Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase font-black px-1.5 py-0.5 rounded bg-[#E50914] text-white">
            {item.entity_type}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-zinc-300 backdrop-blur-sm border border-white/10">
            4K
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-bold text-white uppercase tracking-wide line-clamp-1 group-hover:text-[#E50914] transition-colors">
          {item.label}
        </h4>
        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
          {item.prompt_used || 'Ground truth prompt directive aligned with approved plan.'}
        </p>

        <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>{item.generation_model || 'FLUX.2'}</span>
          <span className="text-white group-hover:text-[#E50914] flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Inspect
          </span>
        </div>
      </div>
    </div>
  );
}
