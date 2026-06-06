import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration } = requestProps;
    
    const client = context.switchToWs().getClient();
    // Use user ID or IP for rate limiting
    const ip = client.handshake.address;
    const userId = client.data?.userId;
    
    const tracker = userId || ip;
    const throttlerName = throttler.name || 'default';
    const key = this.generateKey(context, tracker, throttlerName);
    
    const { totalHits } = await this.storageService.increment(key, ttl, limit, blockDuration, throttlerName);

    if (totalHits > limit) {
      client.emit('error', 'Rate limit exceeded. Slow down.');
      throw new ThrottlerException();
    }

    return true;
  }
}
