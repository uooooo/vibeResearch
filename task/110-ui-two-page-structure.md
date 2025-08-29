# 110: UI Two-Page Structure (Theme / Plan)

- Status: In Progress
- Priority: High
- Owner: TBD

Goal
- `/theme` と `/plan` の二枚看板へUIを集約し、重複している `/workspace` を廃止（リダイレクト）する。レイアウト/スタイルは Workspace 風をベースに共通化。

Scope
- ナビ/導線: Headerに `GlobalProjectPicker`、主要タブは Theme / Plan（Export/Projects は補助）。
- `/workspace`: `/theme` へリダイレクト（互換期間は残す）。
- レイアウト: `ChatLayout` を Theme/Plan に適用し、左（入力/ログ）・右（候補/エディタ）で統一。
- 文言: 「Generate Theme Candidates」「Generate Plan via Workflow (Review)」「Saved as new version（see History）」。
- Flow: パスA（テーマ探索→計画）、パスB（計画のみ）。

Deliverables
- `/app/workspace/page.tsx` の削除（/workspace 廃止）。
- Theme/Plan の軽微なレイアウト統一（非破壊、段階適用）。
- Docs 更新: `docs/ui/structure.md` 補足、`docs/db/projects.md` 追加。

Acceptance Criteria
- `/workspace` 訪問時に `/theme` へ遷移する。
- Theme/Plan 双方で Project 単位の実行が明確（ヘッダーのピッカー、SSEログ、履歴保存）。
- 主要導線が Theme/Plan の2ページ中心で理解できる。

Dependencies
- 104 UI Foundation / 101 Plan Workflow / 108 Scholarly。

Notes
- 本タスクでは機能の削除は行わず、リダイレクトとレイアウト共有を優先。Evidence パネル/RAG 注入は別エピック。
