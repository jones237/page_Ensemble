// src/components/PaymentModal.tsx
// Modal de paiement — Step 1 (caution) et Step 2 (location fee)
import { useState } from 'react';
import { X, Phone, CheckCircle, Loader2, AlertCircle, Copy } from 'lucide-react';
import {
  PaymentMethod, PaymentType,
  useInitiatePayment,
  METHOD_LABELS,
} from '../hooks/usePayments';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Données de la réservation
  reservationId: string;
  payerId: string;
  receiverId: string;
  receiverName: string;
  receiverPhone?: string;
  type: PaymentType;
  amount: number;
  bookTitle: string;
}

const USSD_CODES: Record<PaymentMethod, (phone: string, amount: number) => string> = {
  mtn:    (_p, amount) => `*126*1*${amount}#`,
  orange: (_p, amount) => `#150*1*${amount}#`,
  cash:   () => '',
};

export function PaymentModal({
  isOpen, onClose, onSuccess,
  reservationId, payerId, receiverId, receiverName, receiverPhone,
  type, amount, bookTitle,
}: PaymentModalProps) {
  const [method, setMethod]       = useState<PaymentMethod | null>(null);
  const [phone, setPhone]         = useState('');
  const [step, setStep]           = useState<'method' | 'instructions' | 'confirm'>('method');
  const [copied, setCopied]       = useState(false);

  const initiate = useInitiatePayment();

  if (!isOpen) return null;

  const typeLabel = type === 'caution' ? 'Caution (dépôt)' : 'Frais de location';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleProceed = async () => {
    if (!method) return;

    if (method === 'cash') {
      // Cash → initier directement, le proprio confirme en personne
      await initiate.mutateAsync({
        reservation_id: reservationId,
        payer_id: payerId,
        receiver_id: receiverId,
        type, method, amount,
      });
      onSuccess();
      return;
    }

    if (step === 'method') {
      setStep('instructions');
      return;
    }

    if (step === 'instructions') {
      setStep('confirm');
      return;
    }

    // Étape confirm → enregistrer le paiement initié
    await initiate.mutateAsync({
      reservation_id: reservationId,
      payer_id: payerId,
      receiver_id: receiverId,
      type, method, amount,
      phone_number: phone || undefined,
    });
    onSuccess();
  };

  const ussd = method && method !== 'cash'
    ? USSD_CODES[method](phone, amount)
    : '';

  const canProceed =
    !!method && (
      method === 'cash' ||
      step === 'method' ||
      step === 'instructions' ||
      (step === 'confirm')
    );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh] sm:max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{typeLabel}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px] sm:max-w-xs">"{bookTitle}"</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-500 hover:text-gray-600 p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Montant */}
        <div className="px-5 pt-5 pb-3">
          <div className={`rounded-xl p-4 text-center ${
            type === 'caution' ? 'bg-blue-50 border border-blue-100' : 'bg-blue-50 border border-blue-100'
          }`}>
            <p className="text-xs text-gray-500 mb-1">{typeLabel} à payer</p>
            <p className={`text-3xl font-extrabold ${type === 'caution' ? 'text-blue-700' : 'text-blue-700'}`}>
              {amount.toLocaleString('fr-FR')} FCFA
            </p>
            <p className="text-xs text-gray-500 mt-1">à {receiverName}</p>
          </div>
        </div>

        {/* Étape 1 : Choix méthode */}
        {step === 'method' && (
          <div className="px-5 pb-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Choisissez votre méthode de paiement
            </p>
            <div className="space-y-2">
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => {
                const info = METHOD_LABELS[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition ${
                      method === m
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 text-sm">{info.label}</p>
                      {m === 'cash' && (
                        <p className="text-xs text-gray-500">Le propriétaire confirmera en personne</p>
                      )}
                      {m === 'mtn' && (
                        <p className="text-xs text-gray-500">MTN MoMo — Cameroun</p>
                      )}
                      {m === 'orange' && (
                        <p className="text-xs text-gray-500">Orange Money — Cameroun</p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      method === m ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {method === m && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 2 : Instructions MTN / Orange */}
        {step === 'instructions' && method && method !== 'cash' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              Instructions {METHOD_LABELS[method].label}
            </p>

            {/* Numéro du proprio */}
            {receiverPhone && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Numéro de {receiverName}</p>
                  <p className="font-bold text-gray-900 text-lg">{receiverPhone}</p>
                </div>
                <button
                  onClick={() => handleCopy(receiverPhone)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>
            )}

            {/* Code USSD */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Code USSD à composer sur votre téléphone</p>
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold text-xl text-gray-900">{ussd}</p>
                <button
                  onClick={() => handleCopy(ussd)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
            </div>

            {/* Étapes */}
            <div className="space-y-2">
              {[
                `Composez ${ussd} sur votre téléphone`,
                `Entrez votre code PIN ${METHOD_LABELS[method].label}`,
                `Confirmez l'envoi de ${amount.toLocaleString('fr-FR')} FCFA`,
                'Revenez ici et confirmez le paiement',
              ].map((instruction, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-600">{instruction}</p>
                </div>
              ))}
            </div>

            {/* Numéro optionnel de l'emprunteur */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Votre numéro {METHOD_LABELS[method].label} (optionnel)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Étape 3 : Confirmation finale */}
        {step === 'confirm' && (
          <div className="px-5 pb-5 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Confirmez que le virement a été effectué</p>
                <p className="text-xs text-blue-700 mt-1">
                  En confirmant, vous déclarez avoir envoyé{' '}
                  <span className="font-bold">{amount.toLocaleString('fr-FR')} FCFA</span> à {receiverName}.
                  Le propriétaire devra valider la réception.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="font-bold text-gray-900">{amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Méthode</span>
                <span className="font-semibold">{method ? METHOD_LABELS[method].label : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destinataire</span>
                <span className="font-semibold">{receiverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-semibold">{typeLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer boutons */}
        <div className="px-5 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3">
          {step !== 'method' && (
            <button
              onClick={() => setStep(step === 'confirm' ? 'instructions' : 'method')}
              className="px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
            >
              Retour
            </button>
          )}
          <button
            onClick={handleProceed}
            disabled={!canProceed || initiate.isPending}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {initiate.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</>
            ) : step === 'confirm' ? (
              <><CheckCircle className="h-4 w-4" /> J'ai effectué le paiement</>
            ) : method === 'cash' ? (
              'Signaler au propriétaire'
            ) : step === 'method' ? (
              'Suivant →'
            ) : (
              "J'ai composé le code →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
