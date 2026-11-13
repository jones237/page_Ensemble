// src/pages/admin/SettingsPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGroupSettings, useSaveGroupSettings } from '../../hooks/useGroupSettings';
import { useGroups } from '../../hooks/useGroups';
import { useToast, errorMessage } from '../../hooks/useToast';
import { QueryState } from '../../components/QueryState';
import { Settings, DollarSign, Calendar, Shield, Save, RotateCcw, Loader2, CheckCircle, KeyRound, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading, error, refetch } = useGroupSettings(profile?.groupe_id || '');
  const saveSettings = useSaveGroupSettings();
  const { data: allGroups, isLoading: groupsLoading } = useGroups();
  const administersAGroup = !!allGroups?.some((g) => g.admin_id === profile?.id);

  const [form, setForm] = useState({
    prix_location_defaut: 0,
    montant_caution_defaut: 0,
    duree_emprunt_jours: 14,
  });
  const [saved, setSaved] = useState(false);

  // --- Outil TEMPORAIRE : changer le mot de passe d'un membre sans email -----------------------
  // Réservé à l'administrateur (re-vérifié côté serveur). À retirer dès que l'envoi d'emails
  // fonctionne normalement — voir SECURITY_CHECKLIST.md.
  const isAdmin = profile?.role === 'administrateur';
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    if (resetPassword.length < 8 || !/[A-Z]/.test(resetPassword) || !/[0-9]/.test(resetPassword)) {
      setResetMsg({ type: 'err', text: '8 caractères minimum, avec une majuscule et un chiffre.' });
      return;
    }
    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée, reconnectez-vous.');
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { targetEmail: resetEmail.trim(), newPassword: resetPassword },
      });
      if (error) {
        const serverMsg = (error as { context?: { body?: { error?: string } } }).context?.body?.error;
        throw new Error(serverMsg || error.message);
      }
      setResetMsg({ type: 'ok', text: data?.message || 'Mot de passe mis à jour.' });
      setResetEmail('');
      setResetPassword('');
    } catch (err) {
      setResetMsg({ type: 'err', text: errorMessage(err, 'Impossible de changer ce mot de passe.') });
    } finally {
      setResetLoading(false);
    }
  };

  // Charger les settings existants dans le formulaire
  useEffect(() => {
    if (settings) {
      setForm({
        prix_location_defaut: settings.prix_location_defaut,
        montant_caution_defaut: settings.montant_caution_defaut,
        duree_emprunt_jours: settings.duree_emprunt_jours,
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?.groupe_id) return;
    try {
      await saveSettings.mutateAsync({
        groupe_id: profile.groupe_id,
        ...form,
        updated_by: profile.id,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setForm({
      prix_location_defaut: 0,
      montant_caution_defaut: 0,
      duree_emprunt_jours: 14,
    });
  };

  if (!profile || groupsLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!['proprietaire', 'administrateur'].includes(profile.role) && !administersAGroup) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-500">Réservé aux propriétaires et administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" /> Paramètres du Groupe
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez les tarifs et règles de location par défaut
          </p>
        </div>

        <QueryState isLoading={isLoading} error={error} onRetry={() => refetch()} minHeight="py-16">
          <div className="space-y-6">

            {/* Tarifs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Tarifs de location</h2>
                  <p className="text-xs text-gray-500">Appliqués par défaut à chaque nouveau livre ajouté</p>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-5">

                {/* Prix location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix de location par livre
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={form.prix_location_defaut}
                        onChange={e => handleChange('prix_location_defaut', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">FCFA</span>
                    </div>
                  </div>
                  {/* Suggestions rapides */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[0, 200, 300, 500, 750, 1000].map(v => (
                      <button
                        key={v}
                        onClick={() => handleChange('prix_location_defaut', v)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${
                          form.prix_location_defaut === v
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {v} FCFA
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant de la caution
                    <span className="ml-2 text-xs text-gray-500 font-normal">(remboursée au retour)</span>
                  </label>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={form.montant_caution_defaut}
                      onChange={e => handleChange('montant_caution_defaut', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">FCFA</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[0, 500, 1000, 2000, 5000].map(v => (
                      <button
                        key={v}
                        onClick={() => handleChange('montant_caution_defaut', v)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${
                          form.montant_caution_defaut === v
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {v === 0 ? 'Pas de caution' : `${v} FCFA`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Durée */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Durée d'emprunt</h2>
                  <p className="text-xs text-gray-500">Durée maximale par défaut pour chaque emprunt</p>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de jours d'emprunt
                </label>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.duree_emprunt_jours}
                    onChange={e => handleChange('duree_emprunt_jours', parseInt(e.target.value) || 14)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">jours</span>
                </div>

                {/* Slider visuel */}
                <input
                  type="range"
                  min={3}
                  max={60}
                  value={form.duree_emprunt_jours}
                  onChange={e => handleChange('duree_emprunt_jours', parseInt(e.target.value))}
                  className="w-full mt-3 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3 jours</span>
                  <span className="font-semibold text-blue-600">{form.duree_emprunt_jours} jours</span>
                  <span>60 jours</span>
                </div>

                {/* Préréglages */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    { label: '1 semaine', value: 7 },
                    { label: '2 semaines', value: 14 },
                    { label: '3 semaines', value: 21 },
                    { label: '1 mois', value: 30 },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => handleChange('duree_emprunt_jours', value)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${
                        form.duree_emprunt_jours === value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aperçu */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-blue-900 mb-3">📋 Récapitulatif</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-blue-700">{form.prix_location_defaut}</p>
                  <p className="text-xs text-blue-600">FCFA / location</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-blue-700">{form.montant_caution_defaut}</p>
                  <p className="text-xs text-blue-600">FCFA caution</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-blue-700">{form.duree_emprunt_jours}</p>
                  <p className="text-xs text-blue-600">jours max</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                <RotateCcw className="h-4 w-4" /> Réinitialiser
              </button>
              <button
                onClick={handleSave}
                disabled={saveSettings.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {saveSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <><CheckCircle className="h-4 w-4" /> Enregistré !</>
                ) : (
                  <><Save className="h-4 w-4" /> Enregistrer les paramètres</>
                )}
              </button>
            </div>
          </div>
        </QueryState>

        {isAdmin && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-amber-900">Changer le mot de passe d'un membre (temporaire)</h2>
                <p className="text-sm text-amber-800 mt-1">
                  À utiliser seulement si l'email « mot de passe oublié » ne lui arrive pas. Ce bouton sera retiré
                  dès que l'envoi d'emails fonctionnera normalement.
                </p>
              </div>
            </div>
            <form onSubmit={handleAdminReset} className="space-y-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email du membre</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="membre@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  disabled={resetLoading}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="8 caractères, 1 majuscule, 1 chiffre"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Donnez-le ensuite au membre de vive voix ou par message ; il pourra le changer depuis son profil.
                </p>
              </div>
              {resetMsg && (
                <p className={`text-sm ${resetMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                  {resetMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={resetLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50"
              >
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Changer ce mot de passe
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
