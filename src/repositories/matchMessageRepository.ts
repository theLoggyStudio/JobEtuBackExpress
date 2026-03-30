import { randomUUID } from 'node:crypto';
import { usesJsonStylePersistence } from '../../Constants/variable.constant';
import { MatchMessage } from '../models';
import type { MatchMessageEntity } from './entities';
import { loadJsonStore, withJsonStore } from './json/jsonDb';

function modelToEntity(m: InstanceType<typeof MatchMessage>): MatchMessageEntity {
  const t = m as InstanceType<typeof MatchMessage> & { createdAt: Date; updatedAt: Date };
  return {
    id: m.id,
    matchId: m.matchId,
    senderUserId: m.senderUserId,
    body: m.body,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function listMatchMessagesByMatchId(matchId: string): Promise<MatchMessageEntity[]> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.matchMessages
      .filter((x) => x.matchId === matchId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  const rows = await MatchMessage.findAll({
    where: { matchId },
    order: [['createdAt', 'ASC']],
  });
  return rows.map(modelToEntity);
}

export async function createMatchMessageEntity(input: {
  matchId: string;
  senderUserId: string;
  body: string;
}): Promise<MatchMessageEntity> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const now = new Date();
      const entity: MatchMessageEntity = {
        id: randomUUID(),
        matchId: input.matchId,
        senderUserId: input.senderUserId,
        body: input.body,
        createdAt: now,
        updatedAt: now,
      };
      store.matchMessages.push(entity);
      return entity;
    });
  }
  const m = await MatchMessage.create({
    matchId: input.matchId,
    senderUserId: input.senderUserId,
    body: input.body,
  });
  return modelToEntity(m);
}
