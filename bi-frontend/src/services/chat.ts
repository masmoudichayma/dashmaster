import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  Message, ChatResponse, SSASConnection, Database, 
  Cube, CubeSchema, Conversation, ConversationSummary 
} from '../models/chat';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = 'http://localhost:3001/api/v1';
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private conversationsSubject = new BehaviorSubject<ConversationSummary[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();
  private currentConversationId: string | null = null;

  constructor(private http: HttpClient) {
    this.loadMessagesFromStorage();
    this.updateConversationsList();
  }

  // --- MÉTHODE AXE 5 : APPRENTISSAGE ---
  sendFeedback(payload: { prompt: string, correctedMdx: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/nlp/feedback`, payload);
  }

  // --- LOGIQUE EXISTANTE ---
  private loadMessagesFromStorage(): void {
    const stored = localStorage.getItem('chat_messages');
    if (stored) {
      try {
        const messages = JSON.parse(stored);
        this.messagesSubject.next(messages);
      } catch (error) { console.error(error); }
    }
  }

  private saveMessagesToStorage(messages: Message[]): void {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }

  createConversation(cubeName: string, databaseName: string): string {
    const conversationId = `conv_${Date.now()}`;
    const conversation: Conversation = {
      id: conversationId,
      title: `${cubeName} - ${new Date().toLocaleDateString('fr-FR')}`,
      cubeName, databaseName, timestamp: new Date(), messages: [],
    };
    this.saveConversation(conversation);
    this.currentConversationId = conversationId;
    this.messagesSubject.next([]);
    return conversationId;
  }

  private saveConversation(conversation: Conversation): void {
    localStorage.setItem(`conversation_${conversation.id}`, JSON.stringify(conversation));
    this.updateConversationsList();
  }

  private updateConversationsList(): void {
    const conversations: ConversationSummary[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('conversation_')) {
        const conv = JSON.parse(localStorage.getItem(key) || '{}');
        conversations.push({
          id: conv.id, title: conv.title, cubeName: conv.cubeName,
          timestamp: new Date(conv.timestamp), messageCount: conv.messages?.length || 0,
        });
      }
    }
    conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.conversationsSubject.next(conversations);
  }

  loadConversation(conversationId: string): void {
    const stored = localStorage.getItem(`conversation_${conversationId}`);
    if (stored) {
      const conversation = JSON.parse(stored);
      this.messagesSubject.next(conversation.messages);
      this.currentConversationId = conversationId;
    }
  }

  deleteConversation(conversationId: string): void {
    localStorage.removeItem(`conversation_${conversationId}`);
    this.updateConversationsList();
    if (this.currentConversationId === conversationId) {
      this.clearMessages();
      this.currentConversationId = null;
    }
  }

  addMessage(message: Message): void {
    const newMessages = [...this.messagesSubject.value, message];
    this.messagesSubject.next(newMessages);
    this.saveMessagesToStorage(newMessages);
    if (this.currentConversationId) {
      const stored = localStorage.getItem(`conversation_${this.currentConversationId}`);
      if (stored) {
        const conversation = JSON.parse(stored);
        conversation.messages = newMessages;
        this.saveConversation(conversation);
      }
    }
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    localStorage.removeItem('chat_messages');
  }

  connectToSSAS(serverName: string, port: number): Observable<{ success: boolean; databases: any[] }> {
  // Utilise this.apiUrl pour éviter la 404 (http://localhost:3001/api/v1/ssas/connect)
  return this.http.post<{ success: boolean; databases: any[] }>(
    `${this.apiUrl}/ssas/connect`, 
    { serverName, port }
  );
}

  getCubes(serverName: string, databaseName: string): Observable<{ cubes: Cube[] }> {
    return this.http.get<{ cubes: Cube[] }>(`${this.apiUrl}/ssas/cubes?serverName=${serverName}&databaseName=${databaseName}`);
  }

  getCubeSchema(serverName: string, databaseName: string, cubeName: string): Observable<CubeSchema> {
    return this.http.get<CubeSchema>(`${this.apiUrl}/ssas/cube-schema?serverName=${serverName}&databaseName=${databaseName}&cubeName=${cubeName}`);
  }

  sendPromptWithContext(prompt: string, context: any): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/nlp/analyze-with-context`, { prompt, context });
  }
}