# 💳 Fatura Easy

Backend para gerenciamento de faturas compartilhadas entre múltiplos usuários, com foco em consistência financeira, controle de limites e automação de invoices.

O projeto surgiu para resolver um problema real de organização financeira familiar relacionado ao controle de gastos compartilhados em cartões de crédito, fechamento de faturas e acompanhamento de responsabilidades individuais.

Diferente de um CRUD tradicional, o sistema evoluiu para uma pequena engine financeira orientada a domínio, simulando comportamentos presentes em aplicações financeiras reais.

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
- Distribuição automática por competência de fatura
- Correção de diferenças decimais no parcelamento

### Exemplo

Compra de R$ 300,00 em 4x:

- Junho → R$ 75,00
- Julho → R$ 75,00
- Agosto → R$ 75,00
- Setembro → R$ 75,00

---

## 📄 Invoice Engine

Cada invoice representa a composição financeira de:

```text
Cartão + Mês + Ano
```

Exemplo:

```text
Nubank — 06/2026
Nubank — 07/2026
```

---

## 🔄 Lifecycle de Faturas

| Status | Descrição |
|---|---|
| OPEN | Aceita novas compras |
| CLOSED | Fatura congelada para alterações |
| PAID | Libera automaticamente o limite consumido |

---

## ⏰ Automação Financeira

O sistema possui rotinas automatizadas utilizando `node-cron` para:

- Fechamento automático de invoices
- Atualização de status financeiros
- Sincronização automática de lifecycle

---

# 🧠 Regras de Negócio Implementadas

- Controle de limite individual
- Controle de limite global
- Competência automática de fatura
- Parcelamento consistente
- Freeze financeiro após fechamento
- Liberação automática de limite após pagamento
- Invoice única por competência
- Sincronização transacional de pagamentos

---

# 🏗️ Arquitetura e Modelagem

## Entidades Principais

```text
User
CreditCard
CreditCardUser
Purchase
PurchaseInstallment
Invoice
```

---

## Conceito Central

A arquitetura é baseada no conceito de `Purchase` como origem da verdade financeira.

As invoices funcionam como projeções organizadas da dívida por competência, evitando duplicidade de estado financeiro e reduzindo inconsistências.

---

# 🛠️ Stack Utilizada

## Backend

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL

## Infraestrutura

- Docker
- JWT Authentication
- node-cron

---

# 📦 Infraestrutura Implementada

- API containerizada
- PostgreSQL persistente
- Variáveis de ambiente
- Middleware de autenticação JWT
- Health Check endpoint

---

# 🚧 Próximas Evoluções

- Padronização global de erros (`AppError`)
- Swagger/OpenAPI
- Testes automatizados com Jest
- Dashboard financeiro
- Frontend mobile com React Native
- Audit trail financeiro
- Estornos e pagamentos parciais
- Ledger financeiro

---

# 🚀 Como Executar

## Clone o repositório

```bash
git clone <repo-url>
```

---

## Instale as dependências

```bash
npm install
```

---

## Configure o `.env`

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/fatura_easy?schema=public"
JWT_SECRET="seu_secret_super_seguro"
```

---

## Suba a infraestrutura

```bash
docker-compose up -d
```

---

## Execute as migrations

```bash
npx prisma migrate dev
```

---

## Inicie a aplicação

```bash
npm run dev
```

---

# 📌 Objetivo do Projeto

O objetivo do projeto é aprofundar conhecimentos em engenharia backend através da modelagem de regras financeiras reais, explorando arquitetura, automação de processos e consistência de dados em sistemas orientados a domínio.
