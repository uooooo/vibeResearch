# vibeResearch：要件定義・設計メモ（統合版 v1.0）

> **目的**：本ドキュメント単体で、アプリのビジョン／要件／アーキテクチャ／実装計画／評価指標／拡張方針（将来の「分析実行」含む）を把握できるようにする。

---

## 0. ビジョン / 価値仮説

- **ビジョン**：人間とAIが並走し、研究の **(1) テーマ探索 → (2) 研究計画策定 → (3) 構造化アウトプット生成** を高速化・高品質化する“Research Copilot”。
    
- **初期ドメイン**：経済学 / AI / Crypto /（他分野への将来拡張可能な設計）。
    
- **価値仮説**：テーマ探索〜計画草案のリードタイムを**2–4週間→48時間以内**へ短縮。RAGの再現率（Recall@10）**≥ 0.8**、nDCG@5 **≥ 0.75** を目安。
    
- **差別化**：読解支援中心の既存ツールと異なり、**「研究テーマ創出 / リサーチクエスチョンの発見・分析」「計画策定 / 検証可能な計画への落とし込み」「（将来）分析の実行まで並走」** にフォーカス。
    

---

## 1. スコープ / 非スコープ

### スコープ（IN）

- テーマ探索（研究ギャップの同定、候補提示、根拠の付与）。
    
- 研究計画の策定（RQ/仮説/データ/手法/識別戦略/検証/倫理）。
    
- 構造化アウトプット（Markdown + 参考文献CSL）生成。
    
- **将来拡張としての「分析の実行」**：
    
    - データ取得はユーザーが行うが、**コーディングと実行はエージェントと並走**。
        
    - v1では未実装。**拡張性を確保**し、後続マイルストーンのIssueとして保留。
        

### 非スコープ（OUT）

- 完全自動の論文執筆（LaTeX最終原稿の自動完成）。
    
- 本番運用の重計算インフラ（GPU大規模訓練等）の提供。
    

---

## 2. ターゲットユーザー / ユースケース

- **ペルソナ**：大学院生・助手・実務研究者（英語論文・数式・コードに耐性）。
    
- **UC-01** 分野キーワード→3–5件の新規性あるテーマ候補（根拠付き）。
    
- **UC-02** 候補比較（新規性/実行可能性/データ可用性/リスク）スコア化。
    
- **UC-03** 選択テーマ→研究計画テンプレ充足（編集→再生成）。
    
- **UC-04** 関連データ源の提示（FRED, HF Datasets, Dune 等）。
    
- **UC-05** Markdown + 参考文献（APA/MLA/CSL）出力。
    
- **UC-06** `.suspend()`で重要分岐点でユーザー確認→`.resume()`で続行。
    
- **UC-07（将来）** 分析コード生成→サンドボックス実行→結果・図表の取得。
    

---

## 3. 競合・ベンチマークと差別化

- **ベンチマーク**：SciSpace ほか（学術読解・要約・引用管理）。
    
- **示唆**：PDF解析は**複数パーサ**（例：Grobid / PyMuPDF 等）の組合せ、  
    セクション単位のチャンク化・構造重み付けが精度を押し上げる。
    
- **差別化**：当プロダクトは**研究テーマ創出／計画化／（将来）分析実行**を第一級機能として設計。
    

---

## 4. 技術スタック（決定事項）

- **アプリ**：Next.js（App Router） / TypeScript
    
- **UI**：Tailwind CSS / shadcn/ui / Vercel AI SDK（ストリーミング）
    
