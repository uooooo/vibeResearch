# 001: Set up project structure

- Status: Todo
- Owner: TBD
- Priority: High
- Estimate: 0.5–1 day

## Goal
Next.js + Mastra + Supabase を前提に、最小のディレクトリと雛形を整備して開発を開始できる状態にする。

## Scope
- ディレクトリ作成（agents, workflows, lib/{rag,scholarly,utils}, server/api/runs, db, ui/{components,pages}）
- 空ファイル（.gitkeep）配置
- 既存の `src/app` を生かしつつ最小ページの雛形（後続タスクで実装）

## Deliverables
- 既定ディレクトリの作成
- AGENTS.md のディレクトリ設計と一致

## Checklist
- [ ] `src/agents` `src/workflows` を作成
- [ ] `src/lib/{rag,scholarly,utils}` を作成
- [ ] `src/server/api/runs` を作成
- [ ] `src/db` を作成
- [ ] `src/ui/{components,pages}` を作成
- [ ] `docs/` を作成（将来ADR格納）
- [ ] 各ディレクトリに `.gitkeep` を配置

## Acceptance Criteria
- 指定のディレクトリが存在し、リポジトリに追跡されている
- AGENTS.md の構成と乖離がない

## Notes
- コード実装は別タスク（API/エージェント/ワイヤーフレーム）で行う

