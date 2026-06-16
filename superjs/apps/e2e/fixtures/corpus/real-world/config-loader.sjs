// Config Loader — file parsing with sum type errors
// Node.js example

import * as fs from 'fs'
import * as path from 'path'

type ConfigError =
  | FileNotFound { path: string }
  | ParseError { path: string; message: string }
  | ValidationError { field: string; message: string }
  | EnvVarMissing { name: string }

type Result<T, E> = | Ok(T) | Err(E)

type AppConfig {
  host: string
  port: number
  database: DatabaseConfig
  logLevel: LogLevel
}

type LogLevel = | Debug | Info | Warn | Error

type DatabaseConfig {
  url: string
  maxConnections: number
  timeoutMs: number
}

function parseLogLevel(s: string): LogLevel? {
  match s.toLowerCase() {
    'debug' => Debug()
    'info' => Info()
    'warn' => Warn()
    'error' => Error()
    _ => null
  }
}

function validateConfig(raw: dynamic): Result<AppConfig, ConfigError> {
  if (typeof raw.host !== 'string') {
    return Err(ValidationError({ field: 'host', message: 'must be a string' }))
  }
  if (typeof raw.port !== 'number' || raw.port < 1 || raw.port > 65535) {
    return Err(ValidationError({ field: 'port', message: 'must be 1-65535' }))
  }
  const level = parseLogLevel(raw.logLevel ?? 'info')
  if (level === null) {
    return Err(ValidationError({ field: 'logLevel', message: 'must be debug|info|warn|error' }))
  }
  if (typeof raw.database?.url !== 'string') {
    return Err(ValidationError({ field: 'database.url', message: 'must be a string' }))
  }
  return Ok({
    host: raw.host,
    port: raw.port,
    database: {
      url: raw.database.url,
      maxConnections: raw.database.maxConnections ?? 10,
      timeoutMs: raw.database.timeoutMs ?? 5000
    },
    logLevel: level
  })
}

function loadConfig(filePath: string): Result<AppConfig, ConfigError> {
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    return Err(FileNotFound({ path: resolved }))
  }
  try {
    const text = fs.readFileSync(resolved, 'utf-8')
    const raw: dynamic = JSON.parse(text)
    return validateConfig(raw)
  } catch (e) {
    return Err(ParseError({ path: resolved, message: String(e) }))
  }
}

function loadWithEnvOverrides(filePath: string): Result<AppConfig, ConfigError> {
  const result = loadConfig(filePath)
  match result {
    Err(e) => return Err(e)
    Ok(config) => {
      const portEnv = process.env['PORT']
      const dbEnv = process.env['DATABASE_URL']
      return Ok({
        ...config,
        port: portEnv !== undefined ? parseInt(portEnv, 10) : config.port,
        database: {
          ...config.database,
          url: dbEnv ?? config.database.url
        }
      })
    }
  }
}

function describeError(e: ConfigError): string {
  match e {
    FileNotFound { path } => `Config file not found: ${path}`
    ParseError { path, message } => `Failed to parse ${path}: ${message}`
    ValidationError { field, message } => `Invalid config.${field}: ${message}`
    EnvVarMissing { name } => `Required env var not set: ${name}`
  }
}

function main(): void {
  // Write a sample config for demo
  const sample = {
    host: 'localhost',
    port: 3000,
    logLevel: 'info',
    database: { url: 'postgres://localhost/mydb', maxConnections: 20, timeoutMs: 3000 }
  }
  const tmpPath = '/tmp/sjs-config.json'
  fs.writeFileSync(tmpPath, JSON.stringify(sample, null, 2))

  const result = loadWithEnvOverrides(tmpPath)
  match result {
    Ok(config) => {
      console.log('Config loaded:')
      console.log('  host:', config.host)
      console.log('  port:', config.port)
      console.log('  db url:', config.database.url)
    }
    Err(e) => console.error('Config error:', describeError(e))
  }

  // Test missing file
  const bad = loadConfig('/tmp/nonexistent.json')
  match bad {
    Ok(_) => console.log('unexpected OK')
    Err(e) => console.log('Expected error:', describeError(e))
  }
}

main()