- **バックエンド**：Next.js API Routes（/api/runs/*）
    
- **DB**：Supabase（PostgreSQL + pgvector, Storage, Auth, RLS）
    
- **エージェント基盤**：**Mastra**（第一候補）
    
    - 採用理由：TypeScriptネイティブ、Vercel AI SDK親和、`.suspend()`/`.resume()`、評価・DXが優れる。
        
- **RAG補助**：LlamaIndex.ts（高度化時に一部採用可）
    
- **デプロイ**：Vercel
    
- **LLM**：OpenAI / Google AI（用途で切替）
    
- **外部学術API**：arXiv / Semantic Scholar（必要に応じCrossref等）
    
- **任意Web/学術検索**：Perplexity等（利用条件次第でTool化）
    

> **補足**：LangChain.jsは比較検討済み。TS/Next.js親和性・中断再開・UIストリーミングの体験でMastra優位。

---

## 5. 全体アーキテクチャ

```
+---------------------------------------------------------------+
|                        Frontend (Next.js)                    |
|  React + shadcn/ui + Vercel AI SDK (SSE/stream)              |
+----------------------------|----------------------------------+
                             | POST /api/runs/start (stream)
                             v
+----------------------------+----------------------------------+
|               Backend (Next.js API Routes)                    |
|  /api/runs/start  /api/runs/{id}/resume  /api/runs/{id}/log   |
+----------------------------|----------------------------------+
                             | instantiate/run
                             v
+---------------------------------------------------------------+
|                         Mastra Core                           |
|  Agent(ThemeFinder) / Workflow(ResearchPlan, Export)          |
|  Memory / Tools / Policies / .suspend() .resume()             |
+---------+------------------------------+----------------------+
          |                              |                      
          | Tools: RAG                   | Tools: Scholarly     | Tools: LLM
          v                              v                      v
+-----------------------+     +-----------------------+    +-----------------+
| Supabase (pgvector)   |     | arXiv / SemScholar    |    | OpenAI / Google |
| documents/chunks      |     | search/metadata       |    | completion/json |
+-----------------------+     +-----------------------+    +-----------------+
          |
          |  persist artifacts / runs / citations / plans
          v
+-----------------------+  Supabase Postgres + Storage (RLS)   +--------------+
| projects/runs/plans   |<------------------------------------>|  Dashboard   |
+-----------------------+                                       +--------------+
```

### 将来拡張：分析実行レイヤ

```
Frontend (UI: Notebook/Console)
  └─> /api/jobs/submit  ─> Job Orchestrator (queue) ─> Sandbox Runner
                                          └─> Logs/Artifacts → Supabase Storage
                                          └─> Status Events (SSE) → UI
```

- **Sandbox Runner**：軽量コンテナ/WASM等でPython/R/Juliaを実行（ネットワーク/CPU/メモリ制限）。
    
- **Artifacts**：図表（PNG/SVG）、CSV、Notebook、stdout/stderr を保存・可視化。
    
- **セキュリティ**：ユーザ空間の分離、外部ネットワークの制限、依存のホワイトリスト。
    

---

## 6. 主要シーケンス

### 6.1 テーマ探索（現行）

```
UI → POST /api/runs/start(kind:"theme", input)
  → Mastra Agent(ThemeFinder)
    → Tool: RAG (pgvector) / Scholarly API / Web
    → LLM: ギャップ分析
    → stream: progress/hits/summaries
    → stream: choice(theme_candidates)
    → .suspend() （ユーザー選択）
UI → POST /api/runs/{id}/resume(answers)
  → 追加要約・比較表 → 保存 → done
```

### 6.2 研究計画ワークフロー（現行）

```
UI → start(kind:"plan", theme_id)
  → Workflow: ExtractMethods → DraftPlan → .suspend()(review)
  → resume(feedback) → FinalizePlan → 保存・出力
```

### 6.3 分析実行（将来）

```
UI: データ(ユーザー提供)選択 → "分析を実行"
  → /api/jobs/submit(analysis_spec, code_cells)
  → Orchestrator: キュー投入 → Sandbox Runner
  → stream: logs/metrics/artifacts → UI
  → 完了後: resultsメタ + アーティファクト保存 → RAGにも登録可
```

---

## 7. データモデル（最小核/RLS前提）

- `projects(id, owner_id, title, domain, created_at)`
    
- `documents(id, project_id, source_type, url, doi, sha256, metadata_json)`
    
- `chunks(id, document_id, section, start, end, text, text_hash, embedding vector)`
    
- `plans(id, project_id, yaml_json, version, created_at)`
    
- `runs(id, project_id, kind, model, status, started_at, ended_at, cost_usd)`
    
- `tool_invocations(id, run_id, tool, args_json, result_meta, latency_ms)`
    
- `citations(id, project_id, claim_id, paper_id, section, start, end, passage_hash)`
    
- `results(id, project_id, run_id, type, uri, meta_json, created_at)` ←（将来：分析成果物）
    

> **RLS**：`projects.owner_id = auth.uid()` を起点に子テーブルを参照制御。

---

## 8. RAGパイプライン

- **取込**：PDF/URL→テキスト抽出（将来：Grobid等との多段）→正規化。
    
- **チャンク**：セクション優先（Abstract/Intro/Method/Results/Disc/Ref）。
    
- **埋め込み**：pgvectorに保存（セクションやDOI等メタを付帯）。
    
- **検索**：ベクトル + BM25ハイブリッド → 低コストLLMで再ランキング。
    
- **出力**：各主張に出典（paper_id/section/offset/hash）必須。
    
- **キャッシュ**：内容ハッシュ単位で要約/抽出を再利用。
    

---

## 9. エージェント/ワークフロー（Mastra）

### 9.1 フェーズ別の実装パターン

- **テーマ探索**：`Agent(ThemeFinderAgent)`
    
    - Tools: `rag.search`, `scholar.search`, `web.search`
        
    - Memory: 対話履歴 / 候補メモ / 選好
        
    - Policy: `max_steps=8`, `max_tool_calls=10`, `budget_usd=1.0`
        
    - 中断・再開：候補提示後に`.suspend()`で選択/再探索分岐。
        
- **研究計画**：`Workflow(ResearchPlanWorkflow)`
    
    - Steps: `ExtractMethods` → `DraftPlan` → `.suspend()(review)` → `Finalize`
        
    - 失敗時フォールバック：スケルトン計画（見出しのみ）を暫定提示。
        
- **アウトプット生成**：`Workflow(MarkdownExportWorkflow)`
    
    - `GatherAllData`→`FormatMarkdown(テンプレ)`→`CSL出力`。
        
- **（将来）分析実行**：`Workflow(AnalysisRunWorkflow)`
    
    - Steps: `SpecBuild`（RQ→コード骨子）→ `.suspend()`（変数・パス確認）→  
        `SubmitJob`（Orchestratorへ）→ `StreamLogs` → `CollectArtifacts`。
        

### 9.2 プロンプトテンプレ（抜粋）

**ThemeFinder（System）**

```
あなたは研究戦略家『Metis』。次の順序で推論：
1) Consensus: 当該分野の合意事項を3行に要約（出典付）
2) Conflict: 矛盾・未解決点を列挙（各行に出典ID）
3) Proposals: 3–5件のテーマ案（新規性/検証可能性/主要出典）
確証度(High/Med/Low)を各主張に付す。出典なしの断定は禁止。
```

**Methods抽出（Task）**

```
Methodologyテキストから厳密JSONを抽出：
{ research_questions[], hypotheses[], data_source{}, analytical_model{}, validation_technique, limitations }
無ければ null。過剰説明なし。
```

**計画整形（Task）**

```
査読者チェックリスト（RQ可検証性/識別戦略整合/データ適合/倫理）に照らして自己評価(Yes/No+根拠)を末尾に付す。
```

---

## 10. API契約（サンプル）

- `POST /api/runs/start`
    
    - **req** `{ project_id, kind:"theme"|"plan"|"export", input, model?, budget? }`
        
    - **res (SSE/Stream)** `{ type: "progress"|"choice"|"await"|"error"|"done", payload }`
        
- `POST /api/runs/{id}/resume`
    
    - **req** `{ answers, cursor? }`
        
    - **res (Stream)** 進捗の続き。
        
- `POST /api/jobs/submit`（将来：分析実行）
    
    - **req** `{ project_id, analysis_spec, code_cells[], resources?, budget? }`
        
    - **res** `{ job_id }` → 別SSEで`/api/jobs/{id}/events`
        

---

## 11. 非機能要件（NFR）

- **性能**：初回ヒット提示まで p90 ≤ 8秒（キャッシュ有）。
    
- **可用性**：βでSLA 99.5%を目安。
    
- **セキュリティ/プライバシ**：プロジェクト単位のRLS。出典付きで透明性確保。
    
- **コスト**：リクエスト上限（トークン/Tool回数/予算）。モデル切替とキャッシュで最小化。
    
- **監査性**：Run Log（モデル/温度/プロンプト/出力/ツール呼出/コスト）。
    
- **法令/ライセンス**：API ToS順守。全文保存はユーザーアップロードのみ。
    

---

## 12. 監視・コスト管理

- **メトリクス**：RAG nDCG/Recall、平均応答時間、失敗率、平均コスト/プロジェクト。
    
- **ダッシュボード**：Run/Tool単位のログとコスト内訳。
    
- **ガードレール**：`budget_usd`・`max_steps`超過で`.suspend()`し続行可否を問い合わせ。
    

---

## 13. リスクと対策

- **サーバレスの実行時間制限**：SSEで即応。長時間はジョブキュー（将来：分析実行）へ委譲。
    
- **外部APIレート/失敗**：指数バックオフ、複数経路、キャッシュ、縮退（内部RAGのみ）。
    
- **RAG精度**：セクション重み/ハイブリッド検索/LLM再ランキング/評価セット運用。
    
- **幻覚**：出典必須・確証度ラベル・UIで「非確証」バッジ表示。
    
- **コスト膨張**：思考/Tool上限、安価モデルでスクリーニング、再利用キャッシュ。
    
- **分析実行の安全性（将来）**：サンドボックス、ネットワーク封鎖、依存のホワイトリスト、CPU/メモリ制限、ファイルI/O隔離。
    

---

## 14. 開発ロードマップ（DoD付）

- **MS0：基盤（1週）** 認証/プロジェクトCRUD/RLS/Run Logスキーマ。
    
    - DoD：空Runを作成しログが保存される。
        
- **MS1：RAG PoC（1–2週）** PDF取込→チャンク→pgvector検索API。
    
    - DoD：Top-5が妥当（nDCG@5 ≥ 0.6）。
        
- **MS2：テーマ探索Agent（2週）** Mastra + Tools + ストリーミング + `.suspend()`。
    
    - DoD：3–5案＋根拠提示→選択→保存。
        
- **MS3：研究計画Workflow（2週）** 抽出→草案→レビュー→確定。
    
    - DoD：テンプレ全項目が往復編集可。
        
- **MS4：アウトプット生成（1週）** Markdown + CSL出力、モニタリング。
    
    - DoD：E2Eで1プロジェクト完走、KPI計測可。
        
- **MS5：分析実行 α（将来 2–3週）** Job API雛形、Sandbox Runner(最小)、ログ/アーティファクト保存。
    
    - DoD：簡単な集計/回帰のコードがサンドボックスで実行され、結果がストレージに残る。
        
- **MS6：分析実行 β（将来 3–4週）** Notebook風UI、依存解決、結果の再現性（envロック）。
    
    - DoD：計画→コード→実行→図表→レポに反映まで往復可能。
        

---

## 15. UI 概要

- **Dashboard**：プロジェクト一覧、コスト/KPI概要。
    
- **Explorer**：イベントログ＋候補パネル＋比較表。`.suspend()`入力UI。
    
- **Planner**：計画テンプレ編集＋差分表示（再生成とマージ）。
    
- **Exporter**：Markdown/CSLプレビュー＆DL。
    
- **（将来）Runner**：Notebook/Console、ログ/図表/成果物ビュー。
    

---

## 16. 出力テンプレ（Markdown）

```markdown
---
title: "<テーマ>"
authors: ["<User>"]
domain: "economics|ai|crypto"
version: 1
---
# Research Question
...
# Literature Gap (with citations)
- ... [paper_id]
# Plan
## Data
## Method
## Identification / Validation
## Ethics
# References (CSL)
```

---

## 17. オフライン評価

- **RAG**：nDCG@5 / Recall@10（小規模ゴールドセットをドメイン別に作成）。
    
- **要約品質**：ROUGE-L + 人手評価（Faithfulness）。
    
- **計画妥当性**：チェックリスト（識別戦略の一貫性、データ適合）。
    
- **A/B**：プロンプト/ツール順序/モデル切替の比較（Mastraのログを活用）。
    

---

## 18. オープンな設計判断（要決定）

- 学術APIの優先度と予算配分（arXiv / Semantic Scholar 等）。
    
- PDF解析の多段化（βは軽量→安定後にGrobid等を導入）。
    
- 分析実行のランタイム（WASM/軽量コンテナ）と依存解決方式（envロック）。
    
- 評価ゴールドセットの作成・更新プロセス（責任者/頻度）。
    

---

## 19. 参考：検索戦略（分野別の初期方針）

- **AI**：arXiv API / Papers with Code / （任意）Perplexity Academic。
    
- **Crypto**：arXiv / 研究機関レポート / Semantic Scholar / Elicit（利用条件次第）。
    
- **経済学**：既存ジャーナル/ワーキングペーパー（Semantic Scholar / arXiv / Elicit等）。
    

---

## 20. Issue バックログ（抜粋：分析実行向け）

1. **Job Orchestrator**：キュー / リトライ / タイムアウト / 予算上限。
    
2. **Sandbox Runner**：python:3.x ベース / CPU, Mem, FS 制限 / ネット制限。
    
3. **Artifacts スキーマ**：図表/CSV/Notebook/ログの保存規約。
    
4. **Env ロック**：依存リスト（`pip freeze` or `uv`), ハッシュで再現性確保。
    
5. **UI Runner**：Notebook風エディタ、セル実行、ログ/図表ビューア。
    
6. **セキュリティ**：ユーザごとの分離、外部アクセス制限、秘密情報の扱い。
    
7. **RAG連携**：分析結果の要約→内部コーパス化（再利用）。
    

---

### 結語

- 本統合メモは、初期メモ＋改訂案を統合し、**現行v1の実装**から**将来の分析実行**まで見通した設計を提示しました。まずは **MS1→MS2** を短サイクルで完了し、RAG評価とコスト可視化を先行させることを推奨します。