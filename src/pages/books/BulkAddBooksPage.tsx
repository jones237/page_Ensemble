// src/pages/books/BulkAddBooksPage.tsx
// Ajout de plusieurs livres d'un coup : on colle une liste "Titre ; Auteur ; Catégorie"
// (une ligne = un livre). Pensé pour le démarrage d'un groupe : 20 livres en 2 minutes.
import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useGroupSettings } from '../../hooks/useGroupSettings';
import { supabase } from '../../lib/supabaseClient';
import { BOOK_CATEGORIES } from '../../types';

const MAX_LINES = 50;

type ParsedRow =
  | { ok: true; line: number; titre: string; auteur: string; categorie: string }
  | { ok: false; line: number; raw: string; reason: string };

function parseLines(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = idx + 1;
    if (!raw.trim()) return;
    const cells = raw.split(/;|\t|\|/).map((c) => c.trim());
    // ignorer une ligne d'en-tête éventuelle ("Titre ; Auteur ; Catégorie")
    if (cells[0].toLowerCase() === 'titre') return;
    const [titre, auteur, cat] = cells;
    if (!titre) return rows.push({ ok: false, line, raw, reason: 'Titre manquant' });
    if (!auteur) return rows.push({ ok: false, line, raw, reason: 'Auteur manquant (format : Titre ; Auteur)' });
    if (titre.length > 200) return rows.push({ ok: false, line, raw, reason: 'Titre trop long (200 max)' });
    if (auteur.length > 100) return rows.push({ ok: false, line, raw, reason: 'Auteur trop long (100 max)' });
    const categorie =
      BOOK_CATEGORIES.find((c) => c.value.toLowerCase() === (cat ?? '').toLowerCase())?.value ?? 'Autre';
    rows.push({ ok: true, line, titre, auteur, categorie });
  });
  return rows;
}

export default function BulkAddBooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: groupSettings } = useGroupSettings(profile?.groupe_id || '');

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => parseLines(text), [text]);
  const valid = rows.filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok);
  const invalid = rows.filter((r): r is Extract<ParsedRow, { ok: false }> => !r.ok);
  const tooMany = valid.length > MAX_LINES;

  if (!profile?.groupe_id) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 text-center max-w-sm w-full">
          <p className="text-gray-700 mb-4">Rejoignez d'abord un groupe pour ajouter des livres.</p>
          <Link to="/groups" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
            Voir les groupes
          </Link>
        </div>
      </div>
    );
  }

  const handleImport = async () => {
    if (!profile.groupe_id || valid.length === 0 || tooMany) return;
    setError(null);
    setLoading(true);
    try {
      const prix = groupSettings?.prix_location_defaut ?? 0;
      const payload = valid.map((r) => ({
        titre: r.titre,
        auteur: r.auteur,
        categorie: r.categorie,
        condition: 'Bon',
        prix_location: prix,
        proprietaire_id: profile.id,
        groupe_id: profile.groupe_id as string,
      }));
      const { error: insertError } = await supabase.from('books').insert(payload);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast({ title: `${payload.length} livre${payload.length > 1 ? 's' : ''} ajouté${payload.length > 1 ? 's' : ''}`, variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setError(msg || "Erreur lors de l'import. Aucun livre n'a été ajouté.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">
          <ChevronLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Plus className="h-6 w-6 text-blue-600" /> Ajouter plusieurs livres
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Une ligne par livre, au format <span className="font-mono bg-gray-100 px-1 rounded">Titre ; Auteur ; Catégorie</span>.
            La catégorie est facultative (« Autre » par défaut). Maximum {MAX_LINES} livres à la fois.
            Les livres sont ajoutés en bon état, au tarif par défaut du groupe ({groupSettings?.prix_location_defaut ? `${groupSettings.prix_location_defaut} FCFA` : 'gratuit'}) ;
            vous pourrez les modifier ensuite.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            disabled={loading}
            placeholder={'Le Pèlerin ; John Bunyan ; Bible & Études bibliques\nL\'Enfant noir ; Camara Laye ; Fiction\nMathématiques 3e ; Collectif'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {rows.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {valid.length} livre{valid.length > 1 ? 's' : ''} prêt{valid.length > 1 ? 's' : ''} à être ajouté{valid.length > 1 ? 's' : ''}
              </p>
              {tooMany && (
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> Trop de lignes : retirez-en {valid.length - MAX_LINES} (maximum {MAX_LINES}).
                </p>
              )}
              {invalid.length > 0 && (
                <ul className="text-sm text-red-700 space-y-1">
                  {invalid.map((r) => (
                    <li key={r.line} className="flex items-start gap-2 min-w-0">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">Ligne {r.line} ignorée : {r.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || valid.length === 0 || tooMany}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Ajout…</> : `Ajouter ${valid.length || ''} livre${valid.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
