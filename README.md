# 💳 Fatura Easy

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,100:2563eb&height=180&section=header&text=Fatura%20Easy&fontSize=40&fontColor=ffffff" />
</p>

<p align="center">

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
<img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />

</p>

#### 🚀 Acesso Rápido
- ***API em Produção:** [https://faturaeasy-df0h.onrender.com](https://faturaeasy-df0h.onrender.com)
- ***Documentação Interativa (Swagger):** [https://faturaeasy-df0h.onrender.com/docs](https://faturaeasy-df0h.onrender.com/docs)

---


Backend para gerenciamento de faturas compartilhadas entre múltiplos usuários, criado para resolver um problema real de organização financeira familiar.

O sistema permite controlar gastos realizados em cartões compartilhados, acompanhar responsabilidades individuais, gerenciar limites e automatizar o ciclo de vida das faturas.

Mais do que um CRUD tradicional, o projeto evoluiu para uma pequena engine financeira orientada a domínio, simulando comportamentos encontrados em aplicações financeiras reais.

---

# 📑 Sumário

* Objetivo do Projeto
* Problema Resolvido
* Arquitetura e Modelagem
* Funcionalidades
* Regras de Negócio
* Documentação da API
* Stack Utilizada
* Infraestrutura
* Roadmap
* Como Executar
* Aprendizados

---

# 📌 Objetivo do Projeto

Desenvolvido para solucionar um problema real de controle de faturas compartilhadas em cartões de crédito, este projeto centraliza gastos, limites e responsabilidades financeiras de múltiplos usuários.

Além de atender uma necessidade pessoal e familiar, o sistema faz parte do meu portfólio como desenvolvedor backend, demonstrando conhecimentos em:

* Modelagem de domínio
* Arquitetura de software
* Consistência de dados
* Automação de processos
* APIs REST
* Containerização

---

# 🎯 Problema Resolvido

Em cenários onde um mesmo cartão é utilizado por múltiplas pessoas, torna-se difícil controlar:

* Quem realizou cada compra
* Quanto cada usuário consumiu do limite
* Quais parcelas pertencem a cada pessoa
* Quanto ainda está pendente de pagamento
* Qual o valor real disponível do cartão

O Fatura Easy centraliza essas informações e automatiza a gestão financeira compartilhada.

---

# 🏗️ Arquitetura e Modelagem

## 🧩 Arquitetura do Sistema

```mermaid
flowchart TD

User --> Purchase
Purchase --> PurchaseInstallment
PurchaseInstallment --> Invoice
Invoice --> Payment
Payment --> CreditLimit
```

---

## 🔄 Fluxo do Domínio

```text
Purchase
│
├── PurchaseInstallments
│
└──► Invoice
        │
        └──► Payment
```

---

## 📦 Entidades Principais

```text
User
CreditCard
CreditCardUser
Purchase
PurchaseInstallment
Invoice
```

### User

Usuário autenticado do sistema.

### CreditCard

Cartão compartilhado entre múltiplos usuários.

### CreditCardUser

Relacionamento entre usuário e cartão, incluindo regras de limite individual.

### Purchase

Representa a compra original realizada pelo usuário.

### PurchaseInstallment

Representa cada parcela gerada a partir de uma compra.

### Invoice

Representa a projeção financeira das parcelas agrupadas por competência (mês/ano).

---

## 📂 Estrutura do Projeto

```text
src
├─ @types
├─ config
├─ infra
├─ jobs
├─ modules
├─ routes
├─ shared
└─ tests
```

### Exemplo de módulo

```text
modules
└─ auth
   ├─ auth.controller.ts
   ├─ auth.routes.ts
   ├─ auth.schema.ts
   └─ auth.service.ts
```

---

## 🧠 Decisões de Arquitetura

* Purchase é a fonte da verdade financeira
* Invoice é uma projeção agregada por competência
* Parcelas são entidades independentes
* Evita duplicidade de estado financeiro
* Invoice única por competência
* Sistema prioriza consistência antes de otimizações prematuras

---

## 🎯 Conceito Central

A arquitetura foi construída considerando a entidade **Purchase** como origem da verdade financeira.

As invoices funcionam como projeções organizadas da dívida por competência, evitando duplicidade de estado financeiro e reduzindo inconsistências.

---

# 🚀 Principais Funcionalidades

## 👥 Compartilhamento de Cartões

* Cartão com owner principal
* Múltiplos usuários vinculados
* Controle de limite individual
* Controle de limite global

---

## 💳 Gestão Financeira de Compras

* Registro de compras parceladas
* Geração automática de parcelas
* Distribuição por competência
* Correção de diferenças decimais

### Exemplo

Compra de R$ 300,00 em 4x

```text
Junho      → R$ 75,00
Julho      → R$ 75,00
Agosto     → R$ 75,00
Setembro   → R$ 75,00
```

---

## 📄 Invoice Engine

Cada invoice representa:

```text
Cartão + Mês + Ano
```

Exemplo:

```text
Nubank - 06/2026
Nubank - 07/2026
```

---

## 🔄 Lifecycle de Faturas

| Status | Descrição                                 |
| ------ | ----------------------------------------- |
| OPEN   | Aceita novas compras                      |
| CLOSED | Fatura congelada para alterações          |
| PAID   | Libera automaticamente o limite utilizado |

---

## ⏰ Automação Financeira

Rotinas automatizadas utilizando node-cron:

* Fechamento automático de invoices
* Atualização de status financeiros
* Sincronização do lifecycle
* Processos financeiros agendados

---

## ⭐ Diferenciais do Projeto

* Engine financeira própria para parcelamento
* Controle de limite individual e global
* Lifecycle completo de invoices
* Automação financeira com cron jobs
* Modelagem orientada ao domínio
* Estrutura preparada para evolução futura

---

# 🧠 Regras de Negócio Implementadas

* Controle de limite individual
* Controle de limite global
* Competência automática de invoice
* Parcelamento consistente
* Correção de diferenças decimais
* Invoice única por competência
* Freeze financeiro após fechamento
* Liberação automática de limite após pagamento
* Sincronização transacional de pagamentos

---

## 📚 Documentação e Contratos da API

A API possui documentação interativa utilizando Swagger/OpenAPI, permitindo explorar todos os endpoints, schemas e fluxos de autenticação.
Além da documentação automática, os contratos da API são definidos utilizando Zod, garantindo consistência entre validação, tipagem e documentação.

### Recursos Implementados

- Documentação Swagger/OpenAPI
- Validação de requisições com Zod
- Schemas compartilhados entre validação e documentação
- Padronização global de respostas de erro
- Mensagens de validação estruturadas
- Documentação de autenticação JWT

### Exemplo de Resposta de Erro

<img src="https://github.com/EriclysLuckas/FaturaEasy/blob/main/img/error.png?raw=true" />





---



# 🌐 Deploy

                    ┌─────────────────────┐
                    │       Render        │
                    │      API Node.js    │
                    └──────────┬──────────┘
                               │
                               │ 
                               ▼
                    ┌─────────────────────┐
                    │        Neon         │
                    │     PostgreSQL      │
                    └─────────────────────┘

### Fatura Easy API

https://faturaeasy-df0h.onrender.com

### Swagger

Documentação interativa

https://faturaeasy-df0h.onrender.com/docs
<img src="https://github.com/EriclysLuckas/FaturaEasy/blob/main/img/swagger%20home.png?raw=true" />

### Banco de Dados

O banco de produção utiliza PostgreSQL hospedado no Neon.

A aplicação se conecta ao banco através da variável de ambiente:

DATABASE_URL="postgresql://..."

As credenciais reais não são versionadas no repositório.



---



# 🛠️ Stack Utilizada

## Backend

* Node.js
* TypeScript
* Fastify
* Prisma ORM
* PostgreSQL
* Zod

## Infraestrutura

* Docker
* JWT Authentication
* node-cron
* Swagger/OpenAPI

---

# 📦 Infraestrutura Implementada

* API containerizada
* PostgreSQL persistente
* Variáveis de ambiente
* Middleware JWT
* Swagger/OpenAPI
* Padronização global de erros
* Health Check Endpoint

---

# 📈 Roadmap

## ✅ Concluído

* Autenticação JWT
* Compartilhamento de cartões
* Controle de limites
* Parcelamento automático
* Invoice Engine
* Cron Jobs financeiros
* Swagger/OpenAPI
* Padronização global de erros

---

## 🚧 Em Desenvolvimento

* Testes automatizados com Vitest
* Dashboard financeiro
* Aplicativo mobile com React Native

---

## 🔮 Futuro

* Audit Trail financeiro
* Estornos de compras
* Pagamentos parciais
* Ledger financeiro
* Eventos de domínio
* Observabilidade e métricas

---

# 🚀 Como Executar

## Clone o repositório

```bash
git clone <repo-url>
```

## Instale as dependências

```bash
npm install
```

## Configure o .env

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/fatura_easy?schema=public"

JWT_SECRET="seu_secret_super_seguro"
```

## Suba a infraestrutura

```bash
docker-compose up -d
```

## Execute as migrations

```bash
npx prisma migrate dev
```

## Inicie a aplicação

```bash
npm run dev
```

---

# 🎯 Aprendizados

Durante o desenvolvimento deste projeto foram explorados:

* Modelagem de domínio
* Consistência financeira
* Arquitetura backend
* Controle de estados
* Automação de processos
* APIs REST
* Swagger/OpenAPI
* Docker
* PostgreSQL
* Prisma ORM

---

# 📌 Status do Projeto

Projeto em desenvolvimento ativo e evoluindo conforme necessidades reais de uso após deploy.

Novas funcionalidades serão implementadas com foco em resolver problemas reais de gestão financeira compartilhada.

