// src/pages/groups/GroupsPage.tsx
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  useGroups,
  useJoinGroup,
  useCreateGroup,
  useMyJoinRequests,
  useCancelJoinRequest,
  useJoinGroupByCode,
  useLeaveGroup,
} from '../../hooks/useGroups';
import { useToast, errorMessage } from '../../hooks/useToast';
import { QueryState } from '../../components/QueryState';
import {
  AccessCodeCard,
  EditGroupCard,
  MembersPanel,
  DisputesPanel,
  DeleteGroupZone,
  PendingRequestsPanel,
  GroupCard,
  CreateGroupModal,
  JoinByCodeForm,
} from './components';
import { Users, Plus, Search, Loader2, LayoutDashboard } from 'lucide-react';

export default function GroupsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: groups, isLoading, error, refetch } = useGroups();
  const { data: myRequests } = useMyJoinRequests(profile?.id);

  const joinGroup = useJoinGroup();
  const createGroup = useCreateGroup();
  const cancelRequest = useCancelJoinRequest();
  const joinByCode = useJoinGroupByCode();
  const leaveGroup = useLeaveGroup();

  const [searchTerm, setSearchTerm] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ nom: '', description: '' });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const q = searchTerm.trim().toLowerCase();
  const filteredGroups = groups?.filter(
    (g) => q === '' || g.nom.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
  );

  const adminGroups = groups?.filter((g) => g.admin_id === profile?.id) ?? [];
  const isGroupAdmin = (groupId: string) => groups?.find((g) => g.id === groupId)?.admin_id === profile?.id;
  const myPendingRequestFor = (groupId: string) =>
    myRequests?.find((r) => r.group_id === groupId && r.statut === 'en_attente');

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !newGroupData.nom.trim()) return;

    setCreatingGroup(true);
    try {
      await createGroup.mutateAsync({
        nom: newGroupData.nom,
        description: newGroupData.description,
        admin_id: profile.id,
      });
      toast({ title: 'Groupe créé avec succès', variant: 'success' });
      setNewGroupData({ nom: '', description: '' });
      setShowCreateForm(false);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!profile?.id) return;
    setJoiningGroupId(groupId);
    try {
      await joinGroup.mutateAsync({ groupId, userId: profile.id });
      toast({
        title: 'Demande envoyée',
        description: "L'administrateur du groupe doit maintenant l'approuver.",
        variant: 'success',
      });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequest.mutateAsync(requestId);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleJoinByCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setJoiningByCode(true);
    try {
      const result = await joinByCode.mutateAsync(accessCode.trim());
      const joined = Array.isArray(result) ? result[0] : result;
      toast({ title: 'Groupe rejoint', description: `Vous avez rejoint "${joined?.nom}" !`, variant: 'success' });
      setAccessCode('');
    } catch (err) {
      toast({ title: 'Code invalide', description: errorMessage(err, 'Code invalide'), variant: 'destructive' });
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Quitter ce groupe ? Vous perdrez accès à son catalogue.')) return;
    setLeavingGroup(true);
    try {
      await leaveGroup.mutateAsync();
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setLeavingGroup(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 Groupes Communautaires</h1>
            <p className="text-gray-600">Rejoignez une communauté de lecteurs</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="h-5 w-5" />
            Créer un groupe
          </button>
        </div>

        {adminGroups.length > 0 && (
          <div className="mb-8">
            {adminGroups.map((g) => (
              <div key={g.id}>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">👑 Vous administrez "{g.nom}"</p>
                    <p className="text-xs text-purple-700">Gérez le stock, les livres et les demandes du groupe</p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition shrink-0"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Tableau de bord
                  </button>
                </div>
                <EditGroupCard group={g} />
                <AccessCodeCard groupId={g.id} groupNom={g.nom} />
                <DisputesPanel groupId={g.id} groupNom={g.nom} />
                <PendingRequestsPanel groupId={g.id} groupNom={g.nom} />
                <MembersPanel groupId={g.id} adminId={g.admin_id} currentUserId={profile?.id} />
                <DeleteGroupZone groupId={g.id} groupNom={g.nom} />
              </div>
            ))}
          </div>
        )}

        {showCreateForm && (
          <CreateGroupModal
            nom={newGroupData.nom}
            description={newGroupData.description}
            submitting={creatingGroup}
            onNomChange={(nom) => setNewGroupData((prev) => ({ ...prev, nom }))}
            onDescriptionChange={(description) => setNewGroupData((prev) => ({ ...prev, description }))}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={handleCreateGroup}
          />
        )}

        <JoinByCodeForm
          code={accessCode}
          submitting={joiningByCode}
          onCodeChange={setAccessCode}
          onSubmit={handleJoinByCode}
        />

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          minHeight="py-16"
          isEmpty={!filteredGroups || filteredGroups.length === 0}
          empty={
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucun groupe trouvé</h2>
              <p className="text-gray-600 mb-6">
                Créez un nouveau groupe ou demandez à rejoindre un groupe existant.
              </p>
            </div>
          }
        >
          {filteredGroups && filteredGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isMember={profile?.groupe_id === group.id}
                  isAdmin={isGroupAdmin(group.id)}
                  hasPendingRequest={!!myPendingRequestFor(group.id)}
                  isJoining={joiningGroupId === group.id}
                  isLeaving={leavingGroup}
                  onJoin={() => handleJoinGroup(group.id)}
                  onCancelRequest={() => {
                    const pending = myPendingRequestFor(group.id);
                    if (pending) handleCancelRequest(pending.id);
                  }}
                  onLeave={handleLeaveGroup}
                />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}
