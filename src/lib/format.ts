// src/lib/format.ts — affichage des montants (prêt gratuit par défaut)
export const formatPrix = (n: number | null | undefined): string =>
  n ? `${n.toLocaleString('fr-FR')} FCFA` : 'Gratuit';

export const formatCaution = (n: number | null | undefined): string =>
  n ? `${n.toLocaleString('fr-FR')} FCFA` : 'Sans caution';
