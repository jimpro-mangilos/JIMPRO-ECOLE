/**
 * Shared React Query keys for the entire application.
 * Using a structured factory pattern prevents collisions and makes invalidation easy.
 */
export const queryKeys = {
  sections: {
    all: ['sections'] as const,
    active: ['sections', 'active'] as const,
  },
  options: {
    all: ['options'] as const,
    active: ['options', 'active'] as const,
    bySection: (sectionId: string) => ['options', 'bySection', sectionId] as const,
  },
  classes: {
    all: ['classes'] as const,
    active: ['classes', 'active'] as const,
  },
  motifsPaiement: {
    all: ['motifsPaiement'] as const,
    active: ['motifsPaiement', 'active'] as const,
  },
  typesPaiement: {
    all: ['typesPaiement'] as const,
    active: ['typesPaiement', 'active'] as const,
  },
  anneesScolaires: {
    all: ['anneesScolaires'] as const,
    active: ['anneesScolaires', 'active'] as const,
  },
  eleves: {
    all: ['eleves'] as const,
    list: (filters?: Record<string, unknown>) => ['eleves', 'list', filters ?? {}] as const,
    detail: (id: string) => ['eleves', 'detail', id] as const,
  },
  paiements: {
    all: ['paiements'] as const,
    list: (filters?: Record<string, unknown>) => ['paiements', 'list', filters ?? {}] as const,
  },
  finances: {
    all: ['compteCourant'] as const,
    list: (filters?: Record<string, unknown>) => ['compteCourant', 'list', filters ?? {}] as const,
  },
  fournitures: {
    all: ['gestionFournitures'] as const,
  },
  stocks: {
    all: ['stockUniformes'] as const,
  },
  configuration: {
    all: ['configuration'] as const,
  },
  users: {
    all: ['profiles'] as const,
  },
} as const;
