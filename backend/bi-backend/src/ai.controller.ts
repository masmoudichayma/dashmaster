import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { MdxAgentService } from './mdx-agent.service';

@Controller('nlp')
export class AiController {
  constructor(private readonly mdxAgentService: MdxAgentService) {}

  @Post('analyze-with-context')
  async analyze(@Body() body: { prompt: string, context: any }) {
    if (!body.prompt || !body.context) {
      throw new HttpException('Données manquantes', HttpStatus.BAD_REQUEST);
    }

    // L'agent traite la demande (Axes 1, 2, 3, 4)
    const result = await this.mdxAgentService.processQuery(body.prompt, body.context);
    
    return result; // Renvoie { mdx, chartSuggestion, explanation }
  }

  @Post('feedback')
  async handleFeedback(@Body() body: { prompt: string, correctedMdx: string }) {
    // Axe 5 : Apprentissage (Log des corrections pour futur fine-tuning)
    console.log(`📝 Feedback reçu pour : ${body.prompt}`);
    return { success: true };
  }
}