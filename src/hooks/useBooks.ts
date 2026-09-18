// src/hooks/useBooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Book, CreateBookRequest, BookFilter, GroupMember, Group } from '../types';

// ========== QUERIES ==========

/**
 * Récupère tous les livres d'un groupe avec filtres optionnels
 */
export const useBooks = (groupId: string, filters?: BookFilter) => {
  return useQuery({
    queryKey: ['books', groupId, filters],
    queryFn: async () => {
      let query = supabase
        .from('books')
        .select(`*`)
        .eq('groupe_id', groupId);

      // Appliquer les filtres
      if (filters?.categorie) {
        query = query.eq('categorie', filters.categorie);
      }
      if (filters?.condition) {
        query = query.eq('condition', filters.condition);
      }
      if (filters?.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters?.proprietaire_id) {
        query = query.eq('proprietaire_id', filters.proprietaire_id);
      }
      if (filters?.search) {
        // Recherche par titre ou auteur (case-insensitive)
        query = query.or(
          `titre.ilike.%${filters.search}%,auteur.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const ownerIds = [...new Set((data ?? []).map((b) => b.proprietaire_id).filter(Boolean))];
      const { data: owners } = ownerIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', ownerIds)
        : { data: [] as any[] };
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

      return (data ?? []).map((b) => ({
        ...b,
        proprietaire: ownerById.get(b.proprietaire_id),
      })) as (Book & { proprietaire?: GroupMember; groupe?: Group })[];
    },
    enabled: !!groupId,
  });
};

/**
 * Récupère un livre spécifique par ID
 */
export const useBook = (bookId: string) => {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`*, reviews:reviews(id, rating, contenu, reviewer_id, reservation_id)`)
        .eq('id', bookId)
        .single();

      if (error) throw error;

      const { data: groupe } = await supabase
        .from('groups_public')
        .select('id, nom, admin_id')
        .eq('id', data.groupe_id)
        .single();

      const reviewerIds = ((data.reviews ?? []) as any[]).map((r) => r.reviewer_id).filter(Boolean);
      const idsToFetch = [...new Set([data.proprietaire_id, ...reviewerIds].filter(Boolean))];
      const { data: people } = idsToFetch.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url, bio').in('id', idsToFetch)
        : { data: [] as any[] };
      const byId = new Map((people ?? []).map((p) => [p.id, p]));

      return {
        ...data,
        groupe,
        proprietaire: byId.get(data.proprietaire_id),
        reviews: ((data.reviews ?? []) as any[]).map((r) => ({
          ...r,
          reviewer: byId.get(r.reviewer_id),
        })),
      } as any;
    },
    enabled: !!bookId,
  });
};

/**
 * Récupère les livres du propriétaire actuel
 */
export const useMyBooks = (proprietaireId: string) => {
  return useQuery({
    queryKey: ['myBooks', proprietaireId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('proprietaire_id', proprietaireId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
    enabled: !!proprietaireId,
  });
};

// Tous les livres d'un groupe qu'on administre (au-delà de ses propres livres) —
// utilisé par un administrateur de groupe pour gérer le catalogue complet.
export const useGroupBooksForAdmin = (groupId?: string) => {
  return useQuery({
    queryKey: ['groupBooksForAdmin', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('groupe_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ownerIds = [...new Set((data ?? []).map((b) => b.proprietaire_id).filter(Boolean))];
      const { data: owners } = ownerIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', ownerIds)
        : { data: [] as any[] };
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

      return (data ?? []).map((b) => ({ ...b, proprietaire: ownerById.get(b.proprietaire_id) })) as (Book & {
        proprietaire?: GroupMember;
      })[];
    },
    enabled: !!groupId,
  });
};

// ========== MUTATIONS ==========

/**
 * Crée un nouveau livre
 */
export const useCreateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBook: CreateBookRequest & { proprietaire_id: string }) => {
      const { data, error } = await supabase
        .from('books')
        .insert(newBook)
        .select()
        .single();

      if (error) throw error;
      return data as Book;
    },
    onSuccess: (newBook) => {
      // Invalider la liste des livres du groupe
      queryClient.invalidateQueries({
        queryKey: ['books', newBook.groupe_id],
      });
      // Invalider la liste des livres du propriétaire
      queryClient.invalidateQueries({
        queryKey: ['myBooks', newBook.proprietaire_id],
      });
    },
  });
};

/**
 * Met à jour un livre existant
 */
export const useUpdateBook = (bookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Book>) => {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', bookId)
        .select()
        .single();

      if (error) throw error;
      return data as Book;
    },
    onSuccess: (updatedBook) => {
      // Invalider les queries
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({
        queryKey: ['books', updatedBook.groupe_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['myBooks', updatedBook.proprietaire_id],
      });
    },
  });
};

/**
 * Supprime un livre (soft delete via statut)
 */
export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider tous les queries de livres
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    },
  });
};

// ── Réservations rendues, empruntées par cet utilisateur pour ce livre,
//    et n'ayant pas encore reçu d'avis — sert à savoir si on peut en écrire un.
export const useReviewableReservations = (bookId?: string, userId?: string, existingReservationIds?: string[]) =>
  useQuery({
    queryKey: ['reviewableReservations', bookId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, date_retour_reel')
        .eq('book_id', bookId)
        .eq('emprunteur_id', userId)
        .eq('statut', 'Retourné')
        .order('date_retour_reel', { ascending: false });
      if (error) throw error;
      const reviewed = new Set(existingReservationIds ?? []);
      return (data ?? []).filter((r) => !reviewed.has(r.id));
    },
    enabled: !!bookId && !!userId,
  });

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bookId: string;
      reservationId: string;
      rating: number;
      contenu?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          book_id: payload.bookId,
          reservation_id: payload.reservationId,
          reviewer_id: userData.user?.id,
          rating: payload.rating,
          contenu: payload.contenu || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['book', variables.bookId] });
      queryClient.invalidateQueries({ queryKey: ['reviewableReservations', variables.bookId] });
    },
  });
};

// ========== PAGINATION ==========

export interface PaginatedBooks {
  data: (Book & { proprietaire?: GroupMember })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const PAGE_SIZE = 12;

export const useBooksPaginated = (
  groupId: string,
  page: number,
  filters?: BookFilter
) => {
  return useQuery({
    queryKey: ['books_paged', groupId, page, filters],
    queryFn: async (): Promise<PaginatedBooks> => {
      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let query = supabase
        .from('books')
        .select('*', { count: 'exact' })
        .eq('groupe_id', groupId);

      if (filters?.categorie)      query = query.eq('categorie', filters.categorie);
      if (filters?.condition)      query = query.eq('condition', filters.condition);
      if (filters?.statut)         query = query.eq('statut', filters.statut);
      if (filters?.proprietaire_id) query = query.eq('proprietaire_id', filters.proprietaire_id);
      if (filters?.search) {
        query = query.or(
          `titre.ilike.%${filters.search}%,auteur.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const ownerIds = [...new Set((data ?? []).map((b) => b.proprietaire_id).filter(Boolean))];
      const { data: owners } = ownerIds.length
        ? await supabase
            .from('profiles_public')
            .select('id, nom_complet, avatar_url')
            .in('id', ownerIds)
        : { data: [] };

      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
      const total     = count ?? 0;

      return {
        data: (data ?? []).map((b) => ({
          ...b,
          proprietaire: ownerById.get(b.proprietaire_id),
        })) as (Book & { proprietaire?: GroupMember })[],
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    },
    enabled: !!groupId,
    placeholderData: (prev) => prev, // garde les données précédentes pendant le chargement
  });
};
