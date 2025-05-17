import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function sendWebhook() {
  await producer.connect();
  await producer.send({
    topic: 'webhook-events',
    messages: [
      {
        value: JSON.stringify({
          provider_transaction_id: 'tx_123',
          amount: 100.00,
          user_id: 'user_001',
          provider: 'providus',
        }),
      },
      {
        value: JSON.stringify({
          provider_transaction_id: 'tx_123', // Duplicate
          amount: 100.00,
          user_id: 'user_001',
          provider: 'providus',
        }),
      },
    ],
  }).then(console.log);
  await producer.disconnect();
}

sendWebhook().catch(console.error);