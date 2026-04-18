import { Injectable, OnModuleInit } from '@nestjs/common';
import { MdxBuilderService } from './mdx-builder.service';

@Injectable()
export class AiService implements OnModuleInit {
  
  constructor(private readonly mdxBuilder: MdxBuilderService) {}

  async onModuleInit() {
    console.log('✅ AI Service initialized (Rule-based MDX Generator)');
  }

  /**
   * 🚀 Génération MDX par règles (sans IA)
   */
  async generateMDXFast(
    prompt: string, 
    cubeSchema: any
  ): Promise<{ 
    mdx: string; 
    fromCache: boolean; 
    duration: number; 
    chartType: string 
  }> {
    const startTime = Date.now();

    try {
      // Générer le MDX avec le builder
      const mdx = this.mdxBuilder.generateMDX(prompt, cubeSchema);
      
      // Analyser pour recommander le graphique
      const components = this.mdxBuilder.analyzeQuestion(prompt, cubeSchema);
      const chartType = this.mdxBuilder.recommendChartType(components);

      const duration = Date.now() - startTime;
      console.log(`✅ Generated in ${duration}ms`);

      return { 
        mdx, 
        fromCache: false, 
        duration,
        chartType 
      };

    } catch (error) {
      console.error('❌ Error generating MDX:', error);
      throw error;
    }
  }

  /**
   * Réponse textuelle simple
   */
  generateSimpleResponse(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('top')) return 'Voici le classement demandé.';
    if (lower.includes('par') || lower.includes('by')) return 'Voici la répartition demandée.';
    if (lower.includes('compare')) return 'Voici la comparaison demandée.';
    if (lower.includes('total') || lower.includes('nombre')) return 'Voici le total demandé.';
    
    return 'Voici l\'analyse demandée.';
  }
}