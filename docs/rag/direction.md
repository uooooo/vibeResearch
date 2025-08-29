# RAG Direction and Scope (Theme-first)

目的
- テーマ探索と計画策定の品質を上げるための根拠情報（snippets/citations）を提供する。
- まずは「外部APIによる最新論文探索」を主軸に据え、ローカルRAG（自前コーパス）の構築は段階導入する。

基本方針（並行アプローチの整理）
- A) ローカルRAG（自前学術コーパス）
  - 対象: 経済学 / AI / Crypto の論文本文（将来はPDF/URL取込→正規化→チャンク→pgvector）。
  - 用途: Mastra Agent の deep research を自前コーパスに対して行い、Future work/Limitations からテーマ抽出。
  - 現状: 時間がかかるため段階導入に切替（v1 で対応）。
- B) 外部APIディープリサーチ（優先）
  - 対象: Semantic Scholar（既存）, arXiv（既存）, Perplexity API（追加予定）。
  - 用途: 最新の論文探索をAPIで行い、タイトル/要旨/メタを Mastra の candidate 生成時に提示・要約。
  - 現状: scholarly 検索は導入済み。Perplexity は未導入。

当面の決定（v0 → v0.5）
- v0（現状）
  - Theme 候補生成は外部API（Semantic Scholar→arXiv フォールバック）を用いる。
  - RAG（pgvector）はデータモデルのみ用意。プロンプトへの注入はオフ（`USE_RAG=0` デフォルト）。
- v0.5（短期強化）
  - Perplexity API を scholarly レイヤーに追加（並列/バックフィル）。
  - 使用箇所はまず Theme の候補生成ステップに限定（Plan では未使用）。
  - Theme 候補提示に「関連論文・トピックの要旨」セクションを付与（証拠性向上）。
- v1（段階導入）
  - Ingest: URL/PDF→テキスト抽出→正規化→チャンク（段落＋~1k chars）→埋め込み。
  - Search: keyword + vector（pgvector）ハイブリッド。プロンプト注入は `USE_RAG=1` で有効化。
  - Provenance: 参照した chunks→documents.metadata を CSL へマッピングし、Export に含める。

データモデル（Supabase）
- `documents(id, project_id, title, source_url, metadata jsonb)`
- `chunks(id, document_id, idx/section/start/end, text, text_hash, embedding vector(1536))`
- RLS は `projects.owner_id` に連動。プライベートコーパスとして管理。

フラグ / 環境変数
- `USE_RAG` : 0=オフ（既定）, 1=RAGコンテキストを Theme で使用。
- `OPENAI_API_KEY` : v1 の埋め込み計算に使用（`text-embedding-3-small` を想定）。
- `PERPLEXITY_API_KEY` : scholarly レイヤー強化用（v0.5）。

Theme での使い方（段階）
- v0: `scholar.search` の結果（タイトル上位）をプロンプトに補助文として添付（start.ts 既存実装）。
- v0.5: Perplexity から要約/関連トピックを追加して、候補の筋の良さ評価を強化。
- v1: `rag.search`（ハイブリッド）上位スニペットを短い引用として注入。`rag_hits` をログ出力し Evidence パネルで確認可能にする。

Plan での使い方（将来）
- セクション再生成やレビュー反映時に、関連スニペットを追加コンテキストとして利用（デフォルトはオフにし、十分な評価後にオン）。
- Export 時に CSL 参照として出力（RAG/Scholarly の両系統に対応）。

受入基準（各段階）
- v0: Theme 候補生成で `scholar_hits` のログが表示され、候補の質が向上していること。
- v0.5: Perplexity 統合で最新性向上と要約が提示されること（レイテンシとコストを記録）。
- v1: `rag.search` が keyword+vector を返し、使用スニペットが CSL へ正しく写像され Export に反映されること。

実装タスク（対応する task/*）
- 108 エピック（scholarly & enrichment）
  - Semantic Scholar / arXiv: 済（最小）
  - Perplexity: 追加（v0.5）
- 102 エピック（RAG 基礎）
  - Ingest / Chunk / Embedding / Search: v1 で導入。
  - Evidence パネル / CSL: v1 で導入。

未決事項（要合意）
- Perplexity の利用範囲（テーマ候補生成のみ or プラン草案補助にも使用するか）。
- URL/PDF 取込の優先度（手貼りテキスト先行で良いか）。
- チャンク戦略（段落優先 + サイズ上限で開始／後で見出し・セマンティック分割導入）。

影響範囲
- 現状のコードは scholarly ベースで稼働済み。RAG は非活性化のため既存フローに影響なし。
- v0.5 追加は `lib/tools/scholar.ts` への Perplexity 統合が中心。UI は Theme ログ/候補表示を小幅強化。

更新履歴
- 2025-08-29 初版（A/B 並行のうち B を優先、A は段階導入）。
