# Usar uma imagem base do Node.js 20
FROM node:20-alpine

# Criar e definir o diretório de trabalho
WORKDIR /src/app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto dos arquivos do projeto
COPY . .

# Compilar o TypeScript
RUN npm run build

# Expor a porta que sua aplicação usa
EXPOSE 8080

# Comando para iniciar a aplicação
CMD ["npm", "start"]
