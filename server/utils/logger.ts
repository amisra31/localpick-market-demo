/**
 * Production-ready logging utility
 * Respects environment variables and provides structured logging
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): LogMessage {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data
    };
  }

  private output(logMessage: LogMessage): void {
    if (!this.shouldLog(logMessage.level)) return;

    if (this.isDevelopment) {
      // Development: Use console methods for better debugging
      const prefix = `[${logMessage.timestamp}] ${logMessage.context ? `[${logMessage.context}]` : ''} ${logMessage.level.toUpperCase()}:`;
      
      switch (logMessage.level) {
        case 'error':
          console.error(prefix, logMessage.message, logMessage.data || '');
          break;
        case 'warn':
          console.warn(prefix, logMessage.message, logMessage.data || '');
          break;
        case 'info':
          console.info(prefix, logMessage.message, logMessage.data || '');
          break;
        case 'debug':
          console.debug(prefix, logMessage.message, logMessage.data || '');
          break;
      }
    } else {
      // Production: Use structured JSON logging
      console.log(JSON.stringify(logMessage));
    }
  }

  error(message: string, context?: string, data?: any): void {
    this.output(this.formatMessage('error', message, context, data));
  }

  warn(message: string, context?: string, data?: any): void {
    this.output(this.formatMessage('warn', message, context, data));
  }

  info(message: string, context?: string, data?: any): void {
    this.output(this.formatMessage('info', message, context, data));
  }

  debug(message: string, context?: string, data?: any): void {
    this.output(this.formatMessage('debug', message, context, data));
  }

  // Database operation logging
  dbOperation(operation: string, table: string, data?: any): void {
    this.debug(`Database ${operation} on ${table}`, 'database', data);
  }

  // API request logging
  apiRequest(method: string, path: string, userId?: string, data?: any): void {
    this.info(`${method} ${path}`, 'api', { userId, ...data });
  }

  // Authentication logging
  auth(event: string, userId?: string, data?: any): void {
    this.info(`Auth: ${event}`, 'auth', { userId, ...data });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };