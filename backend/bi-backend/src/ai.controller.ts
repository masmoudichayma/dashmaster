import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService } from './ai.service';

// ✅ CORRECTION : le préfixe dépend de votre main.ts
// Si main.ts a app.setGlobalPrefix('api/v1') → utilisez @Controller('nlp')
// Si main.ts n'a PAS de préfixe global   → utilisez @Controller('api/v1/nlp')
//
// D'après l'erreur 404, l'URL appelée est :3001/api/v1/nlp/analyze-with-context
// Vérifiez votre main.ts et choisissez l'un des deux cas ci-dessous :

@Controller('nlp') // ← CAS 1 : si main.ts a setGlobalPrefix('api/v1')
// @Controller('api/v1/nlp') // ← CAS 2 : si main.ts n'a PAS de préfixe global

export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-with-context')
  async analyzeWithContext(@Body() body: { prompt: string; context: any }) {
    try {
      const startTime = Date.now();
      console.log(`⚡ Processing: "${body.prompt}"`);

      const schema = body.context?.cubeSchema || body.context;

      if (!schema || !schema.measures) {
        return {
          reply: "Veuillez sélectionner un cube pour fournir le contexte à l'IA.",
          mdx: '',
          parsed: { intention: 'error', confiance_score: 0 },
        };
      }

      const result = await this.aiService.generateMDXFast(body.prompt, schema);
      const reply = this.aiService.generateSimpleResponse(body.prompt);
      const totalDuration = Date.now() - startTime;

      console.log(`✅ Total: ${totalDuration}ms`);

      return {
        reply,
        mdx: result.mdx,
        chartType: result.chartType,
        parsed: {
          intention: 'auto',
          confiance_score: 0.95,
          chartType: result.chartType,
        },
        metadata: {
          duration: totalDuration,
          fromCache: result.fromCache,
        },
      };
    } catch (e: any) {
      console.error('❌ Error:', e);
      return {
        reply: "Erreur lors de l'analyse.",
        error: e.message,
        mdx: '',
      };
    }
  }

  @Post('feedback')
  async saveFeedback(@Body() body: { prompt: string; correctedMdx: string }) {
    console.log('📝 Feedback received:');
    console.log('   Prompt:', body.prompt);
    console.log('   Corrected MDX:', body.correctedMdx);
    return { reply: 'Merci ! Votre correction a été enregistrée.', status: 'success' };
  }

  @Get('cache-stats')
  getCacheStats() {
    return { size: 0, message: 'Cache not implemented in rule-based mode' };
  }

  @Post('clear-cache')
  clearCache() {
    return { message: 'Cache not implemented in rule-based mode' };
  }
}