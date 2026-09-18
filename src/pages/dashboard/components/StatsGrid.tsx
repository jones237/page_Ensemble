import { BookOpen, CheckCircle, Clock, Users, LucideIcon } from 'lucide-react';

interface StatsGridProps {
  total: number;
  available: number;
  reserved: number;
  borrowed: number;
}

const CONFIG: { key: keyof StatsGridProps; label: string; icon: LucideIcon; bg: string; color: string }[] = [
  { key: 'total', label: 'Total', icon: BookOpen, bg: 'bg-blue-50', color: 'text-blue-600' },
  { key: 'available', label: 'Disponibles', icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600' },
  { key: 'reserved', label: 'Réservés', icon: Clock, bg: 'bg-yellow-50', color: 'text-yellow-600' },
  { key: 'borrowed', label: 'Empruntés', icon: Users, bg: 'bg-indigo-50', color: 'text-indigo-600' },
];

export function StatsGrid(props: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {CONFIG.map(({ key, label, icon: Icon, bg, color }) => (
        <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`${bg} rounded-lg p-2.5`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{props[key]}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
