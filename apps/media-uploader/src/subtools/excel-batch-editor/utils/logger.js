import winston from 'winston';
import chalk from 'chalk';

export function createLogger(verbose = false) {
  const logger = winston.createLogger({
    level: verbose ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp }) => {
        // Color-coded console output
        const coloredLevel = {
          error: chalk.red('ERROR'),
          warn: chalk.yellow('WARN'),
          info: chalk.blue('INFO'),
          debug: chalk.gray('DEBUG')
        }[level] || level.toUpperCase();

        return `${chalk.gray(`[${timestamp}]`)} ${coloredLevel}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: false }), // We handle coloring manually
          winston.format.simple()
        )
      })
    ]
  });

  return logger;
}