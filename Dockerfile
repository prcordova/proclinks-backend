# Usar uma imagem base do Node.js 20
FROM node:20-alpine

# Criar e definir o diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto dos arquivos do projeto
COPY . .

# Compilar o TypeScript
RUN npm run build

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
