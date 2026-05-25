Markdown
# 💳 Fatura Easy

![Node.js](https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

Backend desenvolvido para gerenciamento de faturas compartilhadas entre múltiplos usuários, com foco em consistência financeira, controle de limites e automação de lifecycle de invoices.

O projeto nasceu de uma necessidade real: organizar gastos compartilhados em cartões de crédito de forma confiável, permitindo controle individual de limite, parcelamento automático e sincronização financeira entre usuários.

Mais do que um CRUD financeiro, o objetivo evoluiu para a construção de uma pequena engine financeira orientada a domínio.

---

## ✨ Objetivos do Projeto

* Praticar arquitetura backend além de CRUD tradicional.
* Aplicar regras reais de negócio financeiro.
* Evoluir conhecimentos em Node.js + TypeScript.
* Construir um projeto de portfólio com problema real.
* Simular comportamentos presentes em sistemas financeiros reais.

---

## 🧠 Conceito Central da Arquitetura

O sistema é baseado no conceito de **Purchase como verdade financeira**. Toda movimentação financeira nasce de:
* `Purchase`
* `PurchaseInstallment`

As faturas (`Invoices`) funcionam como **projeções organizadas da dívida por competência financeira**. Isso evita duplicidade de estado financeiro e melhora a consistência dos dados.

---

## 💳 Regras de Negócio Implementadas

### 👥 Compartilhamento de Cartão
Um cartão pode possuir:
* **Owner principal**
* Múltiplos usuários vinculados
* Limite global
* Limite individual por usuário

### 🛑 Controle de Limite Individual
Cada usuário:
* Consome apenas seu próprio limite.
* Não pode ultrapassar o teto definido.

### 🌐 Controle de Limite Global
O sistema:
* Soma parcelas pendentes do cartão.
* Impede estouro do limite total.

### 📅 Competência Financeira
As compras são organizadas por competência de fatura.
* **Exemplo (Fechamento dia 10):**
  * Compra dia 08 $\rightarrow$ entra na invoice atual.
  * Compra dia 12 $\rightarrow$ entra na próxima invoice.

### 🔄 Parcelamento Automático
Ao criar uma compra, o sistema:
* Divide parcelas automaticamente.
* Corrige diferenças decimais.
* Gera competências futuras.
* Cria parcelas independentes.

> **Exemplo Prático: R$ 300,00 em 4x**
> * **Junho:** R$ 75,00
> * **Julho:** R$ 75,00
> * **Agosto:** R$ 75,00
> * **Setembro:** R$ 75,00

---

## 📄 Invoice Engine

Cada invoice representa a combinação de: **Cartão + Mês + Ano**.
* *Exemplo:* Nubank — 06/2026, Nubank — 07/2026.

### 🔄 Lifecycle de Invoices
O sistema gerencia o fluxo de estados financeiros:

| Estado | Descrição |
| :--- | :--- |
| `OPEN` | Aceita novas compras e recalcula a composição financeira. |
| `CLOSED` | Composição financeira congelada. Não aceita novas compras. |
| `PAID` | Invoice quitada, parcelas marcadas como pagas e limite liberado automaticamente. |

---

## 💰 Payment Engine

Ao realizar o pagamento de uma invoice, o sistema executa sequencialmente:
1. Valida o *owner* do cartão.
2. Valida o status da invoice.
3. Busca parcelas pendentes.
4. Marca parcelas como pagas.
5. Sincroniza a invoice automaticamente.
6. Libera o limite consumido.

---

## ⏰ Automação Financeira

O projeto possui automação integrada utilizando `node-cron`. Atualmente o sistema executa:
* Fechamento automático de invoices.
* Sincronização de lifecycle.
* Atualização automática baseada na data atual.

---

## 🏗️ Arquitetura e Modelagem

### Estrutura Financeira (Entidades)
* `User`
* `CreditCard`
* `CreditCardUser`
* `Purchase`
* `PurchaseInstallment`
* `Invoice`

### 🔐 Garantias de Consistência Implementadas
* Invoice única por competência.
* Competência correta.
* Parcelamento consistente.
* *Freeze* financeiro após fechamento.
* Controle de limite individual e global.
* Sincronização e fechamento automáticos.
* Atualização transacional e liberação automática de limite.

---

## 🚧 Funcionalidades em Desenvolvimento

### CRUD Complementar
* **Cartões:** Listagem, atualização e remoção.
* **Compras:** Listagem, filtros, paginação, atualização e remoção.

---

## 📌 Próximas Evoluções Planejadas

* **Padronização de Erros:** Criação do `AppError`, handler global, erros financeiros padronizados e respostas consistentes.
* **Documentação OpenAPI:** Integração com Swagger para documentação automática e exemplos de request/response.
* **Frontend Mobile:** Stack planejada com React Native, Expo, NativeWind, React Query e Zustand.
* **Dashboard Financeiro:** Gastos mensais, analytics, gráficos, gastos por usuário e por cartão.
* **Evoluções Financeiras Futuras:** Snapshot imutável de invoices, ledger financeiro, estornos/refunds, pagamentos parciais, audit trail e recorrência.

---

## 🛠️ Stack Utilizada

* **Backend:** Node.js, TypeScript, Fastify, Prisma ORM, PostgreSQL.
* **Infraestrutura:** Docker, JWT Authentication, node-cron.

### 📦 Infraestrutura Implementada
* API containerizada.
* PostgreSQL persistente.
* Gerenciamento de variáveis de ambiente.
* Autenticação JWT com middleware de rotas protegidas.
* Rota de Health Check.

---

## 🚀 Como Executar o Projeto

1. **Clone o repositório:**
```bash
   git clone <repo-url>
Instale as dependências:

Bash
   npm install
Configure as variáveis de ambiente:
Crie um arquivo .env na raiz do projeto:

Snippet de código
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/fatura_easy?schema=public"
   JWT_SECRET="seu_secret_super_seguro"
Execute os containers da infraestrutura:

Bash
   docker-compose up -d
Execute as migrations do banco de dados:

Bash
   npx prisma migrate dev
Inicie a aplicação em modo de desenvolvimento:

Bash
   npm run dev
