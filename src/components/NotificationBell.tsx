// src/components/NotificationBell.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  AppNotification,
} from '../hooks/useNotifications';
import { Bell, Check } from 'lucide-react';
import { TYPE_ICON, timeAgo, notificationRoute } from '../lib/notificationMeta';

export default function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications } = useNotifications(userId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.lu).length ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: AppNotification) => {
    if (!n.lu) markRead.mutate(n.id);
    const to = notificationRoute(n.type, n.lien_id);
    if (to) navigate(to);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[85vw] max-w-80 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">Notifications</p>
            {unreadCount > 0 && userId && (
              <button
                onClick={() => markAllRead.mutate(userId)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition flex gap-2 ${
                    !n.lu ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span className="text-lg shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{n.titre}</span>
                    <span className="block text-xs text-gray-500 line-clamp-2">{n.message}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.lu && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm text-blue-600 hover:bg-gray-50 py-2.5 border-t border-gray-100 font-medium"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
