# UI Structure: Two-Page Flow (Theme / Plan)

目的
- 機能が点在してフローが見えづらい課題を解消し、利用者視点で「テーマ探索 → 計画策定」の二段フローを明確化する。

トップレベル構成
- Theme ページ（テーマ探索）: `/theme`
  - 入力: Domain / Keywords / Free query + Project 選択
  - 進行: SSE ログ（scholar_hits などの可視化）、候補カード表示、比較・選択
  - 中断: 候補提示後に `.suspend()`（選択待ち）
  - 再開: 選択後、Plan 下書き生成へ（Mastra またはプロバイダフォールバック）
  - 将来: Evidence パネル（scholarly/RAG ヒット一覧、簡易引用）
- Plan ページ（計画策定）: `/plan`
  - 表示: 現在の下書きプラン（編集可能セクション）+ 版管理（History）
  - ワークフロー: 「Generate Plan via Workflow (Review)」→ 下書き提示 → レビュー送信 → 最終化（diff 表示）
  - 保存: finalize 時に「Saved as new version（History参照）」のバナー表示
  - 将来: RAG/Scholarly 由来の引用を CSL として Export に含める

ナビゲーション指針
- ヘッダーに `GlobalProjectPicker` を常設（Theme/Plan 双方から同じプロジェクトを切替可能）。
- トップナビは最小限（Theme / Plan / Projects）。Export は Plan 内（もしくは Theme 結果内）のボタンとして配置。
- Home（`/`）は軽量（説明＋CTA）とし、主要導線は `/theme` と `/plan`。

イベント／API 対応（既存に合わせる）
- Theme → `POST /api/runs/start { kind: "theme" }`（SSE: started/progress/candidates/suspend）
- Plan → `POST /api/runs/start { kind: "plan" }`（SSE: started/review/suspend）→ `POST /api/runs/{id}/resume`（review送信→finalize）
- Observability（将来）: ヘッダーまたは設定からツール実行ログ（model/latency）へ遷移。

UI 文言（マイクロコピー）
- Theme: 「Generate Theme Candidates」→ 「Compare & Select」→ 「Continue to Plan」
- Plan: 「Generate Plan via Workflow (Review)」→ 「Submit Review」→ 「Finalize & Save as Version」
- Finalize 後: 「Saved as new version（see History）」を表示。

段階導入と影響
- `/workspace` は廃止（ルート削除）。
- 既存の `/theme` `/plan` ページを中核に据え、レイアウトを共有（Workspace風の左右2カラム）。
- Projects は補助導線として維持。Export は Plan 内のアクションとして露出。
- RAG は v1 で Evidence パネルと一緒に注入（`USE_RAG=1` のとき）。

更新履歴
- 2025-08-29 初版（二ページ構成の明文化）。

---

補足: 2つのエントリーフローと Project の意味

二つのコア機能の動線
- パスA（テーマ探索→計画）
  - `/theme` でテーマ候補を探索・比較・選択 → `.suspend()` 後の `resume` で草案作成 → `/plan` に遷移して編集/最終化。
- パスB（テーマは決まっている→計画のみ）
  - `/plan` でタイトル（=テーマ）を入力 → 「Generate Plan via Workflow (Review)」で下書き生成 → レビュー送信→最終化。
  - 将来: `/plan` から `scholar.search` を軽く叩いて参考文献ヒントを表示（Evidenceパネルはオプション）。

Project とは
- スコープ: ひとつの研究テーマ/計画と関連データ（runs, plans, documents/chunks, citations, results, tool_invocations）を束ねる単位。
- セキュリティ: Supabase RLS で `projects.owner_id = auth.uid()` により所有者だけが参照/更新可。
- 利用箇所: `/theme` と `/plan` の両方で `GlobalProjectPicker` により選択。APIは `projectId` を受け取り結果/ログをそのプロジェクトに紐づけ保存。
- 推奨運用: 「1テーマ/研究トラックにつき1プロジェクト」。同一プロジェクト内で候補比較→選定→Plan最終化まで完結。別テーマにスイッチする場合は新規プロジェクトを作成。

設計の妥当性メモ
- 二ページ構成はユーザーのメンタルモデル（テーマ探索と計画策定）に一致し、導線と保存先（プロジェクト）を明確にする。
- `/workspace` のチャット風UIは「見せ方」としては良いが、フロー上は `/theme` へ集約し、スタイル/レイアウトを共有する。
- これにより重複実装を避け、ログ/履歴/Evidence等の可視化も一本化できる。
