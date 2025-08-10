# 002: Technology selection

- Status: Done
- Owner: TBD
- Priority: High
- Estimate: 0.5 day

## Goal
要件メモに基づき採用技術を確定し、必要な環境変数・運用ルールを定義する。

## Scope
- フレームワーク/ランタイム: Next.js(App Router) + TypeScript + Bun
- UI: Tailwind CSS + shadcn/ui + Vercel AI SDK
- Agent: Mastra（第一候補）
- DB: Supabase（PostgreSQL + pgvector, Storage, Auth, RLS）
- LLM: OpenAI / Google AI（用途で切替）
- Scholarly API: arXiv / Semantic Scholar（必要に応じ Crossref）
- デプロイ: Vercel

## Deliverables
- 採用技術の確定メモ（AGENTS.md 反映）
- .env.example に必要な KEY 名の一覧（値は未保存）

## Checklist
- [x] AGENTS.md の技術スタック項目を最終化
- [x] 主要ライブラリ（Mastra, Supabase, shadcn/ui, Vercel AI SDK）の導入方針を記述
- [x] 必須環境変数の列挙（例: OPENAI_API_KEY, GOOGLE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY）
- [x] デプロイ先(Vercel)方針とビルドコマンドの確認（bun）

## Acceptance Criteria
- 採用/非採用の根拠が AGENTS.md に明記されている
- 環境変数一覧が用意されている

## Notes
- ネットワーク制限下のため、依存追加は別タイミングで行う
