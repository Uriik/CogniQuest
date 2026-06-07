import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { WsThrottlerGuard } from './common/guards/ws-throttler.guard';
import { Server, Socket } from 'socket.io';
import { gameReadySchema, gameAnswerSchema, gameAttackIntentSchema, gameAttackSchema, gameUseHintSchema, PublicGameState, toPublicRoomState } from '@cogniquest/shared';
import { checkRateLimit, RATE_RULES, RedisKvStore, rateKey } from '@cogniquest/auth';
import { getQuestionPool, getCorrectOptionId, getDb, matches, subjects, eq } from '@cogniquest/db';
import { placeFleetRandom, resolveAttack, isFleetDestroyed, fleetSummary, computeHint } from '@cogniquest/game-engine';
import { randomUUID } from 'crypto';
import { redis } from './redis.client';

// Adapta o cliente ioredis à interface CacheStore esperada por getQuestionPool.
const questionCache = {
  get: (key: string) => redis.get(key),
  set: async (key: string, value: string, ttlSeconds?: number) => {
    if (ttlSeconds) await redis.set(key, value, 'EX', ttlSeconds);
    else await redis.set(key, value);
  },
};

// Sorteia (Fisher-Yates) e retorna os primeiros `n` itens — amostragem em memória,
// evitando ORDER BY RANDOM() por partida.
function sampleN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

