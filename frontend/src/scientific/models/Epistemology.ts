/**
 * Scientific Epistemology & Provenance Model
 * Categorizes the epistemic source and methodology of all scientific data and visualizations.
 */

export type EpistemicProvenance =
  | 'MATHEMATICALLY_DERIVED'
  | 'MODEL_DERIVED'
  | 'EMPIRICAL_DATA'
  | 'CONCEPTUAL_ABSTRACTION';

export interface ProvenanceCitation {
  sourceName: string;
  sourceUrl?: string;
  doi?: string;
  retrievalDate?: string;
  standardReference?: string;
}

export interface EpistemologyMetadata {
  provenance: EpistemicProvenance;
  label: string;
  shortDescription: string;
  detailedMethodology: string;
  limitations: string;
  citation?: ProvenanceCitation;
}

export const EPISTEMOLOGY_DEFINITIONS: Record<EpistemicProvenance, {
  badgeLabel: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  description: string;
}> = {
  MATHEMATICALLY_DERIVED: {
    badgeLabel: 'MATHEMATICALLY DERIVED',
    colorClass: 'text-sky-700',
    borderClass: 'border-sky-300',
    bgClass: 'bg-sky-50',
    description: 'Calculated analytically from foundational mathematical equations under specified physical conditions.',
  },
  MODEL_DERIVED: {
    badgeLabel: 'MODEL-DERIVED',
    colorClass: 'text-indigo-700',
    borderClass: 'border-indigo-300',
    bgClass: 'bg-indigo-50',
    description: 'Calculated using an established physical approximation or semi-empirical theoretical framework.',
  },
  EMPIRICAL_DATA: {
    badgeLabel: 'EMPIRICAL DATA',
    colorClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50',
    description: 'Directly sourced from peer-reviewed experimental laboratory measurements (NIST, CODATA, IUPAC).',
  },
  CONCEPTUAL_ABSTRACTION: {
    badgeLabel: 'CONCEPTUAL ABSTRACTION',
    colorClass: 'text-amber-700',
    borderClass: 'border-amber-300',
    bgClass: 'bg-amber-50',
    description: 'An intentional visual metaphor designed to communicate subatomic phenomena that cannot be directly visualized at human scale.',
  },
};
