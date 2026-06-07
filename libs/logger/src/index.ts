import winston from "winston";

export interface LoggerOptions {
  serviceName: string;
  level?: string;
}

const loggers = new Map<string, winston.Logger>();

export function createLogger(options: LoggerOptions): winston.Logger {
  const { serviceName, level = process.env.LOG_LEVEL ?? "info" } = options;

  const existing = loggers.get(serviceName);
  if (existing) return existing;

  const logger = winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format:
          process.env.NODE_ENV === "production"
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level: lvl, message, service, ...meta }) => {
                  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                  return `${timestamp} [${service}] ${lvl}: ${message}${extra}`;
                })
              ),
      }),
    ],
  });

  loggers.set(serviceName, logger);
  return logger;
}

export function withCorrelation(
  logger: winston.Logger,
  correlationId: string
): winston.Logger {
  return logger.child({ correlationId });
}

export type Logger = winston.Logger;
