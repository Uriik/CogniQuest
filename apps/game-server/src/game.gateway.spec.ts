import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

jest.mock('@cogniquest/db', () => ({
  getDb: jest.fn().mockReturnValue({ query: { subjects: { findFirst: jest.fn() } }, insert: jest.fn().mockReturnValue({ values: jest.fn() }) }),
  matches: {}, subjects: {}, eq: jest.fn(), getRandomQuestions: jest.fn().mockResolvedValue([])
}));

jest.mock('ioredis', () => {
  const sharedMock = {
    get: jest.fn(),
    set: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    hset: jest.fn(),
    del: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => sharedMock)
  };
});

describe('GameGateway', () => {
  let gateway: GameGateway;
  let mockRedis: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis = new Redis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameGateway],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('deve emitir game:state corretamente ao inicializar (handleGameReady)', async () => {
    const roomId = '123e4567-e89b-12d3-a456-426614174000';
    const hostId = 'user-abc';
    const mockClient = { emit: jest.fn(), join: jest.fn(), data: { userId: hostId } } as unknown as Socket;

    mockRedis.hgetall.mockResolvedValue({
      status: 'ready',
      hostId,
      guestId: 'AI', // Solo mode
      hostName: 'TestHost'
    });
    mockRedis.get.mockImplementation(async (key: string) => {
      if (key.includes(':ready:')) return '1';
      return null;
    });

    await gateway.handleReady({ roomId }, mockClient);

    expect(mockRedis.hset).toHaveBeenCalledWith(`room:${roomId}`, { status: 'in_game' });
    
    expect(gateway.server.to).toHaveBeenCalledWith(hostId);
    expect(gateway.server.emit).toHaveBeenCalledWith('game:start', expect.objectContaining({
      turn: hostId
    }));

    expect(gateway.server.to).toHaveBeenCalledWith(roomId);
    expect(gateway.server.emit).toHaveBeenCalledWith('game:state', expect.objectContaining({
      roomId,
      hostId,
      hostFleet: expect.any(Object),
      guestFleet: expect.any(Object),
      hostRevealed: expect.any(Array),
      guestRevealed: expect.any(Array)
    }));
  });
});
