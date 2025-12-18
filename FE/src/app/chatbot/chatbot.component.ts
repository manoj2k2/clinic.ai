import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserPatientService } from '../services/user-patient.service';
import { io, Socket } from 'socket.io-client';
import { Subject, takeUntil } from 'rxjs';

interface Message {
  id?: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

interface PatientOption {
  id: string;
  label: string;
  isPrimary: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  // Chat state
  messages: Message[] = [];
  messageInput = '';
  isLoading = false;
  isConnected = false;
  socket?: Socket;
  sessionId = '';
  showTyping = false;

  // Patient management
  selectedPatientId: string | null = null;
  availablePatients: PatientOption[] = [];
  isLoadingPatients = true;
  showPatientSelector = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private userPatientService: UserPatientService
  ) {
    this.sessionId = 'session-' + Date.now();
  }

  ngOnInit() {
    // Initialize user-patient service
    this.userPatientService.initialize();

    // Subscribe to patient list changes
    this.userPatientService.patients$
      .pipe(takeUntil(this.destroy$))
      .subscribe(patientIds => {
        this.updatePatientOptions(patientIds);
        this.isLoadingPatients = false;
      });

    // Subscribe to primary patient changes
    this.userPatientService.primaryPatient$
      .pipe(takeUntil(this.destroy$))
      .subscribe(primaryPatientId => {
        if (primaryPatientId && primaryPatientId !== this.selectedPatientId) {
          this.selectedPatientId = primaryPatientId;
          
          // Connect to chatbot if not already connected
          if (!this.isConnected) {
            this.initializeConnection();
          }
        }
      });

    // Fallback: Load patients using auth service if new service fails
    this.auth.getAvailablePatientIds().subscribe(patients => {
      if (patients.length > 0 && this.availablePatients.length === 0) {
        this.updatePatientOptions(patients);
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  /**
   * Update available patient options for dropdown
   */
  private updatePatientOptions(patientIds: string[]) {
    const primaryId = this.userPatientService.getCurrentPrimaryPatient();
    
    this.availablePatients = patientIds.map(id => ({
      id,
      label: this.formatPatientLabel(id),
      isPrimary: id === primaryId
    }));

    console.log('📋 Available patients:', this.availablePatients);
  }

  /**
   * Format patient ID for display
   * TODO: Fetch actual patient name from FHIR server
   */
  private formatPatientLabel(patientId: string): string {
    // Extract last part of ID for display
    const parts = patientId.split('-');
    const shortId = parts[parts.length - 1] || patientId;
    
    // Check if this is the primary patient
    const isPrimary = patientId === this.userPatientService.getCurrentPrimaryPatient();
    
    return isPrimary ? `Patient ${shortId} ⭐ (Primary)` : `Patient ${shortId}`;
  }

  /**
   * Initialize WebSocket connection to chatbot service
   */
  initializeConnection() {
    const patientId = this.selectedPatientId;
    if (!patientId) {
      console.error('No patient selected');
      this.addSystemMessage('⚠️ Please select a patient to start chatting');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('🔌 Connecting to chatbot service...');
    console.log('   Session ID:', this.sessionId);
    console.log('   Patient ID:', patientId);

    this.socket = io('http://localhost:3001', {
      query: {
        sessionId: this.sessionId,
        patientId: patientId
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chatbot service');
      this.isConnected = true;
    });

    this.socket.on('connected', (data) => {
      console.log('🤖 Connection confirmed:', data);
      const patientLabel = this.formatPatientLabel(patientId);
      this.addSystemMessage(`Connected to AI Medical Assistant for ${patientLabel}`);
    });

    this.socket.on('response', (data) => {
      this.showTyping = false;
      this.addMessage(data.message, 'assistant', data.timestamp);
      this.isLoading = false;
    });

    this.socket.on('typing', (data) => {
      this.showTyping = data.isTyping;
    });

    this.socket.on('error', (data) => {
      this.showTyping = false;
      this.addMessage('⚠️ ' + data.message, 'assistant', data.timestamp);
      this.isLoading = false;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from chatbot service');
      this.isConnected = false;
      this.addSystemMessage('Disconnected from chatbot service');
    });

    this.socket.on('history', (data) => {
      if (data.success && data.messages) {
        console.log('📜 Loaded conversation history:', data.messages.length, 'messages');
        this.loadHistoryMessages(data.messages);
      }
    });
  }

  /**
   * Switch to a different patient
   */
  switchPatient(patientId: string) {
    if (patientId === this.selectedPatientId) {
      console.log('👤 Already on patient:', patientId);
      return;
    }

    console.log('🔄 Switching patient from', this.selectedPatientId, 'to', patientId);

    // Verify access before switching
    this.userPatientService.hasAccessToPatient(patientId).subscribe(hasAccess => {
      if (!hasAccess) {
        this.addSystemMessage('⚠️ You do not have access to this patient');
        return;
      }

      // Set as primary patient
      this.userPatientService.setPrimaryPatient(patientId).subscribe(success => {
        if (success) {
          this.selectedPatientId = patientId;
          this.messages = []; // Clear chat history
          
          // Disconnect and reconnect with new patient
          if (this.socket) {
            this.socket.disconnect();
          }
          
          // Create new session
          this.sessionId = 'session-' + Date.now();
          this.initializeConnection();

          const patientLabel = this.formatPatientLabel(patientId);
          this.addSystemMessage(`Switched to ${patientLabel}`);
        } else {
          this.addSystemMessage('⚠️ Failed to switch patient. Please try again.');
        }
      });
    });
  }

  /**
   * Send a message to the chatbot
   */
  sendMessage() {
    const content = this.messageInput.trim();
    if (!content || !this.socket || !this.isConnected) {
      if (!this.isConnected) {
        this.addSystemMessage('⚠️ Not connected to chatbot service');
      }
      return;
    }

    // Add user message
    this.addMessage(content, 'user', new Date());

    // Send to server
    this.socket.emit('message', { 
      content,
      metadata: {
        patientId: this.selectedPatientId
      }
    });

    // Clear input and set loading state
    this.messageInput = '';
    this.isLoading = true;
    this.showTyping = true;
  }

  /**
   * Load conversation history
   */
  loadHistory() {
    if (!this.socket || !this.isConnected) {
      this.addSystemMessage('⚠️ Not connected to chatbot service');
      return;
    }

    this.socket.emit('getHistory');
    this.addSystemMessage('Loading conversation history...');
  }

  /**
   * Load history messages into chat
   */
  private loadHistoryMessages(messages: any[]) {
    this.messages = []; // Clear current messages
    messages.forEach(msg => {
      this.addMessage(
        msg.content,
        msg.role === 'user' ? 'user' : 'assistant',
        msg.timestamp
      );
    });
  }

  /**
   * Toggle patient selector dropdown
   */
  togglePatientSelector() {
    this.showPatientSelector = !this.showPatientSelector;
  }

  /**
   * Get display name for current patient
   */
  getCurrentPatientName(): string {
    if (!this.selectedPatientId) {
      return 'No patient selected';
    }
    return this.formatPatientLabel(this.selectedPatientId);
  }

  /**
   * Check if patient switching is available
   */
  canSwitchPatient(): boolean {
    return this.availablePatients.length > 1;
  }

  /**
   * Add a message to the chat
   */
  private addMessage(content: string, sender: 'user' | 'assistant' | 'system', timestamp: Date | string) {
    const message: Message = {
      content,
      sender,
      timestamp: typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    };
    this.messages.push(message);
  }

  /**
   * Add a system message
   */
  private addSystemMessage(content: string) {
    this.addMessage(content, 'system', new Date());
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer!.nativeElement.scrollTop = 
          this.messagesContainer!.nativeElement.scrollHeight;
      }, 0);
    }
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
