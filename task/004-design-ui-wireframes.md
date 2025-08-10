# 004: Design UI wireframes

- Status: Done
- Owner: TBD
- Priority: Medium
- Estimate: 1 day

## Goal
主要フロー（テーマ探索→候補比較→計画レビュー→エクスポート）のワイヤーフレームを作成し、UIの情報設計を固める。

## Scope
- ページ/画面: Home（入力）、Theme Explorer（SSE進捗 + 候補カード）、Plan Editor（レビュー/再生成）、Export View（Markdown/CSLプレビュー）
- コンポーネント: Progress/Logs、CandidateList、ComparisonTable、PlanSections、ResumePrompt
- 重要分岐点で `.suspend()` / `.resume()` の UI 表現

## Deliverables
- `/docs/ui/wireframes.md` にテキストベースのワイヤーフレーム（ASCII/mermaid可）
- 画面遷移図（簡易）

## Checklist
- [x] 画面リストと目的の明文化
- [x] 各画面の主要コンポーネント一覧
- [x] SSE ストリーム表示の設計（メッセージ/イベント種別）
- [x] `.suspend()` 入力フォームの設計（分岐）
- [x] Export の構造（Markdown + 参考文献CSL）

## Acceptance Criteria
- ワイヤーフレーム文書が存在し、レビュー可能
- 主要フローの分岐と戻りが図示されている

## Notes
- 高精度なビジュアルは不要。情報設計優先。
