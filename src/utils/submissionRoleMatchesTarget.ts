import { ROLE_CONFIG } from '../../Constants/variable.constant';
import type { QuestionnaireTarget, UserRole } from '../../Constants/types.constant';

/** Le rôle « particulier » suit les mêmes questionnaires que l’étudiant. */
export function submissionRoleMatchesTarget(role: UserRole, target: QuestionnaireTarget): boolean {
  if (role === target) return true;
  if (target === 'etudiant' && role === ROLE_CONFIG.particulier) return true;
  return false;
}
