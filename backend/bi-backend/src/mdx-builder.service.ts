import { Injectable } from '@nestjs/common';

interface MDXComponents {
  measures: string[];
  dimensions: string[];
  filters: Array<{ dimension: string; value: string }>;
  topN?: number;
  orderBy?: { measure: string; direction: 'ASC' | 'DESC' };
}

@Injectable()
export class MdxBuilderService {
  
  /**
   * 🎯 ÉTAPE 1 : Analyser la question et extraire les composants
   */
  analyzeQuestion(question: string, cubeSchema: any): MDXComponents {
    const lower = question.toLowerCase();
    const components: MDXComponents = {
      measures: [],
      dimensions: [],
      filters: []
    };

    // ═══════════════════════════════════════════════════════════
    // DÉTECTION DES MEASURES
    // ═══════════════════════════════════════════════════════════
    
    // Communications
    if (lower.includes('communication') || lower.includes('montrer')) {
      components.measures.push('Communications Nombre');
    }
    
    // Envois
    if (lower.includes('envoi') || lower.includes('envoyé') || lower.includes('sent')) {
      components.measures.push('Nb Sent');
    }
    
    // Délivrés
    if (lower.includes('délivr') || lower.includes('deliver')) {
      components.measures.push('Nb Deliv');
    }
    
    // Clics
    if (lower.includes('clic') || lower.includes('click')) {
      components.measures.push('Unique Clicks');
    }
    
    // Vues
    if (lower.includes('vue') || lower.includes('view') || lower.includes('ouverture')) {
      components.measures.push('Unique Views');
    }
    
    // Dispatched
    if (lower.includes('dispatch') || lower.includes('expédié')) {
      components.measures.push('Nb Dispatched');
    }

    // Si aucune measure détectée, prendre la première du schéma
    if (components.measures.length === 0 && cubeSchema.measures.length > 0) {
      components.measures.push(cubeSchema.measures[0].name);
    }

    // ═══════════════════════════════════════════════════════════
    // DÉTECTION DES DIMENSIONS (mots-clés "par", "selon", "by")
    // ═══════════════════════════════════════════════════════════
    
    const hasDimensionKeyword = 
      lower.includes(' par ') || 
      lower.includes(' by ') || 
      lower.includes(' selon ') ||
      lower.includes(' pour chaque ');

    if (hasDimensionKeyword) {
      // Segment
      if (lower.includes('segment')) {
        components.dimensions.push('Segment');
      }
      
      // Genre
      if (lower.includes('genre') || lower.includes('gender') || lower.includes('sexe')) {
        components.dimensions.push('Genders');
      }
      
      // Canal
      if (lower.includes('canal') || lower.includes('channel')) {
        components.dimensions.push('Canal');
      }
      
      // Campagne
      if (lower.includes('campagne') || lower.includes('campaign')) {
        components.dimensions.push('Campaigns');
      }
      
      // Date/Temps
      if (lower.includes('date') || lower.includes('mois') || lower.includes('année') || lower.includes('jour')) {
        components.dimensions.push('Calendar');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // DÉTECTION TOP N
    // ═══════════════════════════════════════════════════════════
    
    const topMatch = lower.match(/top\s*(\d+)/);
    if (topMatch) {
      components.topN = parseInt(topMatch[1]);
    }

    // ═══════════════════════════════════════════════════════════
    // DÉTECTION ORDRE (ASC/DESC)
    // ═══════════════════════════════════════════════════════════
    
    if (lower.includes('décroissant') || lower.includes('desc') || lower.includes('plus grand')) {
      components.orderBy = {
        measure: components.measures[0],
        direction: 'DESC'
      };
    }
    
    if (lower.includes('croissant') || lower.includes('asc') || lower.includes('plus petit')) {
      components.orderBy = {
        measure: components.measures[0],
        direction: 'ASC'
      };
    }

    // ═══════════════════════════════════════════════════════════
    // DÉTECTION FILTRES (WHERE)
    // ═══════════════════════════════════════════════════════════
    
    // Filtre sur segment spécifique
    const segmentMatch = lower.match(/segment\s*[=:]\s*['"]?(\w+)['"]?/);
    if (segmentMatch) {
      components.filters.push({
        dimension: 'Segment',
        value: segmentMatch[1]
      });
    }
    
    // Filtre sur genre spécifique
    const genderMatch = lower.match(/genre\s*[=:]\s*['"]?(\w+)['"]?/);
    if (genderMatch) {
      components.filters.push({
        dimension: 'Genders',
        value: genderMatch[1]
      });
    }

    return components;
  }

  /**
   * 🏗️ ÉTAPE 2 : Construire le MDX à partir des composants
   */
  buildMDX(components: MDXComponents, cubeName: string): string {
    let mdx = '';

    // ═══════════════════════════════════════════════════════════
    // SELECT clause - MEASURES
    // ═══════════════════════════════════════════════════════════
    
    const measuresStr = components.measures
      .map(m => `[Measures].[${m}]`)
      .join(', ');
    
    mdx += `SELECT {${measuresStr}} ON COLUMNS`;

    // ═══════════════════════════════════════════════════════════
    // ROWS clause - DIMENSIONS
    // ═══════════════════════════════════════════════════════════
    
    if (components.dimensions.length > 0) {
      const dimension = components.dimensions[0];
      
      let rowsClause = '';
      
      // TOP N ?
      if (components.topN) {
        rowsClause = `TopCount([${dimension}].[${dimension}].Members, ${components.topN}, [Measures].[${components.measures[0]}])`;
      }
      // ORDER BY ?
      else if (components.orderBy) {
        rowsClause = `ORDER([${dimension}].[${dimension}].Members, [Measures].[${components.orderBy.measure}], ${components.orderBy.direction})`;
      }
      // SIMPLE
      else {
        rowsClause = `{[${dimension}].[${dimension}].Members}`;
      }
      
      mdx += `, ${rowsClause} ON ROWS`;
    }

    // ═══════════════════════════════════════════════════════════
    // FROM clause
    // ═══════════════════════════════════════════════════════════
    
    mdx += ` FROM [${cubeName}]`;

    // ═══════════════════════════════════════════════════════════
    // WHERE clause - FILTRES
    // ═══════════════════════════════════════════════════════════
    
    if (components.filters.length > 0) {
      const filter = components.filters[0];
      mdx += ` WHERE [${filter.dimension}].[${filter.dimension}].&[${filter.value}]`;
    }

    return mdx;
  }

  /**
   * 🚀 MÉTHODE PRINCIPALE : Générer MDX depuis une question
   */
  generateMDX(question: string, cubeSchema: any): string {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 QUESTION:', question);
    console.log('═══════════════════════════════════════════════════════════');

    // ÉTAPE 1 : Analyser la question
    const components = this.analyzeQuestion(question, cubeSchema);
    
    console.log('📊 COMPOSANTS DÉTECTÉS:');
    console.log('   Measures:', components.measures);
    console.log('   Dimensions:', components.dimensions);
    console.log('   Filters:', components.filters);
    console.log('   TopN:', components.topN);
    console.log('   OrderBy:', components.orderBy);
    console.log('───────────────────────────────────────────────────────────');

    // ÉTAPE 2 : Construire le MDX
    const mdx = this.buildMDX(components, cubeSchema.cubeName);
    
    console.log('✅ MDX GÉNÉRÉ:');
    console.log('   ', mdx);
    console.log('═══════════════════════════════════════════════════════════');

    return mdx;
  }

  /**
   * 📊 Recommander le type de graphique
   */
  recommendChartType(components: MDXComponents): string {
    // Pas de dimension = nombre total → Carte/KPI
    if (components.dimensions.length === 0) {
      return 'kpi';
    }

    // Dimension temporelle → Ligne
    if (components.dimensions.some(d => d === 'Calendar')) {
      return 'line';
    }

    // Top N → Barre
    if (components.topN) {
      return 'bar';
    }

    // Dimension catégorielle simple → Pie
    if (components.dimensions.length === 1) {
      return 'pie';
    }

    // Par défaut → Barre
    return 'bar';
  }
}