import { Injectable } from '@nestjs/common';

/**
 * Interface représentant une correction mémorisée par l'agent.
 * C'est la base de la boucle d'apprentissage (Axe 5).
 */
export interface FeedbackMemory {
  prompt: string;        // La question initiale de l'utilisateur
  correctedMdx: string;  // Le code MDX corrigé et validé par l'humain
  timestamp: Date;       // Date de l'apprentissage
}

@Injectable()
export class AiService {
  /**
   * feedbackStore : Simulation d'une base de données locale.
   * Pour une persistance réelle, il faudrait lier cela à SQLite, TypeORM ou un fichier JSON.
   */
  private feedbackStore: FeedbackMemory[] = [
    { 
      prompt: "Profit pour la catégorie Accessoires", 
      correctedMdx: "SELECT {[Measures].[Sales Amount] - [Measures].[Total Product Cost]} ON COLUMNS, {[Product].[Category].&[Accessories]} ON ROWS FROM [Adventure Works]",
      timestamp: new Date()
    },
    { 
      prompt: "Ventes par année", 
      correctedMdx: "SELECT {[Measures].[Sales Amount]} ON COLUMNS, {[Date].[Calendar Year].Members} ON ROWS FROM [Adventure Works]",
      timestamp: new Date()
    }
  ];

  constructor() {}

  /**
   * 💾 ENREGISTRER UNE CORRECTION (AXE 5)
   * Cette méthode est appelée par le contrôleur quand l'utilisateur clique sur "Valider & Apprendre".
   */
  async saveFeedback(prompt: string, correctedMdx: string) {
    // On évite d'ajouter des doublons pour la même question
    const index = this.feedbackStore.findIndex(f => f.prompt.toLowerCase() === prompt.toLowerCase());
    
    if (index !== -1) {
      this.feedbackStore[index].correctedMdx = correctedMdx;
      this.feedbackStore[index].timestamp = new Date();
    } else {
      this.feedbackStore.push({
        prompt,
        correctedMdx,
        timestamp: new Date()
      });
    }

    console.log(`💾 [Apprentissage] Nouvelle règle mémorisée pour : "${prompt}"`);
    return { status: 'success', memorySize: this.feedbackStore.length };
  }

  /**
   * 🧠 RÉCUPÉRER L'HISTORIQUE
   * Utilisé par le MdxAgentService pour injecter des exemples dans le prompt (Few-Shot Learning).
   */
  getHistory(): FeedbackMemory[] {
    // On retourne les exemples les plus récents en premier
    return this.feedbackStore.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 🔍 RECHERCHE DE CONTEXTE PERTINENT
   * Filtre la mémoire pour ne donner à l'IA que ce qui ressemble à la question actuelle.
   */
  getRelevantContext(currentPrompt: string): string {
    const words = currentPrompt.toLowerCase().split(' ');
    
    // On filtre les feedbacks qui partagent au moins un mot-clé significatif (> 3 lettres)
    const matches = this.feedbackStore.filter(f => 
      words.some(word => word.length > 3 && f.prompt.toLowerCase().includes(word))
    );

    if (matches.length === 0) return "";

    let context = "\n--- EXEMPLES D'APPRENTISSAGE PRÉCÉDENTS ---\n";
    matches.slice(0, 3).forEach(m => {
      context += `Question: ${m.prompt} => MDX Correct: ${m.correctedMdx}\n`;
    });
    
    return context;
  }
}