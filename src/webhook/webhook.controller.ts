import { Controller, Post, Body } from '@nestjs/common';
import { Kafka } from 'kafkajs';

@Controller('webhook')
export class WebhookController {
  private readonly kafka: Kafka;
  private readonly producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'webhook-producer',
      brokers: ['kafka:9092'],
    });
    this.producer = this.kafka.producer();
  }

  @Post()
  async receiveWebhook(@Body() payload: { provider_transaction_id: string; amount: number; user_id: string; provider: string }) {
    await this.producer.connect();
    await this.producer.send({
      topic: 'webhook-events',
      messages: [{ value: JSON.stringify(payload) }],
    });
    await this.producer.disconnect();
    return { status: 'Webhook received' };
  }
}