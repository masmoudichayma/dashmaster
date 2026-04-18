import { Module } from '@nestjs/common';
import { SsasModule } from './ssas/ssas.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MdxBuilderService } from './mdx-builder.service';

@Module({
  imports: [SsasModule],
  controllers: [AppController, AiController],
  providers: [AppService, AiService, MdxBuilderService],
  exports: [AiService, MdxBuilderService],
})
export class AppModule {}