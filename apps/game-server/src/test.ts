import { getDb, matches } from '@cogniquest/db';
import { randomUUID } from 'crypto';

const db = getDb();
db.insert(matches).values({
  gameType: 'battleship',
  hostId: randomUUID(),
  guestId: randomUUID(),
  subjectId: randomUUID(),
  ageBand: '6-8',
  winnerId: randomUUID(),
  status: 'finished',
  startedAt: new Date(),
  finishedAt: new Date()
});
