import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyAccessToken } from '@cogniquest/auth';
import { encryptPayload, decryptPayload } from '@cogniquest/shared';

export class AuthenticatedIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: any) {
    super(app);
    const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    pubClient.on('error', (err) => console.error('Redis PubClient Error:', err.message));
    const subClient = pubClient.duplicate();
    subClient.on('error', (err) => console.error('Redis SubClient Error:', err.message));
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options?: any): any {
    const corsOrigin = process.env.WEB_CLIENT_URL || 'http://localhost:3000';
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
    });
    server.adapter(this.adapterConstructor);

    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication error: Missing token'));
        }
        
        if (!process.env.AUTH_SECRET) {
          throw new Error('Authentication error: Missing AUTH_SECRET');
        }

        const claims = await verifyAccessToken(token, { 
          secret: process.env.AUTH_SECRET, 
          accessTtlSeconds: 900, 
          refreshTtlSeconds: 2592000 
        });
        
        socket.data.userId = claims.sub;

        // --- Monkey-patch Emit for outgoing E2EE encryption ---
        const originalEmit = socket.emit;
        socket.emit = function (this: any, event: string, ...args: any[]) {
          const encryptedArgs = args.map(arg => encryptPayload(arg));
          return (originalEmit as any).call(this, event, ...encryptedArgs);
        } as any;
        // ------------------------------------------------------

        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // --- Middleware for incoming E2EE decryption ---
    server.on('connection', (socket) => {
      socket.use((packet, next) => {
        // packet is an array: [eventName, ...args]
        if (packet && packet.length > 1) {
          for (let i = 1; i < packet.length; i++) {
            packet[i] = decryptPayload(packet[i]);
          }
        }
        next();
      });
    });
    // -----------------------------------------------

    return server;
  }
}

async function bootstrap() {
  if (!process.env.AUTH_SECRET) {
    console.error("FATAL ERROR: AUTH_SECRET is not defined.");
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.WEB_CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useWebSocketAdapter(new AuthenticatedIoAdapter(app));
  
  await app.listen(process.env.PORT || 3001);
  console.log(`Game server running on port ${process.env.PORT || 3001}`);
}
bootstrap();
// Trigger restart
