# AGENTS.md — vibeResearch Agent Design

本ドキュメントは、memo-RequirementDefinition.md を元にした「研究支援エージェント（Research Copilot）」の実装方針、構成、ディレクトリ設計、運用ルールをまとめたものです。初回スコープは「テーマ探索」「研究計画策定」「構造化アウトプット生成」です（将来：分析実行）。

## ミッション / スコープ
- ビジョン: 人間とAIが並走し、(1) テーマ探索 → (2) 研究計画 → (3) 構造化アウトプットを高速・高品質化
- 初期ドメイン: Economics / AI / Crypto（将来拡張可能）
- 成果物: Markdown + 参考文献（CSL）/ 計画YAML/JSON / ランログ

## 技術スタック（決定事項）
- アプリ: Next.js App Router / TypeScript
- UI: Tailwind CSS / shadcn/ui / Vercel AI SDK（ストリーミング）
- バックエンド: Next.js API Routes（`/api/runs/*`）
- DB: Supabase（PostgreSQL + pgvector, Storage, Auth, RLS）
- エージェント基盤: Mastra（.suspend()/.resume() を活用）
- RAG補助: pgvector +（高度化時）LlamaIndex.ts
- デプロイ: Vercel
- LLM: OpenAI / Google AI（用途に応じて切替）
- 学術API: arXiv / Semantic Scholar（必要に応じCrossref 等）

補足: パッケージマネージャは Bun 推奨（本リポジトリは bun.lockb を同梱）。npm/yarn も動作可だが、基本は `bun` を利用する。

### ライブラリ/ツールのバージョンメモ（Kickoff時点）
- Next.js: 15.4.6（App Router）
- React: 19.1.0 / ReactDOM: 19.1.0
- TypeScript: ^5
- Tailwind CSS: ^4（Tailwind v4 系）
- @tailwindcss/postcss: ^4
- ESLint: ^9 / eslint-config-next: 15.4.6
- Bun: 使用推奨（バージョンはローカル環境依存、後日 `.bun-version` で固定予定）

計画中（導入時に確定して追記）
- Mastra: TBD（導入時に実バージョン記録）
- @vercel/ai（Vercel AI SDK）: TBD
- @supabase/supabase-js: ^2 を想定
- shadcn/ui: ジェネレータ由来（導入コミット時のスナップショットを記録）
- Radix UI 各種: TBD（shadcn/ui 追加時に確定）
- LlamaIndex.ts（必要なら）: TBD

バージョン固定方針
- 主要フレームワークは minor/patch を慎重に上げる（Renovate か手動運用）
- 新規導入時は AGENTS.md に「導入理由・バージョン・影響範囲」を追記

## ランタイム / ビルド
- 推奨コマンド: `bun install`, `bun run dev`, `bun run build`, `bun run lint`
- 開発サーバは必要時に各自で起動（CIでは build のみ）
- Node/Bun バージョンは `.node-version`/`.bun-version`（将来追加）で固定予定

## エージェント構成（Mastra）
- Agent: ThemeFinderAgent
  - Tools: `rag.search`, `scholar.search`, `web.search`
  - Policy: `max_steps=8`, `max_tool_calls=10`, `budget_usd=1.0`
  - 中断/再開: 候補提示 → `.suspend()` → ユーザー選択後 `.resume()`
- Workflow: ResearchPlanWorkflow
  - Steps: `ExtractMethods` → `DraftPlan` → `.suspend()(review)` → `Finalize`
- Exporter: Markdown + CSL（参考文献メタを付与）

### API ルート（計画）
- `POST /api/runs/start` — { kind: "theme" | "plan", input } を受け実行開始（SSE stream）
- `POST /api/runs/{id}/resume` — `.resume()` 入力を受けて続行
- `POST /api/runs/{id}/log` — 進捗/メトリクス記録

### データモデル（最小核）
- projects, documents, chunks, plans, runs, tool_invocations, citations, results（詳細は memo を参照）
- RLS: `projects.owner_id = auth.uid()` を起点に参照制御

## ディレクトリ設計（提案）
```
src/
  agents/              # Mastra Agent 実装（ThemeFinder など）
  workflows/           # ResearchPlan 等のWorkflow
  lib/
    rag/               # 取込/チャンク/検索ユーティリティ
    scholarly/         # arXiv / Semantic Scholar クライアント
    utils/             # 汎用ユーティリティ
  server/
    api/
      runs/            # /api/runs/* ルート実装
  db/                  # Supabase 型/SQL スキーマ（将来: 生成）
  ui/
    components/        # shadcn/ui ベースのUIコンポーネント
    pages/             # 画面スケルトン/ルーティング補助
  app/                 # Next.js App Router（UIエントリ）
docs/                  # 仕様やADR等
task/                  # タスク管理Markdown
```

## 開発ルール
- 型: TypeScript（strict 推奨）
- コーディング標準: ESLint（`eslint-config-next`）/ Prettier（将来導入）
- Secrets: `.env.local` に `OPENAI_API_KEY` `GOOGLE_API_KEY` `NEXT_PUBLIC_SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` 等（値はローカルのみ）
- コミット: 小さく、意味単位で。PR は「成果物/動機/テスト計画」を記載
- 依存: まずは最小限（Mastra, shadcn/ui, Supabase, Vercel AI SDK）

### ブランチ命名ポリシー（メモ）
- 基本形式: `feature/<内容の要約-kebab>` / `fix/<修正内容>` / `chore/<雑務>`
- 例:
  - `feature/setup-project-structure`
  - `feature/tech-selection-env-versions`
  - `feature/domain-model-and-schema`
  - `feature/ui-wireframes`
- 目的: PR 一覧で内容が一目で分かる命名にする（`feature/task-xxx` は非推奨）

## 里程標（マイルストーン）
- M0 Kickoff: 構成合意 / ひな型 / タスク整理
- M1 Theme Explorer: 題材入力→候補提示（SSE）→ `.suspend()`
- M2 Plan Workflow: テンプレ草案→レビュー→最終化
- M3 Export: Markdown + CSL 出力 / 保存
- M4（将来）Analysis Runner: Sandbox実行 / ログ・成果物保存

## タスク管理
- GitHub Issues と `/task/*.md` を併用
- 初期タスクを `/task` に作成済み（001〜004）。Issue タイトル/本文はタスクMarkdown準拠

## 次アクション（Kickoff）
- 依存インストールと基本ディレクトリの作成
- API スケルトン `/api/runs/start|resume` の雛形
- エージェント/ワークフローの型定義スケルトン
- UI ワイヤーフレーム（Theme探索→Plan確認→Export）

