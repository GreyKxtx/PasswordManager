import mongoose, { Connection } from 'mongoose';
import { config } from './env';

export class DatabaseManager {
  private connection: Connection | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5 секунд

  /**
   * Подключение к базе данных
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return;
    }

    if (this.isConnected()) {
      console.log('✅ Already connected to MongoDB');
      return;
    }

    this.isConnecting = true;
    const mongoUri = config.mongoUri;

    try {
      console.log('🔍 Connecting to MongoDB...');
      console.log('📍 URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Скрываем credentials в логах

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // Таймаут выбора сервера
        socketTimeoutMS: 45000, // Таймаут сокета
      });

      this.connection = mongoose.connection;
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      this.setupEventHandlers();

      console.log('✅ MongoDB connected successfully');
      console.log('📊 Database:', this.connection.db?.databaseName);
      console.log('🔗 Host:', this.connection.host);
      console.log('🔌 Port:', this.connection.port);
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ MongoDB connection error:', error);
      
      // Попытка переподключения
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        console.error('❌ Max reconnection attempts reached. Exiting...');
        process.exit(1);
      }
    }
  }

  /**
   * Настройка обработчиков событий подключения
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('connected', () => {
      console.log('📡 MongoDB connection established');
    });

    this.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    this.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      this.connection = null;
      
      // Автоматическое переподключение
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    });

    this.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      this.reconnectAttempts = 0;
    });
  }

  /**
   * Проверка состояния подключения
   */
  isConnected(): boolean {
    return this.connection?.readyState === 1; // 1 = connected
  }

  /**
   * Получение текущего подключения
   */
  getConnection(): Connection | null {
    return this.connection;
  }

  /**
   * Получение состояния подключения
   */
  getConnectionState(): string {
    if (!this.connection) return 'disconnected';
    
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    
    return states[this.connection.readyState] || 'unknown';
  }

  /**
   * Graceful shutdown - корректное отключение
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      console.log('ℹ️ No active connection to close');
      return;
    }

    try {
      await mongoose.disconnect();
      this.connection = null;
      console.log('✅ MongoDB connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Проверка здоровья подключения
   */
  async healthCheck(): Promise<{ status: string; database?: string; state?: string }> {
    if (!this.isConnected()) {
      return { status: 'disconnected' };
    }

    try {
      // Простой ping к базе данных
      await this.connection?.db?.admin().ping();
      return {
        status: 'healthy',
        database: this.connection?.db?.databaseName,
        state: this.getConnectionState(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        state: this.getConnectionState(),
      };
    }
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();

// Экспорт для обратной совместимости
export const connectDatabase = async (): Promise<void> => {
  await databaseManager.connect();
};
