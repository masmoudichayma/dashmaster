import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MdxAgentService } from './mdx-agent.service';
import { SsasController } from './ssas/ssas.controller'; // Vérifie le chemin
import { SsasService } from './ssas/ssas.service';       // Vérifie le chemin
import { SsasPowershellService } from './ssas/ssas-powershell.service'; // <--- AJOUTE CECI !

@Module({
  imports: [],
  controllers: [
    AiController, 
    SsasController
  ],
  providers: [
    AiService,
    MdxAgentService,
    SsasService,
    SsasPowershellService // <--- AJOUTE CECI AUSSI !
  ],
})
export class AppModule {}