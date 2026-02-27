# Usar imagem oficial do Node
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copiar arquivos de dependência primeiro (melhora cache)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do projeto
COPY . .

# Gerar client do Prisma
RUN npx prisma generate

# Expor porta da API
EXPOSE 3333

# Comando para iniciar aplicação
CMD ["npm", "run", "dev"]