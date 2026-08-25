# Page Dependency Trees

## / (Main Laboratory Workbench)
Entry: `frontend/src/pages/Index.tsx`
Dependencies:
- `src/components/Atom3D.tsx`
  - `src/shaders/fresnelShader.ts`
  - `src/shaders/orbitalShader.ts`
- `src/components/BohrModel3D.tsx`
- `src/components/PeriodicTableGrid.tsx`
  - `src/data/elements.ts`
- `src/components/ComparisonMode.tsx`
  - `src/data/elementProperties.ts`
- `src/components/ReactionSimulator.tsx`
  - `src/data/reactions.ts`
- `src/components/Molecule3D.tsx`
  - `src/data/molecules.ts`
- `src/components/MoleculeBuilder.tsx`
- `src/components/SpectroscopyBar.tsx`
- `src/components/QuantumNumbersHUD.tsx`
- `src/components/LibraryManager.tsx`
- `src/lib/audioEngine.ts`
- `src/store/useAppStore.ts`
