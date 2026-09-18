// src/pages/profile/ProfilePage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroups';
import { useAdjustBalance, useBalanceHistory } from '../../hooks/useGroups';
import { supabase } from '../../lib/supabaseClient';
import { useToast, errorMessage } from '../../hooks/useToast';
import { User, Mail, Phone, MapPin, LogOut, Loader2, Edit2, Wallet, Plus, Minus, Bell, Lock, HelpCircle, Info, AlertTriangle, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { data: group } = useGroup(profile?.groupe_id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    nom_complet: profile?.nom_complet || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
  });

  const isAdmin = profile?.role === 'administrateur';
  const adjustBalance = useAdjustBalance();
  const { data: balanceHistory } = useBalanceHistory(isAdmin ? profile?.id : undefined);
  const [amount, setAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [notifsOn, setNotifsOn] = useState(profile?.notifications_actives ?? true);
  const [togglingNotifs, setTogglingNotifs] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpCopied, setHelpCopied] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const handleToggleNotifs = async () => {
    if (!profile) return;
    const next = !notifsOn;
    setNotifsOn(next);
    setTogglingNotifs(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_actives: next })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile?.();
    } catch (err) {
      setNotifsOn(!next); // rollback visuel
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setTogglingNotifs(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivateError(null);
    setDeactivating(true);
    try {
      const { error } = await supabase.rpc('deactivate_own_account');
      if (error) throw error;
      await signOut();
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAdjust = async (sign: 1 | -1) => {
    const value = parseInt(amount, 10);
    if (!value || value <= 0 || !profile) return;
    setAdjusting(true);
    try {
      await adjustBalance.mutateAsync({
        targetUserId: profile.id,
        delta: sign * value,
        reason: sign === 1 ? 'Dépôt' : 'Retrait',
      });
      await refreshProfile?.();
      setAmount('');
      toast({ title: 'Solde mis à jour', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setAdjusting(false);
    }
  };

  if (!profile) {
    return <div>Chargement...</div>;
  }

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
      await signOut();
    }
  };

  // Allowlist explicite : jamais role ni groupe_id depuis ce formulaire.
  // (De toute façon bloqué côté serveur par un trigger, mais on ne les
  // envoie même pas ici — défense en profondeur.)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nom_complet: editData.nom_complet,
          phone: editData.phone,
          bio: editData.bio,
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile?.();
      setIsEditing(false);
      toast({ title: 'Profil mis à jour', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err, 'Erreur inconnue'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'administrateur':
        return 'bg-red-100 text-red-800';
      case 'proprietaire':
        return 'bg-blue-100 text-blue-800';
      case 'membre':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles</p>
        </div>

        {/* Solde */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-emerald-100 text-sm mb-1">Solde actuel</p>
              <p className="text-2xl sm:text-3xl font-extrabold truncate">
                {(profile.solde ?? 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 sm:h-7 sm:h-7" />
            </div>
          </div>

          {isAdmin ? (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Montant (FCFA)"
                  className="w-full px-3 py-2 rounded-lg bg-white/20 placeholder-emerald-100 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                  disabled={adjusting}
                />
                <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleAdjust(1)}
                  disabled={adjusting || !amount}
                  className="flex-1 px-3 py-2 bg-white text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition disabled:opacity-50 flex items-center justify-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" /> Créditer
                </button>
                <button
                  onClick={() => handleAdjust(-1)}
                  disabled={adjusting || !amount}
                  className="flex-1 px-3 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition disabled:opacity-50 flex items-center justify-center gap-1 border border-white/30 text-sm"
                >
                  <Minus className="h-4 w-4" /> Débiter
                </button>
                </div>
              </div>
              <p className="text-xs text-emerald-100 mt-2">
                Réservé aux administrateurs — chaque mouvement est enregistré.
              </p>

              {balanceHistory && balanceHistory.length > 0 && (
                <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                  {balanceHistory.map((tx) => (
                    <div key={tx.id} className="flex justify-between text-xs text-emerald-50">
                      <span>{tx.reason || '—'}</span>
                      <span className="font-semibold">
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-emerald-100 mt-2">
              Contactez un administrateur pour créditer ou débiter votre solde.
            </p>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Background */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          {/* Content */}
          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
            {/* Avatar & Infos */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-20 mb-6 sm:mb-8">
              {/* Avatar */}
              <div className="relative z-10">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.nom_complet}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                    {profile.nom_complet?.charAt(0)}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {profile.nom_complet}
                </h2>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-4 py-1 rounded-full text-sm font-semibold ${getRoleBadge(
                      profile.role
                    )}`}
                  >
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                  {group && (
                    <span className="px-4 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                      👥 {group.nom}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </button>
            </div>

            {/* Informations */}
            {!isEditing ? (
              <div className="space-y-6 py-8 border-t border-gray-200">
                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Téléphone */}
                {profile.phone && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {profile.phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Groupe */}
                {group && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Groupe</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {group.nom}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bio */}
                {profile.bio && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Bio</p>
                    <p className="text-gray-900">{profile.bio}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-600">
                  <p>
                    Membre depuis le{' '}
                    <span className="font-semibold">
                      {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              /* Formulaire de Modification */
              <form onSubmit={handleSaveProfile} className="space-y-6 py-8 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={editData.nom_complet}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        nom_complet: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-2 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {saving ? 'Enregistrement...' : '✓ Enregistrer'}
                  </button>
                </div>
              </form>
            )}

            {/* Paramètres */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Paramètres</h2>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {/* Notifications */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rappels de retour</p>
                      <p className="text-xs text-gray-500">Notifications d'échéance et de retard</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleNotifs}
                    disabled={togglingNotifs}
                    className={`relative w-11 h-6 rounded-full transition ${
                      notifsOn ? 'bg-blue-600' : 'bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifsOn ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Sécurité */}
                <Link
                  to="/forgot-password"
                  className="flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">Changer mon mot de passe</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>

                {/* Aide */}
                <div className="bg-white">
                  <button
                    type="button"
                    onClick={() => setShowHelp((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">Aide & Support</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-gray-300 transition-transform ${showHelp ? 'rotate-90' : ''}`} />
                  </button>
                  {showHelp && (
                    <div className="px-4 pb-4">
                      <p className="text-xs text-gray-500 mb-2">
                        Une question, un problème ? Écrivez-nous directement à :
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
                          support@pageensemble.app
                        </code>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText('support@pageensemble.app');
                            setHelpCopied(true);
                            setTimeout(() => setHelpCopied(false), 2000);
                          }}
                          className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition shrink-0"
                        >
                          {helpCopied ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* À propos */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">À propos</p>
                  </div>
                  <span className="text-xs text-gray-400">PageEnsemble v1.0</span>
                </div>
              </div>
            </div>

            {/* Zone dangereuse */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Zone dangereuse</h2>

              {!showDeactivateConfirm ? (
                <button
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-medium rounded-lg transition text-sm"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Désactiver mon compte
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-1 font-medium">
                    Désactiver votre compte ?
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    Vous serez déconnecté et retiré de votre groupe. Cette action nécessite
                    de ne pas avoir de réservation en cours. Contactez le support pour réactiver.
                  </p>
                  {deactivateError && (
                    <p className="text-xs text-red-900 bg-red-100 rounded px-2 py-1.5 mb-3">{deactivateError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDeactivateConfirm(false); setDeactivateError(null); }}
                      disabled={deactivating}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeactivateAccount}
                      disabled={deactivating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {deactivating ? 'Désactivation...' : 'Oui, désactiver'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
