import { Module } from '@nestjs/common';
import { WebhookConsumerService } from './webhook-consumer.service';
import { RedisService } from '../redis/redis.service';

@Module({
  providers: [WebhookConsumerService, RedisService],
})
export class WebhookModule {}