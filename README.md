# 💳 Fatura Easy

<p align="left">

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
<img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />

</p>

Backend para gerenciamento de faturas compartilhadas entre múltiplos usuários, criado para resolver um problema real de organização financeira familiar.

O sistema permite controlar gastos realizados em cartões compartilhados, acompanhar responsabilidades individuais, gerenciar limites e automatizar o ciclo de vida das faturas.

Mais do que um CRUD tradicional, o projeto evoluiu para uma pequena engine financeira orientada a domínio, simulando comportamentos encontrados em aplicações financeiras reais.

---

# 📌 Objetivo do Projeto

Desenvolvido para solucionar um problema real de controle de faturas compartilhadas em cartões de crédito, este projeto centraliza gastos, limites e responsabilidades financeiras de múltiplos usuários.

Além de atender uma necessidade pessoal e familiar, o sistema faz parte do meu portfólio como desenvolvedor backend, demonstrando conhecimentos em modelagem de domínio, arquitetura de software, automação de processos e consistência de dados.

---

# 🚀 Principais Funcionalidades

## 👥 Compartilhamento de Cartões

- Cartão com owner principal
- Múltiplos usuários vinculados
- Controle de limite individual por usuário
- Controle de limite global do cartão

---

## 💳 Gestão Financeira de Compras

- Registro de compras parceladas
- Geração automática de parcelas
- Distribuição automática por competência
- Correção de diferenças decimais em parcelamentos

### Exemplo

Compra de R$ 300,00 em 4x:

- Junho → R$ 75,00
- Julho → R$ 75,00
- Agosto → R$ 75,00
- Setembro → R$ 75,00

---

## 📄 Invoice Engine

Cada invoice representa a composição financeira de:


Cartão + Mês + Ano


Exemplo:


Nubank — 06/2026
Nubank — 07/2026


---

## 🔄 Lifecycle de Faturas

| Status | Descrição |
|------|------------|
| OPEN | Aceita novas compras |
| CLOSED | Fatura congelada para alterações |
| PAID | Libera automaticamente o limite utilizado |

---

## ⏰ Automação Financeira

Rotinas automatizadas utilizando `node-cron`:

- Fechamento automático de invoices
- Atualização de status financeiros
- Sincronização do lifecycle das faturas

---

# 🧠 Regras de Negócio Implementadas

- Controle de limite individual
- Controle de limite global
- Competência automática de fatura
- Parcelamento consistente
- Correção de diferenças decimais
- Invoice única por competência
- Freeze financeiro após fechamento
- Liberação automática de limite após pagamento
- Sincronização transacional de pagamentos

---

# 🏗️ Arquitetura e Modelagem

## Entidades Principais


User
CreditCard
CreditCardUser
Purchase
PurchaseInstallment
Invoice


---

## Fluxo do Domínio


Purchase
│
├── PurchaseInstallments
│
└──► Invoice


### Purchase
Representa a compra original realizada pelo usuário.

### PurchaseInstallment
Representa cada parcela gerada a partir de uma compra.

### Invoice
Representa a projeção financeira das parcelas agrupadas por competência (mês/ano).

---

## Conceito Central

A arquitetura foi construída considerando a entidade **Purchase** como origem da verdade financeira.

As invoices funcionam como projeções organizadas da dívida por competência, evitando duplicidade de estado financeiro e reduzindo inconsistências.

---

# 🛠️ Stack Utilizada

## Backend

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- Zod

## Infraestrutura

- Docker
- JWT Authentication
- node-cron
- Swagger/OpenAPI

---

# 📦 Infraestrutura Implementada

- API containerizada
- PostgreSQL persistente
- Variáveis de ambiente
- Middleware JWT
- Swagger/OpenAPI
- Padronização global de erros
- Health Check endpoint

---

# 📈 Roadmap

## Concluído

- Autenticação JWT
- Compartilhamento de cartões
- Controle de limites
- Parcelamento automático
- Invoice Engine
- Cron Jobs financeiros
- Swagger/OpenAPI
- Padronização global de erros

## Em Desenvolvimento

- Testes automatizados com Jest
- Dashboard financeiro
- Aplicativo mobile com React Native

## Futuro

- Audit Trail financeiro
- Estornos de compras
- Pagamentos parciais
- Ledger financeiro

---

# 🚀 Como Executar

## Clone o repositório

```bash
git clone <repo-url>
Instale as dependências
npm install
Configure o .env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/fatura_easy?schema=public"

JWT_SECRET="seu_secret_super_seguro"
Suba a infraestrutura
docker-compose up -d
Execute as migrations
npx prisma migrate dev
Inicie a aplicação
npm run dev
🎯 Aprendizados

Durante o desenvolvimento deste projeto foram explorados:

Modelagem de domínio
Consistência financeira
Arquitetura backend
Automação de processos
Controle de estados
APIs REST
Documentação com Swagger
Containerização com Docker
📌 Status do Projeto

Em desenvolvimento ativo e evoluindo conforme necessidades reais de uso após deploy.
Novas funcionalidades serão  implementadas com foco em resolver problemas reais de gestão financeira compartilhada.
