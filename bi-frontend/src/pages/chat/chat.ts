import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat';
import { Message, Database, Cube, CubeSchema, ConversationSummary } from '../../models/chat';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class ChatComponent implements OnInit {
  serverName: string = 'DESKTOP-QBV33CS';
  serverPort: number = 2383;
  isConnected: boolean = false;
  isConnecting: boolean = false;
  connectionStatus: string = 'Disconnected';

  databases: Database[] = [];
  selectedDatabase: Database | null = null;
  cubes: Cube[] = [];
  selectedCube: Cube | null = null;
  cubeSchema: CubeSchema | null = null;

  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  activeTab: 'chat' | 'history' = 'chat';
  conversations$: Observable<ConversationSummary[]>;

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef, private zone: NgZone) {
    this.conversations$ = this.chatService.conversations$;
  }

  ngOnInit(): void {
    this.chatService.messages$.subscribe((messages) => {
      this.zone.run(() => {
        this.messages = messages;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 100);
      });
    });
    this.connectToServer();
  }

  // --- MÉTHODE AXE 5 : SAUVEGARDER LA CORRECTION MANUELLE ---
  saveCorrection(index: number): void {
    const botMsg = this.messages[index];
    const userMsg = this.messages[index - 1]; // On récupère la question juste avant

    if (botMsg.metadata?.mdx && userMsg && userMsg.sender === 'user') {
      const payload = {
        prompt: userMsg.text,
        correctedMdx: botMsg.metadata.mdx
      };

      this.chatService.sendFeedback(payload).subscribe({
        next: () => alert('✅ Apprentissage réussi ! L\'IA a mémorisé cette correction.'),
        error: (err) => alert('❌ Erreur lors de l\'apprentissage.')
      });
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading || !this.selectedCube || !this.selectedDatabase) return;

    const userText = this.userInput;
    this.chatService.addMessage({ text: userText, sender: 'user', timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;

    const context = {
      cubeName: this.selectedCube.name,
      databaseName: this.selectedDatabase.name,
      cubeSchema: this.cubeSchema!,
    };

    this.chatService.sendPromptWithContext(userText, context).subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.chatService.addMessage({
            text: response.reply,
            sender: 'bot',
            timestamp: new Date(),
            metadata: { mdx: response.mdx, parsed: response.parsed }
          });
          this.isLoading = false;
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  connectToServer(): void {
    this.isConnecting = true;
    this.chatService.connectToSSAS(this.serverName, this.serverPort).subscribe({
      next: (res) => {
        this.isConnected = res.success;
        this.databases = res.databases || [];
        this.isConnecting = false;
      },
      error: () => { this.isConnecting = false; }
    });
  }

  selectDatabase(db: Database): void {
    this.selectedDatabase = db;
    this.chatService.getCubes(this.serverName, db.name).subscribe(res => this.cubes = res.cubes);
  }

  selectCube(cube: Cube): void {
    this.selectedCube = cube;
    this.chatService.createConversation(cube.name, this.selectedDatabase!.name);
    this.chatService.getCubeSchema(this.serverName, this.selectedDatabase!.name, cube.name)
        .subscribe(schema => this.cubeSchema = schema);
  }

  onEnterPress(event: any): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  copyMDX(mdx: string): void {
    navigator.clipboard.writeText(mdx);
  }

  clearChat(): void { if (confirm('Effacer ?')) this.chatService.clearMessages(); }

  loadConversation(id: string): void { this.chatService.loadConversation(id); this.activeTab = 'chat'; }

  deleteConversation(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Supprimer ?')) this.chatService.deleteConversation(id);
  }

  private scrollToBottom(): void {
    if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
  }

  trackByMessage(index: number, message: any): number {
    return new Date(message.timestamp).getTime() + index;
  }
}