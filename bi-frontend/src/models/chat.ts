// src/models/chat.ts

export interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  metadata?: {
    parsed?: any;
    mdx?: string;
    confidence?: number;
    chartType?: string;
  };
}

export interface ChatResponse {
  reply: string;
  mdx: string;
  chartType?: string;
  parsed?: any;
  recommendations?: any[];
}

export interface SSASConnection {
  success: boolean;
  message: string;
  databases?: Database[];
}

export interface Database {
  name: string;
  cubes?: Cube[];
  cubeCount?: number;
}

export interface Cube {
  name: string;
  description?: string;
}

export interface CubeSchema {
  cubeName: string;
  measures: Measure[];
  dimensions: Dimension[];
}

export interface Measure {
  name: string;
  dataType?: string;
  aggregationType: string;
  format?: string;
  description?: string; // ← AJOUTÉ
}

export interface Dimension {
  name: string;
  type: string;
  hierarchies?: Hierarchy[];
  attributes?: Attribute[];
}

export interface Hierarchy {
  name: string;
  levels?: Level[];
}

export interface Level {
  name: string;
  columnName?: string;
}

export interface Attribute {
  name: string;
  type?: string;
}

export interface Conversation {
  id: string;
  title: string;
  cubeName: string;
  databaseName: string;
  timestamp: Date;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  cubeName: string;
  timestamp: Date;
  messageCount: number;
}

// ← AJOUTÉ : Interface pour le diagramme du cube
export interface CubeDiagram {
  cubeName: string;
  structure: 'star' | 'snowflake';
  factTable: {
    name: string;
    measureGroups: string[];
    foreignKeys?: string[];
  };
  dimensionTables: {
    name: string;
    type?: string;
    primaryKey?: string;
    foreignKey?: string;
    attributes?: string[];
  }[];
}
