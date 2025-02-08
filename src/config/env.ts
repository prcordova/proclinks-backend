import dotenv from 'dotenv'
import path from 'path'

// Carrega o .env antes de qualquer outra configuração
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
})

export const env = {
  PORT: process.env.PORT || 8080,
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
}

type EnvKey = keyof typeof env

const requiredEnvs: EnvKey[] = ['MONGODB_URI', 'JWT_SECRET']
for (const required of requiredEnvs) {
  if (!env[required]) {
    console.error(`❌ Variável de ambiente ${required} não está definida`)
    process.exit(1)
  }
} 