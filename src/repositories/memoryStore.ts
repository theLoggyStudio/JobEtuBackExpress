import { createDefaultJsonStore, type JsonStoreFile } from './json/jsonStoreDefaults';

/**
 * Store volatile en RAM pour les tests API : redémarrage du serveur = données d’origine.
 * Les dépôts existants utilisent `withJsonStore` (mutation sur la référence courante).
 *
 * Pour des mises à jour **immables** (spread) depuis du code dédié aux tests :
 * `setMemoryStore((prev) => ({ ...prev, users: [...prev.users, user] }))`
 */
let memoryStoreSingleton: JsonStoreFile | null = null;

export function getMemoryStore(): JsonStoreFile {
  if (!memoryStoreSingleton) {
    memoryStoreSingleton = createDefaultJsonStore();
  }
  return memoryStoreSingleton;
}

/** Efface la RAM : prochain `getMemoryStore()` recrée le jeu de données par défaut. */
export function resetMemoryStore(): void {
  memoryStoreSingleton = null;
}

/** Remplace tout le store via une fonction (typiquement spread sur `prev`). */
export function setMemoryStore(updater: (prev: JsonStoreFile) => JsonStoreFile): void {
  memoryStoreSingleton = updater(getMemoryStore());
}
