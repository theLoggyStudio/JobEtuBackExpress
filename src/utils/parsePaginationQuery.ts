import { PAGINATION_CONFIG } from '../../Constants/variable.constant';

/** Query `limit` / `offset` pour les listes paginées (GET). */
export function parseLimitOffsetQuery(query: Record<string, unknown>): { limit: number; offset: number } {
  const limitRaw = Number(query.limit);
  const offsetRaw = Number(query.offset);
  const limit = Math.min(
    Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : PAGINATION_CONFIG.defaultLimit),
    PAGINATION_CONFIG.maxLimit
  );
  const offset = Math.max(0, Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0);
  return { limit, offset };
}
