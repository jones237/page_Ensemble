// src/types/index.ts

// PROFILS
export interface Profile {
  id: string;
  nom_complet: string;
  phone?: string;
  role: 'administrateur' | 'proprietaire' | 'membre';
  groupe_id?: string;
  avatar_url?: string;
  bio?: string;
  solde?: number;
  notifications_actives?: boolean;
  created_at: string;
  updated_at: string;
}

// GROUPES
export interface Group {
  id: string;
  nom: string;
  description?: string;
  admin_id: string;
  admin?: Profile; // Relation
  photo_url?: string;
  code_acces?: string;
  created_at: string;
  updated_at: string;
}

// Vue allégée d'un membre de groupe (profiles_public), utilisée par la gestion admin
export interface GroupMember {
  id: string;
  nom_complet: string;
  avatar_url?: string;
  role: Profile['role'];
  created_at: string;
}

export type JoinRequestStatus = 'en_attente' | 'approuve' | 'refuse';

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  statut: JoinRequestStatus;
  message?: string;
  created_at: string;
  // Présent uniquement sur les requêtes récupérées côté admin (jointure profiles_public)
  user?: Pick<GroupMember, 'id' | 'nom_complet' | 'avatar_url'>;
}

// Réservation en litige, enrichie du livre concerné et de l'emprunteur —
// utilisée par le panneau de résolution de litiges d'un admin de groupe.
export type DisputedReservation = Reservation & {
  book?: Pick<Book, 'id' | 'titre' | 'proprietaire_id' | 'groupe_id'>;
  emprunteur?: Pick<GroupMember, 'id' | 'nom_complet' | 'avatar_url'>;
};

// LIVRES
export type BookCondition = 'Excellent' | 'Bon' | 'Acceptable';
export type BookStatus = 'Disponible' | 'Reservé' | 'Emprunté';
export type BookCategory =
  // Catégories générales
  | 'Fiction'
  | 'Non-fiction'
  | 'Scolaire'
  | 'Jeunesse'
  | 'Biographie'
  | 'Histoire'
  | 'Science'
  | 'Développement personnel'
  | 'Santé & Bien-être'
  | 'Poésie & Littérature'
  // Catégories chrétiennes
  | 'Bible & Études bibliques'
  | 'Théologie & Doctrine'
  | 'Devotionnel & Prières'
  | 'Évangélisation & Mission'
  | 'Famille chrétienne'
  | 'Témoignages chrétiens'
  | 'Leadership chrétien'
  | 'Prophétie & Eschatologie'
  | 'Vie spirituelle'
  | 'Chants & Louanges'
  | 'Autre';

// Constante listant toutes les catégories avec icônes (pour les UI)
export const BOOK_CATEGORIES: { value: BookCategory; label: string; icon: string; group: string }[] = [
  // Général
  { value: 'Fiction',               label: 'Fiction',               icon: '📖', group: 'Général' },
  { value: 'Non-fiction',           label: 'Non-fiction',           icon: '📰', group: 'Général' },
  { value: 'Scolaire',              label: 'Scolaire',              icon: '🎓', group: 'Général' },
  { value: 'Jeunesse',              label: 'Jeunesse',              icon: '🧒', group: 'Général' },
  { value: 'Biographie',            label: 'Biographie',            icon: '👤', group: 'Général' },
  { value: 'Histoire',              label: 'Histoire',              icon: '🏛️', group: 'Général' },
  { value: 'Science',               label: 'Science',               icon: '🔬', group: 'Général' },
  { value: 'Développement personnel', label: 'Développement personnel', icon: '🌱', group: 'Général' },
  { value: 'Santé & Bien-être',     label: 'Santé & Bien-être',     icon: '💪', group: 'Général' },
  { value: 'Poésie & Littérature',  label: 'Poésie & Littérature',  icon: '✍️', group: 'Général' },
  // Chrétien
  { value: 'Bible & Études bibliques', label: 'Bible & Études bibliques', icon: '✝️', group: 'Chrétien' },
  { value: 'Théologie & Doctrine',  label: 'Théologie & Doctrine',  icon: '📜', group: 'Chrétien' },
  { value: 'Devotionnel & Prières', label: 'Devotionnel & Prières', icon: '🙏', group: 'Chrétien' },
  { value: 'Évangélisation & Mission', label: 'Évangélisation & Mission', icon: '🌍', group: 'Chrétien' },
  { value: 'Famille chrétienne',    label: 'Famille chrétienne',    icon: '👨‍👩‍👧', group: 'Chrétien' },
  { value: 'Témoignages chrétiens', label: 'Témoignages chrétiens', icon: '💬', group: 'Chrétien' },
  { value: 'Leadership chrétien',   label: 'Leadership chrétien',   icon: '👑', group: 'Chrétien' },
  { value: 'Prophétie & Eschatologie', label: 'Prophétie & Eschatologie', icon: '🔮', group: 'Chrétien' },
  { value: 'Vie spirituelle',       label: 'Vie spirituelle',       icon: '✨', group: 'Chrétien' },
  { value: 'Chants & Louanges',     label: 'Chants & Louanges',     icon: '🎵', group: 'Chrétien' },
  { value: 'Autre',                 label: 'Autre',                 icon: '📚', group: 'Général' },
];

