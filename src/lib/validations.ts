// src/lib/validations.ts
// ─── Schémas de validation Zod pour toute l'application ─────────────────────
import { z } from 'zod';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  nom_complet: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères')
    .regex(/^[\p{L}\s'\-]+$/u, 'Le nom ne doit contenir que des lettres'),
  email: z
    .string()
    .email('Adresse email invalide')
    .max(254, 'Email trop long'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Mot de passe trop long')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirm'],
});

export const signInSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
});

// ── Livres ────────────────────────────────────────────────────────────────────

export const addBookSchema = z.object({
  titre: z
    .string()
    .min(1, 'Le titre est obligatoire')
    .max(200, 'Titre trop long'),
  auteur: z
    .string()
    .min(1, "L'auteur est obligatoire")
    .max(100, 'Nom d\'auteur trop long'),
  resume: z.string().max(2000, 'Résumé trop long').optional(),
  categorie: z.string().min(1, 'Choisissez une catégorie'),
  condition: z.enum(['Excellent', 'Bon', 'Acceptable']),
  prix_location: z
    .number()
    .min(0, 'Le prix ne peut pas être négatif')
    .max(100_000, 'Prix trop élevé'),
  nombre_pages: z.number().min(1).max(10_000).optional(),
  isbn: z
    .string()
    .regex(/^(?:97[89]\d{10}|\d{9}[\dX])?$/, 'ISBN invalide')
    .optional()
    .or(z.literal('')),
});

// ── Profil ────────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  nom_complet: z
    .string()
    .min(2, 'Minimum 2 caractères')
    .max(80, 'Maximum 80 caractères'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-]{7,20}$/, 'Numéro invalide')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Bio trop longue (max 500 caractères)').optional(),
});

// ── Réservation ───────────────────────────────────────────────────────────────

export const reservationSchema = z.object({
  book_id: z.string().uuid('ID livre invalide'),
  date_fin_prevue: z.string().datetime().optional(),
});

// ── Groupes ───────────────────────────────────────────────────────────────────

export const groupSchema = z.object({
  nom: z
    .string()
    .min(3, 'Minimum 3 caractères')
    .max(80, 'Maximum 80 caractères'),
  description: z.string().max(500, 'Description trop longue').optional(),
});

// ── Utilitaire ────────────────────────────────────────────────────────────────

/** Formate les erreurs Zod en objet {champ: message} */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((e) => [e.path.join('.'), e.message])
  );
}

export type SignUpInput        = z.infer<typeof signUpSchema>;
export type SignInInput        = z.infer<typeof signInSchema>;
export type AddBookInput       = z.infer<typeof addBookSchema>;
export type ProfileInput       = z.infer<typeof profileSchema>;
export type ReservationInput   = z.infer<typeof reservationSchema>;
export type GroupInput         = z.infer<typeof groupSchema>;
