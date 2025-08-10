# 003: Create initial domain model

- Status: Done
- Owner: TBD
- Priority: High
- Estimate: 1 day

## Goal
要件メモのデータモデル（projects/documents/chunks/plans/runs/tool_invocations/citations/results）を TS 型と最小スキーマとして定義する。

## Scope
- TypeScript 型の下書き（`src/db/types.ts` または `src/domain/models.ts`）
- Supabase 用のスキーマ雛形（`docs/db/schema.sql` などに保存）
- モデル相互の関係と RLS 前提のアクセス境界のメモ

## Deliverables
- 型定義ファイル（PRに含める）
- スキーマ雛形（生成用メモ）

## Checklist
- [x] `Project`, `Document`, `Chunk`, `Plan`, `Run`, `ToolInvocation`, `Citation`, `Result` の型定義
- [x] pgvector 用の埋め込みカラム（chunks.embedding）想定
- [x] RLS 前提の `owner_id` / `project_id` の参照方針を明記
- [x] 変更が AGENTS.md のデータモデル節と矛盾しないことを確認

## Acceptance Criteria
- 型定義がコンパイル通過（import 可能）
- スキーマ雛形が保存され、参照できる

## Notes
- 実 DB 反映やマイグレーションは別タスク
