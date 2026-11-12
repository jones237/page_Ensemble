import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface BookAccess {
  id: string; book_id: string; user_id: string;
  granted_at: string; expires_at?: string; pages_read: number;
}

export const useBookAccess = (bookId: string, userId?: string) =>
  useQuery({
    queryKey: ['bookAccess', bookId, userId],
    queryFn: async (): Promise<BookAccess | null> => {
      const { data } = await supabase.from('book_access').select('*')
        .eq('book_id', bookId).eq('user_id', userId).maybeSingle();
      return data as BookAccess | null;
    },
    enabled: !!bookId && !!userId,
  });

export const useGrantAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: { book_id: string; user_id: string; expires_days?: number }): Promise<BookAccess> => {
      const expires_at = p.expires_days
        ? new Date(Date.now() + p.expires_days * 86400000).toISOString() : null;
      const { data, error } = await supabase.from('book_access')
        .upsert({ book_id: p.book_id, user_id: p.user_id, granted_at: new Date().toISOString(), expires_at, pages_read: 0 },
                { onConflict: 'book_id,user_id' })
        .select().single();
      if (error) throw error;
      return data as BookAccess;
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: ['bookAccess', v.book_id] }),
  });
};

export const useSaveProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: { book_id: string; user_id: string; pages_read: number }) => {
      const { error } = await supabase.from('book_access')
        .update({ pages_read: p.pages_read }).eq('book_id', p.book_id).eq('user_id', p.user_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: ['bookAccess', v.book_id] }),
  });
};

export const useSearchGutenberg = (query: string) =>
  useQuery({
    queryKey: ['gutenberg', query],
    queryFn: async () => {
      if (query.length < 3) return [];
      const res  = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=fr,en`);
      const data = await res.json();
      return (data.results ?? []).slice(0, 12).map((b: Record<string, unknown>) => {
        const fmt = b.formats as Record<string, string>;
        return {
          id: b.id as number, title: b.title as string,
          author: (b.authors as { name: string }[])?.[0]?.name ?? 'Inconnu',
          cover_url: fmt?.['image/jpeg'] ?? null,
          pdf_url: fmt?.['application/pdf'] ?? null,
          download_count: b.download_count as number,
        };
      }).filter((b: { pdf_url: string | null }) => b.pdf_url);
    },
    enabled: query.length >= 3,
    staleTime: 300_000,
  });

export const useSearchOpenLibrary = (query: string) =>
  useQuery({
    queryKey: ['openLibrary', query],
    queryFn: async () => {
      if (query.length < 3) return [];
      const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,first_publish_year&limit=12`);
      const data = await res.json();
      return (data.docs ?? []).map((d: Record<string, unknown>) => ({
        key:       d.key as string,
        title:     d.title as string,
        author:    (d.author_name as string[])?.[0] ?? 'Inconnu',
        cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        year:      d.first_publish_year as number,
      }));
    },
    enabled: query.length >= 3,
    staleTime: 300_000,
  });
