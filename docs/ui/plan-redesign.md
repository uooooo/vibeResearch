# Plan UI Redesign (v2)

目的
- Plan ページを「編集に集中」「ワークフローの見通し」「履歴と書き出しの明確化」に再設計し、Theme と分離された分かりやすい UX にする。

前提とゴール
- 2つの入口に最適化：
  - A) Theme から遷移して草案を整える（自動ドラフト → レビュー → 最終化）
  - B) 既にテーマが決まっており、手動/半自動で計画を作成する
- Mastra の suspend/resume を自然に扱い、レビューと差分確認が迷子にならない
- 編集（Editor）とワークフロー（Workflow）の関心を分け、History/Export を見つけやすくする

情報設計（タブ+サイドパネル）
- 上部タブ（Radix Tabs 想定）
  - Editor: 計画の編集に集中（セクション編集、Save、軽い再生成）
  - Workflow: 生成・レビュー・差分・ログ（進行中はここをデフォルトに）
  - History: バージョン履歴（復元・差分比較）
- 右パネル（全タブ共通、状況に応じて切替）
  - Guidance: 操作ガイド/チェックリスト（初期状態）
  - Evidence: RAG/Scholarly の軽量エビデンス（v0.5 では Perplexity のタイトル+要約）
  - Logs/Diff: Workflow 実行時はここにログと差分のスナップショット

レイアウト
- ヘッダー: Title + ProjectPicker + アクション（Export は Editor/History からも可）
- メイン: Tabs（Editor/Workflow/History）
  - Editor
    - 左: セクションアウトライン（RQ/Hypothesis/Data/Methods/Identification/Validation/Ethics）
    - 中央: 選択セクションのエディタ（タイトルは上部固定）
    - 右: Guidance/Evidence（RAGがONのとき表示）
    - 下部: Save、Regenerate（セクション単位）、バリデーション（必須フィールド）
  - Workflow
    - 左: CTA（Generate Plan via Workflow）、レビュー入力（テキストエリア）
    - 中央: Draftプレビュー（読み取り専用フィールド）
    - 右: Logs（進行順）、Diff（前→後）
  - History
    - 一覧（作成日時/タイトル/ステータス）
    - アクション: Restore as new draft, Compare with current（差分）

主要フロー
- A) Theme → Plan
  1. Theme で候補を選択 → resume → 自動ドラフトを保存
  2. Plan へ遷移（Workflow タブをアクティブ）
  3. Draft 確認 → Review 送信 → Diff 確認 → Finalize → Editor に内容を反映
- B) Plan only
  1. Editor タブからタイトル/RQなどを入力 → Save
  2. 必要に応じ Workflow タブで生成/リファインを使用 → Diff 確認 → 反映

マイクロコピー（例）
- Editor
  - Save Plan / Saved as new version (see History)
  - Regenerate section (keeps your edits; saves as a new version)
- Workflow
  - Generate Plan via Workflow (Review)
  - Review comments or requested changes
  - Finalized via workflow. Saved as new version (see History)
- History
  - No history yet
  - Restore this version as a new draft

ワイヤーフレーム（テキスト）
- Header
  [Research Plan   | ProjectPicker ] [ Export ▼ ]

- Tabs: [ Editor ] [ Workflow ] [ History ]

- Editor
  | Outline |   Section Editor (Title fixed at top; section below)   |  Guidance/Evidence |
  |  RQ     |   [textarea]                                           |  – Perplexity hits |
  |  Hypo   |   [Regenerate] [Save]                                  |  – Scholar titles  |

- Workflow
  | CTA + Review |     Draft Preview (read-only cards)     | Logs + Diff |
  | [Generate]   |  Title/RQ/Hypo/Data/…                  |  • fetching…|
  | [Submit rev] |                                        |  Changes:    |

- History
  [ 2025-08-30 12:03 draft ]  [Restore] [Compare]

アクセシビリティ/バリデーション
- 必須: Title, RQ（Editorでラベルにエラー表示）
- 操作説明: Guidanceカードに常に短い説明
- キーボード: Ctrl/Cmd+S で Save（将来）

実装方針（段階導入）
- v2a（骨組み）
  - Tabs を導入（Editor/Workflow/History）
  - Editor: アウトライン + セクションエディタ（既存フォームを分割）
  - Workflow: 既存の開始/ログ/ドラフト/レビューブロックをタブへ移設
  - History: 既存の一覧をタブへ移設
- v2b（快適性）
  - 右パネルの Guidance/Evidence 切替（Evidence は Perplexity後）
  - Diff 表示のスタイル改善
  - Export ボタンをヘッダーのアクションへ昇格
- v2c（仕上げ）
  - 差分比較（History vs Current）
  - ショートカット、軽量トースト

依存
- 108（Perplexity v0.5）: Evidence ブロック
- 102（RAG v1）: RAG Evidence と CSL 連携

リスク
- 大きなレイアウト変更による一時的な混乱 → タブ/ガイダンスで補う
- 将来のRAG注入で右パネルが混む → Guidance/Evidence/Logs をタブ化可能にして回避

受入基準
- Editor/Workflow/History のタブで機能が明確に分離
- Theme→Plan 遷移時は Workflow タブがアクティブでドラフトが見える
- 保存/再生成/レビュー/最終化/履歴復元が迷いなく実行できる

