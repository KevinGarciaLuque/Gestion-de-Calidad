import { Module } from '@nestjs/common';
import { MccController } from './mcc.controller';
import { MccService } from './mcc.service';

@Module({
  controllers: [MccController],
  providers: [MccService],
})
export class MccModule {}
