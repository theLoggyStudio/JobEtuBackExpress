import { BUSINESS_RULES } from '../../Constants/variable.constant';

export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BUSINESS_RULES.maxSlugLength);
  return base || 'questionnaire';
}
