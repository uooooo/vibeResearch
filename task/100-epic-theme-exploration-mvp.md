# 100 EPIC: Theme Exploration MVP

- Status: Planned
- Priority: High
- Owner: TBD

## Goal
キーワード/ドメインから研究テーマ候補を提示し、SSEで進捗を表示、`.suspend()`でユーザー選択を受け付ける最小機能を完成させる。

## Scope
- API: `POST /api/runs/start(kind: "theme")` のSSE実装
- Agent: `ThemeFinderAgent`（Mastra）雛形→最小結果まで
- UI: Theme Explorerページ（ログ/候補カード/比較/続行）
- Resume: `POST /api/runs/{id}/resume` による再開
- 保存: ランメタ/候補をSupabaseへ保存（最小）

## Deliverables
- 動作するSSEストリーム（ダミー→本実装）
- 候補カードと比較UI
- suspend/resumeのエンドツーエンド動作

## Acceptance Criteria
- 入力→進捗ストリーム→候補提示→選択→再開が一連で成功
- エラー時にUI上で理由が分かる

## Dependencies
- 002 技術選定 / 003 ドメインモデル / 104 UI基盤 / 103 Supabase

