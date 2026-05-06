# FlashCard App

App de flashcards gamificado e multiplataforma (Android + iOS) com repetição espaçada (SRS), leaderboard e área do professor.

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native + Expo (Expo Router) |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | PostgreSQL |
| Auth | Supabase Auth (email, Google, Apple) |
| Estado | Zustand |
| i18n | i18n-js + expo-localization |

## Estrutura do Monorepo

```
/
├── apps/
│   ├── backend/               Node.js API (Express + PostgreSQL)
│   │   └── src/
│   │       ├── db/            schema.sql + conexão pg
│   │       ├── middleware/    auth (Supabase JWT)
│   │       ├── routes/        auth, decks, cards, study, leaderboard, search, teacher, users
│   │       └── services/      srs.ts (SM-2), xp.ts (níveis)
│   └── mobile/                React Native + Expo
│       ├── app/
│       │   ├── (auth)/        Login, Cadastro
│       │   ├── (tabs)/        Home, Decks, Busca, Ranking, Professor
│       │   ├── deck/[id]      Tela do deck (modos de estudo + cards)
│       │   └── study/[id]     Sessão de estudo (flip / múltipla escolha / type)
│       ├── components/        FlashCard, DeckCard, StreakCalendar, XPBar, LeaderboardRow
│       ├── stores/            authStore, deckStore, studyStore (Zustand)
│       ├── services/          api.ts, srs.ts, notifications.ts
│       └── i18n/              pt.ts, en.ts
└── package.json               (npm workspaces)
```

## Algoritmo SRS — SM-2

Cada carta possui três estados visuais:

| Cor | Estado | Significado |
|---|---|---|
| 🔵 Azul | `new` | Carta nunca vista |
| 🔴 Vermelho | `hard` | Resposta ruim (quality < 3), intervalo reiniciado |
| 🟢 Verde | `review` | Dentro do intervalo de revisão calculado |

O cálculo do próximo intervalo segue:

```
quality ≥ 3  →  rep0→1d, rep1→6d, repN→round(interval × EF)
quality < 3  →  reset: repetitions=0, interval=1d
EF = max(1.3, EF + 0.1 − (5−q)×(0.08+(5−q)×0.02))
```

## Sistema de XP e Níveis

| Ação | XP |
|---|---|
| Múltipla escolha correta | +10 |
| Digitação correta | +15 |
| Correspondência exata (type) | +5 bonus |
| Level formula | `floor(sqrt(xp/100)) + 1` |

## Rotas da API

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro (email+senha) |
| GET | `/api/auth/me` | Perfil do token atual |

### Decks
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/decks` | Lista decks do usuário + biblioteca |
| POST | `/api/decks` | Criar deck |
| GET | `/api/decks/:id` | Detalhes do deck |
| PUT | `/api/decks/:id` | Editar (dono) |
| DELETE | `/api/decks/:id` | Excluir (dono) |
| POST | `/api/decks/:id/save` | Adicionar à biblioteca |
| POST | `/api/decks/import/csv` | Importar CSV |

### Cards
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/decks/:deckId/cards` | Listar cartas com progresso SRS |
| POST | `/api/decks/:deckId/cards` | Adicionar carta |
| PUT | `/api/decks/:deckId/cards/:id` | Editar carta |
| DELETE | `/api/decks/:deckId/cards/:id` | Excluir carta |

### Estudo
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/study/due/:deckId` | Fila SRS do dia |
| POST | `/api/study/session` | Iniciar sessão |
| POST | `/api/study/answer` | Registrar resposta + SRS + XP |
| PATCH | `/api/study/session/:id/end` | Encerrar sessão + streak |
| GET | `/api/study/leaderboard/:deckId` | Ranking do deck |

### Leaderboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/leaderboard` | Top 100 global + posição do usuário |
| GET | `/api/leaderboard/search?q=` | Buscar jogador |

### Professor
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/teacher/invite` | Gerar token de convite |
| POST | `/api/teacher/join/:token` | Aluno aceita convite |
| GET | `/api/teacher/students` | Listar alunos vinculados |
| GET | `/api/teacher/students/:id` | Atividade de um aluno |
| POST | `/api/teacher/feedback` | Enviar feedback |
| POST | `/api/teacher/assign-deck` | Atribuir deck ao aluno |
| GET | `/api/teacher/my-feedback` | Feedbacks recebidos (aluno) |

## Setup

### Pré-requisitos
- Node.js 18+
- PostgreSQL 15+
- Conta no [Supabase](https://supabase.com)

### Backend

```bash
cd apps/backend
cp .env.example .env
# Preencha DATABASE_URL e chaves do Supabase
npm install
npm run db:migrate   # cria tabelas
npm run dev
```

### Mobile

```bash
cd apps/mobile
# Edite services/api.ts com sua SUPABASE_URL, SUPABASE_ANON_KEY e API_BASE
npm install
npm run start        # Expo Go no dispositivo
npm run android
npm run ios
```

## Modelo de Dados (resumo)

```
users           → id, username, email, xp, level, streak_days, role
decks           → id, owner_id, name, is_public, tags, card_count
cards           → id, deck_id, front, back, position
card_progress   → user_id, card_id, repetitions, easiness_factor, interval_days, next_review_date, status
user_decks      → user_id, deck_id  (biblioteca)
study_sessions  → user_id, deck_id, mode, xp_earned, cards_studied
daily_activity  → user_id, activity_date, cards_studied, xp_earned  (heatmap)
teacher_students → teacher_id, student_id
invite_tokens   → teacher_id, token, expires_at
teacher_feedback → teacher_id, student_id, message
deck_assignments → teacher_id, student_id, deck_id
```
