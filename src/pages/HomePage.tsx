// src/pages/HomePage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { ArrowRight, ChevronDown, Plus, Users } from 'lucide-react';

// ---- Data hooks (real data, no invented numbers) ----------------------

function useHomeStats() {
  return useQuery({
    queryKey: ['homeStats'],
    queryFn: async () => {
      const [{ count: bookCount }, { count: groupCount }, { count: reservationCount }] =
        await Promise.all([
          supabase.from('books').select('*', { count: 'exact', head: true }),
          supabase.from('groups_public').select('*', { count: 'exact', head: true }),
          supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .gte(
              'date_debut',
              new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
            ),
        ]);
      return {
        books: bookCount ?? 0,
        groups: groupCount ?? 0,
        reservationsThisMonth: reservationCount ?? 0,
      };
    },
  });
}

function useActiveGroups() {
  return useQuery({
    queryKey: ['homeActiveGroups'],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('groups_public')
        .select('id, nom, description')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;

      const withCounts = await Promise.all(
        (groups ?? []).map(async (g) => {
          const [{ count: membres }, { count: livres }] = await Promise.all([
            supabase.from('profiles_public').select('*', { count: 'exact', head: true }).eq('groupe_id', g.id),
            supabase.from('books').select('*', { count: 'exact', head: true }).eq('groupe_id', g.id),
          ]);
          return { ...g, membres: membres ?? 0, livres: livres ?? 0 };
        })
      );

      return withCounts;
    },
  });
}

// ---- Static content (labelled as such, not claimed as real data) ------

const steps = [
  {
    num: '1',
    title: 'Inscrivez-vous',
    desc: 'Créez votre compte gratuitement en 30 secondes. Email ou téléphone.',
  },
  {
    num: '2',
    title: 'Rejoignez un groupe',
    desc: 'Choisissez le groupe de votre quartier ou de votre école. C’est là que vivent les livres.',
  },
  {
    num: '3',
    title: 'Réservez',
    desc: 'Parcourez le catalogue, réservez en 2 clics. Le propriétaire est notifié tout de suite.',
  },
  {
    num: '4',
    title: 'Lisez & rendez',
    desc: 'Récupérez le livre en main propre, lisez le temps convenu, rendez-le. Puis recommencez.',
  },
];

const faqs = [
  {
    q: "C'est gratuit ?",
    a: "L'inscription et la création de groupe sont gratuites. Chaque propriétaire fixe librement le tarif de location et la caution de ses propres livres.",
  },
  {
    q: 'Et si je rends en retard ?',
    a: "Un rappel automatique vous est envoyé à l'approche de la date de retour. En cas de retard, le propriétaire du livre en est notifié.",
  },
  {
    q: 'Qui peut rejoindre ?',
    a: "Toute personne peut créer un compte et demander à rejoindre un groupe existant, ou en créer un nouveau (quartier, école, association, communauté religieuse...).",
  },
  {
    q: 'Comment se passe la remise du livre ?',
    a: "Vous convenez d'un lieu et d'un horaire directement avec le propriétaire ou l'emprunteur au sein du groupe. La plateforme ne gère pas la livraison physique.",
  },
];

export default function HomePage() {
  const { data: stats } = useHomeStats();
  const { data: activeGroups } = useActiveGroups();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-white">
      {/* ---------------- HERO ---------------- */}
      <section className="bg-blue-50/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-16 pb-20">
          <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Location de livres entre voisins
          </span>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 max-w-3xl leading-tight mb-4 sm:mb-6">
            Empruntez le prochain livre que vous allez adorer
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mb-8">
            Chez vos voisins, dans votre groupe. Réservez en 2 clics, lisez le temps convenu,
            rendez. Simple, local, et à petit prix.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Voir les livres disponibles
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/groups"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Rejoindre un groupe
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {stats ? `${stats.books}+` : '—'}
              </p>
              <p className="text-gray-500 text-sm">livres disponibles</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">{stats?.groups ?? '—'}</p>
              <p className="text-gray-500 text-sm">groupes actifs</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {stats?.reservationsThisMonth ?? '—'}
              </p>
              <p className="text-gray-500 text-sm">réservations ce mois</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- COMMENT ÇA MARCHE ---------------- */}
      <section id="comment-ca-marche" className="bg-gray-50 py-16 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 mb-2">Comment ça marche ?</h2>
          <p className="text-gray-500 mb-10">Quatre étapes. Zéro complication.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-8">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-4">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-xl p-6 text-left">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Et concrètement, l'échange ?</h4>
              <p className="text-sm text-gray-600">
                Vous convenez d'un lieu avec le propriétaire (devant chez lui, au marché, à
                l'école...). La caution et le tarif sont définis par le propriétaire du livre. En
                cas de retard, un petit rappel automatique. En cas de perte, on en discute
                ensemble dans le groupe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- GROUPES ACTIFS ---------------- */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Des groupes déjà actifs</h2>
            <p className="text-gray-500">Rejoignez celui de votre quartier, ou créez le vôtre.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeGroups?.map((g) => (
              <div key={g.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {g.nom?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{g.nom}</p>
                    {g.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">{g.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  <span>{g.livres} livres</span>
                  <span>{g.membres} membres</span>
                </div>
                <Link
                  to="/groups"
                  className="block text-center border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
                >
                  Demander à rejoindre
                </Link>
              </div>
            ))}

            <Link
              to="/groups"
              className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition"
            >
              <span className="w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mb-3">
                <Plus className="h-5 w-5" />
              </span>
              <p className="font-bold text-gray-900 mb-1">Créer mon groupe</p>
              <p className="text-xs text-gray-500">
                Votre immeuble, votre école, votre association...
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-gray-900"
                >
                  {f.q}
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-4 text-sm text-gray-600">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA FINAL ---------------- */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">
            Prêt à emprunter votre prochain livre ?
          </h2>
          <p className="text-blue-100 mb-8">
            Rejoignez un groupe près de chez vous et commencez en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Voir le catalogue
            </Link>
            <Link
              to="/groups"
              className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition"
            >
              <Users className="h-4 w-4" />
              Rejoindre un groupe
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
