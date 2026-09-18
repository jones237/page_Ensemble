// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sentry } from './lib/monitoring';
import { PWAInstallBanner, PWAUpdatePrompt } from './components/PWAPrompt';
import BottomNav from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { ToastProvider } from './hooks/useToast';
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

// Auth Pages
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'));
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Dashboard Pages
const CatalogPage = lazy(() => import('./pages/dashboard/CatalogPage'));
const MyReservationsPage = lazy(() => import('./pages/dashboard/MyReservationsPage'));
const ProprietaireDashboardPage = lazy(() => import('./pages/dashboard/ProprietaireDashboardPage'));

// Books Pages
const BookDetailPage = lazy(() => import('./pages/books/BookDetailPage'));
const AddBookPage = lazy(() => import('./pages/books/AddBookPage'));
const EditBookPage = lazy(() => import('./pages/books/EditBookPage'));

// Groups Pages
const GroupsPage = lazy(() => import('./pages/groups/GroupsPage'));

// Admin Pages
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

// Profile Pages
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// Setup QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      // Ne pas gaspiller de retries sur des erreurs qui ne se résoudront
      // jamais toutes seules (404, 403, contraintes...). On ne retry que
      // les échecs probablement réseau/transitoires, 2 fois max.
      retry: (failureCount, error: unknown) => {
        const e = error as Record<string, unknown>; const status = e?.status ?? e?.code;
        if (status && Number(status) >= 400 && Number(status) < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      // Ne relance pas automatiquement une requête déjà en échec tant que
      // le navigateur reste hors-ligne — évite de spammer des appels voués
      // à échouer ; react-query relance de lui-même au retour du réseau.
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
    },
  },
});

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div className='min-h-screen flex items-center justify-center'><p className='text-red-600'>Une erreur critique est survenue. Notre équipe a été notifiée.</p></div>}>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
          <OfflineBanner />
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1 pb-16 md:pb-0">
                    <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
          </div>
        }>
            <Routes>
                {/* ========== PUBLIC ROUTES ========== */}
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Home (public marketing landing page) */}
                <Route path="/" element={<HomePage />} />

                {/* ========== PROTECTED ROUTES ========== */}

                {/* Groups */}
                <Route path="/groups" element={
                  <ProtectedRoute>
                    <GroupsPage />
                  </ProtectedRoute>
                } />

                {/* Profile */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />

                {/* Catalog & Books */}
                <Route path="/catalog" element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                } />

                <Route path="/books/:bookId" element={
                  <ProtectedRoute>
                    <BookDetailPage />
                  </ProtectedRoute>
                } />

                <Route path="/books/add" element={
                  <ProtectedRoute>
                    <AddBookPage />
                  </ProtectedRoute>
                } />

                <Route path="/books/edit/:id" element={
                  <ProtectedRoute>
                    <EditBookPage />
                  </ProtectedRoute>
                } />

                {/* Reservations */}
                <Route path="/my-reservations" element={
                  <ProtectedRoute>
                    <MyReservationsPage />
                  </ProtectedRoute>
                } />

                {/* Proprietaire Dashboard */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <ProprietaireDashboardPage />
                  </ProtectedRoute>
                } />

                {/* Settings */}
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
          </Suspense>
            </main>

            <BottomNav />

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
                <div className="text-center text-gray-600 text-sm">
                  <p>© 2026 PageEnsemble - Plateforme de location de livres communautaire</p>
                  <p className="mt-2">Créé avec ❤️ pour les communautés</p>
                </div>
              </div>
            </footer>
          </div>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
    </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
}
