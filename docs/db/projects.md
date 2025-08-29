# Projects: Concept and Usage

概要
- `projects` は研究単位のコンテナです。テーマ探索、計画、RAGドキュメント、実行ログなどを同一スコープで管理します。

リレーション（主要）
- `projects` 1 ── n `runs`: `/api/runs/start` に `projectId` を渡した場合に紐づく実行。
- `projects` 1 ── n `plans`: 計画のバージョン管理（下書き/最終化）。
- `projects` 1 ── n `documents` 1 ── n `chunks`: RAG取込のコンテンツ。
- `projects` 1 ── n `results` / `citations` / `tool_invocations`: 生成物・参照・ツール実行の記録。

セキュリティ
- Supabase RLS で `projects.owner_id = auth.uid()` を基準にスコープするため、所有者のみが閲覧/編集可能。

UI での扱い
- ヘッダーの `GlobalProjectPicker` で現在のプロジェクトを選択。
- Theme/Plan ともに選択中の `projectId` を用いて実行・保存を行う。

よくある質問
- Q: プロジェクトは1テーマ=1つが原則？
  - A: 推奨は「1テーマ/研究トラックにつき1プロジェクト」。Theme探索→Plan→Exportまでが一塊。
- Q: 複数テーマ案を比較したい場合？
  - A: 同一プロジェクト内に候補/ログを残すか、テーマ毎に分けて作成（後者は履歴の分離が明確）。

関連スキーマ
- 参照: `docs/db/schema.sql`（`projects`, `runs`, `plans`, `documents`, `chunks`, …）。

更新履歴
- 2025-08-29 初版。

