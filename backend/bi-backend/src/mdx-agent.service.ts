import { Injectable } from '@nestjs/common';
import { Ollama } from "@langchain/ollama";

@Injectable()
export class MdxAgentService {
  private model: Ollama;

  constructor() {
    this.model = new Ollama({
      baseUrl: "http://localhost:11434",
      model: "deepseek-coder", // Modèle optimisé pour le code
      temperature: 0, // Précision maximale
    });
  }

 async processQuery(userPrompt: string, cubeSchema: any): Promise<any> {
  const systemPrompt = `
    RÔLE : Expert MDX.
    CUBE : [${cubeSchema.cubeName}]
    STRUCTURE :
    - MESURES : ${cubeSchema.measures.map(m => `[Measures].[${m.name}]`).join(', ')}
    - DIMENSIONS : ${cubeSchema.dimensions.map(d => `[${d.name}]`).join(', ')}

    MISSION : Générer un JSON pour la question : "${userPrompt}"
    FORMAT OBLIGATOIRE (SANS TEXTE AUTOUR) :
    {
      "mdx": "SELECT ... FROM ...",
      "chartSuggestion": "bar",
      "explanation": "texte"
    }
  `;

  try {
    const response = await this.model.invoke(systemPrompt);
    
    // NETTOYAGE CRUCIAL : On cherche le premier '{' et le dernier '}'
    const startJson = response.indexOf('{');
    const endJson = response.lastIndexOf('}');
    
    if (startJson === -1 || endJson === -1) {
      throw new Error("L'IA n'a pas renvoyé un format JSON valide");
    }

    const cleanJson = response.substring(startJson, endJson + 1);
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("❌ Erreur IA:", error.message);
    // Retour de secours pour éviter la 500
    return {
      mdx: `SELECT {[Measures].[Nb Sent]} ON 0 FROM [${cubeSchema.cubeName}]`,
      chartSuggestion: "table",
      explanation: "Erreur de génération, voici une requête par défaut."
    };
  }
}
}