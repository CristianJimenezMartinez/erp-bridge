export interface TocItem {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface DocArticle {
  slug: string; // e.g. "primeros-pasos/requisitos-del-sistema"
  categorySlug: string; // e.g. "primeros-pasos"
  title: string;
  subtitle: string;
  badge: string;
  readingTime: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  toc: TocItem[];
  contentHtml: string;
  relatedSlugs?: string[];
}

export interface DocCategory {
  slug: string;
  title: string;
  icon: string;
  description: string;
  order: number;
}
