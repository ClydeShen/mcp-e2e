import { randomUUID } from 'crypto';
import { Session } from '../types';

export class SessionManager {
  private sessions: Map<string, Session>;
  private readonly cleanupInterval: number;
  private readonly sessionTimeout: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    options: {
      cleanupInterval?: number; // milliseconds
      sessionTimeout?: number; // milliseconds
    } = {}
  ) {
    this.sessions = new Map();
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 minutes
    this.startCleanup();
  }

  /**
   * Creates a new session
   */
  createSession(metadata?: Record<string, any>): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      metadata,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Gets an existing session by ID
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = new Date();
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * Updates session metadata
   */
  updateSession(
    sessionId: string,
    metadata: Record<string, any>
  ): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
      session.lastAccessedAt = new Date();
      this.sessions.set(sessionId, session);
      return session;
    }
    return undefined;
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Gets all active sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Starts the cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Cleans up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Stops the cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
