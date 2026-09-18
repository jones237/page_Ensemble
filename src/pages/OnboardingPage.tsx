// src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGroups, useJoinGroup, useCreateGroup } from '../hooks/useGroups';
import { captureEvent } from '../lib/monitoring';
import { BookOpen, Users, BookMarked, ChevronRight, ChevronLeft, Check, Loader2, Search } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'welcome' | 'group' | 'role' | 'done';

// ── Composant ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate    = useNavigate();
  const { profile } = useAuth();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const joinGroup   = useJoinGroup();
  const createGroup = useCreateGroup();

  const [step, setStep]             = useState<Step>('welcome');
  const [groupChoice, setGroupChoice] = useState<'join' | 'create' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName]   = useState('');
  const [newGroupDesc, setNewGroupDesc]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const filteredGroups = groups?.filter(g =>
    g.nom.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  const STEPS: Step[] = ['welcome', 'group', 'role', 'done'];
  const stepIndex = STEPS.indexOf(step);
  const progress  = (stepIndex / (STEPS.length - 1)) * 100;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGroupAction = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    try {
      if (groupChoice === 'join' && selectedGroupId) {
        await joinGroup.mutateAsync({ groupId: selectedGroupId, userId: profile.id });
        captureEvent('onboarding.joined_group', { groupId: selectedGroupId });
      } else if (groupChoice === 'create' && newGroupName.trim()) {
        await createGroup.mutateAsync({
          nom: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          admin_id: profile.id,
        });
        captureEvent('onboarding.created_group', { name: newGroupName });
      }
      setStep('role');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_done', '1');
    captureEvent('onboarding.completed');
    navigate('/catalog');
  };

  const canProceedGroup =
    (groupChoice === 'join' && selectedGroupId) ||
    (groupChoice === 'create' && newGroupName.trim().length >= 3);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Étape {stepIndex} / {STEPS.length - 2}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* ── Étape 1 : Bienvenue ─────────────────────────────────────── */}
          {step === 'welcome' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenue sur PageEnsemble 👋
              </h1>
              <p className="text-gray-500 mb-2">
                Bonjour <span className="font-semibold text-gray-900">{profile?.nom_complet}</span> !
              </p>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                PageEnsemble vous permet de louer et partager des livres au sein
                de votre communauté. En 3 étapes, vous serez prêt.
              </p>

              {/* Mini-aperçu des features */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: '📚', label: 'Catalogue de livres' },
                  { icon: '🔖', label: 'Réservation facile' },
                  { icon: '👥', label: 'Communauté privée' },
                ].map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <p className="text-xs text-gray-600 leading-tight">{f.label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('group')}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                Commencer <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* ── Étape 2 : Groupe ────────────────────────────────────────── */}
          {step === 'group' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Rejoignez ou créez un groupe</h2>
                  <p className="text-xs text-gray-500">Les livres sont partagés au sein d'un groupe</p>
                </div>
              </div>

              {/* Choix */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { value: 'join' as const,   icon: '👥', label: 'Rejoindre', desc: 'Un groupe existant' },
                  { value: 'create' as const, icon: '✨', label: 'Créer',     desc: 'Mon propre groupe' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setGroupChoice(opt.value); setSelectedGroupId(null); }}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      groupChoice === opt.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Rejoindre un groupe */}
              {groupChoice === 'join' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un groupe…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {groupsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">Aucun groupe trouvé</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {filteredGroups.map(g => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGroupId(g.id)}
                          className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition ${
                            selectedGroupId === g.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {g.nom.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{g.nom}</p>
                            {g.description && (
                              <p className="text-xs text-gray-500 truncate">{g.description}</p>
                            )}
                          </div>
                          {selectedGroupId === g.id && (
                            <Check className="h-5 w-5 text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Créer un groupe */}
              {groupChoice === 'create' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Nom du groupe *
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Club de lecture Église Makarios"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      maxLength={80}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-right text-xs text-gray-400 mt-0.5">{newGroupName.length}/80</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Description (optionnel)
                    </label>
                    <textarea
                      placeholder="Décrivez votre groupe en quelques mots…"
                      value={newGroupDesc}
                      onChange={e => setNewGroupDesc(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm mt-3 bg-red-50 p-3 rounded-lg">{error}</p>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('welcome')}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={handleGroupAction}
                  disabled={!canProceedGroup || loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> En cours…</>
                    : <>{groupChoice === 'create' ? 'Créer' : 'Rejoindre'} <ChevronRight className="h-4 w-4" /></>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Rôle & conseil ────────────────────────────────── */}
          {step === 'role' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <BookMarked className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Comment voulez-vous utiliser l'app ?</h2>
                  <p className="text-xs text-gray-500">Vous pourrez changer ça plus tard</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  {
                    icon: '📖',
                    title: 'Je veux emprunter des livres',
                    desc: 'Parcourez le catalogue et réservez les livres qui vous intéressent.',
                    action: () => setStep('done'),
                  },
                  {
                    icon: '📚',
                    title: 'Je veux prêter mes livres',
                    desc: 'Ajoutez vos livres au catalogue et gérez les emprunts.',
                    action: () => navigate('/books/add'),
                  },
                  {
                    icon: '🔄',
                    title: 'Les deux à la fois',
                    desc: 'Empruntez et prêtez — profitez au maximum de la communauté.',
                    action: () => setStep('done'),
                  },
                ].map(opt => (
                  <button
                    key={opt.title}
                    onClick={() => {
                      localStorage.setItem('onboarding_done', '1');
                      captureEvent('onboarding.role_selected', { role: opt.title });
                      opt.action();
                    }}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left flex items-start gap-3 transition group"
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700">{opt.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('group')}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
            </div>
          )}

          {/* ── Étape 4 : Done ──────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes prêt ! 🎉</h2>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Votre compte est configuré. Explorez le catalogue et faites
                votre première réservation dès maintenant.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleFinish}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-5 w-5" /> Voir le catalogue
                </button>
                <button
                  onClick={() => { localStorage.setItem('onboarding_done', '1'); navigate('/books/add'); }}
                  className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  + Ajouter mon premier livre
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip link */}
        {step !== 'done' && (
          <button
            onClick={() => { localStorage.setItem('onboarding_done', '1'); navigate('/catalog'); }}
            className="block text-center w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            Passer l'introduction →
          </button>
        )}
      </div>
    </div>
  );
}
