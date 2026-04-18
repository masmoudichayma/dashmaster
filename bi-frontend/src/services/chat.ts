import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Message,
  ChatResponse,
  SSASConnection,
  Database,
  Cube,
  CubeSchema,
  CubeDiagram,
  Conversation,
  ConversationSummary,
} from '../models/chat';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  // ✅ URL de base — doit correspondre à main.ts setGlobalPrefix('api/v1')
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

  // ─── SSAS ────────────────────────────────────────────────────

  connectToSSAS(serverName: string, port: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/ssas/connect`, { serverName, port });
  }

  getCubes(serverName: string, databaseName: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ssas/cubes`, {
      params: { serverName, databaseName },
    });
  }

  getCubeSchema(serverName: string, databaseName: string, cubeName: string): Observable<CubeSchema> {
    return this.http.get<CubeSchema>(`${this.apiUrl}/ssas/cube-schema`, {
      params: { serverName, databaseName, cubeName },
    });
  }

  getCubeDiagram(serverName: string, databaseName: string, cubeName: string): Observable<CubeDiagram> {
    return this.http.get<CubeDiagram>(`${this.apiUrl}/ssas/cube-diagram`, {
      params: { serverName, databaseName, cubeName },
    });
  }

  // ─── NLP / IA ────────────────────────────────────────────────

  // ✅ Route correcte : /api/v1/nlp/analyze-with-context
  sendPromptWithContext(prompt: string, context: any): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/nlp/analyze-with-context`, {
      prompt,
      context,
    });
  }

  sendFeedback(payload: { prompt: string; correctedMdx: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/nlp/feedback`, payload);
  }

  // ─── MESSAGES ────────────────────────────────────────────────

  addMessage(message: Message): void {
    const current = this.messagesSubject.getValue();
    const newMsg: Message = { ...message, id: this.generateId() };
    const updated = [...current, newMsg];
    this.messagesSubject.next(updated);
    this.saveMessagesToStorage(updated);
    this.updateCurrentConversation(updated);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    this.currentConversationId = null;
    localStorage.removeItem('currentMessages');
  }

  // ─── CONVERSATIONS ───────────────────────────────────────────

  createConversation(cubeName: string, databaseName: string): void {
    this.clearMessages();
    this.currentConversationId = this.generateId();
    const conv: Conversation = {
      id: this.currentConversationId,
      title: `${cubeName} — ${new Date().toLocaleDateString('fr-FR')}`,
      cubeName,
      databaseName,
      timestamp: new Date(),
      messages: [],
    };
    const convs = this.getConversationsFromStorage();
    convs.unshift(conv);
    localStorage.setItem('conversations', JSON.stringify(convs));
    this.updateConversationsList();
  }

  loadConversation(id: string): void {
    const convs = this.getConversationsFromStorage();
    const conv = convs.find((c) => c.id === id);
    if (conv) {
      this.currentConversationId = id;
      this.messagesSubject.next(conv.messages || []);
    }
  }

  deleteConversation(id: string): void {
    const convs = this.getConversationsFromStorage().filter((c) => c.id !== id);
    localStorage.setItem('conversations', JSON.stringify(convs));
    this.updateConversationsList();
    if (this.currentConversationId === id) this.clearMessages();
  }

  // ─── STORAGE ─────────────────────────────────────────────────

  private saveMessagesToStorage(messages: Message[]): void {
    localStorage.setItem('currentMessages', JSON.stringify(messages));
  }

  private loadMessagesFromStorage(): void {
    try {
      const raw = localStorage.getItem('currentMessages');
      if (raw) {
        const msgs: Message[] = JSON.parse(raw).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        this.messagesSubject.next(msgs);
      }
    } catch {}
  }

  private updateCurrentConversation(messages: Message[]): void {
    if (!this.currentConversationId) return;
    const convs = this.getConversationsFromStorage();
    const idx = convs.findIndex((c) => c.id === this.currentConversationId);
    if (idx !== -1) {
      convs[idx].messages = messages;
      localStorage.setItem('conversations', JSON.stringify(convs));
      this.updateConversationsList();
    }
  }

  private updateConversationsList(): void {
    const convs = this.getConversationsFromStorage();
    const summaries: ConversationSummary[] = convs.map((c) => ({
      id: c.id,
      title: c.title,
      cubeName: c.cubeName,
      timestamp: new Date(c.timestamp),
      messageCount: c.messages?.length || 0,
    }));
    this.conversationsSubject.next(summaries);
  }

  private getConversationsFromStorage(): Conversation[] {
    try {
      const raw = localStorage.getItem('conversations');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}