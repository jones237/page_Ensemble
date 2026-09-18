// src/lib/notifications.ts
// Déclenche les workflows n8n pour SMS/Email

import { logger } from './logger';

const N8N_WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE || '';

export type NotifType =
  | 'reservation_confirmee'
  | 'reservation_acceptee'
  | 'reservation_annulee'
  | 'rappel_retour'     // J-3 avant la date limite
  | 'livre_en_retard'
  | 'livre_retourne';

interface NotifPayload {
  type: NotifType;
  emprunteur: { nom: string; phone: string; email?: string };
  proprietaire: { nom: string; phone: string; email?: string };
  livre: { titre: string; auteur: string };
  reservation: {
    id: string;
    date_debut: string;
    date_fin_prevue: string;
    date_retour_reel?: string;
    montant_location: number;
    montant_caution: number;
  };
}

export async function sendNotification(payload: NotifPayload): Promise<boolean> {
  if (!N8N_WEBHOOK_BASE) {
    logger.warn('[notifications] VITE_N8N_WEBHOOK_BASE non configuré — notification ignorée');
    return false;
  }

  try {
    const res = await fetch(`${N8N_WEBHOOK_BASE}/pageensemble-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    logger.error('[notifications] Erreur envoi webhook n8n:', err);
    return false;
  }
}

// Helpers typés par cas d'usage
export const notify = {
  reservationConfirmee: (payload: Omit<NotifPayload, 'type'>) =>
    sendNotification({ ...payload, type: 'reservation_confirmee' }),

  reservationAcceptee: (payload: Omit<NotifPayload, 'type'>) =>
    sendNotification({ ...payload, type: 'reservation_acceptee' }),

  reservationAnnulee: (payload: Omit<NotifPayload, 'type'>) =>
    sendNotification({ ...payload, type: 'reservation_annulee' }),

  livreRetourne: (payload: Omit<NotifPayload, 'type'>) =>
    sendNotification({ ...payload, type: 'livre_retourne' }),

  livreEnRetard: (payload: Omit<NotifPayload, 'type'>) =>
    sendNotification({ ...payload, type: 'livre_en_retard' }),
};
