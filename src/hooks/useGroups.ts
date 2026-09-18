// src/hooks/useGroups.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Group, GroupMember, DisputedReservation } from '../types';

export const useGroups = () =>
  useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('groups_public')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const adminIds = [...new Set((groups ?? []).map((g) => g.admin_id))];
      const { data: admins } = adminIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', adminIds)
        : { data: [] as any[] };
      const adminById = new Map((admins ?? []).map((a) => [a.id, a]));

      return (groups ?? []).map((g) => ({ ...g, admin: adminById.get(g.admin_id) })) as (Group & {
        admin?: GroupMember;
      })[];
    },
  });

export const useGroup = (groupId: string) =>
  useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data: g, error } = await supabase
        .from('groups_public')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;

      const { data: admin } = await supabase
        .from('profiles_public')
        .select('id, nom_complet, avatar_url, bio')
        .eq('id', g.admin_id)
        .single();

      return { ...g, admin } as any;
    },
    enabled: !!groupId,
  });

export const useGroupStats = (groupId: string) =>
  useQuery({
    queryKey: ['groupStats', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('statut')
        .eq('groupe_id', groupId);
      if (error) throw error;
      return {
        total:     data?.length || 0,
        available: data?.filter((b) => b.statut === 'Disponible').length || 0,
        borrowed:  data?.filter((b) => b.statut === 'Emprunté').length   || 0,
        reserved:  data?.filter((b) => b.statut === 'Reservé').length    || 0,
      };
    },
    enabled: !!groupId,
  });

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nom: string; description?: string; admin_id: string }) => {
      const { data, error } = await supabase
        .from('groups').insert(payload).select().single();
      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

export const useUpdateGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Group>) => {
      const { data, error } = await supabase
        .from('groups').update(updates).eq('id', groupId).select().single();
      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// joinGroup : payload = { groupId, userId } — envoie une DEMANDE d'adhésion (nécessite l'approbation de l'administrateur du groupe)
export const useJoinGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: string; userId: string; message?: string }) => {
      const { error } = await supabase
        .from('group_join_requests')
        .insert({ group_id: payload.groupId, user_id: payload.userId, message: payload.message });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['myJoinRequests'] });
    },
  });
};

// Mes demandes d'adhésion (pour savoir si "en attente" / "refusée" par groupe)
export const useMyJoinRequests = (userId?: string) =>
  useQuery({
    queryKey: ['myJoinRequests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

export const useCancelJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('group_join_requests').delete().eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myJoinRequests'] });
    },
  });
};

// Demandes en attente pour un groupe dont je suis administrateur
export const usePendingJoinRequests = (groupId?: string) =>
  useQuery({
    queryKey: ['pendingJoinRequests', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('group_id', groupId)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))];
      const { data: users } = userIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', userIds)
        : { data: [] as any[] };
      const userById = new Map((users ?? []).map((u) => [u.id, u]));

      return (data ?? []).map((r) => ({ ...r, user: userById.get(r.user_id) })) as any[];
    },
    enabled: !!groupId,
  });

export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_join_request', { request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJoinRequests'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useRejectJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('reject_join_request', { request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJoinRequests'] });
    },
  });
};

// Rejoindre un groupe via un code d'accès — passe uniquement le code,
// jamais d'update direct de groupe_id. Vérification + mise à jour côté serveur.
export const useJoinGroupByCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// ── Solde : ajustement admin uniquement (incrément ou décrément) ──────────
export const useAdjustBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { targetUserId: string; delta: number; reason?: string }) => {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        target_user_id: payload.targetUserId,
        delta: payload.delta,
        reason: payload.reason ?? null,
      });
      if (error) throw error;
      return data as number;
    },
  });
};

export const useBalanceHistory = (userId?: string) =>
  useQuery({
    queryKey: ['balanceHistory', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

export const useGenerateAccessCode = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase
        .from('groups').update({ code_acces: code }).eq('id', groupId);
      if (error) throw error;
      return code;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminGroupCode', groupId] }),
  });
};

// Le code d'accès n'est visible que par l'administrateur du groupe
// (RLS : groups n'est lisible que par admin_id = auth.uid()).
export const useAdminGroupCode = (groupId?: string) =>
  useQuery({
    queryKey: ['adminGroupCode', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, nom, code_acces')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data as { id: string; nom: string; code_acces: string | null };
    },
    enabled: !!groupId,
  });

// ── Membres d'un groupe (pour la gestion admin) ──────────────────────────────
export const useGroupMembers = (groupId?: string) =>
  useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, nom_complet, avatar_url, role, created_at')
        .eq('groupe_id', groupId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!groupId,
  });

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_group');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groupMembers'] });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('admin_remove_member', { p_target_user_id: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groupMembers'] }),
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.rpc('delete_group', { p_group_id: groupId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

// ── Litiges de retour en attente (pour l'admin du groupe / propriétaire) ────
export const useDisputedReturns = (groupId?: string) =>
  useQuery({
    queryKey: ['disputedReturns', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, book:book_id(id, titre, proprietaire_id, groupe_id)')
        .eq('confirme_par_emprunteur', false)
        .eq('litige_resolu', false)
        .order('date_confirmation_emprunteur', { ascending: false });
      if (error) throw error;

      const filtered = (data ?? []).filter((r) => r.book?.groupe_id === groupId);

      const userIds = [...new Set(filtered.map((r) => r.emprunteur_id).filter(Boolean))];
      const { data: users } = userIds.length
        ? await supabase.from('profiles_public').select('id, nom_complet, avatar_url').in('id', userIds)
        : { data: [] as any[] };
      const userById = new Map((users ?? []).map((u) => [u.id, u]));

      return filtered.map((r) => ({ ...r, emprunteur: userById.get(r.emprunteur_id) })) as DisputedReservation[];
    },
    enabled: !!groupId,
  });

export const useResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reservationId: string; rembourserCaution: boolean; notes: string }) => {
      const { data, error } = await supabase.rpc('resolve_dispute', {
        p_reservation_id: payload.reservationId,
        p_rembourser_caution: payload.rembourserCaution,
        p_notes: payload.notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disputedReturns'] }),
  });
};

export const useTransferGroupAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: string; newAdminId: string }) => {
      const { error } = await supabase.rpc('transfer_group_admin', {
        p_group_id: payload.groupId,
        p_new_admin_id: payload.newAdminId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groupMembers'] });
    },
  });
};
