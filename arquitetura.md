# Arquitetura do Twenty CRM

## O que é o Twenty?

O Twenty é um CRM (Customer Relationship Management) open-source, projetado para ser uma alternativa moderna e flexível às ferramentas tradicionais de CRM. Ele permite que empresas gerenciem contatos, empresas, oportunidades de vendas e automatizem processos — tudo isso com código aberto e possibilidade de auto-hospedagem.

> **Documentação oficial**: Existe documentação oficial em [docs.twenty.com](https://docs.twenty.com). O próprio repositório contém o pacote `twenty-docs` com o conteúdo desse site. Para setup local, veja [docs.twenty.com/developers/local-setup](https://docs.twenty.com/developers/local-setup).

---

## Visão Geral da Arquitetura

O sistema é organizado como um **monorepo** gerenciado pelo [Nx](https://nx.dev/) e [Yarn 4 (workspaces)](https://yarnpkg.com/). Isso significa que todo o código — frontend, backend, bibliotecas compartilhadas e ferramentas — vive em um único repositório, mas em pacotes independentes.

```
twenty/ (raiz do monorepo)
├── packages/
│   ├── twenty-front/        ← Aplicação React (interface do usuário)
│   ├── twenty-server/       ← API NestJS (backend e regras de negócio)
│   ├── twenty-ui/           ← Biblioteca de componentes visuais
│   ├── twenty-shared/       ← Tipos e utilitários compartilhados
│   ├── twenty-emails/       ← Templates de e-mail (React Email)
│   ├── twenty-sdk/          ← SDK público para integrações externas
│   ├── twenty-zapier/       ← Integração com Zapier
│   ├── twenty-cli/          ← Ferramenta de linha de comando
│   ├── twenty-docker/       ← Configurações Docker e Docker Compose
│   ├── twenty-docs/         ← Site de documentação (Next.js)
│   ├── twenty-website/      ← Site institucional (Next.js)
│   └── twenty-e2e-testing/  ← Testes end-to-end com Playwright
```

---

## Stack de Tecnologias

| Camada        | Tecnologia principal                                    |
|---------------|---------------------------------------------------------|
| Frontend      | React 18, TypeScript, Vite                              |
| Estado global | Jotai (átomos e seletores reativos)                     |
| Estilização   | Emotion (CSS-in-JS, padrão styled-components)           |
| Internacionalização | Lingui                                            |
| Backend       | NestJS (Node.js), TypeScript                            |
| API           | GraphQL (GraphQL Yoga), REST, MCP                       |
| ORM           | TypeORM + camada própria chamada TwentyORM              |
| Banco de dados| PostgreSQL (dados principais), Redis (cache e filas)    |
| Filas         | BullMQ sobre Redis                                      |
| Análise de dados | ClickHouse (opcional, para analytics)               |
| Monorepo      | Nx + Yarn 4 Workspaces                                  |
| Deploy        | Docker / Docker Compose                                 |

---

## Componentes Principais

### 1. Frontend (`twenty-front`)

A interface do usuário é uma SPA (Single Page Application) em React. Ela se comunica com o backend via GraphQL e WebSocket (para atualizações em tempo real).

**Principais módulos do frontend:**

- **`auth/`** — Telas de login, cadastro, OAuth (Google, Microsoft), SSO
- **`object-record/`** — Exibição e edição de registros do CRM (contatos, empresas, oportunidades etc.)
- **`workflow/`** — Editor visual de automações (fluxos de trabalho com triggers e ações)
- **`settings/`** — Configurações do workspace, modelos de dados, permissões
- **`views/`** — Sistema de views com tabelas, kanban, filtros, agrupamentos
- **`navigation/`** — Barra lateral e menu de navegação (personalizável por workspace)
- **`apollo/`** — Configuração do Apollo Client para comunicação GraphQL
- **`ai/`** — Recursos de inteligência artificial integrados à interface
- **`analytics/`** — Dashboards e métricas

### 2. Backend (`twenty-server`)

O backend é construído com NestJS e está dividido em três grandes áreas:

#### Engine (motor central)

A parte mais sofisticada do sistema. Responsável por toda a infraestrutura que torna o Twenty extensível e multi-tenant.

**`engine/api/`** — Camadas de API expostas ao cliente:
- `graphql/` — API GraphQL principal (queries, mutations, subscriptions)
- `rest/` — API REST (em migração progressiva para TwentyORM)
- `mcp/` — API MCP para integração com agentes de IA

**`engine/core-modules/`** — Módulos fundamentais do sistema:
- `auth/` — Autenticação: email/senha, Google OAuth, Microsoft OAuth, SAML/SSO
- `billing/` — Planos, assinaturas e cobrança (integração com Stripe)
- `workflow/` — API de workflows (automações)
- `file-storage/` — Armazenamento de arquivos (local ou S3)
- `message-queue/` — Gerenciamento de filas com BullMQ
- `redis-client/` — Conexão e uso do Redis
- `search/` — Busca global de registros
- `user/` — Gerenciamento de usuários
- `workspace/` — Gerenciamento de workspaces (multi-tenancy)
- `logic-function/` — Execução de funções de lógica customizadas
- `sso/` — Single Sign-On (SAML)
- `two-factor-authentication/` — 2FA
- `telemetry/` — Coleta de métricas e rastreamento

**`engine/metadata-modules/`** — Sistema de metadados (o "motor de modelos"):
- `object-metadata/` — Definição dos objetos do CRM (ex.: Contato, Empresa)
- `field-metadata/` — Definição dos campos de cada objeto
- `view/` — Configurações de views salvas pelos usuários
- `permissions/` e `role/` — Sistema de permissões por papel (RBAC)
- `ai/` — Agentes e modelos de IA por workspace

**`engine/twenty-orm/`** — ORM próprio construído sobre TypeORM, que suporta schemas dinâmicos por workspace (multi-tenancy real com schemas PostgreSQL separados).

#### Modules (módulos de domínio)

São os módulos de negócio do CRM — cada um representa uma entidade ou funcionalidade:

| Módulo              | O que faz                                          |
|---------------------|----------------------------------------------------|
| `company/`          | Gerencia empresas                                  |
| `person/`           | Gerencia pessoas/contatos                          |
| `opportunity/`      | Gerencia oportunidades de venda (pipeline)         |
| `task/`             | Gerencia tarefas                                   |
| `note/`             | Gerencia notas                                     |
| `messaging/`        | Sincronização de e-mails (Gmail, Microsoft)        |
| `calendar/`         | Sincronização de eventos de calendário             |
| `workflow/`         | Executor de automações (triggers, ações)           |
| `connected-account/`| Contas conectadas (Google, Microsoft)              |
| `attachment/`       | Gerencia anexos de arquivos                        |
| `favorite/`         | Favoritos do usuário                               |
| `dashboard/`        | Painéis de métricas                                |
| `timeline/`         | Linha do tempo de atividades de um registro        |

#### Queue Worker

Um processo separado que consome as filas do BullMQ. Executa tarefas assíncronas como:
- Sincronização de e-mails e calendário
- Execução de workflows automáticos
- Envio de e-mails
- Limpeza de registros na lixeira

---

## Como o Multi-Tenancy Funciona

O Twenty suporta múltiplos **workspaces** (empresas/equipes) em uma única instância. Cada workspace tem seu próprio schema PostgreSQL isolado — ou seja, os dados de um workspace nunca se misturam com outro.

```
PostgreSQL
├── schema: public (core — usuários, workspaces, billing)
├── schema: workspace_abc123 (dados do Workspace A)
└── schema: workspace_xyz789 (dados do Workspace B)
```

O **TwentyORM** gerencia essa troca dinâmica de schema em tempo de execução, com base no token do usuário autenticado.

---

## Sistema de Metadados (Modelos Dinâmicos)

Uma das funcionalidades mais poderosas do Twenty é a possibilidade de customizar o modelo de dados sem alterar código. Os usuários podem:

- Criar **objetos customizados** (ex.: "Projeto", "Produto", "Ticket")
- Adicionar **campos customizados** em qualquer objeto
- Definir **relações** entre objetos

Isso é possível porque o sistema de metadados armazena as definições de objetos e campos no banco de dados e os aplica dinamicamente via TwentyORM. O frontend também consome esses metadados para renderizar formulários, tabelas e filtros corretamente.

---

## Fluxo de uma Requisição GraphQL

```
Cliente (React)
    ↓ Apollo Client (HTTP ou WebSocket)
NestJS — Middleware (autenticação, extração do workspace do token)
    ↓
GraphQL Yoga (resolvedor da query/mutation)
    ↓
WorkspaceQueryRunner (decide qual schema usar)
    ↓
TwentyORM (acessa o schema do workspace correto no PostgreSQL)
    ↓
Resposta retorna ao cliente
```

Para operações em tempo real (subscriptions), o fluxo usa WebSocket com Server-Sent Events (SSE).

---

## Sistema de Workflows (Automações)

O Twenty possui um motor de automações visual onde o usuário pode criar fluxos que reagem a eventos e executam ações. Exemplos:

- **Trigger**: "Quando uma oportunidade for criada"
- **Ação**: "Enviar e-mail" ou "Criar tarefa" ou "Chamar uma API externa"

A execução dos workflows acontece no worker (processo separado), via BullMQ. O frontend oferece um editor visual de diagramas para montar esses fluxos.

---

## Autenticação e Segurança

O sistema suporta múltiplos métodos de autenticação:

- **Email e senha** (com verificação de e-mail e 2FA)
- **Google OAuth** (login e acesso às APIs Gmail/Calendar)
- **Microsoft OAuth** (login e acesso às APIs Outlook/Calendar)
- **SAML/SSO** (para autenticação corporativa)

Tokens JWT são usados para autorizar as requisições. O middleware do NestJS extrai o workspace e o usuário a partir do token antes de qualquer operação.

---

## Armazenamento de Arquivos

O sistema suporta dois modos de armazenamento:

- **Local**: arquivos salvos no sistema de arquivos do servidor
- **S3**: armazenamento em nuvem (AWS S3 ou compatíveis, como MinIO)

A configuração é feita via variáveis de ambiente (`STORAGE_TYPE`, `STORAGE_S3_*`).

---

## Deploy com Docker

A forma recomendada de rodar o Twenty em produção é via Docker Compose, com três serviços principais:

```
┌─────────────────────────────────────────┐
│             Docker Compose              │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  │
│  │  server  │  │  worker  │  │  db  │  │
│  │ (porta   │  │ (BullMQ  │  │ (PG) │  │
│  │  3000)   │  │  worker) │  │      │  │
│  └──────────┘  └──────────┘  └──────┘  │
│                                         │
│  ┌───────┐  ┌────────────────────────┐  │
│  │ redis │  │  (S3 externo opcional) │  │
│  └───────┘  └────────────────────────┘  │
└─────────────────────────────────────────┘
```

O container `server` serve tanto a API quanto os arquivos estáticos do frontend (em produção, o frontend é compilado e servido pelo próprio NestJS via `ServeStaticModule`).

---

## Integrações Externas

| Integração     | Finalidade                                            |
|----------------|-------------------------------------------------------|
| Gmail          | Sincronizar e-mails enviados/recebidos               |
| Google Calendar| Sincronizar eventos de calendário                    |
| Microsoft Outlook | Sincronizar e-mails e calendário                  |
| Zapier         | Automatizar fluxos com outros apps via Zapier        |
| Stripe         | Billing e assinaturas (versão cloud)                 |
| Sentry         | Monitoramento de erros                               |
| ClickHouse     | Analytics avançado (opcional)                        |
| Cloudflare     | DNS e domínios customizados por workspace            |

---

## Resumo Visual

```
                    ┌─────────────────────────┐
                    │     Usuário (browser)    │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │     twenty-front        │
                    │  React + Apollo Client  │
                    │  Jotai + Emotion        │
                    └────────────┬────────────┘
                    GraphQL / REST / WebSocket
                    ┌────────────▼────────────┐
                    │     twenty-server       │
                    │       NestJS            │
                    │  ┌──────────────────┐   │
                    │  │ Engine (core)    │   │
                    │  │ TwentyORM        │   │
                    │  │ Metadata System  │   │
                    │  └──────────────────┘   │
                    │  ┌──────────────────┐   │
                    │  │ Modules (domain) │   │
                    │  │ CRM entities     │   │
                    │  └──────────────────┘   │
                    └──────┬────────┬─────────┘
                           │        │
              ┌────────────▼┐  ┌────▼──────────┐
              │ PostgreSQL  │  │     Redis      │
              │ (multi-     │  │ (cache +       │
              │  schema)    │  │  BullMQ filas) │
              └─────────────┘  └───────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │     twenty-server        │
                          │  (modo worker / BullMQ) │
                          │  Processa jobs async     │
                          └─────────────────────────┘
```
