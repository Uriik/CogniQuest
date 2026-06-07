import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { WsThrottlerGuard } from './common/guards/ws-throttler.guard';
import { Server, Socket } from 'socket.io';
import {
  lobbyCreateSchema,
  lobbyJoinSchema,
  lobbyGetInviteSchema,
  lobbyRenameSchema,
  PublicRoomState,
  toPublicRoomState,
} from '@cogniquest/shared';
import { createSignedToken, generateNumericCode, verifySignedToken, checkRateLimit, RATE_RULES, RedisKvStore, rateKey, hashPassword, verifyPassword } from '@cogniquest/auth';
import { getDb, users, eq } from '@cogniquest/db';
import { randomUUID } from 'crypto';
import { redis } from './redis.client';

// Janela em que uma sala recém-criada NÃO é reapada pelo anti-fantasma, cobrindo
// a transição de página do host (create -> game) sem socket conectado.
const REAP_GRACE_MS = 15000;

@WebSocketGateway({ cors: { origin: process.env.WEB_CLIENT_URL || 'http://localhost:3000', credentials: true } })
@UseGuards(WsThrottlerGuard)
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    if (client.data?.userId) {
      client.join(client.data.userId);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId || client.id;
    const roomId = await redis.get(`user:${userId}:room`);
    if (!roomId) return;

    const roomData = await redis.hgetall(`room:${roomId}`);
    // Partidas em andamento são tratadas pelo GameGateway (abandono).
    if (!roomData || (roomData.status !== 'open' && roomData.status !== 'ready')) return;

    // Período de graça: F5/queda rápida de rede não destrói a sala. Só limpamos
    // se o usuário não voltar (lobby:get / join re-vinculam e cancelam isto).
    await redis.set(`gone:${roomId}:${userId}`, '1', 'EX', 30);
    setTimeout(async () => {
      const stillGone = await redis.get(`gone:${roomId}:${userId}`);
      if (!stillGone) return; // voltou a tempo
      await redis.del(`gone:${roomId}:${userId}`);
      const current = await redis.hgetall(`room:${roomId}`);
      if (current && (current.status === 'open' || current.status === 'ready')) {
        await this.leaveRoom(roomId, userId);
      }
    }, 12000);
  }

  @SubscribeMessage('lobby:create')
  async handleLobbyCreate(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = lobbyCreateSchema.parse(payload);
      const roomId = randomUUID();
      const hostId = client.data?.userId || client.id;
      const ip = client.handshake.address || "127.0.0.1";

      const kvStore = new RedisKvStore(redis);
      const limit = await checkRateLimit(kvStore, rateKey("createRoom", ip), RATE_RULES.createRoom);
      if (!limit.allowed) {
        client.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' });
        return;
      }

      const isSolo = parsed.mode === 'solo';
      const isPrivate = !isSolo && !parsed.isPublic;

      // Sala privada exige senha.
      if (isPrivate && !parsed.password) {
        client.emit('error', { code: 'PASSWORD_REQUIRED', message: 'Sala privada precisa de senha' });
        return;
      }

      // Fetch host name
      const db = getDb();
      const userRec = await db.query.users.findFirst({ where: eq(users.id, hostId) });
      const hostName = userRec?.displayName || "Jogador";

      const state: PublicRoomState = {
        roomId,
        name: parsed.name?.trim() || `Sala de ${hostName}`,
        hostId,
        hostName,
        guestId: isSolo ? 'AI' : '',
        guestName: isSolo ? 'Máquina' : '',
        subjectSlug: parsed.subjectSlug,
        grade: parsed.grade,
        // Solo is immediately ready to start (no second human needed).
        status: isSolo ? 'ready' : 'open',
        isPublic: isSolo ? false : parsed.isPublic,
        mode: parsed.mode,
      };

      await redis.hset(`room:${roomId}`, state);
      // Marca de criação. Protege a sala recém-criada do "anti-fantasma" do lobby
      // durante a transição de página do host (create -> game), janela em que ele
      // fica momentaneamente sem socket conectado.
      await redis.hset(`room:${roomId}`, { createdAt: Date.now() });
      // Guarda só o hash da senha (nunca o texto puro) para salas privadas.
      if (isPrivate && parsed.password) {
        await redis.hset(`room:${roomId}`, { passwordHash: await hashPassword(parsed.password) });
      }
      await redis.expire(`room:${roomId}`, 3600);

      // Lista todas as salas duo abertas (públicas e privadas). Solo nunca é listada.
      // As privadas aparecem na lista com cadeado e exigem senha para entrar.
      if (!isSolo) {
        await redis.zadd('room:public:index', Date.now(), roomId);
      }

      const code = generateNumericCode(6);
      if (!process.env.AUTH_SECRET) throw new Error('Missing AUTH_SECRET');
      const inviteToken = createSignedToken({ roomId }, process.env.AUTH_SECRET, 3600);
      
      await redis.set(`invite:code:${code}`, roomId, 'EX', 3600);

      client.join(roomId);
      // Vincula o host à sala para que a saída/desconexão seja sempre detectada.
      await redis.set(`user:${hostId}:room`, roomId, 'EX', 86400);

      client.emit('lobby:created', { roomId, code, inviteToken });
      this.server.to(roomId).emit('lobby:updated', state);
      this.broadcastLobbyUpdate();

    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload or error creating lobby' });
    }
  }

  @SubscribeMessage('lobby:join')
  async handleLobbyJoin(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = lobbyJoinSchema.parse(payload);
      let roomId = parsed.roomId;

      if (parsed.code) {
        roomId = (await redis.get(`invite:code:${parsed.code}`)) || undefined;
      } else if (parsed.inviteToken) {
        if (!process.env.AUTH_SECRET) throw new Error('Missing AUTH_SECRET');
        const data = verifySignedToken<{ roomId: string }>(parsed.inviteToken, process.env.AUTH_SECRET);
        roomId = data.roomId;
      }

      if (!roomId) {
        client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found or invite expired' });
        return;
      }

      const roomData = await redis.hgetall(`room:${roomId}`);
      if (!roomData || !roomData.roomId) {
        client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Proteção de sala privada: quem entra direto pela lista precisa da senha.
      // Código/convite já autorizam a entrada e dispensam a senha.
      const joinedViaInvite = Boolean(parsed.code || parsed.inviteToken);
      const isPrivate = roomData.isPublic === 'false';
      if (isPrivate && !joinedViaInvite) {
        if (!roomData.passwordHash) {
          client.emit('error', { code: 'ROOM_PRIVATE', message: 'This room requires an invite' });
          return;
        }
        const ok = parsed.password
          ? await verifyPassword(roomData.passwordHash, parsed.password)
          : false;
        if (!ok) {
          client.emit('error', { code: 'WRONG_PASSWORD', message: 'Senha incorreta' });
          return;
        }
      }

      const guestId = client.data?.userId || client.id;

      if (roomData.guestId && roomData.guestId !== guestId) {
        client.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
        return;
      }

      // Fetch guest name
      const db = getDb();
      const userRec = await db.query.users.findFirst({ where: eq(users.id, guestId) });
      const guestName = userRec?.displayName || "Jogador";

      await redis.hset(`room:${roomId}`, {
        guestId,
        guestName,
        status: 'ready'
      });

      // Sala cheia: remove do índice público para não aparecer mais na lista.
      await redis.zrem('room:public:index', roomId);

      client.join(roomId);
      // Vincula o convidado à sala (saída/desconexão sempre detectada).
      await redis.set(`user:${guestId}:room`, roomId, 'EX', 86400);
      await redis.del(`gone:${roomId}:${guestId}`);

      const updatedState = await redis.hgetall(`room:${roomId}`);
      this.server.to(roomId).emit('lobby:updated', toPublicRoomState(updatedState));
      this.broadcastLobbyUpdate();

    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload or join error' });
    }
  }

  @SubscribeMessage('lobby:get')
  async handleLobbyGet(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { roomId } = lobbyGetInviteSchema.parse(payload);
      const roomData = await redis.hgetall(`room:${roomId}`);
      if (!roomData || !roomData.roomId) {
        client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }
      // Garante que o cliente receba broadcasts futuros desta sala.
      client.join(roomId);
      // Reconexão: re-vincula o usuário e cancela a graça de saída pendente.
      const uid = client.data?.userId || client.id;
      if (roomData.hostId === uid || roomData.guestId === uid) {
        await redis.set(`user:${uid}:room`, roomId, 'EX', 86400);
        await redis.del(`gone:${roomId}:${uid}`);
      }
      client.emit('lobby:updated', toPublicRoomState(roomData));
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload' });
    }
  }

  @SubscribeMessage('lobby:rename')
  async handleLobbyRename(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { roomId, name } = lobbyRenameSchema.parse(payload);
      const userId = client.data?.userId || client.id;
      const roomData = await redis.hgetall(`room:${roomId}`);

      if (!roomData || roomData.hostId !== userId) {
        client.emit('error', { code: 'UNAUTHORIZED', message: 'Apenas o host pode renomear a sala' });
        return;
      }
      if (roomData.status !== 'open' && roomData.status !== 'ready') {
        client.emit('error', { code: 'ROOM_LOCKED', message: 'Não é possível renomear agora' });
        return;
      }

      await redis.hset(`room:${roomId}`, { name: name.trim() });
      const updated = await redis.hgetall(`room:${roomId}`);
      this.server.to(roomId).emit('lobby:updated', toPublicRoomState(updated));
      this.broadcastLobbyUpdate();
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload' });
    }
  }

  @SubscribeMessage('lobby:subscribe')
  async handleLobbySubscribe(@ConnectedSocket() client: Socket) {
    client.join('lobby_watchers');
    // Emite o estado inicial imediatamente para o cliente
    const rooms = await this.getLobbyList();
    client.emit('lobby:listed', rooms);
  }

  @SubscribeMessage('lobby:unsubscribe')
  async handleLobbyUnsubscribe(@ConnectedSocket() client: Socket) {
    client.leave('lobby_watchers');
  }

  private async getLobbyList(): Promise<PublicRoomState[]> {
    try {
      // Mais recentes primeiro.
      const ids = await redis.zrevrange('room:public:index', 0, 49);
      if (ids.length === 0) return [];

      // 1 round-trip para TODOS os hashes das salas (antes: N hgetall em loop).
      const pipe = redis.pipeline();
      ids.forEach((id) => pipe.hgetall(`room:${id}`));
      const execed = (await pipe.exec()) || [];

      // 1 round-trip agregado de presença entre instâncias (antes: N fetchSockets,
      // um por sala). server.fetchSockets() devolve todos os sockets; montamos o
      // conjunto de salas que têm ao menos um socket conectado.
      const allSockets = await this.server.fetchSockets();
      const liveRooms = new Set<string>();
      for (const s of allSockets) {
        for (const r of s.rooms) liveRooms.add(r);
      }

      const rooms: PublicRoomState[] = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const r = execed[i]?.[1] as Record<string, string> | undefined;
        // Limpa entradas órfãs (expiradas) do índice.
        if (!r || !r.roomId) {
          await redis.zrem('room:public:index', id);
          continue;
        }
        // Lista salas duo abertas (aguardando oponente), públicas e privadas.
        if (r.status !== 'open' || r.mode === 'solo') continue;
        // Anti-fantasma: a sala precisa ter alguém realmente conectado.
        if (!liveRooms.has(id)) {
          // Sala recém-criada: o host pode estar trocando de página (create -> game)
          // e momentaneamente sem socket. Não reapa durante essa graça; também não
          // lista ainda (aparece assim que o host reconecta).
          const age = Date.now() - Number(r.createdAt || 0);
          if (age < REAP_GRACE_MS) continue;
          // Reconexão em andamento (F5/queda rápida): respeita a graça de saída.
          const gone = await redis.exists(
            `gone:${id}:${r.hostId || ''}`,
            `gone:${id}:${r.guestId || ''}`,
          );
          if (gone > 0) continue;
          await this.deleteRoom(id, r);
          continue;
        }
        rooms.push(toPublicRoomState(r));
      }
      return rooms;
    } catch {
      return [];
    }
  }

  private async broadcastLobbyUpdate() {
    const rooms = await this.getLobbyList();
    this.server.to('lobby_watchers').emit('lobby:listed', rooms);
  }

  @SubscribeMessage('lobby:list')
  async handleLobbyList(@ConnectedSocket() client: Socket) {
    const rooms = await this.getLobbyList();
    client.emit('lobby:listed', rooms);
  }

  @SubscribeMessage('lobby:getInvite')
  async handleLobbyGetInvite(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = lobbyGetInviteSchema.parse(payload);
      const roomId = parsed.roomId;
      
      const roomData = await redis.hgetall(`room:${roomId}`);
      if (!roomData || roomData.hostId !== (client.data?.userId || client.id)) {
        client.emit('error', { code: 'UNAUTHORIZED', message: 'Only host can generate invite' });
        return;
      }

      const code = generateNumericCode(6);
      if (!process.env.AUTH_SECRET) throw new Error('Missing AUTH_SECRET');
      const inviteToken = createSignedToken({ roomId }, process.env.AUTH_SECRET, 3600);
      
      await redis.set(`invite:code:${code}`, roomId, 'EX', 3600);
      
      client.emit('lobby:invite', { roomId, code, inviteToken });
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Failed to generate invite' });
    }
  }

  @SubscribeMessage('lobby:leave')
  async handleLobbyLeave(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = lobbyGetInviteSchema.parse(payload); // só precisa do roomId
      const roomId = parsed.roomId;
      const userId = client.data?.userId || client.id;

      await redis.del(`gone:${roomId}:${userId}`); // saída explícita: sem graça
      await this.leaveRoom(roomId, userId);
      client.leave(roomId);
    } catch (error) {
      // ignore
    }
  }

  /**
   * Saída de um usuário de uma sala. Regras (garantidas):
   * - Host sai com convidado presente → convidado vira host; sala continua aberta.
   * - Convidado sai → host fica sozinho; sala volta a 'open' e reaparece na lista.
   * - Sala fica sem ninguém → sala é DELETADA (hash, índice, estado, ready, vínculos).
   * - Partida em andamento → oponente vence por abandono e a sala é deletada.
   */
  private async leaveRoom(roomId: string, userId: string) {
    const r = await redis.hgetall(`room:${roomId}`);

    // Sala já não existe: garante limpeza de resíduos do usuário e do índice.
    if (!r || !r.roomId) {
      await redis.del(`user:${userId}:room`, `room:${roomId}:ready:${userId}`);
      await redis.zrem('room:public:index', roomId);
      return;
    }

    const isHost = r.hostId === userId;
    const isGuest = r.guestId === userId;
    if (!isHost && !isGuest) return; // não pertence à sala

    // Desfaz o vínculo e o tabuleiro "ready" de quem saiu.
    await redis.del(`user:${userId}:room`, `room:${roomId}:ready:${userId}`);

    // Partida em andamento: abandono → oponente vence e sala é encerrada.
    if (r.status === 'in_game') {
      const opponentId = isHost ? r.guestId : r.hostId;
      if (opponentId && opponentId !== 'AI') {
        this.server.to(opponentId).emit('game:over', { winnerId: opponentId, reason: 'abandoned' });
      }
      await this.deleteRoom(roomId, r);
      return;
    }

    const hasGuest = Boolean(r.guestId && r.guestId !== 'AI' && r.guestId !== '');

    if (isHost) {
      if (hasGuest) {
        // Convidado vira host; sala segue aberta esperando novo oponente.
        await redis.hset(`room:${roomId}`, {
          hostId: r.guestId!,
          hostName: r.guestName || 'Jogador',
          status: 'open',
        });
        await redis.hdel(`room:${roomId}`, 'guestId', 'guestName');
        if (r.mode !== 'solo') await redis.zadd('room:public:index', Date.now(), roomId);
        const updated = await redis.hgetall(`room:${roomId}`);
        this.server.to(roomId).emit('lobby:updated', toPublicRoomState(updated));
        this.broadcastLobbyUpdate();
      } else {
        // Sem ninguém → deleta (garantido).
        await this.deleteRoom(roomId, r);
      }
    } else {
      // Convidado saiu → host fica sozinho; sala volta a aparecer na lista.
      await redis.hdel(`room:${roomId}`, 'guestId', 'guestName');
      await redis.hset(`room:${roomId}`, { status: 'open' });
      if (r.mode !== 'solo') await redis.zadd('room:public:index', Date.now(), roomId);
      const updated = await redis.hgetall(`room:${roomId}`);
      this.server.to(roomId).emit('lobby:updated', toPublicRoomState(updated));
      this.broadcastLobbyUpdate();
    }
  }

  /** Remove COMPLETAMENTE uma sala e todos os seus resíduos. */
  private async deleteRoom(roomId: string, roomData?: Record<string, string>) {
    const r = roomData || (await redis.hgetall(`room:${roomId}`));
    await redis.del(`room:${roomId}`);
    await redis.zrem('room:public:index', roomId);
    await redis.del(`game:${roomId}`, `game:${roomId}:questions`, `game:${roomId}:answers`);
    if (r?.hostId) {
      await redis.del(`user:${r.hostId}:room`, `room:${roomId}:ready:${r.hostId}`);
    }
    if (r?.guestId && r.guestId !== 'AI' && r.guestId !== '') {
      await redis.del(`user:${r.guestId}:room`, `room:${roomId}:ready:${r.guestId}`);
    }
    this.server.to(roomId).emit('error', { code: 'ROOM_CLOSED', message: 'Sala encerrada.' });
    this.broadcastLobbyUpdate();
  }
}
