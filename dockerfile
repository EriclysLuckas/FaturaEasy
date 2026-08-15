# Usar imagem oficial do Node
FROM node:22-slim

WORKDIR /app

# Instalar OpenSSL necessário para o Prisma
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependência primeiro
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar restante do projeto
COPY . .

# Gerar client Prisma
RUN npx prisma generate

EXPOSE 3333

CMD ["npm", "start"]