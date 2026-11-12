// src/hooks/useReservations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Reservation, CreateReservationRequest, UpdateReservationRequest, GroupMember } from '../types';

type ReservationRow = Reservation & { book?: Record<string, unknown> };

// ── Réservations de l'emprunteur ────────────────────────────────────────────
export const useMyReservations = (userId: string) => {
  return useQuery({
    queryKey: ['myReservations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, book:book_id(id, titre, auteur, image_url, prix_location, proprietaire_id)`)
        .eq('emprunteur_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ownerIds = [...new Set((data ?? []).map((r: ReservationRow) => r.book?.proprietaire_id as string | undefined).filter(Boolean))];
      const { data: owners } = ownerIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', ownerIds)
        : { data: [] as any[] };
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

      return (data ?? []).map((r: ReservationRow) => ({
        ...r,
        book: { ...r.book, proprietaire: ownerById.get(r.book?.proprietaire_id as string) },
      })) as (Reservation & { book: Record<string, unknown> & { proprietaire?: GroupMember } })[];
    },
    enabled: !!userId,
  });
};

// ── Réservations reçues par le propriétaire ─────────────────────────────────
export const useMyReservationsAsOwner = (proprietaireId: string) => {
  return useQuery({
    queryKey: ['ownerReservations', proprietaireId],
    queryFn: async () => {
      // 1. Récupérer les IDs des livres du propriétaire
      const { data: bookIds, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('proprietaire_id', proprietaireId);

      if (booksError) throw booksError;
      if (!bookIds || bookIds.length === 0) return [];

      const ids = bookIds.map((b) => b.id);

      // 2. Récupérer les réservations de ces livres
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, book:book_id(id, titre, auteur, image_url, prix_location)`)
        .in('book_id', ids)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const emprunteurIds = [...new Set((data ?? []).map((r: ReservationRow) => r.emprunteur_id).filter(Boolean))];
      const { data: emprunteurs } = emprunteurIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', emprunteurIds)
        : { data: [] as any[] };
      const emprunteurById = new Map((emprunteurs ?? []).map((e) => [e.id, e]));

      return (data ?? []).map((r: ReservationRow) => ({
        ...r,
        emprunteur: emprunteurById.get(r.emprunteur_id),
      })) as (Reservation & { book: Record<string, unknown>; emprunteur?: GroupMember })[];
    },
    enabled: !!proprietaireId,
  });
};

// ── Réservations d'un livre spécifique ──────────────────────────────────────
export const useBookReservations = (bookId: string) => {
  return useQuery({
    queryKey: ['bookReservations', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*`)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const emprunteurIds = [...new Set((data ?? []).map((r: ReservationRow) => r.emprunteur_id).filter(Boolean))];
      const { data: emprunteurs } = emprunteurIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', emprunteurIds)
        : { data: [] as any[] };
      const emprunteurById = new Map((emprunteurs ?? []).map((e) => [e.id, e]));

      return (data ?? []).map((r: ReservationRow) => ({
        ...r,
        emprunteur: emprunteurById.get(r.emprunteur_id),
      })) as (Reservation & { emprunteur?: GroupMember })[];
    },
    enabled: !!bookId,
  });
};

// ── Une réservation spécifique ───────────────────────────────────────────────
export const useReservation = (reservationId: string) => {
  return useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, book:book_id(id, titre, auteur, image_url, condition, proprietaire_id)`)
        .eq('id', reservationId)
        .single();

      if (error) throw error;

      const idsToFetch = [...new Set([data.emprunteur_id, data.book?.proprietaire_id].filter(Boolean))];
      const { data: people } = idsToFetch.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url, bio').in('id', idsToFetch)
        : { data: [] as any[] };
      const byId = new Map((people ?? []).map((p) => [p.id, p]));

      return {
        ...data,
        book: { ...data.book, proprietaire: byId.get(data.book?.proprietaire_id) },
        emprunteur: byId.get(data.emprunteur_id),
      } as any;
    },
    enabled: !!reservationId,
  });
};

// ── Numéro de téléphone de l'autre partie (réservation active uniquement) ──
export const useReservationContactPhone = (reservationId?: string) => {
  return useQuery({
    queryKey: ['reservationContactPhone', reservationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reservation_contact_phone', {
        p_reservation_id: reservationId,
      });
      if (error) throw error;
      return data as string | null;
    },
    enabled: !!reservationId,
    retry: false,
  });
};

// ── Créer une réservation ────────────────────────────────────────────────────
// Passe exclusivement par la RPC create_reservation (transaction + verrou
// FOR UPDATE côté serveur) — plus d'insert direct depuis le client, ce qui
// évite la double réservation en cas d'appels concurrents.
export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReservationRequest & { emprunteur_id?: string }) => {
      const { data, error } = await supabase.rpc('create_reservation', {
        p_book_id: payload.book_id,
        p_date_fin: payload.date_fin_prevue ?? null,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
      queryClient.invalidateQueries({ queryKey: ['bookReservations', res.book_id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    },
  });
};

// ── Mettre à jour une réservation ────────────────────────────────────────────
// ── Mettre à jour une réservation ────────────────────────────────────────────
// Ne prend plus reservationId en paramètre du hook (ce qui obligeait à
// l'appeler à l'intérieur des handlers → violation des Rules of Hooks /
// "Invalid hook call"). Le hook s'appelle UNE FOIS au niveau du composant ;
// reservationId est désormais passé dans les variables de la mutation.
export const useUpdateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      updates,
    }: {
      reservationId: string;
      updates: UpdateReservationRequest;
    }) => {
      const { data, error } = await supabase
        .from('reservations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;

      // Enregistrer dans l'historique
      const action =
        updates.statut === 'Actif'     ? 'acceptée'   :
        updates.statut === 'Retourné'  ? 'retournée'  :
        updates.statut === 'Annulé'    ? 'annulée'    :
        updates.caution_payee          ? 'caution_versée' : 'mise à jour';

      await supabase.from('reservation_history').insert({
        reservation_id: reservationId,
        action,
        notes: updates.notes || null,
      });

      return data as Reservation;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reservation', res.id] });
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
      queryClient.invalidateQueries({ queryKey: ['bookReservations', res.book_id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    },
  });
};

// ── Historique d'une réservation ─────────────────────────────────────────────
export const useReservationHistory = (reservationId: string) => {
  return useQuery({
    queryKey: ['reservationHistory', reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservation_history')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!reservationId,
  });
};

// ── Accepter / refuser une réservation (notifie l'emprunteur côté serveur) ──
export const useRespondToReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservationId, accept }: { reservationId: string; accept: boolean }) => {
      const { data, error } = await supabase.rpc('respond_to_reservation', {
        p_reservation_id: reservationId,
        p_accept: accept,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ── Déclarer le retour d'un livre : photo + état, preuve en cas de litige ──
export const useMarkBookReturned = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      reservationId: string;
      etat: 'Bon état' | 'Légèrement endommagé' | 'Endommagé' | 'Perdu';
      photoUrl?: string | null;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('mark_book_returned', {
        p_reservation_id: payload.reservationId,
        p_etat: payload.etat,
        p_photo_url: payload.photoUrl ?? null,
        p_notes: payload.notes ?? null,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ── L'emprunteur confirme ou conteste l'état déclaré au retour ──────────────
export const useConfirmBookReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reservationId: string; confirme: boolean; commentaire?: string }) => {
      const { data, error } = await supabase.rpc('confirm_book_return', {
        p_reservation_id: payload.reservationId,
        p_confirme: payload.confirme,
        p_commentaire: payload.commentaire ?? null,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      queryClient.invalidateQueries({ queryKey: ['ownerReservations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
