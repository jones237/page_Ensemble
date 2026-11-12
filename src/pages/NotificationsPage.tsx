// src/pages/NotificationsPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  AppNotification,
} from '../hooks/useNotifications';
import { QueryState } from '../components/QueryState';
import { TYPE_ICON, timeAgo, notificationRoute } from '../lib/notificationMeta';

const PAGE = 30;

export default function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useNotifications(profile?.id, limit);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const all = data ?? [];
  const unread = all.filter((n) => !n.lu).length;
  const shown = onlyUnread ? all.filter((n) => !n.lu) : all;
  const maybeMore = all.length >= limit; // il reste peut-être des notifications plus anciennes

  const open = (n: AppNotification) => {
    if (!n.lu) markRead.mutate(n.id);
    const to = notificationRoute(n.type, n.lien_id);
    if (to) navigate(to);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-6 overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" /> Notifications
          </h1>
          {unread > 0 && profile?.id && (
            <button
              onClick={() => markAll.mutate(profile.id)}
              disabled={markAll.isPending}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Tout marquer lu
            </button>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 mb-4 text-sm">
          <button
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 rounded-md ${!onlyUnread ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Toutes
          </button>
          <button
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 rounded-md ${onlyUnread ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Non lues{unread > 0 ? ` (${unread})` : ''}
          </button>
        </div>

        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          isEmpty={shown.length === 0}
          empty={
            <div className="text-center py-16 text-gray-500">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>{onlyUnread ? 'Aucune notification non lue.' : 'Aucune notification pour le moment.'}</p>
            </div>
          }
        >
          <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {shown.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition ${
                    !n.lu ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span className="text-xl shrink-0" aria-hidden="true">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{n.titre}</span>
                    <span className="block text-sm text-gray-600 break-words">{n.message}</span>
                    <span className="block text-xs text-gray-500 mt-1">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.lu && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" aria-label="Non lue" />}
                </button>
              </li>
            ))}
          </ul>

          {maybeMore && (
            <div className="text-center mt-4">
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                disabled={isFetching}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {isFetching ? 'Chargement…' : 'Voir plus ancien'}
              </button>
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}
