// frontend/src/db/: アプリが利用する型とユーティリティです。
// 現在は手書きの型がありますが、DBから直接型を生成することで、
// これを100%同期させることができます

export type ID = string;

export interface Project {
  id: ID;
  owner_id: ID;
  title: string;
  domain?: "economics" | "ai" | "crypto" | string;
  created_at: string; // ISO8601
}

export interface Document {
  id: ID;
  project_id: ID;
  source_type: "pdf" | "url" | "note" | string;
  url?: string;
  doi?: string;
  sha256?: string;
  metadata_json?: Record<string, unknown>;
}

export interface Chunk {
  id: ID;
  document_id: ID;
  section?: string; // Abstract/Intro/Method/Results/Discussion/Ref etc.
  start?: number;
  end?: number;
  text: string;
  text_hash?: string;
  embedding?: number[]; // pgvector
}

export interface Plan {
  id: ID;
  project_id: ID;
  yaml_json: unknown; // YAML or JSON representation of the plan
  version?: string;
  created_at: string; // ISO8601
}

export interface Run {
  id: ID;
  project_id: ID;
  kind: "theme" | "plan" | string;
  model?: string;
  status: "pending" | "running" | "suspended" | "done" | "failed" | string;
  started_at?: string;
  ended_at?: string;
  cost_usd?: number;
}

export interface ToolInvocation {
  id: ID;
  run_id: ID;
  tool: string;
  args_json?: Record<string, unknown>;
  result_meta?: Record<string, unknown>;
  latency_ms?: number;
}

export interface Citation {
  id: ID;
  project_id: ID;
  claim_id?: ID; // optional logical grouping
  paper_id?: ID | string; // external id
  section?: string;
  start?: number;
  end?: number;
  passage_hash?: string;
}

export interface Result {
  id: ID;
  project_id: ID;
  run_id?: ID;
  type: "markdown" | "csl" | "figure" | "csv" | "notebook" | string;
  uri: string; // Supabase Storage or external URI
  meta_json?: Record<string, unknown>;
  created_at: string; // ISO8601
}

export interface RunCandidate {
  id: ID;
  run_id: ID;
  title: string;
  novelty?: number;
  risk?: number;
  created_at?: string; // ISO8601
}
