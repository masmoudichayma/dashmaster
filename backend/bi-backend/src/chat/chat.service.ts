import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatService {

  async chatWithOllama(message: string) {

    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: message,
        stream: false
      }
    );

    return response.data.response;
  }
}
