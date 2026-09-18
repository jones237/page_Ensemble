// src/pages/books/EditBookPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBook, useUpdateBook, useDeleteBook } from '../../hooks/useBooks';
import { useGroupSettings } from '../../hooks/useGroupSettings';
import { BOOK_CATEGORIES } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useToast, errorMessage } from '../../hooks/useToast';
import { BookOpen, X, Loader2, ImageIcon } from 'lucide-react';

export default function EditBookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: book, isLoading } = useBook(id || '');
  const updateBook = useUpdateBook(id || '');
  const deleteBook = useDeleteBook();
  const { data: groupSettings } = useGroupSettings(profile?.groupe_id || '');

  const [formData, setFormData] = useState({
    categorie: '',
    condition: 'Bon',
    prix_location: 500,
    montant_caution: '' as number | '',
    duree_pret_jours: '' as number | '',
    resume: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (book) {
      setFormData({
        categorie: book.categorie,
        condition: book.condition,
        prix_location: book.prix_location,
        montant_caution: book.montant_caution ?? '',
        duree_pret_jours: book.duree_pret_jours ?? '',
        resume: book.resume ?? '',
      });
    }
  }, [book]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Livre introuvable</h1>
        </div>
      </div>
    );
  }

  const isOwner = book.proprietaire_id === profile?.id;
  const isGroupAdmin = book.groupe?.admin_id === profile?.id;

  if (!isOwner && !isGroupAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Seul le propriétaire ou l'administrateur du groupe peut le modifier.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'prix_location' || name === 'montant_caution' || name === 'duree_pret_jours'
          ? value === ''
            ? ''
            : parseInt(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let image_url: string | undefined;
      if (photoFile) {
        setUploadingPhoto(true);
        const path = `${profile?.id}/books/${id}-${Date.now()}.${photoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('books_images')
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('books_images').getPublicUrl(path);
        image_url = data.publicUrl;
        setUploadingPhoto(false);
      }

      await updateBook.mutateAsync({
        categorie: formData.categorie as any,
        condition: formData.condition as any,
        prix_location: formData.prix_location,
        montant_caution: formData.montant_caution === '' ? null : formData.montant_caution,
        duree_pret_jours: formData.duree_pret_jours === '' ? null : formData.duree_pret_jours,
        resume: formData.resume,
        ...(image_url ? { image_url } : {}),
      } as any);
      toast({ title: 'Livre mis à jour', variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      setUploadingPhoto(false);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteBook.mutateAsync(id);
      toast({ title: 'Livre supprimé', variant: 'success' });
      navigate(isGroupAdmin && !isOwner ? '/catalog' : '/dashboard');
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err, 'Erreur lors de la suppression'), variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const groupedCategories = BOOK_CATEGORIES.reduce<Record<string, typeof BOOK_CATEGORIES>>(
    (acc, c) => {
      if (!acc[c.group]) acc[c.group] = [];
      acc[c.group].push(c);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Modifier "{book.titre}"
          </h1>
          <p className="text-gray-600">Tarif de location, caution, durée de prêt et catégorie</p>
          {isGroupAdmin && !isOwner && (
            <p className="mt-2 inline-block text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
              👑 Vous modifiez ce livre en tant qu'administrateur du groupe — il appartient à {book.proprietaire?.nom_complet ?? 'un autre membre'}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Photo du livre */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Photo du livre</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-28 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                ) : book.image_url ? (
                  <img src={book.image_url} alt={book.titre} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                  className="text-sm"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {book.image_url ? 'Choisir une nouvelle image la remplacera.' : 'Aucune photo actuellement.'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
            <textarea
              name="resume"
              value={formData.resume}
              onChange={handleInputChange}
              rows={4}
              placeholder="Un résumé ou quelques mots sur ce livre..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={saving}
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Catégorie</label>
            <select
              name="categorie"
              value={formData.categorie}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <optgroup key={group} label={`── ${group} ──`}>
                  {cats.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* État */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">État du livre</label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              <option value="Excellent">Excellent</option>
              <option value="Bon">Bon</option>
              <option value="Acceptable">Acceptable</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarif */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Tarif de location (FCFA)
              </label>
              <input
                type="number"
                name="prix_location"
                value={formData.prix_location}
                onChange={handleInputChange}
                min="0"
                step="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            {/* Caution */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Caution (FCFA)
              </label>
              <input
                type="number"
                name="montant_caution"
                value={formData.montant_caution}
                onChange={handleInputChange}
                min="0"
                step="100"
                placeholder={`Défaut du groupe : ${groupSettings?.montant_caution_defaut ?? 2000}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Vide = utilise le réglage par défaut du groupe.</p>
            </div>

            {/* Durée de prêt */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Durée de prêt (jours)
              </label>
              <input
                type="number"
                name="duree_pret_jours"
                value={formData.duree_pret_jours}
                onChange={handleInputChange}
                min="1"
                placeholder={`Défaut du groupe : ${groupSettings?.duree_emprunt_jours ?? 14}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Vide = utilise le réglage par défaut du groupe.</p>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={saving}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {uploadingPhoto ? 'Envoi de la photo...' : saving ? 'Enregistrement...' : '✓ Enregistrer'}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                🗑️ Supprimer définitivement ce livre
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-3">
                  Supprimer "{book.titre}" définitivement ? Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {deleting ? 'Suppression...' : 'Oui, supprimer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
