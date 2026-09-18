import { logger } from '../lib/logger';
// src/components/Navbar.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import NotificationBell from './NotificationBell';
import { BookOpen, Menu, X, LogOut, LayoutDashboard, Heart, User } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { data: allGroups } = useGroups();
  const administersAGroup = !!allGroups?.some((g) => g.admin_id === profile?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (err) {
      logger.error('Logout error:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `px-4 py-2 rounded-lg transition ${
      isActive(path)
        ? 'bg-blue-600 text-white font-medium'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-blue-600">
            <BookOpen className="h-8 w-8" />
            <span className="hidden sm:inline">PageEnsemble</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && profile ? (
              <>
                {/* Links */}
                <div className="flex gap-2">
                  <Link to="/catalog" className={navLinkClass('/catalog')}>
                    📚 Catalogue
                  </Link>
                  <Link to="/my-reservations" className={navLinkClass('/my-reservations')}>
                    🔖 Mes Réservations
                  </Link>
                  {(profile.role === 'proprietaire' || administersAGroup) && (
                    <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                      <LayoutDashboard className="h-5 w-5 inline mr-2" />
                      Stock
                    </Link>
                  )}
                  {(['proprietaire', 'administrateur'].includes(profile.role) || administersAGroup) && (
                    <Link to="/settings" className={navLinkClass('/settings')}>
                      ⚙️ Paramètres
                    </Link>
                  )}
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-3 border-l border-gray-300 pl-6">
                  <NotificationBell userId={profile.id} />
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {profile.nom_complet}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {profile.role}
                    </p>
                  </div>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.nom_complet}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {profile.nom_complet?.charAt(0)}
                    </div>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Déconnexion"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-1">
                  <Link to="/catalog" className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm">
                    Catalogue
                  </Link>
                  <a href="/#comment-ca-marche" className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm">
                    Comment ça marche
                  </a>
                  <Link to="/groups" className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm">
                    Groupes
                  </Link>
                </div>
                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                  <Link
                    to="/signin"
                    className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/catalog"
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
                  >
                    Parcourir
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Rejoindre
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            {user && profile ? (
              <>
                {/* User Info */}
                <div className="px-4 py-3 bg-gray-50 rounded-lg mb-3">
                  <p className="font-medium text-gray-900">{profile.nom_complet}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
                </div>

                {/* Links */}
                <Link
                  to="/catalog"
                  className={`block px-4 py-2 rounded-lg transition ${
                    isActive('/catalog')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📚 Catalogue
                </Link>
                <Link
                  to="/my-reservations"
                  className={`block px-4 py-2 rounded-lg transition ${
                    isActive('/my-reservations')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🔖 Mes Réservations
                </Link>
                {(profile.role === 'proprietaire' || administersAGroup) && (
                  <Link
                    to="/dashboard"
                    className={`block px-4 py-2 rounded-lg transition ${
                      isActive('/dashboard')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📊 Stock
                  </Link>
                )}
                {(['proprietaire', 'administrateur'].includes(profile.role) || administersAGroup) && (
                  <Link
                    to="/settings"
                    className={`block px-4 py-2 rounded-lg transition ${
                      isActive('/settings')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ⚙️ Paramètres
                  </Link>
                )}

                {/* Logout */}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link to="/catalog" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition" onClick={() => setMobileMenuOpen(false)}>
                  Catalogue
                </Link>
                <a href="/#comment-ca-marche" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition" onClick={() => setMobileMenuOpen(false)}>
                  Comment ça marche
                </a>
                <Link to="/groups" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition" onClick={() => setMobileMenuOpen(false)}>
                  Groupes
                </Link>
                <Link
                  to="/signin"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/signup"
                  className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Rejoindre
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
