# 000 Roadmap: POC Delivery Plan

- Status: In Progress
- Owner: TBD
- Purpose: POCの完成までに必要な段階・成果物・受入基準を俯瞰し、各Epic/Issueを紐付けて進捗を可視化する。

## POCの目的（Definition）
- 入力（ドメイン/キーワード）→ テーマ候補提示（SSE）→ ユーザー選択で一時停止（.suspend）→ 研究計画の草案作成 → レビュー/再開（.resume） → 最終計画の出力（Markdown+CSL）
- 最小の永続化（projects/runs/plans）と認証（Supabase）を実装
- Vercelプレビュー環境で動作確認できる

## フェーズ構成（POCまでの大枠）
- P0 Kickoff（完了）
  - 001 Setup project structure（Done）
  - 002 Technology selection（Done）
  - 003 Initial domain model（Done）
  - 004 Design UI wireframes（Done）
- P1 UI Foundation（Epic 104）
  - Tailwind v4 と shadcn/ui 導入、共通レイアウト/テーマ切替
- P2 Supabase Auth & Persistence（Epic 103）
  - supabase-js設定、最小Auth、projects/runs/plansのCRUD
- P3 Theme Exploration MVP（Epic 100）
  - /api/runs/start SSE実装、ThemeFinderAgent雛形、候補カードUI、suspend/resume
- P4 Research Plan Workflow MVP（Epic 101）
  - ResearchPlanWorkflow（Extract→Draft→suspend→Finalize）、Plan Editor、Markdown+CSL出力
- P5 RAG Pipeline Basics（Epic 102）
  - 取込/チャンク/埋め込み/検索の最小実装（P3/P4の根拠提示を補強）
- P6 Observability & Metrics（Epic 106）
  - runs/logs/tool_invocationsの可視化、基本メトリクス
- P7 Deployment to Vercel（Epic 105）
  - CI/CD、環境変数設定、プレビュー/本番URL

## 受入基準（POC DoD）
- ユースケース: Home入力→Theme ExplorerでSSE進捗→候補提示→選択→Plan Editorでレビュー→最終計画をMarkdown+CSLで出力
- 認証後のみ project 作成/閲覧可能（最小RLS前提）
- Vercelプレビュー上で上記フローがデモ可能
- 主要操作と失敗時のメッセージがUIに表示される

## トラッキング（Epic → 主なIssues）
- 100 Theme Exploration: #18, #19 ほか
- 101 Research Plan: #20, #21 ほか
- 102 RAG Basics: #22, #23 ほか
- 103 Supabase/Auth: #24, #25 ほか
- 104 UI Foundation: #26, #27 ほか
- 105 Deployment: #28 ほか
- 106 Observability: #29 ほか

## リスクと対応
- Mastra/LLM依存の変動: 依存バージョンをAGENTS.mdへ記録、モックで先行実装
- Tailwind v4/shadcnの破壊的変更: 最小コンポーネントから段階導入
- Supabase/RLSの設計: 開発初期は読み取り中心→段階的に書き込みを拡張

## おおまかな順序と並行性
- 先行: P1（UI基盤）/ P2（Supabase）
- 続行: P3（Theme SSE）→ P4（Plan WF）
- 並行: P5（RAG基盤）/ P6（可観測性）
- 仕上げ: P7（Vercel）

---
## Progress Update (2025-08-13)
- P2 Supabase: スキーマ反映（RLS/Trigger/Policy）完了。`results`拡張・`workflow_runs`追加、型更新済み。
- P3 Theme Exploration: SSE/候補提示/比較UI/選択→resumeまでエンドツーエンド動作。Mastraによるsuspend/resume＋スナップショット保存を実装。
- 残項目: P1一部（UIコンポーネントの充実）、P4（Plan Editor/Export）、P5（RAG基盤）、P6（ログUI）、P7（Vercel）
