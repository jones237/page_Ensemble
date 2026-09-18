// src/hooks/useGroupSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface GroupSettings {
  id?: string;
  groupe_id: string;
  prix_location_defaut: number;
  montant_caution_defaut: number;
  duree_emprunt_jours: number;
  updated_by?: string;
  updated_at?: string;
}

export const DEFAULT_SETTINGS: Omit<GroupSettings, 'groupe_id'> = {
  prix_location_defaut: 500,
  montant_caution_defaut: 2000,
  duree_emprunt_jours: 14,
};

export const useGroupSettings = (groupeId: string) =>
  useQuery({
    queryKey: ['groupSettings', groupeId],
    queryFn: async (): Promise<GroupSettings> => {
      const { data, error } = await supabase
        .from('group_settings')
        .select('*')
        .eq('groupe_id', groupeId)
        .maybeSingle();

      if (error) throw error;
      // Si pas encore de settings, retourner les valeurs par défaut
      return data ?? { groupe_id: groupeId, ...DEFAULT_SETTINGS };
    },
    enabled: !!groupeId,
  });

export const useSaveGroupSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: GroupSettings) => {
      const { data, error } = await supabase
        .from('group_settings')
        .upsert(
          { ...settings, updated_at: new Date().toISOString() },
          { onConflict: 'groupe_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as GroupSettings;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groupSettings', variables.groupe_id] });
    },
  });
};
