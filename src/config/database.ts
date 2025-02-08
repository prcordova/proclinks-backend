import mongoose from 'mongoose'
import { env } from './env'

class Database {
  constructor() {
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      await mongoose.connect(env.MONGODB_URI)
      console.log('📦 Conectado ao MongoDB')

      mongoose.connection.on('disconnected', () => {
        console.log('❌ Desconectado do MongoDB')
      })

      mongoose.connection.on('error', (error) => {
        console.error('❌ Erro na conexão MongoDB:', error)
      })

      process.on('SIGINT', async () => {
        try {
          await mongoose.connection.close()
          console.log('📦 MongoDB desconectado pelo término da aplicação')
          process.exit(0)
        } catch (error) {
          console.error('❌ Erro ao fechar conexão MongoDB:', error)
          process.exit(1)
        }
      })
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error)
      process.exit(1)
    }
  }
}

export default new Database() 