export interface Book {
  id: string;
  titre: string;
  auteur: string;
  resume?: string;
  image_url?: string;
  proprietaire_id: string;
  proprietaire?: Profile; // Relation
  groupe_id: string;
  groupe?: Group; // Relation
  categorie: BookCategory;
  condition: BookCondition;
  statut: BookStatus;
  prix_location: number; // en FCFA
  montant_caution?: number | null; // Caution spécifique au livre (FCFA) ; null = hérite du groupe
  duree_pret_jours?: number | null; // Durée de prêt spécifique (jours) ; null = hérite du groupe
  nombre_pages?: number;
  edition?: string;
  isbn?: string;
  created_at: string;
  updated_at: string;
}

// RÉSERVATIONS
export type ReservationStatus = 'Réservé' | 'Actif' | 'Retourné' | 'Annulé' | 'En retard';

export interface Reservation {
  id: string;
  book_id: string;
  book?: Book; // Relation
  emprunteur_id: string;
  emprunteur?: Profile; // Relation
  date_debut: string;
  date_fin_prevue: string;
  date_retour_reel?: string;
  statut: ReservationStatus;
  caution_payee: boolean;
  montant_caution: number;
  montant_location?: number;
  notes?: string;
  photo_retour_url?: string | null;
  etat_retour?: 'Bon état' | 'Légèrement endommagé' | 'Endommagé' | 'Perdu' | null;
  confirme_par_emprunteur?: boolean | null;
  date_confirmation_emprunteur?: string | null;
  created_at: string;
  updated_at: string;
}

// HISTORIQUE DES RÉSERVATIONS
export interface ReservationHistory {
  id: string;
  reservation_id: string;
  action: string; // 'créée', 'retournée', 'prolongée', etc.
  date: string;
  notes?: string;
  created_by?: string;
}

// NOTIFICATIONS
export type NotificationType =
  | 'rappel_retour'
  | 'confirmation_reservation'
  | 'livre_disponible'
  | 'nouvelle_reservation'
  | 'reservation_acceptee'
  | 'reservation_annulee';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  titre: string;
  message: string;
  lien_id?: string; // ID du livre ou réservation
  lu: boolean;
  created_at: string;
}

// MESSAGES
export interface Message {
  id: string;
  sender_id: string;
  sender?: Profile; // Relation
  recipient_id: string;
  recipient?: Profile; // Relation
  reservation_id?: string;
  contenu: string;
  lu: boolean;
  created_at: string;
}

// AVIS / REVIEWS
export interface Review {
  id: string;
  book_id: string;
  reviewer_id: string;
  reviewer?: Profile; // Relation
  rating: number; // 1-5
  contenu?: string;
  created_at: string;
}

// ============================================
// TYPES POUR LES REQUÊTES API
// ============================================

export interface CreateBookRequest {
  titre: string;
  auteur: string;
  resume?: string;
  image_url?: string;
  groupe_id: string;
  categorie: BookCategory;
  condition: BookCondition;
  prix_location: number;
  nombre_pages?: number;
  edition?: string;
  isbn?: string;
}

export interface UpdateBookRequest extends Partial<CreateBookRequest> {
  statut?: BookStatus;
}

export interface CreateReservationRequest {
  book_id: string;
  date_fin_prevue?: string; // Si non fourni, +14 jours par défaut
}

export interface UpdateReservationRequest {
  statut?: ReservationStatus;
  date_retour_reel?: string;
  caution_payee?: boolean;
  notes?: string;
}

// ============================================
// TYPES POUR LA PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================
// TYPES POUR LES FILTRES
// ============================================

export interface BookFilter {
  groupe_id?: string;
  categorie?: BookCategory;
  condition?: BookCondition;
  statut?: BookStatus;
  proprietaire_id?: string;
  search?: string; // Recherche par titre ou auteur
}

export interface ReservationFilter {
  user_id?: string;
  book_id?: string;
  statut?: ReservationStatus;
  groupe_id?: string;
}
