// src/components/BottomNav.tsx
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, BookOpen, Users, Calendar, User } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  { to: '/catalog', label: 'Catalogue', icon: BookOpen, match: (p: string) => p.startsWith('/catalog') || p.startsWith('/books') },
  { to: '/groups', label: 'Groupes', icon: Users, match: (p: string) => p.startsWith('/groups') },
  { to: '/my-reservations', label: 'Réservations', icon: Calendar, match: (p: string) => p.startsWith('/my-reservations') },
  { to: '/profile', label: 'Profil', icon: User, match: (p: string) => p.startsWith('/profile') },
];

export default function BottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();

  // Pas de barre tant qu'on n'est pas connecté (pages d'auth, landing publique)
  if (!user || !profile) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'fill-blue-100' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
