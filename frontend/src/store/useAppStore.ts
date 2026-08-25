/**
/**
 * App Store — Centralized state management with Zustand
 *
 * Holds all shared UI/application state that was previously scattered
 * across 15+ useState hooks in Index.tsx. High-frequency hand tracking
 * values (handPositionX/Y, gesture, etc.) remain as useRef for performance.
 */

import { create } from 'zustand';
import { ChemicalElement, ElementCategory, elements } from '@/data/elements';
import { Molecule } from '@/data/molecules';

export type MainViewMode = '3d' | 'grid' | 'compare' | 'reaction' | 'builder';
export type SidebarViewMode = 'atoms' | 'molecules';
export type WorkspaceMode = 'explore' | 'table' | 'compare' | 'reactions' | 'builder' | 'decay' | 'lattice' | 'lab' | 'library';
export type InspectorTab = 'overview' | 'properties' | 'learning' | 'actions';
export type UIDensity = 'comfortable' | 'compact';

export interface SavedSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    selectedElement: number | null;
    selectedMolecule: string | null;
    workspaceMode: WorkspaceMode | string;
    compareElements: number[];
    builderAtoms: unknown[];
    builderBonds: unknown[];
    notes: string;
    tags: string[];
}

interface AppState {
    // Selection
    selectedElement: ChemicalElement | null;
    selectedMolecule: Molecule | null;
    compareElement1: ChemicalElement | null;
    compareElement2: ChemicalElement | null;

    // View modes
    mainViewMode: MainViewMode;
    workspaceMode: WorkspaceMode;
    viewMode: SidebarViewMode;
    activeFilter: ElementCategory | 'all';
    searchQuery: string;
    commandOpen: boolean;
    inspectorTab: InspectorTab;
    recentItems: string[];
    savedSessions: SavedSession[];
    comparisonBasket: number[];
    uiDensity: UIDensity;

    // UI toggles
    isDarkMode: boolean;
    isFullscreen: boolean;
    showOrbitals: boolean;
    showTutorial: boolean;
    sidebarOpen: boolean;
    isMobile: boolean;
    zenMode: boolean;
    mobileDrawer: 'none' | 'discovery' | 'inspector';

    // Animation
    zoomLevel: number;
    animationSpeed: number;
    isPaused: boolean;

    // Actions — selections
    setSelectedElement: (el: ChemicalElement | null) => void;
    setSelectedMolecule: (mol: Molecule | null) => void;
    setCompareElement1: (el: ChemicalElement | null) => void;
    setCompareElement2: (el: ChemicalElement | null) => void;
    setComparisonSlot: (slot: 1 | 2, el: ChemicalElement | null) => void;

    // Actions — view modes
    setMainViewMode: (mode: MainViewMode) => void;
    setWorkspaceMode: (mode: WorkspaceMode) => void;
    setViewMode: (mode: SidebarViewMode) => void;
    setActiveFilter: (filter: ElementCategory | 'all') => void;
    setSearchQuery: (query: string) => void;
    setCommandOpen: (open: boolean) => void;
    setInspectorTab: (tab: InspectorTab) => void;
    addRecentItem: (item: string) => void;
    setSavedSessions: (sessions: SavedSession[]) => void;
    addSavedSession: (session: SavedSession) => void;
    removeSavedSession: (id: string) => void;
    setComparisonBasket: (items: number[]) => void;
    addToComparisonBasket: (atomicNumber: number) => void;
    setUiDensity: (density: UIDensity) => void;

    // Actions — UI toggles
    toggleDarkMode: () => void;
    setIsFullscreen: (v: boolean) => void;
    setShowOrbitals: (v: boolean) => void;
    setShowTutorial: (v: boolean) => void;
    setSidebarOpen: (v: boolean) => void;
    setIsMobile: (v: boolean) => void;
    setZenMode: (v: boolean) => void;
    toggleZenMode: () => void;
    setMobileDrawer: (drawer: 'none' | 'discovery' | 'inspector') => void;

    // Actions — animation
    setZoomLevel: (v: number | ((prev: number) => number)) => void;
    setAnimationSpeed: (v: number) => void;
    togglePaused: () => void;
    setIsPaused: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial state
    selectedElement: elements[0] || null,
    selectedMolecule: null,
    compareElement1: elements[0] || null, // Hydrogen
    compareElement2: elements[5] || null, // Carbon

    mainViewMode: '3d',
    workspaceMode: 'explore',
    viewMode: 'atoms',
    activeFilter: 'all',
    searchQuery: '',
    commandOpen: false,
    inspectorTab: 'overview',
    recentItems: [],
    savedSessions: [],
    comparisonBasket: [1, 6],
    uiDensity: 'comfortable',

    isDarkMode: true,
    isFullscreen: false,
    showOrbitals: false,
    showTutorial: false,
    sidebarOpen: false,
    isMobile: false,
    zenMode: false,
    mobileDrawer: 'none',

    zoomLevel: 1,
    animationSpeed: 1,
    isPaused: false,

    // Actions
    setSelectedElement: (el) => set({ selectedElement: el }),
    setSelectedMolecule: (mol) => set({ selectedMolecule: mol }),
    setCompareElement1: (el) => set({ compareElement1: el }),
    setCompareElement2: (el) => set({ compareElement2: el }),
    setComparisonSlot: (slot, el) => set(slot === 1 ? { compareElement1: el } : { compareElement2: el }),

    setMainViewMode: (mode) => set({ mainViewMode: mode }),
    setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setCommandOpen: (open) => set({ commandOpen: open }),
    setInspectorTab: (tab) => set({ inspectorTab: tab }),
    addRecentItem: (item) => set((s) => ({
        recentItems: [item, ...s.recentItems.filter(existing => existing !== item)].slice(0, 8),
    })),
    setSavedSessions: (sessions) => set({ savedSessions: sessions }),
    addSavedSession: (session) => set((s) => ({
        savedSessions: [session, ...s.savedSessions.filter(existing => existing.id !== session.id)],
    })),
    removeSavedSession: (id) => set((s) => ({
        savedSessions: s.savedSessions.filter(session => session.id !== id),
    })),
    setComparisonBasket: (items) => set({ comparisonBasket: items.slice(0, 2) }),
    addToComparisonBasket: (atomicNumber) => set((s) => ({
        comparisonBasket: [atomicNumber, ...s.comparisonBasket.filter(item => item !== atomicNumber)].slice(0, 2),
    })),
    setUiDensity: (density) => set({ uiDensity: density }),

    toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
    setIsFullscreen: (v) => set({ isFullscreen: v }),
    setShowOrbitals: (v) => set({ showOrbitals: v }),
    setShowTutorial: (v) => set({ showTutorial: v }),
    setSidebarOpen: (v) => set({ sidebarOpen: v }),
    setIsMobile: (v) => set({ isMobile: v }),
    setZenMode: (v) => set({ zenMode: v }),
    toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
    setMobileDrawer: (drawer) => set({ mobileDrawer: drawer }),

    setZoomLevel: (v) =>
        set((s) => ({
            zoomLevel: typeof v === 'function' ? v(s.zoomLevel) : v,
        })),
    setAnimationSpeed: (v) => set({ animationSpeed: v }),
    togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
    setIsPaused: (v) => set({ isPaused: v }),
}));
