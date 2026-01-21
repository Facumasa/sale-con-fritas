import { create } from 'zustand';
import { ScheduleOption, ScheduleConstraint } from '../services/ai';

interface AIStore {
  isGenerating: boolean;
  generatedOptions: ScheduleOption[];
  constraints: ScheduleConstraint[];
  freeTextConstraints: string;
  selectedOption: ScheduleOption | null;
  impossibleConstraints: string[];
  suggestions: string[];
  
  setIsGenerating: (value: boolean) => void;
  setGeneratedOptions: (options: ScheduleOption[]) => void;
  setConstraints: (constraints: ScheduleConstraint[]) => void;
  setFreeTextConstraints: (text: string) => void;
  setSelectedOption: (option: ScheduleOption | null) => void;
  addConstraint: (constraint: ScheduleConstraint) => void;
  removeConstraint: (id: string) => void;
  setImpossibleConstraints: (constraints: string[]) => void;
  setSuggestions: (suggestions: string[]) => void;
  clearAll: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isGenerating: false,
  generatedOptions: [],
  constraints: [],
  freeTextConstraints: '',
  selectedOption: null,
  impossibleConstraints: [],
  suggestions: [],
  
  setIsGenerating: (value) => set({ isGenerating: value }),
  setGeneratedOptions: (options) => set({ generatedOptions: options }),
  setConstraints: (constraints) => set({ constraints }),
  setFreeTextConstraints: (text) => set({ freeTextConstraints: text }),
  setSelectedOption: (option) => set({ selectedOption: option }),
  setImpossibleConstraints: (constraints) => set({ impossibleConstraints: constraints }),
  setSuggestions: (suggestions) => set({ suggestions }),
  
  addConstraint: (constraint) => set((state) => ({
    constraints: [...state.constraints, constraint]
  })),
  
  removeConstraint: (id) => set((state) => ({
    constraints: state.constraints.filter(c => c.id !== id)
  })),
  
  clearAll: () => set({
    generatedOptions: [],
    constraints: [],
    freeTextConstraints: '',
    selectedOption: null,
    impossibleConstraints: [],
    suggestions: [],
  }),
}));
