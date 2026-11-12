// src/lib/imageValidator.ts
// ─── Validation sécurisée des fichiers image ─────────────────────────────────
// Vérifie les magic bytes (signature réelle du fichier), pas seulement l'extension

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic bytes des formats autorisés
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
  'image/gif':  [[0x47, 0x49, 0x46, 0x38, 0x37], [0x47, 0x49, 0x46, 0x38, 0x39]],
};

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valide un fichier image :
 * 1. Taille maximale
 * 2. Type MIME autorisé
 * 3. Magic bytes (signature réelle du fichier)
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  // 1. Taille
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: `Le fichier est trop lourd (max 5 Mo, reçu ${(file.size / 1024 / 1024).toFixed(1)} Mo)` };
  }

  // 2. Type MIME déclaré
  const allowedTypes = Object.keys(MAGIC_BYTES);
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Format non autorisé. Utilisez JPG, PNG, WebP ou GIF.` };
  }

  // 3. Vérification des magic bytes (contenu réel)
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes  = Array.from(new Uint8Array(buffer));

  const signatures = MAGIC_BYTES[file.type];
  const isRealImage = signatures.some((sig) =>
    sig.every((byte, i) => bytes[i] === byte)
  );

  // Cas spécial WebP : vaut aussi vérifier les octets 8-11 = "WEBP"
  if (file.type === 'image/webp') {
    const webpMarker = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
    const buffer12   = await file.slice(8, 12).arrayBuffer();
    const bytes12    = Array.from(new Uint8Array(buffer12));
    const isWebP     = webpMarker.every((b, i) => bytes12[i] === b);
    if (!isRealImage || !isWebP) {
      return { valid: false, error: 'Le fichier ne semble pas être une image valide.' };
    }
    return { valid: true };
  }

  if (!isRealImage) {
    return { valid: false, error: 'Le fichier ne semble pas être une image valide.' };
  }

  return { valid: true };
}

/** Générer un nom de fichier sécurisé (sans caractères dangereux) */
export function sanitizeFileName(originalName: string, userId: string): string {
  const ext   = originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'jpg';
  const ts    = Date.now();
  const rand  = Math.random().toString(36).substring(2, 8);
  return `${userId}/${ts}_${rand}.${ext}`;
}
