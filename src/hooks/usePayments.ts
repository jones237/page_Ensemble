// src/hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { captureError, captureEvent } from '../lib/monitoring';

export type PaymentMethod = 'mtn' | 'orange' | 'cash';
export type PaymentType   = 'caution' | 'location';
export type PaymentStatus = 'pending' | 'initiated' | 'confirmed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  reservation_id: string;
  payer_id: string;
  receiver_id: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  phone_number?: string;
  reference?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Lire les paiements d'une réservation ──────────────────────────────────────
export const useReservationPayments = (reservationId: string) =>
  useQuery({
    queryKey: ['payments', reservationId],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!reservationId,
  });

// ── Initier un paiement (côté emprunteur) ────────────────────────────────────
export const useInitiatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      reservation_id: string;
      payer_id: string;
      receiver_id: string;
      type: PaymentType;
      method: PaymentMethod;
      amount: number;
      phone_number?: string;
    }): Promise<Payment> => {
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...payload, status: 'initiated' })
        .select()
        .single();
      if (error) throw error;
      captureEvent('payment.initiated', {
        type: payload.type,
        method: payload.method,
        amount: payload.amount,
      });
      return data as Payment;
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['payments', p.reservation_id] });
    },
    onError: (err) => captureError(err, { context: 'initiate_payment' }),
  });
};

// ── Confirmer la réception (côté propriétaire) ────────────────────────────────
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      payment_id: string;
      reservation_id: string;
      confirmed_by: string;
      reference?: string;
      notes?: string;
    }): Promise<Payment> => {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_by: payload.confirmed_by,
          confirmed_at: new Date().toISOString(),
          reference: payload.reference ?? null,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.payment_id)
        .select()
        .single();
      if (error) throw error;
      captureEvent('payment.confirmed', { payment_id: payload.payment_id });
      return data as Payment;
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['payments', p.reservation_id] });
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
    },
  });
};

// ── Rembourser la caution (côté propriétaire, au retour) ─────────────────────
export const useRefundCaution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      payment_id: string;
      reservation_id: string;
      notes?: string;
    }): Promise<Payment> => {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          notes: payload.notes ?? 'Caution remboursée au retour du livre',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.payment_id)
        .select()
        .single();
      if (error) throw error;
      captureEvent('payment.refunded');
      return data as Payment;
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['payments', p.reservation_id] });
    },
  });
};

// ── Marquer comme échoué ──────────────────────────────────────────────────────
export const useFailPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { payment_id: string; reservation_id: string; reason?: string }) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'failed', notes: payload.reason ?? null })
        .eq('id', payload.payment_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['payments', v.reservation_id] });
    },
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string; color: string }> = {
  mtn:    { label: 'MTN Mobile Money',  icon: '📱', color: 'bg-yellow-400 text-yellow-900' },
  orange: { label: 'Orange Money',      icon: '🟠', color: 'bg-orange-500 text-white'      },
  cash:   { label: 'Espèces',           icon: '💵', color: 'bg-green-600 text-white'        },
};

export const STATUS_LABELS: Record<PaymentStatus, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-gray-100 text-gray-600'    },
  initiated: { label: 'Initié',      color: 'bg-blue-100 text-blue-700'    },
  confirmed: { label: 'Confirmé ✓', color: 'bg-green-100 text-green-700'  },
  failed:    { label: 'Échoué',      color: 'bg-red-100 text-red-700'      },
  refunded:  { label: 'Remboursé',   color: 'bg-blue-100 text-blue-700'},
};
