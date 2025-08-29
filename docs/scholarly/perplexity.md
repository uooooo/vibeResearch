# Perplexity Integration (v0.5)

目的
- Theme 候補生成時に、最新動向/洞察の短い要約（2–4 bullets）を補助情報として提示する。
- 既存の Scholarly (Semantic Scholar → arXiv) タイトル群を補完し、候補の筋の良さ評価を助ける。

範囲（v0.5）
- 対象: Theme の候補生成フェーズのみ（Plan では未使用）。
- 出力: 箇条書き（最大4行）。出典やCSLは含めない（誤引用防止）。
- UI: Theme ページ左側に小さな「Insights」カードとして表示。SSEで受信。
- ゲート: `USE_PERPLEXITY=1` かつ `PERPLEXITY_API_KEY` が設定されているときのみ実行。

API 仕様（Perplexity Chat Completions）
- Endpoint: `https://api.perplexity.ai/chat/completions`
- Auth: `Authorization: Bearer ${PERPLEXITY_API_KEY}` / `content-type: application/json`
- Model: `PERPLEXITY_MODEL`（省略時 `sonar-small-online` 等、環境で調整）
- Prompt 方針: system で JSON 指示、user にクエリ（domain/keywords/queryを結合）。
- 期待レスポンス: `{ bullets: string[] }`（fallback: テキストから行抽出）

実装詳細
- ライブラリ: `src/lib/tools/perplexity.ts`
  - `perplexitySummarize({ query, limit=3 }): Promise<{ bullets: string[]; latencyMs?: number }>`
  - 入出力は安全にパース（失敗時は空配列）。
- 起動点: `server/api/runs/start.ts` の Theme ルート（Mastra/プロバイダ双方の前段）
  - クエリ生成: `(query + keywords + domain)` をスペース連結
  - 成功時: SSE `{ type: 'insights', items: bullets }` を送出
  - Telemetry: `tool_invocations` に `perplexity.summarize` を記録（count/latency）
- UI: `app/theme/page.tsx` に `insights` 状態を追加し、`insights` イベントで更新
  - 左カラムの Progress 下に小カード `Insights` を表示

制限・ガード
- Rate limit は最低限（1 run あたり 1 コール）
- ネットワーク/エラー時は黙ってスキップ（UIは表示なし）
- 費用: モデル・トークンに依存。イベントログに latency を記録

将来（v1）
- Perplexity の出典（sources）情報が取得できる場合、CSL マッピングと併走
- Plan の Evidence パネルへの拡大
- キャッシュ（短期 TTL）とバックオフ実装

環境変数
- `USE_PERPLEXITY=1`
- `PERPLEXITY_API_KEY=...`
- `PERPLEXITY_MODEL=sonar-small-online`（任意）

