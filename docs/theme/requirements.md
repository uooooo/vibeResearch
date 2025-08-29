# Theme Exploration — Requirements & Design (v1)

目的（Mission）
- ユーザーが入力する領域/キーワード/自由記述を起点に、AIエージェントが論文情報を多面的に探索し、筋の良い研究テーマ候補を少数精鋭で提示する。
- 候補には根拠（Evidence）と要約（Insights）を伴わせ、比較・選択 → Plan へ自然に接続する。

スコープ（What/Why）
- 入力: Domain（任意）/ Keywords（任意）/ Free Query（任意）
- 出力: ThemeCandidate[]（title/summary/scores/evidence）
- 並列探索: 3系統を並列化し統合（後述）
  1) Provider Deep Research（OpenAI Deep Research / Perplexity Sonar Deep Research）
  2) Scholarly APIs（Semantic Scholar → arXiv）
  3) Local RAG（documents/chunks; v1ではオプトイン/後段）
- UI: /theme での入力→進捗→候補比較→選択（→/plan）

非スコープ（Not Now）
- PDFパーサー/全文取得の堅牢化（v1ではAbstract/metadata中心、PDFは将来）
- 高精度な引用整形（CSLはPlan側のExportで対応）

「筋の良いテーマ」の定義（最低限）
- Novelty: 既存研究との差別化（過度に既知ではない）
- Feasibility: データ/手法/識別戦略の実現可能性
- Signal: 論文のConclusion/Future Work/Limitationsに合致した拡張性
- Evidence: 根拠（論文タイトル/抜粋/メモ）が付くこと

データソース/アダプタ
- provider.deepResearch（抽象）
  - 実体: OpenAI Deep Research / Perplexity Research（まずはPerplexityを簡易実装、OpenAIは設計準備）
  - 出力: { bullets: string[], topics: string[]?, rationale?: string }
- scholarly.search（既存）
  - Semantic Scholar優先→arXivフォールバック
  - 出力: CSLライク（id/title/author/year/url/venue）
- rag.search（将来）
  - pgvectorを用いたハイブリッド検索
  - 出力: { content, score, document_id, section?, offset? }

アグリゲーション（融合）設計
- 正規化
  - 全入力を CandidateSeed に射影: { title, hints[], sources[] }
  - 重複判定: 正規化タイトル/埋め込み類似度（>0.86など）でmerge
- スコアリング
  - novelty_score:（scholarlyヒット類似度の低さ + providerの新規性言及）
  - feasibility_score:（データ/手法への言及の有無 + 論文数/近年性）
  - risk_score:（実現困難箇所の言及から推定）
  - rank = w1*novelty + w2*feasibility − w3*risk（wは環境/UIで後調整）
- 出力
  - 上位3〜5件を ThemeCandidate: { id, title, summary, novelty, feasibility, risk, evidence[] }
  - evidence: { kind: 'scholar'|'provider'|'rag', ref, snippet?, note? }

Conclusion/Future Workの扱い（v1）
- S2/ArXivからのメタ（abstract/tldr/venue/year）をLLMに渡し「未解決課題/拡張仮説」を抽出（短文化）。
- PDF全文は将来: openAccessPdfがあれば抽出試行→セクション抽出→LLMへ（v1では後回し）。

失敗時の戦略
- どれか1系統でも返れば候補生成を続行
- 3系統すべて0件→UIで再入力支援（サブドメイン/キーワード候補を提示）

API / SSE 契約（/api/runs/start kind="theme"）
- started: { runId? }
- progress: { message }
- insights: { items: string[] }（Perplexity/Provider由来の短い洞察）
- facets: { items: string[] }（入力曖昧時のサブドメイン候補; 将来）
- candidates: { items: ThemeCandidate[] }
- suspend: { reason: 'select_candidate' }

UI フロー（/theme）
- 入力（Domain/Keywords/Query）
- 追加オプション（Advanced）: Deep Research Provider 選択（perplexity/openai）、Top K（1–20）
- Progress（ログ + Insights）
- Candidate Comparison（候補カード + スコア + 根拠）
- 選択 → /plan（Workflowタブを既定）
- 再探索: 入力へ戻る/条件調整

データモデル（最小）
- runs（既存）
- tool_invocations（既存; model/latency）
- results: type='candidates'（候補保存）/ 'insights'（任意）
- documents/chunks（将来: RAG）

設定/フラグ
- 深掘りプロバイダ: `DEEP_RESEARCH_PROVIDER=perplexity|openai`（v1はperplexity優先）
- Perplexity: `USE_PERPLEXITY=1`, `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL`
- RAG: `USE_RAG=0`
- 上限件数: `THEME_TOP_K`（既定=10）
- 予算/タイムアウト: `BUDGET_THEME_USD`, `TIMEOUT_MS_THEME`

実装段階（提案）
- v1a: Provider(Perplexity)+Scholarlyの並列/統合（dedupe+ranker）
- v1b: 入力曖昧時のFaceting（LLMでサブドメイン候補→選択→再走）
- v1c: Conclusion/FutureWork抽出（S2メタ/abstractからのヒント抽出）
- v1d: RAG統合（任意）

監視/評価
- Latency/Cost（tool_invocations集計）
- 命中率と関連度（手動評価→task/109に記録）
- ラン/候補バリエーションの保存と復元（results）

オープン課題
- 重みwのチューニング方法（手動→A/B→学習）
- PDF抽出パイプライン（安定化/コスト）
- Provider APIの差異（コスト/規約）

備考（スコア式について）
- 初期スコア式 `rank = w1*novelty + w2*feasibility − w3*risk` は一般的な線形重み付けであり、厳密な標準ではない。まずは暫定重み（例: w1=0.45, w2=0.45, w3=0.10）で開始し、評価タスク（task/109）での人手判定やA/Bで更新していく方針とする。
