import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiService } from '../ai.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, AiService],
  exports: [ChatService],
})
export class ChatModule {}