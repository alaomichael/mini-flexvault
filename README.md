# Mini FlexVault

A prototype high-yield savings platform addressing CompanyX's FlexVault assessment requirements.

## Features
- Idempotent webhook processing (Q2)
- Daily statement generation with reconciliation (Q8)
- Metrics and logs for payout pipeline (Q7)
- Architecture diagram (Q1)

## Tech Stack
- Node.js, NestJS, TypeScript
- Postgres, Redis, Kafka, MinIO
- Prometheus, Grafana
- Deployed on Render

## Setup
1. Clone: `git clone https://github.com/your-username/mini-flexvault`
2. Install: `npm install`
3. Start Docker: `docker-compose up -d`
4. Run: `npm run start:dev`
5. Test webhook: `curl -X POST http://localhost:3000/webhook -d '{"provider_transaction_id":"tx_124","amount":200,"user_id":"user_002","provider":"providus"}' -H "Content-Type: application/json"`
6. Check Grafana: `http://localhost:3000`
7. Check MinIO: `http://localhost:9001`

## Architecture
![Architecture Diagram](./flexvault-architecture.png)