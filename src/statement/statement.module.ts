import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StatementService } from './statement.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [StatementService],
})
export class StatementModule {}