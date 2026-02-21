/**
 * App Store — Centralized state management with Zustand
 *
 * Holds all shared UI/application state that was previously scattered
 * across 15+ useState hooks in Index.tsx. High-frequency hand tracking
 * values (handPositionX/Y, gesture, etc.) remain as useRef for performance.
 */

import { create } from 'zustand';
import { ChemicalElement, ElementCategory } from '@/data/elements';
import { Molecule } from '@/data/molecules';

export type MainViewMode = '3d' | 'grid' | 'compare' | 'reaction' | 'builder';
export type SidebarViewMode = 'atoms' | 'molecules';

interface AppState {
    // Selection
    selectedElement: ChemicalElement | null;
    selectedMolecule: Molecule | null;
    compareElement1: ChemicalElement | null;
    compareElement2: ChemicalElement | null;

    // View modes
    mainViewMode: MainViewMode;
    viewMode: SidebarViewMode;
    activeFilter: ElementCategory | 'all';
    searchQuery: string;

    // UI toggles
    isDarkMode: boolean;
    isFullscreen: boolean;
    showOrbitals: boolean;
    showTutorial: boolean;
    sidebarOpen: boolean;
    isMobile: boolean;

    // Animation
    zoomLevel: number;
    animationSpeed: number;
    isPaused: boolean;

    // Actions — selections
    setSelectedElement: (el: ChemicalElement | null) => void;
    setSelectedMolecule: (mol: Molecule | null) => void;
    setCompareElement1: (el: ChemicalElement | null) => void;
    setCompareElement2: (el: ChemicalElement | null) => void;

    // Actions — view modes
    setMainViewMode: (mode: MainViewMode) => void;
    setViewMode: (mode: SidebarViewMode) => void;
    setActiveFilter: (filter: ElementCategory | 'all') => void;
    setSearchQuery: (query: string) => void;

    // Actions — UI toggles
    toggleDarkMode: () => void;
    setIsFullscreen: (v: boolean) => void;
    setShowOrbitals: (v: boolean) => void;
    setShowTutorial: (v: boolean) => void;
    setSidebarOpen: (v: boolean) => void;
    setIsMobile: (v: boolean) => void;

    // Actions — animation
    setZoomLevel: (v: number | ((prev: number) => number)) => void;
    setAnimationSpeed: (v: number) => void;
    togglePaused: () => void;
    setIsPaused: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial state
    selectedElement: null,
    selectedMolecule: null,
    compareElement1: null,
    compareElement2: null,

    mainViewMode: '3d',
    viewMode: 'atoms',
    activeFilter: 'all',
    searchQuery: '',

    isDarkMode: true,
    isFullscreen: false,
    showOrbitals: false,
    showTutorial: false,
    sidebarOpen: false,
    isMobile: false,

    zoomLevel: 1,
    animationSpeed: 1,
    isPaused: false,

    // Actions
    setSelectedElement: (el) => set({ selectedElement: el }),
    setSelectedMolecule: (mol) => set({ selectedMolecule: mol }),
    setCompareElement1: (el) => set({ compareElement1: el }),
    setCompareElement2: (el) => set({ compareElement2: el }),

    setMainViewMode: (mode) => set({ mainViewMode: mode }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
    setIsFullscreen: (v) => set({ isFullscreen: v }),
    setShowOrbitals: (v) => set({ showOrbitals: v }),
    setShowTutorial: (v) => set({ showTutorial: v }),
    setSidebarOpen: (v) => set({ sidebarOpen: v }),
    setIsMobile: (v) => set({ isMobile: v }),

    setZoomLevel: (v) =>
        set((s) => ({
            zoomLevel: typeof v === 'function' ? v(s.zoomLevel) : v,
        })),
    setAnimationSpeed: (v) => set({ animationSpeed: v }),
    togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
    setIsPaused: (v) => set({ isPaused: v }),
}));
