/**
 * Questionnaire publié ou non. Données JSON héritées / champ absent → **actif** (défaut métier).
 */
export function normalizeQuestionnaireIsActive(raw: unknown): boolean {
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return true;
}
