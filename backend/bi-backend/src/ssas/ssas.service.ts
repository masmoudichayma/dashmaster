import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SsasPowershellService } from './ssas-powershell.service';

@Injectable()
export class SsasService {
  constructor(private readonly powershellService: SsasPowershellService) {}

  /**
   * Utilitaire pour extraire le message d'erreur de manière sécurisée (Fix Error 2339)
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Nettoie le texte pour corriger les liaisons françaises
   */
  private cleanFrenchText(text: string): string {
    return text
      .replace(/de le /gi, "du ")
      .replace(/de les /gi, "des ")
      .replace(/de ([aeiouy])/gi, "d'$1")
      .replace(/  +/g, ' ')
      .trim();
  }

  /**
   * Génère automatiquement une description métier universelle
   */
  private generateMeasureDescription(measureName: string, cubeName: string): string {
    const name = measureName.toLowerCase();
    
    // Dictionnaire Universel (Ventes, Finance, Marketing, Logistique)
    const businessMeanings: { [key: string]: string } = {
      // VENTES & COMMANDES
      'sales amount': "chiffre d'affaires total",
      'order quantity': "volume des commandes",
      'unit price': "prix de vente unitaire",
      'extended amount': "montant total après remise",
      'dis amount': "valeur totale des remises",
      'discount': "réduction commerciale",
      'sales': "ventes réalisées",
      
      // COÛTS & FINANCE
      'standard cost': "coût de revient standard",
      'total product cost': "coût total de fabrication",
      'tax amt': "montant des taxes (TVA)",
      'freight': "frais d'expédition et transport",
      'amt': "montant financier",
      'rev': "revenu",
      
      // MARKETING & COMMUNICATIONS (Cubecom)
      'sent': "messages envoyés",
      'deliv': "messages délivrés",
      'dispatched': "messages expédiés au serveur",
      'view': "ouvertures/lectures",
      'click': "clics sur les liens",
      'unique': "uniques",
      
      // TECHNIQUE
      'revision': "mises à jour (révisions)",
      'ctc': "contact",
      'id': "identifiant"
    };

    let intro = "";
    let target = name;

    // 1. Détection de l'intention et nettoyage des préfixes techniques
    if (name.includes("nb") || name.includes("count")) {
      intro = "Indique le nombre total de";
      target = target.replace(/nb|count/gi, "").trim();
    } else if (name.includes("amount") || name.includes("amt") || name.includes("cost") || name.includes("price")) {
      intro = "Représente la valeur monétaire de";
    } else if (name.includes("pct") || name.includes("rate")) {
      intro = "Analyse le taux de";
    } else {
      intro = "Analyse quantitative sur";
    }

    // 2. Traduction intelligente par bloc (du plus long au plus court)
    let translatedTarget = target;
    const sortedKeys = Object.keys(businessMeanings).sort((a, b) => b.length - a.length);

    sortedKeys.forEach(key => {
      if (translatedTarget.includes(key)) {
        const regex = new RegExp(key, 'gi');
        translatedTarget = translatedTarget.replace(regex, businessMeanings[key]);
      }
    });

    // 3. Nettoyage final des résidus (ex: supprimer 'amount' s'il est resté après traduction)
    translatedTarget = translatedTarget.replace(/amount|amt/gi, "").trim();

    const finalDescription = `${intro} ${translatedTarget} dans le cube ${cubeName}.`;
    return this.cleanFrenchText(finalDescription);
  }

  async connectToServer(serverName: string, port: number) {
    try {
      const databases = await this.getDatabasesList(serverName, port);
      return {
        success: true,
        message: `Connected to ${serverName}`,
        databases,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${this.getErrorMessage(error)}`,
        databases: [],
      };
    }
  }

  async getDatabasesList(serverName: string, port: number) {
    try {
      return await this.powershellService.getDatabases();
    } catch (error) {
      return [];
    }
  }

  async getCubesForDatabase(serverName: string, databaseName: string) {
    try {
      const cubes = await this.powershellService.getCubes(databaseName);
      return { cubes };
    } catch (error) {
      return { cubes: [] };
    }
  }

  async getCubeSchema(serverName: string, databaseName: string, cubeName: string) {
    try {
      const schema = await this.powershellService.getCubeSchema(databaseName, cubeName);
      
      if (schema && schema.measures) {
        schema.measures = schema.measures.map((m: any) => ({
          ...m,
          description: (!m.description || m.description.toLowerCase().includes("pas de description"))
            ? this.generateMeasureDescription(m.name, cubeName)
            : m.description
        }));
      }
      
      return schema;
    } catch (error) {
      throw new HttpException(
        { message: 'Failed to fetch cube schema', error: this.getErrorMessage(error) },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCubeDiagram(serverName: string, databaseName: string, cubeName: string) {
  try {
    // 1. Récupérer le schéma complet (on réutilise ta méthode existante)
    const schema = await this.powershellService.getCubeSchema(databaseName, cubeName);

    // 2. Transformer le schéma en structure de diagramme
    return {
      cubeName: cubeName,
      structure: 'star',
      // Table de faits avec ses mesures réelles
      factTable: {
        name: 'Fact Table',
        measures: schema.measures.map(m => ({
          name: m.name,
          dataType: m.dataType,
          aggregation: m.aggregation
        }))
      },
      // Tables de dimensions avec leurs clés (Hiérarchies)
      dimensionTables: schema.dimensions.map(d => ({
        name: d.name,
        type: d.type,
        keys: d.hierarchies.map(h => h.name) // On affiche les colonnes clés
      }))
    };
  } catch (error) {
    return { error: "Impossible de générer le diagramme détaillé" };
  }
}

  async executeMDX(serverName: string, databaseName: string, mdxQuery: string) {
    try {
      const result = await this.powershellService.executeMdxQuery(databaseName, mdxQuery);
      return {
        data: result.rows || [],
        columns: result.columns || [],
        rowsCount: result.rows?.length || 0,
      };
    } catch (error) {
      return { data: [], columns: [], error: this.getErrorMessage(error) };
    }
  }
}