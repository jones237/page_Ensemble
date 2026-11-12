// src/lib/notificationMeta.ts
// Icônes, durée écoulée et destination de chaque type de notification
// (partagé entre la cloche et la page /notifications).

export const TYPE_ICON: Record<string, string> = {
  rappel_echeance: '⏰',
  retard: '🔴',
  retard_proprietaire: '🔴',
  retard_admin: '🚨',
  reservation_acceptee: '✅',
  reservation_refusee: '❌',
  reservation_annulee: '🚫',
  nouvelle_reservation: '📖',
  retour_a_confirmer: '📸',
  retour_confirme: '✅',
  litige_retour: '⚠️',
  litige_resolu: '⚖️',
  remboursement_caution: '💰',
  rappel_notation: '⭐',
  paiement_initie: '💳',
  bilan_hebdo: '📊',
  demande_groupe_approuvee: '👥',
  demande_groupe_refusee: '🚫',
  nouveau_admin: '🛡️',
  admin_transfere: '🛡️',
  groupe_supprime: '🗑️',
  retire_du_groupe: '👋',
};

const TO_RESERVATIONS = new Set([
  'rappel_echeance', 'retard', 'retard_proprietaire', 'reservation_acceptee',
  'reservation_refusee', 'reservation_annulee', 'nouvelle_reservation', 'retour_a_confirmer',
  'retour_confirme', 'litige_retour', 'litige_resolu', 'remboursement_caution', 'rappel_notation',
]);
const TO_DASHBOARD = new Set(['retard_admin', 'paiement_initie', 'bilan_hebdo']);
const TO_GROUPS = new Set([
  'demande_groupe_approuvee', 'demande_groupe_refusee', 'nouveau_admin',
  'admin_transfere', 'groupe_supprime', 'retire_du_groupe',
]);

/** Page vers laquelle mène une notification (null = rien à ouvrir). */
export function notificationRoute(type: string, lienId: string | null): string | null {
  if (TO_RESERVATIONS.has(type) && lienId) return '/my-reservations';
  if (TO_DASHBOARD.has(type)) return '/dashboard';
  if (TO_GROUPS.has(type)) return '/groups';
  return null;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}
