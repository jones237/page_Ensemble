// src/pages/books/AddBookPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCreateBook } from '../../hooks/useBooks';
import { useToast } from '../../hooks/useToast';
import { BookOpen, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { validateImageFile, sanitizeFileName } from '../../lib/imageValidator';
import { BOOK_CATEGORIES } from '../../types';
import { useGroupSettings } from '../../hooks/useGroupSettings';

export default function AddBookPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const createBook = useCreateBook();

  const { data: groupSettings } = useGroupSettings(profile?.groupe_id || '');

  const [formData, setFormData] = useState({
    titre: '',
    auteur: '',
    resume: '',
    categorie: 'Bible & Études bibliques',
    condition: 'Bon',
    prix_location: groupSettings?.prix_location_defaut ?? 500,
    nombre_pages: '',
    edition: '',
    isbn: '',
  });

  // Mettre à jour le prix par défaut quand les settings chargent
  useEffect(() => {
    if (groupSettings) {
      setFormData(prev => ({
        ...prev,
        prix_location: prev.prix_location === 500
          ? groupSettings.prix_location_defaut
          : prev.prix_location,
      }));
    }
  }, [groupSettings]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile?.id || !profile?.groupe_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-6">
            Vous devez appartenir à un groupe pour ajouter des livres.
          </p>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'prix_location' || name === 'nombre_pages' ? parseInt(value) || 0 : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !profile?.id) return null;
    setUploading(true);
    try {
      // Validation sécurisée du contenu réel du fichier
      const validation = await validateImageFile(imageFile);
      if (!validation.valid) throw new Error(validation.error);

      const filePath = sanitizeFileName(imageFile.name, profile.id);
      const { error: uploadError } = await supabase.storage
        .from('books_images')
        .upload(filePath, imageFile, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('books_images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'upload");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.titre || !formData.auteur) {
        throw new Error('Le titre et l\'auteur sont obligatoires');
      }

      // Upload l'image si présente
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Créer le livre
      await createBook.mutateAsync({
        titre: formData.titre,
        auteur: formData.auteur,
        resume: formData.resume,
        image_url: imageUrl ?? undefined,
        proprietaire_id: profile.id,
        groupe_id: profile.groupe_id ?? '',
        categorie: formData.categorie as any,
        condition: formData.condition as any,
        prix_location: formData.prix_location,
        nombre_pages: formData.nombre_pages ? parseInt(formData.nombre_pages) : undefined,
        edition: formData.edition,
        isbn: formData.isbn,
      });

      toast({ title: 'Livre ajouté avec succès', variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajout du livre';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            ➕ Ajouter un Livre
          </h1>
          <p className="text-gray-600">
            Partagez vos livres avec la communauté
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-4">
              📷 Image du Livre
            </label>
            <div className="flex gap-4">
              {/* Aperçu */}
              <div className="flex-1">
                {imagePreview ? (
                  <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50">
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Clique pour charger une image
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Titre *
            </label>
            <input
              type="text"
              name="titre"
              value={formData.titre}
              onChange={handleInputChange}
              placeholder="ex: Les Misérables"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Auteur */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Auteur *
            </label>
            <input
              type="text"
              name="auteur"
              value={formData.auteur}
              onChange={handleInputChange}
              placeholder="ex: Victor Hugo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Résumé */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Résumé
            </label>
            <textarea
              name="resume"
              value={formData.resume}
              onChange={handleInputChange}
              placeholder="Décrivez le livre en quelques lignes..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Grid de 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Catégorie */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Catégorie
              </label>
              <select
                name="categorie"
                value={formData.categorie}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {Object.entries(
                  BOOK_CATEGORIES.reduce<Record<string, typeof BOOK_CATEGORIES>>(
                    (acc, c) => { if (!acc[c.group]) acc[c.group] = []; acc[c.group].push(c); return acc; }, {}
                  )
                ).map(([group, cats]) => (
                  <optgroup key={group} label={`── ${group} ──`}>
                    {cats.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                État du livre
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="Excellent">Excellent</option>
                <option value="Bon">Bon</option>
                <option value="Acceptable">Acceptable</option>
              </select>
            </div>

            {/* Prix */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Tarif de location (FCFA)
              </label>
              <input
                type="number"
                name="prix_location"
                value={formData.prix_location}
                onChange={handleInputChange}
                min="100"
                step="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Pages */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Nombre de pages
              </label>
              <input
                type="number"
                name="nombre_pages"
                value={formData.nombre_pages}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Édition */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Édition
              </label>
              <input
                type="text"
                name="edition"
                value={formData.edition}
                onChange={handleInputChange}
                placeholder="ex: Édition de poche"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* ISBN */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                ISBN
              </label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                placeholder="ex: 978-2-253-94450-1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading || uploading ? 'Enregistrement...' : '✓ Ajouter le livre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
