# Usar uma imagem base do Node.js 20
FROM node:20-alpine

# Criar e definir o diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Limpar dependências de desenvolvimento
RUN npm prune --production

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080
ENV MONGODB_URI=sua_uri_mongodb
ENV JWT_SECRET=seu_jwt_secret
# Adicione outras variáveis de ambiente necessárias

# Expor a porta que sua aplicação usa
EXPOSE 8080

# Comando para iniciar a aplicação
CMD ["node", "dist/server.js"]
