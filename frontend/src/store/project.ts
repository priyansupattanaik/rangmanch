import { create } from 'zustand';

interface ProjectState {
  projectId: string | null;
  projectName: string;
  projectStatus: string;
  selectedCulture: string;
  secondCulture: string | null;
  setting: string;
  outputScript: string;
  
  // Entities
  scenes: any[];
  characters: any[];
  locations: any[];
  costumes: any[];
  props: any[];
  continuityWarnings: any[];

  // Plan
  plan: any | null;
  cultureReference: any | null;

  // Adapted Screenplay
  adaptedScenes: any[];

  // Visuals
  images: any[];

  // Actions
  setProjectId: (id: string) => void;
  setProjectInfo: (info: { id: string; name: string; status: string }) => void;
  setCultureConfig: (config: {
    selectedCulture: string;
    secondCulture?: string | null;
    setting?: string;
    outputScript?: string;
  }) => void;
  setEntities: (data: {
    scenes: any[];
    characters: any[];
    locations: any[];
    costumes: any[];
    props: any[];
    continuity_warnings?: any[];
  }) => void;
  setPlanData: (plan: any, cultureRef: any) => void;
  setAdaptedScenes: (scenes: any[]) => void;
  setImages: (images: any[]) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  projectName: '',
  projectStatus: 'IDLE',
  selectedCulture: 'malwai',
  secondCulture: null,
  setting: 'rural',
  outputScript: 'Devanagari',

  scenes: [],
  characters: [],
  locations: [],
  costumes: [],
  props: [],
  continuityWarnings: [],

  plan: null,
  cultureReference: null,
  adaptedScenes: [],
  images: [],

  setProjectId: (id) => set({ projectId: id }),
  setProjectInfo: (info) =>
    set({
      projectId: info.id,
      projectName: info.name,
      projectStatus: info.status,
    }),
  setCultureConfig: (config) =>
    set((state) => ({
      selectedCulture: config.selectedCulture ?? state.selectedCulture,
      secondCulture: config.secondCulture !== undefined ? config.secondCulture : state.secondCulture,
      setting: config.setting ?? state.setting,
      outputScript: config.outputScript ?? state.outputScript,
    })),
  setEntities: (data) =>
    set({
      scenes: data.scenes || [],
      characters: data.characters || [],
      locations: data.locations || [],
      costumes: data.costumes || [],
      props: data.props || [],
      continuityWarnings: data.continuity_warnings || [],
    }),
  setPlanData: (plan, cultureRef) =>
    set({
      plan,
      cultureReference: cultureRef,
    }),
  setAdaptedScenes: (scenes) => set({ adaptedScenes: scenes }),
  setImages: (images) => set({ images: images }),
  reset: () =>
    set({
      projectId: null,
      projectName: '',
      projectStatus: 'IDLE',
      scenes: [],
      characters: [],
      locations: [],
      costumes: [],
      props: [],
      continuityWarnings: [],
      plan: null,
      cultureReference: null,
      adaptedScenes: [],
      images: [],
    }),
}));
