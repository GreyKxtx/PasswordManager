import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { databaseManager } from './config/database';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import vaultRoutes from './routes/vault.routes';
import auditRoutes from './routes/audit.routes';
import { errorHandler } from './middleware/error-handler.middleware';
import { logger } from './utils/logger';

const app: Express = express();

// Подключение к базе данных
databaseManager.connect();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Middleware для обработки синтаксических ошибок JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Обработка синтаксических ошибок JSON (если не обработано выше)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
    });
    return;
  }
  next(err);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200, // максимум 200 запросов с одного IP (увеличено для vault операций)
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Более строгий rate limiting для auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // максимум 5 попыток входа/регистрации
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Более мягкий rate limiting для vault endpoints (для частых операций)
const vaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // максимум 500 запросов для vault операций
  message: 'Too many vault requests, please try again later.',
});
app.use('/api/vault', vaultLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbHealth = await databaseManager.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Централизованный обработчик ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`, {
    port: PORT,
    environment: config.nodeEnv,
  });
});

// Graceful shutdown - корректное завершение работы
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await databaseManager.disconnect();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

  // Принудительное завершение через 10 секунд
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});