@WebSocketGateway({ cors: { origin: process.env.WEB_CLIENT_URL || 'http://localhost:3000', credentials: true } })
@UseGuards(WsThrottlerGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    if (client.data?.userId) {
      client.join(client.data.userId);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId || client.id;
    const roomId = await redis.get(`user:${userId}:room`);
    
    if (roomId) {
      await redis.set(`disconnect:${roomId}:${userId}`, '1', 'EX', 15);
      
      setTimeout(async () => {
        const stillDisconnected = await redis.get(`disconnect:${roomId}:${userId}`);
        if (stillDisconnected) {
          const roomData = await redis.hgetall(`room:${roomId}`);
          if (roomData && roomData.status === 'in_game') {
            const opponentId = roomData.hostId === userId ? roomData.guestId : roomData.hostId;
            if (opponentId) {
              this.server.to(roomId).emit('game:over', { winnerId: opponentId, reason: 'abandoned' });
              await this.saveMatch(roomId, opponentId, 'abandoned');
            }
            await redis.del(`game:${roomId}`);
            await redis.hset(`room:${roomId}`, { status: 'abandoned' });
          }
        }
      }, 15000);
    }
  }

  @SubscribeMessage('game:ready')
  async handleReady(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = gameReadySchema.parse(payload);
      const roomId = parsed.roomId;
      const userId = client.data?.userId || client.id;
      
      const roomData = await redis.hgetall(`room:${roomId}`);
      if (!roomData || !roomData.hostId) return;

      client.join(roomId);
      client.emit('lobby:updated', toPublicRoomState(roomData));
      await redis.set(`user:${userId}:room`, roomId, 'EX', 86400);

      // Se o jogo já iniciou ou está restaurando...
      if (roomData.status === 'in_game') {
        await redis.del(`disconnect:${roomId}:${userId}`);
        const gameStr = await redis.get(`game:${roomId}`);
        if (gameStr) {
          const gameState = JSON.parse(gameStr);
          client.emit('game:state', this.getPublicState(roomId, gameState, roomData));
          
          const isHost = userId === roomData.hostId;
          const myFleet = isHost ? gameState.hostFleet : gameState.guestFleet;
          
          client.emit('game:start', {
            yourFleetSummary: fleetSummary(myFleet),
            turn: gameState.turn
          });

          // ... (resto do código de restauração de pergunta mantido)
          const qStr = await redis.get(`game:${roomId}:currentQ:${userId}`);
          if (qStr) {
            const isQStrJson = qStr.startsWith('{') || qStr.startsWith('[');
            if (!isQStrJson) {
              const qs = JSON.parse(await redis.get(`game:${roomId}:questions`) || '[]');
              const qData = qs.find((q: any) => q.id === qStr);
              if (qData) {
                client.emit('game:question', {
                  questionId: qData.id,
                  prompt: qData.prompt,
                  options: qData.options
                });
              }
            }
          }
          return;
        }
      }

      // Aceita o posicionamento enquanto a sala não começou nem terminou.
      // (O host pode posicionar antes do oponente entrar — guardamos e esperamos.)
      if (roomData.status !== 'open' && roomData.status !== 'ready') return;

      const isSolo = roomData.guestId === 'AI';
      const hostId = roomData.hostId;
      const guestId = roomData.guestId;

      // Guarda SEMPRE o tabuleiro deste jogador, mesmo sem oponente ainda.
      const readyKey = `room:${roomId}:ready:${userId}`;
      await redis.set(readyKey, JSON.stringify(parsed.board || placeFleetRandom()), 'EX', 3600);

      // Só dá pra começar quando há um segundo jogador (ou é solo).
      const hasOpponent = isSolo || Boolean(guestId && guestId !== '');
      if (!hasOpponent) return;

      const hostReady = await redis.get(`room:${roomId}:ready:${hostId}`);
      const guestReady = isSolo ? JSON.stringify(placeFleetRandom()) : await redis.get(`room:${roomId}:ready:${guestId}`);

      if (hostReady && guestReady) {
        const hostFleet = JSON.parse(hostReady);
        const guestFleet = JSON.parse(guestReady);

        const gameState = {
          roomId,
          turn: isSolo ? hostId : (Math.random() > 0.5 ? hostId : guestId),
          hostFleet,
          guestFleet,
          hostRevealed: [],
          guestRevealed: [],
          hostHints: 0,
          guestHints: 0,
          hostAnswers: 0,
          guestAnswers: 0,
          pendingAttack: null as {x: number, y: number} | null
        };

        // IMPORTANTE: prepara TUDO (perguntas, estado) ANTES de marcar in_game.
        // Se algo falhar aqui, o status continua 'ready' e ninguém fica preso
        // numa sala 'in_game' sem nunca receber os eventos de início.
        const pool = await getQuestionPool(roomData.subjectSlug!, roomData.grade!, questionCache);
        const sampled = sampleN(pool.questions, 50);
        // Mapa de respostas SERVER-ONLY desta partida (questionId -> correctOptionId).
        // Fica só no Redis; valida respostas sem tocar o Postgres.
        const answersMap: Record<string, string> = {};
        for (const q of sampled) {
          const a = pool.answers[q.id];
          if (a) answersMap[q.id] = a;
        }
        await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);
        await redis.set(`game:${roomId}:questions`, JSON.stringify(sampled), 'EX', 86400);
        if (Object.keys(answersMap).length) {
          await redis.hset(`game:${roomId}:answers`, answersMap);
          await redis.expire(`game:${roomId}:answers`, 86400);
        }

        // Agora sim: marca a partida como iniciada.
        await redis.hset(`room:${roomId}`, { status: 'in_game' });

        this.server.to(roomData.hostId!).emit('game:start', {
          yourFleetSummary: fleetSummary(hostFleet),
          turn: gameState.turn
        });

        if (roomData.guestId && roomData.guestId !== 'AI') {
          this.server.to(roomData.guestId).emit('game:start', {
            yourFleetSummary: fleetSummary(guestFleet),
            turn: gameState.turn
          });
        }

        // Avisa a sala para sair da tela de espera.
        const updatedRoomData = await redis.hgetall(`room:${roomId}`);
        this.server.to(roomId).emit('lobby:updated', toPublicRoomState(updatedRoomData));
        this.server.to(roomId).emit('game:state', this.getPublicState(roomId, gameState, updatedRoomData));
      }
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload' });
    }
  }

  @SubscribeMessage('game:attackIntent')
  async handleAttackIntent(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parsed = gameAttackIntentSchema.parse(payload);
      const roomId = parsed.roomId;
      const userId = client.data?.userId || client.id;

      const gameStr = await redis.get(`game:${roomId}`);
      if (!gameStr) return;
      const gameState = JSON.parse(gameStr);

      if (gameState.turn !== userId) {
        client.emit('error', { code: 'NOT_YOUR_TURN', message: "It is not your turn" });
        return;
      }

      gameState.pendingAttack = { x: parsed.x, y: parsed.y };
      await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);

      // Verifica se o jogador já tem uma pergunta pendente (caso tente burlar a interface)
      const existingQStr = await redis.get(`game:${roomId}:currentQ:${userId}`);
      if (existingQStr) {
        const q = JSON.parse(existingQStr);
        client.emit('game:question', { questionId: q.id, prompt: q.prompt, options: q.options });
        return;
      }

      const qStr = await redis.get(`game:${roomId}:questions`);
      if (qStr) {
        let qs = JSON.parse(qStr);

        // Se acabaram as perguntas da memória, amostra um novo lote do pool cacheado.
        if (qs.length === 0) {
          const roomData = await redis.hgetall(`room:${roomId}`);
          const pool = await getQuestionPool(roomData.subjectSlug!, roomData.grade!, questionCache);
          qs = sampleN(pool.questions, 50);
          // Estende o mapa de respostas da partida com o novo lote.
          const answersMap: Record<string, string> = {};
          for (const q of qs) {
            const a = pool.answers[q.id];
            if (a) answersMap[q.id] = a;
          }
          if (Object.keys(answersMap).length) {
            await redis.hset(`game:${roomId}:answers`, answersMap);
            await redis.expire(`game:${roomId}:answers`, 86400);
          }
        }

        const randomIndex = Math.floor(Math.random() * qs.length);
        const q = qs[randomIndex];
        
        // Remove a pergunta da lista para não repetir na mesma partida!
        qs.splice(randomIndex, 1);
        await redis.set(`game:${roomId}:questions`, JSON.stringify(qs), 'EX', 86400);

        await redis.set(`game:${roomId}:currentQ:${userId}`, JSON.stringify(q), 'EX', 3600);
        client.emit('game:question', { questionId: q.id, prompt: q.prompt, options: q.options });
      }
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Failed to process attack intent' });
    }
  }

  @SubscribeMessage('game:answer')
  async handleGameAnswer(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { roomId, questionId, optionId } = gameAnswerSchema.parse(payload);
      const userId = client.data?.userId || client.id;
      
      const gameStr = await redis.get(`game:${roomId}`);
      if (!gameStr) return;
      const gameState = JSON.parse(gameStr);

      if (gameState.turn !== userId || !gameState.pendingAttack) {
        client.emit('error', { code: 'NOT_YOUR_TURN', message: 'Wait for your turn' });
        return;
      }

      const expectedQ = await redis.get(`game:${roomId}:currentQ:${userId}`);
      if (!expectedQ || JSON.parse(expectedQ).id !== questionId) {
        client.emit('error', { code: 'INVALID_QUESTION', message: 'Question does not match' });
        return;
      }

      // Validação no caminho QUENTE sem tocar o Postgres: o id da resposta correta
      // foi cacheado no Redis (server-only) quando o lote foi montado. Fallback ao
      // banco só se o cache expirou/sumiu (raro).
      let correctOptionId = (await redis.hget(`game:${roomId}:answers`, questionId)) || undefined;
      if (!correctOptionId) {
        correctOptionId = await getCorrectOptionId(questionId);
      }
      const isCorrect = !!correctOptionId && correctOptionId === optionId;

      const roomData = await redis.hgetall(`room:${roomId}`);
      const isHost = userId === roomData.hostId;

      if (isHost) {
        gameState.hostAnswers = (gameState.hostAnswers || 0) + 1;
      } else {
        gameState.guestAnswers = (gameState.guestAnswers || 0) + 1;
      }

      if (isCorrect) {
        client.emit('game:answerResult', { 
          correct: true, 
          canAttack: true,
          hintsAvailable: 0,
          selectedOptionId: optionId,
          correctOptionId 
        });

        const attackX = gameState.pendingAttack.x;
        const attackY = gameState.pendingAttack.y;
        
        // Emit missile animation to everyone in the room
        this.server.to(roomId).emit('game:playerAiming', { x: attackX, y: attackY });
        
        // Wait 1.5s for the animation to play before calculating the hit
        setTimeout(async () => {
          await this.executeAttack(roomId, userId, attackX, attackY, gameState, client);
        }, 1500);
      } else {
        gameState.pendingAttack = null;
        const hostId = roomData.hostId;
        const guestId = roomData.guestId;

        // A verdade autoritativa do turno troca JÁ (impede o jogador de tentar
        // outro ataque na janela de feedback — attackIntent rejeita por turno).
        gameState.turn = (gameState.turn === hostId) ? guestId : hostId;

        await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);

        // Feedback imediato: o jogador vê certo/errado na hora.
        client.emit('game:answerResult', {
          correct: false,
          canAttack: false,
          hintsAvailable: 0,
          selectedOptionId: optionId,
          correctOptionId
        });

        // Pacing de UX: só REVELA a troca de turno (e dispara a IA) depois que o
        // jogador teve tempo de ver o feedback e o modal fechar. Espelha o ritmo
        // do acerto (que aguarda a animação do torpedo antes de seguir).
        setTimeout(async () => {
          const freshStr = await redis.get(`game:${roomId}`);
          if (!freshStr) return; // jogo encerrado/abandonado durante a espera
          const fresh = JSON.parse(freshStr);
          const freshRoom = await redis.hgetall(`room:${roomId}`);
          this.server.to(roomId).emit('game:state', this.getPublicState(roomId, fresh, freshRoom));
          if (freshRoom.mode === 'solo' && fresh.turn === 'AI') {
            this.simulateAITurn(roomId);
          }
        }, 1200);
      }

      // SEMPRE deleta a pergunta atual após ela ser respondida (certa ou errada)
      await redis.del(`game:${roomId}:currentQ:${userId}`);
    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload' });
    }
  }

  private async executeAttack(roomId: string, userId: string, x: number, y: number, gameState: any, client: Socket) {
    const gameExists = await redis.exists(`game:${roomId}`);
    if (!gameExists) return; // Prevent resurrecting an abandoned game during the animation delay

    const hostId = await redis.hget(`room:${roomId}`, 'hostId');
    const guestId = await redis.hget(`room:${roomId}`, 'guestId');
    const isHost = gameState.turn === hostId;

    const targetFleet = isHost ? gameState.guestFleet : gameState.hostFleet;
    const targetRevealed = isHost ? gameState.guestRevealed : gameState.hostRevealed;

    gameState.pendingAttack = null;
    
    if (targetRevealed.some((r: any) => r.x === x && r.y === y)) {
      client.emit('error', { code: 'ALREADY_ATTACKED', message: 'Cell already attacked' });
      return;
    }

    const { result, sunk } = resolveAttack(targetFleet, x, y);
    const outcome = { x, y, result, sunk };
    targetRevealed.push(outcome);

    const won = isFleetDestroyed(targetFleet);
    this.server.to(roomId).emit('game:attackResult', outcome);

    if (won) {
      this.server.to(roomId).emit('game:over', { winnerId: userId });
      await this.saveMatch(roomId, userId, 'finished');
      await redis.del(`game:${roomId}`, `game:${roomId}:questions`, `game:${roomId}:answers`);
      await redis.hset(`room:${roomId}`, { status: 'finished' });
      return;
    }

    const roomData = await redis.hgetall(`room:${roomId}`);

    // Regra de turno: acerto mantém a vez (ataca de novo); erro passa a vez ao oponente.
    const isHit = result === 'hit' || result === 'sunk';
    gameState.turn = isHit ? userId : (isHost ? guestId : hostId);

    await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);
    this.server.to(roomId).emit('game:state', this.getPublicState(roomId, gameState, roomData));

    // Em solo, dispara o turno da IA somente quando a vez realmente passou para ela.
    if (roomData.mode === 'solo' && gameState.turn === 'AI') {
      this.simulateAITurn(roomId);
    }
  }

  @SubscribeMessage('game:useHint')
  async handleGameUseHint(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { roomId } = gameUseHintSchema.parse(payload);
      const userId = client.data?.userId || client.id;
      
      const gameStr = await redis.get(`game:${roomId}`);
      if (!gameStr) return;
      const gameState = JSON.parse(gameStr);

      const hostId = await redis.hget(`room:${roomId}`, 'hostId');
      const isHost = userId === hostId;

      if (isHost && gameState.hostHints <= 0) {
        client.emit('error', { code: 'NO_HINTS', message: 'No hints available' });
        return;
      }
      if (!isHost && gameState.guestHints <= 0) {
        client.emit('error', { code: 'NO_HINTS', message: 'No hints available' });
        return;
      }

      const enemyFleet = isHost ? gameState.guestFleet : gameState.hostFleet;
      const hint = computeHint(enemyFleet);
      if (!hint) {
        client.emit('error', { code: 'NO_HINT_POSSIBLE', message: 'No hint possible' });
        return;
      }

      if (isHost) {
        gameState.hostHints--;
      } else {
        gameState.guestHints--;
      }

      await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);

      client.emit('game:hintResult', {
        hint,
        hintsAvailable: isHost ? gameState.hostHints : gameState.guestHints
      });

    } catch (error) {
      client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid payload' });
    }
  }

  private getPublicState(roomId: string, gameState: any, roomData: any): PublicGameState {
    return {
      roomId,
      hostId: roomData.hostId,
      guestId: roomData.guestId || null,
      turn: gameState.turn,
      hostName: roomData.hostName || 'Jogador',
      guestName: roomData.guestName || 'Adversário',
      hostFleet: fleetSummary(gameState.hostFleet),
      guestFleet: fleetSummary(gameState.guestFleet),
      hostRevealed: gameState.hostRevealed,
      guestRevealed: gameState.guestRevealed,
      hostAnswers: gameState.hostAnswers || 0,
      guestAnswers: gameState.guestAnswers || 0
    };
  }

  private async sendNextQuestion(roomId: string, targetUserId: string) {
    const qStr = await redis.get(`game:${roomId}:questions`);
    if (qStr) {
      const qs = JSON.parse(qStr);
      if (qs.length > 0) {
        // Pick random question from cached list
        const q = qs[Math.floor(Math.random() * qs.length)];
        this.server.to(targetUserId).emit('game:question', {
          questionId: q.id,
          prompt: q.prompt,
          options: q.options
        });
        await redis.set(`game:${roomId}:currentQ:${targetUserId}`, q.id, 'EX', 3600);
      }
    }
  }

  private simulateAITurn(roomId: string) {
    setTimeout(async () => {
      const gameStr = await redis.get(`game:${roomId}`);
      if (!gameStr) return;
      const gameState = JSON.parse(gameStr);

      // Segurança: só age se for mesmo a vez da IA.
      if (gameState.turn !== 'AI') return;

      const hostId = await redis.hget(`room:${roomId}`, 'hostId');
      const targetRevealed: any[] = gameState.hostRevealed;

      // Seleção de alvo inteligente (modo caça/alvo).
      const { x, y } = this.chooseAITarget(gameState, targetRevealed);

      this.server.to(roomId).emit('game:botAiming', { x, y });

      setTimeout(async () => {
        const { result, sunk } = resolveAttack(gameState.hostFleet, x, y);
        const outcome = { x, y, result, sunk };
        targetRevealed.push(outcome);

        // Atualiza a memória da IA com o resultado do tiro.
        this.updateAIMemory(gameState, x, y, result, !!sunk);

        const allSunk = isFleetDestroyed(gameState.hostFleet);
        if (allSunk) {
          this.server.to(roomId).emit('game:attackResult', outcome);
          this.server.to(roomId).emit('game:over', { winnerId: 'AI' });
          await redis.hset(`room:${roomId}`, { status: 'finished' });
          return;
        }

        // Acertou → a IA joga de novo; errou → devolve a vez ao jogador.
        const isHit = result === 'hit' || result === 'sunk';
        gameState.turn = isHit ? 'AI' : hostId;

        await redis.set(`game:${roomId}`, JSON.stringify(gameState), 'EX', 86400);
        this.server.to(roomId).emit('game:attackResult', outcome);
        this.server.to(roomId).emit('game:state', this.getPublicState(roomId, gameState, await redis.hgetall(`room:${roomId}`)));

        // Encadeia o próximo tiro da IA após a animação atual.
        if (isHit) {
          this.simulateAITurn(roomId);
        }
      }, 1500); // Aguarda a animação de mira/impacto no frontend.
    }, 500);
  }

  /**
   * Escolhe o alvo da IA.
   * - Modo ALVO: se houver candidatos na fila (vizinhos de acertos anteriores), mira neles.
   * - Modo CACA: tiro aleatorio preferindo casas em padrao xadrez (paridade),
   *   que cobre o tabuleiro com menos tiros.
   */
  private chooseAITarget(gameState: any, revealed: any[]): { x: number; y: number } {
    gameState.ai = gameState.ai || { queue: [], hits: [] };
    const isRevealed = (x: number, y: number) =>
      revealed.some((r) => r.x === x && r.y === y);

    // Consome a fila de candidatos, ignorando casas já atacadas.
    const queue: { x: number; y: number }[] = (gameState.ai.queue || []).filter(
      (c: any) => !isRevealed(c.x, c.y),
    );
    if (queue.length > 0) {
      const target = queue.shift()!;
      gameState.ai.queue = queue;
      return target;
    }
    gameState.ai.queue = queue;

    // Modo caça: aleatório com preferência por paridade (xadrez).
    const all: { x: number; y: number }[] = [];
    const parity: { x: number; y: number }[] = [];
    for (let yy = 0; yy < 10; yy++) {
      for (let xx = 0; xx < 10; xx++) {
        if (isRevealed(xx, yy)) continue;
        all.push({ x: xx, y: yy });
        if ((xx + yy) % 2 === 0) parity.push({ x: xx, y: yy });
      }
    }
    const pool = parity.length > 0 ? parity : all;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  /**
   * Atualiza a memória da IA após cada tiro.
   * - Afundou: limpa a caça (navio acabou) e volta ao modo aleatório.
   * - Acertou: enfileira vizinhos; com 2+ acertos alinhados, foca só nas pontas da linha.
   */
  private updateAIMemory(
    gameState: any,
    x: number,
    y: number,
    result: string,
    sunk: boolean,
  ) {
    gameState.ai = gameState.ai || { queue: [], hits: [] };
    const inBounds = (c: any) => c.x >= 0 && c.x <= 9 && c.y >= 0 && c.y <= 9;

    if (sunk) {
      gameState.ai.queue = [];
      gameState.ai.hits = [];
      return;
    }

    if (result !== 'hit') return;

    gameState.ai.hits.push({ x, y });
    const hits: { x: number; y: number }[] = gameState.ai.hits;

    // Com 2+ acertos, descobre a orientação e mira nas pontas da linha.
    if (hits.length >= 2) {
      const sameRow = hits.every((h) => h.y === hits[0]!.y);
      const sameCol = hits.every((h) => h.x === hits[0]!.x);
      let ends: { x: number; y: number }[] = [];
      if (sameRow) {
        const ys = hits[0]!.y;
        const xsArr = hits.map((h) => h.x);
        ends = [
          { x: Math.min(...xsArr) - 1, y: ys },
          { x: Math.max(...xsArr) + 1, y: ys },
        ];
      } else if (sameCol) {
        const xs = hits[0]!.x;
        const ysArr = hits.map((h) => h.y);
        ends = [
          { x: xs, y: Math.min(...ysArr) - 1 },
          { x: xs, y: Math.max(...ysArr) + 1 },
        ];
      }
      ends = ends.filter(inBounds);
      if (ends.length > 0) {
        gameState.ai.queue = ends;
        return;
      }
    }

    // Primeiro acerto (ou sem linha definida): enfileira os 4 vizinhos ortogonais.
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ].filter(inBounds);
    gameState.ai.queue = neighbors.concat(gameState.ai.queue || []);
  }

  private async saveMatch(roomId: string, winnerId: string, status: string) {
    const roomData = await redis.hgetall(`room:${roomId}`);
    if (!roomData || !roomData.subjectSlug) return;
    
    const db = getDb();
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.slug, roomData.subjectSlug)
    });
    if (!subject) return;

    // Solo opponent ("AI") is not a real user — store guest as null.
    const realGuestId =
      roomData.guestId && roomData.guestId !== 'AI' ? roomData.guestId : null;

    await db.insert(matches).values({
      gameType: 'battleship',
      hostId: roomData.hostId,
      guestId: realGuestId,
      subjectId: subject.id,
      grade: roomData.grade,
      winnerId: winnerId,
      status: status,
      startedAt: new Date(), 
      finishedAt: new Date()
    } as any);
  }
}
