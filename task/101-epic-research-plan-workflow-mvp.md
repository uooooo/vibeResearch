# 101 EPIC: Research Plan Workflow MVP

- Status: Planned
- Priority: High
- Owner: TBD

## Goal
選択テーマから研究計画（RQ/仮説/データ/手法/識別/検証/倫理）を草案→レビュー→最終化まで導く。

## Scope
- Workflow: `ResearchPlanWorkflow`（Mastra）`ExtractMethods`→`DraftPlan`→`.suspend()`→`Finalize`
- UI: Plan Editor（セクション編集/差分表示/再生成）
- Export: Markdown + CSL 出力
- 保存: 計画のバージョニング（plansテーブル）

## Deliverables
- 最小ワークフローの実装とレビューUI
- Markdown+CSL生成（最低限フォーマット）

## Acceptance Criteria
- `.suspend()`でレビュー入力→`.resume()`で反映→最終化
- 生成物を保存・再取得できる

## Dependencies
- 100 テーマ探索 / 103 Supabase / 104 UI基盤

