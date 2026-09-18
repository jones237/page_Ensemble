import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast, errorMessage } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabaseClient';
import { Reservation } from '../../../types';
import { CheckCircle, Loader2, X } from 'lucide-react';

type EtatRetour = 'Bon état' | 'Légèrement endommagé' | 'Endommagé' | 'Perdu';

interface ReturnModalProps {
  isOpen: boolean;
  reservation: (Reservation & { book?: { titre?: string }; emprunteur?: { nom_complet?: string } }) | null;
  onConfirm: (etat: EtatRetour, photoUrl: string | null, notes: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ReturnModal({ isOpen, reservation, onConfirm, onCancel, loading }: ReturnModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [etat, setEtat] = useState<EtatRetour>('Bon état');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen || !reservation) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleConfirmClick = async () => {
    let photoUrl: string | null = null;
    if (photoFile) {
      setUploading(true);
      try {
        const path = `${profile?.id}/returns/${reservation.id}-${Date.now()}.${photoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('books_images')
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('books_images').getPublicUrl(path);
        photoUrl = data.publicUrl;
      } catch (err) {
        toast({ title: "Erreur lors de l'envoi de la photo", description: errorMessage(err, 'inconnue'), variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    onConfirm(etat, photoUrl, notes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">✅ Valider le retour</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-gray-900">{reservation.book?.titre}</p>
          <p className="text-sm text-gray-600">Emprunteur : {reservation.emprunteur?.nom_complet}</p>
          <p className="text-sm text-gray-600">
            Emprunté le : {new Date(reservation.date_debut).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
          📸 La photo et l'état déclarés servent de preuve en cas de litige — l'emprunteur devra confirmer ou contester cet état.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">État du livre au retour</label>
          <select
            value={etat}
            onChange={(e) => setEtat(e.target.value as EtatRetour)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="Bon état">Bon état</option>
            <option value="Légèrement endommagé">Légèrement endommagé</option>
            <option value="Endommagé">Endommagé</option>
            <option value="Perdu">Perdu</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Photo du livre (optionnel mais recommandé)</label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Aperçu" className="w-full h-32 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes complémentaires
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ex: légère marque page 42..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading || uploading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
            Annuler
          </button>
          <button onClick={handleConfirmClick} disabled={loading || uploading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  );
}
