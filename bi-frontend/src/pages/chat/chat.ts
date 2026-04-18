import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat';
import { Message, Database, Cube, CubeSchema, CubeDiagram, ConversationSummary } from '../../models/chat';
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
 
  // ─── NOUVEAUX : panneau actif + diagramme ───────────────────────
  activePanel: 'schema' | 'details' | 'diagram' = 'schema';
  cubeDiagram: CubeDiagram | null = null;
  isDiagramLoading: boolean = false;
  // ────────────────────────────────────────────────────────────────
 
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  activeTab: 'chat' | 'history' = 'chat';
  conversations$: Observable<ConversationSummary[]>;
 
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
 
  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    this.conversations$ = this.chatService.conversations$;
  }
 
  ngOnInit(): void {
    this.chatService.messages$.subscribe((messages) => {
      this.zone.run(() => {
        this.messages = messages;
        this.cdr.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      });
    });
    this.connectToServer();
  }
 
  // ─── PANEL : basculer vers le diagramme et le charger ───────────
  switchToDiagram(): void {
    this.activePanel = 'diagram';
    if (!this.cubeDiagram && this.selectedCube && this.selectedDatabase) {
      this.loadDiagram();
    }
  }
 
  loadDiagram(): void {
    if (!this.selectedCube || !this.selectedDatabase) return;
    this.isDiagramLoading = true;
    this.cubeDiagram = null;
    this.chatService
      .getCubeDiagram(this.serverName, this.selectedDatabase.name, this.selectedCube.name)
      .subscribe({
        next: (diagram) => {
          this.zone.run(() => {
            this.cubeDiagram = diagram;
            this.isDiagramLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.isDiagramLoading = false;
            this.cdr.markForCheck();
          });
        },
      });
  }
 
  // ─── HELPERS pour le SVG du diagramme ───────────────────────────
  // Dimensions fixes du canvas SVG
  private readonly SVG_W = 720;
  private readonly SVG_H = 520;
  private readonly FACT_W = 200;
  private readonly FACT_H = 140;
  private readonly DIM_W = 160;
  private readonly DIM_H = 110;
 
  getFactX(): number { return (this.SVG_W - this.FACT_W) / 2; }
  getFactY(): number { return (this.SVG_H - this.FACT_H) / 2; }
 
  getDiagramViewBox(): string { return `0 0 ${this.SVG_W} ${this.SVG_H}`; }
 
  // Positionne les dimensions en cercle autour du fait central
  getDimX(i: number): number {
    const count = this.cubeDiagram?.dimensionTables.length || 1;
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const radius = 190;
    return this.getFactX() + this.FACT_W / 2 + radius * Math.cos(angle) - this.DIM_W / 2;
  }
 
  getDimY(i: number): number {
    const count = this.cubeDiagram?.dimensionTables.length || 1;
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const radius = 190;
    return this.getFactY() + this.FACT_H / 2 + radius * Math.sin(angle) - this.DIM_H / 2;
  }
 
  // Point de départ de la ligne (centre du fait)
  getDimConnectorStart(_i: number): { x: number; y: number } {
    return {
      x: this.getFactX() + this.FACT_W / 2,
      y: this.getFactY() + this.FACT_H / 2,
    };
  }
 
  // Point d'arrivée de la ligne (centre de la dimension)
  getDimConnectorEnd(i: number): { x: number; y: number } {
    return {
      x: this.getDimX(i) + this.DIM_W / 2,
      y: this.getDimY(i) + this.DIM_H / 2,
    };
  }
 
  // ─── HELPERS pour le panel Détails ──────────────────────────────
  getTotalHierarchies(): number {
    if (!this.cubeSchema) return 0;
    return this.cubeSchema.dimensions.reduce(
      (sum, d) => sum + (d.hierarchies?.length || 0), 0
    );
  }
 
  getTotalAttributes(): number {
    if (!this.cubeSchema) return 0;
    return this.cubeSchema.dimensions.reduce(
      (sum, d) => sum + (d.attributes?.length || 0), 0
    );
  }
 
  // ─── MÉTHODE : SAUVEGARDER LA CORRECTION MANUELLE ───────────────
  saveCorrection(index: number): void {
    const botMsg = this.messages[index];
    const userMsg = this.messages[index - 1];
    if (botMsg?.metadata?.mdx && userMsg && userMsg.sender === 'user') {
      const payload = { prompt: userMsg.text, correctedMdx: botMsg.metadata.mdx };
      this.chatService.sendFeedback(payload).subscribe({
        next: () => {
          alert('✅ Apprentissage réussi ! L\'IA a mémorisé cette correction.');
          this.cdr.markForCheck();
        },
        error: () => alert('❌ Erreur lors de l\'apprentissage.'),
      });
    }
  }
 
  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading || !this.selectedCube || !this.cubeSchema) {
      if (!this.selectedCube) alert("Sélectionnez d'abord un cube !");
      return;
    }
    const userText = this.userInput;
    this.chatService.addMessage({ text: userText, sender: 'user', timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;
    this.cdr.markForCheck();
 
    const context = {
      cubeName: this.selectedCube.name,
      databaseName: this.selectedDatabase!.name,
      cubeSchema: this.cubeSchema,
    };
 
    this.chatService.sendPromptWithContext(userText, context).subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.chatService.addMessage({
            text: response.reply,
            sender: 'bot',
            timestamp: new Date(),
            metadata: { mdx: response.mdx, chartType: response.chartType },
          });
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          console.error('Erreur IA Chat:', err);
        });
      },
    });
  }
 
  connectToServer(): void {
    this.isConnecting = true;
    this.chatService.connectToSSAS(this.serverName, this.serverPort).subscribe({
      next: (res) => {
        this.isConnected = res.success;
        this.databases = res.databases || [];
        this.isConnecting = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isConnecting = false;
        this.cdr.markForCheck();
      },
    });
  }
 
  selectDatabase(db: Database): void {
    this.selectedDatabase = db;
    this.chatService.getCubes(this.serverName, db.name).subscribe((res) => {
      this.cubes = res.cubes;
      this.cdr.markForCheck();
    });
  }
 
  selectCube(cube: Cube): void {
    this.selectedCube = cube;
    // Réinitialiser le diagramme quand on change de cube
    this.cubeDiagram = null;
    this.activePanel = 'schema';
    this.chatService.createConversation(cube.name, this.selectedDatabase!.name);
    this.chatService
      .getCubeSchema(this.serverName, this.selectedDatabase!.name, cube.name)
      .subscribe((schema) => {
        this.cubeSchema = schema;
        this.cdr.markForCheck();
      });
  }
 
  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
 
  copyMDX(mdx: string): void { navigator.clipboard.writeText(mdx); }
 
  clearChat(): void {
    if (confirm('Effacer toute la conversation ?')) {
      this.chatService.clearMessages();
      this.cdr.markForCheck();
    }
  }
 
  loadConversation(id: string): void {
    this.chatService.loadConversation(id);
    this.activeTab = 'chat';
    this.cdr.markForCheck();
  }
 
  deleteConversation(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Supprimer définitivement cet historique ?')) {
      this.chatService.deleteConversation(id);
      this.cdr.markForCheck();
    }
  }
 
  private scrollToBottom(): void {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    }
  }
 
  trackByMessage(index: number, message: Message): number {
    return new Date(message.timestamp).getTime() + index;
  }
}