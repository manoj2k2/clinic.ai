import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { io, Socket } from 'socket.io-client';

interface Message {
  id?: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  messages: Message[] = [];
  messageInput = '';
  isLoading = false;
  isConnected = false;
  socket?: Socket;
  sessionId = '';
  selectedPatientId: string | null = null;
  availablePatients: string[] = [];
  showTyping = false;

  constructor(private auth: AuthService) {
    this.sessionId = 'session-' + Date.now();
  }

  ngOnInit() {
    // Get available patients for this user
    this.auth.getAvailablePatientIds().subscribe(patients => {
      this.availablePatients = patients;
    });

    // Get primary patient and connect
    this.auth.getPrimaryPatientObservable().subscribe(patientId => {
      if (patientId) {
        this.selectedPatientId = patientId;
        this.initializeConnection();
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }
 
  initializeConnection() {
    const patientId = this.selectedPatientId;
    if (!patientId) {
      console.error('No patient selected');
      return;
    }

    this.socket = io('http://localhost:3001', {
      query: {
        sessionId: this.sessionId,
        patientId: patientId
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to chatbot service');
      this.isConnected = true;
    });

    this.socket.on('connected', (data) => {
      console.log('Connection confirmed:', data);
      this.addSystemMessage('Connected to AI Medical Assistant');
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
      console.log('Disconnected from chatbot service');
      this.isConnected = false;
    });
  }

  switchPatient(patientId: string) {
    if (patientId === this.selectedPatientId) return;
    
    this.auth.setActivePatientId(patientId).subscribe(success => {
      if (success) {
        this.selectedPatientId = patientId;
        this.messages = [];
        
        // Disconnect and reconnect with new patient
        if (this.socket) {
          this.socket.disconnect();
        }
        
        this.sessionId = 'session-' + Date.now();
        this.initializeConnection();
      }
    });
  }

  sendMessage() {
    const content = this.messageInput.trim();
    if (!content || !this.socket || !this.isConnected) {
      return;
    }

    // Add user message
    this.addMessage(content, 'user', new Date());

    // Send to server
    this.socket.emit('message', { content });

    // Clear input and set loading state
    this.messageInput = '';
    this.isLoading = true;
    this.showTyping = true;
  }

  private addMessage(content: string, sender: 'user' | 'assistant', timestamp: Date | string) {
    const message: Message = {
      content,
      sender,
      timestamp: typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    };
    this.messages.push(message);
  }

  private addSystemMessage(content: string) {
    this.addMessage(content, 'assistant', new Date());
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer!.nativeElement.scrollTop = 
          this.messagesContainer!.nativeElement.scrollHeight;
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
