import mongoose from 'mongoose'
import dotenv from 'dotenv'

// Carrega as variáveis de ambiente
dotenv.config()

const dbUri = process.env.MONGODB_URI as string

class Database {
  constructor() {
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      await mongoose.connect(dbUri)
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

// Verifica se a URI existe antes de instanciar
if (!dbUri) {
  console.error('❌ A variável de ambiente MONGODB_URI não está definida')
  process.exit(1)
}

export default new Database() 