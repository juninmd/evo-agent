export type ReportPeriod =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "semester";

export interface EvidenceRecord {
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
}

export interface EditorialMetrics {
  considered: number;
  selected: number;
  rejected: number;
  buckets: Record<string, number>;
  primarySources: number;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  summary: string;
  tags: string[];
  date: string;
  sources: string[];
  evidence: EvidenceRecord[];
  editorialMetrics: EditorialMetrics;
  reportPeriod?: ReportPeriod;
}
