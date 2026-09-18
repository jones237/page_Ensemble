// src/pages/dashboard/ProprietaireDashboardPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMyBooks, useDeleteBook, useGroupBooksForAdmin } from '../../hooks/useBooks';
import { useMyReservationsAsOwner, useUpdateReservation, useRespondToReservation, useMarkBookReturned } from '../../hooks/useReservations';
import { useGroups } from '../../hooks/useGroups';
import { useToast, errorMessage } from '../../hooks/useToast';
import { Reservation } from '../../types';
import { ConfirmModal, ReturnModal, StatsGrid, BooksPanel, ReservationsPanel, ReservationTab } from './components';
import { AlertCircle, Bell, Loader2, Plus } from 'lucide-react';

type EtatRetour = 'Bon état' | 'Légèrement endommagé' | 'Endommagé' | 'Perdu';
type OwnerReservation = Reservation & { book?: { titre?: string }; emprunteur?: { nom_complet?: string } };

export default function ProprietaireDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: books, isLoading: booksLoading, error: booksError, refetch: refetchBooks } = useMyBooks(profile?.id || '');
  const { data: reservations, isLoading: reservationsLoading, error: reservationsError, refetch: refetchReservations } = useMyReservationsAsOwner(profile?.id || '');
  const deleteBook = useDeleteBook();
  const updateReservation = useUpdateReservation();
  const respondToReservation = useRespondToReservation();
  const markBookReturned = useMarkBookReturned();

  const { data: allGroups, isLoading: groupsLoading } = useGroups();
  const adminOfGroup = allGroups?.find((g) => g.admin_id === profile?.id);
  const { data: groupBooks, isLoading: groupBooksLoading, error: groupBooksError, refetch: refetchGroupBooks } = useGroupBooksForAdmin(adminOfGroup?.id);
  const [booksView, setBooksView] = useState<'mine' | 'group'>('mine');

  const displayedBooks = booksView === 'group' ? groupBooks : books;
  const displayedBooksLoading = booksView === 'group' ? groupBooksLoading : booksLoading;
  const displayedBooksError = booksView === 'group' ? groupBooksError : booksError;
  const refetchDisplayedBooks = booksView === 'group' ? refetchGroupBooks : refetchBooks;

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; bookId: string; titre: string }>({ open: false, bookId: '', titre: '' });
  const [returnModal, setReturnModal] = useState<{ open: boolean; reservation: OwnerReservation | null }>({ open: false, reservation: null });
  const [tab, setTab] = useState<ReservationTab>('pending');

  const pendingRes  = reservations?.filter((r) => r.statut === 'Réservé')  || [];
  const activeRes   = reservations?.filter((r) => r.statut === 'Actif')    || [];
  const returnedRes = reservations?.filter((r) => r.statut === 'Retourné').slice(0, 10) || [];
  const overdueRes  = activeRes.filter((r) => new Date(r.date_fin_prevue) < new Date());

  const totalBooks     = displayedBooks?.length || 0;
  const availableBooks = displayedBooks?.filter((b) => b.statut === 'Disponible').length || 0;
  const borrowedBooks  = displayedBooks?.filter((b) => b.statut === 'Emprunté').length  || 0;
  const reservedBooks  = displayedBooks?.filter((b) => b.statut === 'Reservé').length   || 0;

  const handleAccept = async (reservationId: string) => {
    setActionLoading(reservationId + '_accept');
    try {
      await respondToReservation.mutateAsync({ reservationId, accept: true });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (reservationId: string) => {
    setActionLoading(reservationId + '_refuse');
    try {
      await respondToReservation.mutateAsync({ reservationId, accept: false });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnConfirm = async (etat: EtatRetour, photoUrl: string | null, notes: string) => {
    const res = returnModal.reservation;
    if (!res) return;
    setActionLoading(res.id + '_return');
    try {
      await markBookReturned.mutateAsync({ reservationId: res.id, etat, photoUrl, notes: notes || undefined });
      setReturnModal({ open: false, reservation: null });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCautionPaid = async (reservationId: string) => {
    setActionLoading(reservationId + '_caution');
    try {
      await updateReservation.mutateAsync({ reservationId, updates: { caution_payee: true } });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteModal.bookId) return;
    setActionLoading('delete_' + deleteModal.bookId);
    try {
      await deleteBook.mutateAsync(deleteModal.bookId);
      setDeleteModal({ open: false, bookId: '', titre: '' });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!profile?.id || (profile.role === 'membre' && groupsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (profile.role === 'membre' && !adminOfGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Cette page est réservée aux propriétaires de livres.</p>
        </div>
      </div>
    );
  }

  const currentTab = tab === 'pending' ? pendingRes : tab === 'active' ? activeRes : returnedRes;

  return (
    <>
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Supprimer ce livre ?"
        message={`Le livre "${deleteModal.titre}" sera supprimé définitivement. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleDeleteBook}
        onCancel={() => setDeleteModal({ open: false, bookId: '', titre: '' })}
        loading={!!actionLoading?.startsWith('delete_')}
      />

      <ReturnModal
        isOpen={returnModal.open}
        reservation={returnModal.reservation}
        onConfirm={handleReturnConfirm}
        onCancel={() => setReturnModal({ open: false, reservation: null })}
        loading={!!actionLoading?.endsWith('_return')}
      />

      <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📚 Mon Dashboard</h1>
              <p className="text-gray-600 mt-1">Bienvenue, {profile.nom_complet}</p>
            </div>
            <button
              onClick={() => navigate('/books/add')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm shrink-0 self-start sm:self-auto text-sm"
            >
              <Plus className="h-5 w-5" /> Ajouter un livre
            </button>
          </div>

          {overdueRes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Bell className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">
                  {overdueRes.length} livre{overdueRes.length > 1 ? 's' : ''} en retard !
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {overdueRes.map((r) => r.book?.titre).join(', ')}
                </p>
              </div>
            </div>
          )}

          <StatsGrid total={totalBooks} available={availableBooks} reserved={reservedBooks} borrowed={borrowedBooks} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <BooksPanel
              view={booksView}
              onViewChange={setBooksView}
              showToggle={!!adminOfGroup}
              books={displayedBooks}
              isLoading={displayedBooksLoading}
              error={displayedBooksError}
              onRetry={() => refetchDisplayedBooks()}
              currentUserId={profile?.id}
              onDeleteRequest={(bookId, titre) => setDeleteModal({ open: true, bookId, titre })}
            />

            <ReservationsPanel
              tab={tab}
              onTabChange={setTab}
              pendingCount={pendingRes.length}
              activeCount={activeRes.length}
              returnedCount={returnedRes.length}
              items={currentTab}
              isLoading={reservationsLoading}
              error={reservationsError}
              onRetry={() => refetchReservations()}
              actionLoading={actionLoading}
              onAccept={handleAccept}
              onRefuse={handleRefuse}
              onMarkReturned={(res) => setReturnModal({ open: true, reservation: res })}
              onCautionPaid={handleCautionPaid}
            />
          </div>
        </div>
      </div>
    </>
  );
}
