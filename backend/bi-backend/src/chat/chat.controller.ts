import { Controller, Post, Body, Get } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {

  constructor(private readonly chatService: ChatService) {}

  @Get()
  getTest() {
    return { message: "Chat API is working" };
  }

  @Post()
  async chat(@Body('message') message: string) {

    const reply = await this.chatService.chatWithOllama(message);

    return { reply };
  }
}
