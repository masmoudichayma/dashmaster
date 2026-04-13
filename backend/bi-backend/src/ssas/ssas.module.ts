import { Module } from '@nestjs/common';
import { SsasController } from './ssas.controller';
import { SsasService } from './ssas.service';
import { SsasPowershellService } from './ssas-powershell.service';

@Module({
  controllers: [SsasController],
  providers: [SsasService, SsasPowershellService],
  exports: [SsasService, SsasPowershellService],
})
export class SsasModule {}