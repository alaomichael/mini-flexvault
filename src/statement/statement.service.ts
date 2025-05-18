
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StatementService {
  private readonly pgPool: Pool;
  private readonly s3Client: S3Client;

  constructor() {
    this.pgPool = new Pool({
      user: 'postgres',
      host: 'postgres',
      database: 'flexvault',
      password: 'password',
      port: 5432,
    });
    this.s3Client = new S3Client({
      endpoint: 'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  @Cron(CronExpression.EVERY_10_SECONDS) // Adjusted for testing
  async generateDailyStatement() {
    try {
      const result = await this.pgPool.query(`
        SELECT 
          user_id,
          SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN amount ELSE 0 END) as total_withdrawals,
          SUM(CASE WHEN transaction_type = 'INTEREST' THEN amount ELSE 0 END) as total_interest
        FROM ledger
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY user_id
      `);

      const totalBalance = result.rows.reduce((sum, row) => 
        sum + (row.total_deposits - row.total_withdrawals + row.total_interest), 0);

      const report = {
        date: new Date().toISOString().split('T')[0],
        total_balance: totalBalance,
        user_summaries: result.rows,
      };

      const s3Params = {
        Bucket: 'flexvault-reports',
        Key: `statements/${report.date}.json`,
        Body: JSON.stringify(report),
        ContentType: 'application/json',
      };
      await this.s3Client.send(new PutObjectCommand(s3Params));

      console.log(`Statement for ${report.date} uploaded to MinIO`);

      const bankBalance = await this.getBankBalance();
      const drift = Math.abs(totalBalance - bankBalance);
      if (drift / totalBalance > 0.001) {
        console.error(`Reconciliation drift detected: ${drift}`);
      }
    } catch (error) {
      console.error('Error generating statement:', error);
    }
  }

  private async getBankBalance(): Promise<number> {
    return 1000000;
  }
}