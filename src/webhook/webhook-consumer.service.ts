import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { Pool } from 'pg';
import { Counter, Histogram } from 'prom-client';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WebhookConsumerService implements OnModuleInit {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly pgPool: Pool;
  private readonly redis: RedisService;
  private readonly payoutSuccess = new Counter({
    name: 'payout_success_total',
    help: 'Total successful payouts',
    labelNames: ['provider'],
  });
  private readonly payoutLatency = new Histogram({
    name: 'payout_processing_seconds',
    help: 'Payout processing latency',
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  constructor(redisService: RedisService) {
    this.kafka = new Kafka({
      clientId: 'flexvault-consumer',
      brokers: ['localhost:9092'],
    });
    // this.consumer = this.kafka.consumer({ groupId: 'webhook-group' });
    this.consumer = this.kafka.consumer({ groupId: 'webhook-group-test' });
    this.pgPool = new Pool({
      user: 'postgres',
      host: 'postgres',
      database: 'flexvault',
      password: 'password',
      port: 5432,
    });
    this.redis = redisService;
  }

  async onModuleInit() {
    console.log('Connecting Kafka consumer...');
    await this.consumer.connect();
    console.log('Connected. Subscribing to topic...');
    await this.consumer.subscribe({ topic: 'webhook-events', fromBeginning: true });
    console.log('Subscribed. Starting consumer...');
    
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        console.log(`Received message: ${message.value?.toString()}`);
        const startTime = Date.now();
        if (!message.value) {
          console.error('Received message with null value, skipping');
          return;
        }
        const webhookPayload = JSON.parse(message.value.toString());
        const { provider_transaction_id, amount, user_id, provider } = webhookPayload;

        const lockKey = `lock:webhook:${provider_transaction_id}`;
        console.log(`Trying to acquire lock for ${provider_transaction_id}`);
        const lockAcquired = await this.redis.acquireLock(lockKey, 10000);
        console.log(`Lock acquired: ${lockAcquired}`);

        if (!lockAcquired) {
          console.log(`Lock not acquired for ${provider_transaction_id}, skipping`);
          return;
        }

        try {
          const result = await this.pgPool.query(
            'SELECT id FROM webhook_events WHERE provider_transaction_id = $1',
            [provider_transaction_id],
          );

          if (result.rows.length > 0) {
            console.log(`Duplicate webhook ${provider_transaction_id}, skipping`);
            return;
          }

          await this.pgPool.query(
            'INSERT INTO webhook_events (provider_transaction_id, amount, user_id, created_at) VALUES ($1, $2, $3, NOW())',
            [provider_transaction_id, amount, user_id],
          );

          await this.pgPool.query(
            'INSERT INTO ledger (user_id, amount, transaction_type, created_at) VALUES ($1, $2, $3, NOW())',
            [user_id, amount, 'DEPOSIT'],
          );

          console.log(`[PAYOUT_SUCCESS] user_id=${user_id}, amount=${amount}, provider=${provider}`);
          this.payoutSuccess.inc({ provider });
          this.payoutLatency.observe((Date.now() - startTime) / 1000);
        } catch (error) {
          console.error(`[PAYOUT_FAILURE] user_id=${user_id}, provider_transaction_id=${provider_transaction_id}, error=${error.message}`);
          throw error;
        } finally {
          await this.redis.releaseLock(lockKey);
        }
      },
    });
  }
}