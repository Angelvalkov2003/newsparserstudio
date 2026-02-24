export interface MetadataItem {
  name: string;
  url?: string;
}

export interface ArticleMetadata {
  title: string;
  document_date?: string;
  authors: MetadataItem[];
  categories: MetadataItem[];
  tags: MetadataItem[];
}

export interface ComponentBase {
  id: string;
  type: string;
}

export interface HeadingComponent extends ComponentBase {
  type: "heading";
  text: string;
  level?: number;
}

export interface ParagraphComponent extends ComponentBase {
  type: "paragraph";
  text: string;
}

export interface ImageComponent extends ComponentBase {
  type: "image";
  url?: string;
  caption?: string;
  description?: string;
  link_url?: string;
}

export interface LinkComponent extends ComponentBase {
  type: "link";
  text: string;
  url: string;
}

export interface CodeBlockComponent extends ComponentBase {
  type: "code_block";
  code: string;
  language?: string;
}

export interface EquationComponent extends ComponentBase {
  type: "equation";
  latex: string;
  equation_number?: number;
}

export interface CitationComponent extends ComponentBase {
  type: "citation";
  citation_text: string;
  author_text?: string;
}

export interface FootnoteComponent extends ComponentBase {
  type: "footnote";
  identifier: string;
  content: string;
}

export interface HorizontalRulerComponent extends ComponentBase {
  type: "horizontal_ruler";
}

export interface ListItemComponent {
  indent: number;
  bullet: string;
  content: string;
}

export interface ListComponent extends ComponentBase {
  type: "list";
  items: ListItemComponent[];
}

export interface PollComponent extends ComponentBase {
  type: "poll";
  question: string;
  choices: string[];
  allow_multiple?: boolean;
  results?: number[];
  count_name?: string;
  poll_name?: string;
}

export interface TableComponent extends ComponentBase {
  type: "table";
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface VideoComponent extends ComponentBase {
  type: "video";
  url: string;
  name?: string;
  caption?: string;
  description?: string;
  thumbnail_image_url?: string;
}

export type ArticleComponent =
  | HeadingComponent
  | ParagraphComponent
  | ImageComponent
  | LinkComponent
  | CodeBlockComponent
  | EquationComponent
  | CitationComponent
  | FootnoteComponent
  | HorizontalRulerComponent
  | ListComponent
  | PollComponent
  | TableComponent
  | VideoComponent;

export const COMPONENT_TYPES = [
  "heading",
  "paragraph",
  "image",
  "link",
  "code_block",
  "equation",
  "citation",
  "footnote",
  "horizontal_ruler",
  "list",
  "poll",
  "table",
  "video",
] as const;

export type ArticleComponentType = (typeof COMPONENT_TYPES)[number];

export interface ArticleBody {
  metadata: ArticleMetadata;
  components: ArticleComponent[];
}

export interface ArticleDataParsed {
  readonly metadata: Readonly<ArticleMetadata>;
  readonly components: readonly ArticleComponent[];
}

export interface ArticleDataCorrected {
  metadata: ArticleMetadata;
  components: ArticleComponent[];
}

export interface NewsArticle {
  url: string;
  data_parsed: ArticleDataParsed;
  data_corrected: ArticleDataCorrected;
}

export function isHeading(c: ArticleComponent): c is HeadingComponent {
  return c.type === "heading";
}
export function isParagraph(c: ArticleComponent): c is ParagraphComponent {
  return c.type === "paragraph";
}
export function isImage(c: ArticleComponent): c is ImageComponent {
  return c.type === "image";
}
export function isLink(c: ArticleComponent): c is LinkComponent {
  return c.type === "link";
}
export function isCodeBlock(c: ArticleComponent): c is CodeBlockComponent {
  return c.type === "code_block";
}
export function isEquation(c: ArticleComponent): c is EquationComponent {
  return c.type === "equation";
}
export function isCitation(c: ArticleComponent): c is CitationComponent {
  return c.type === "citation";
}
export function isFootnote(c: ArticleComponent): c is FootnoteComponent {
  return c.type === "footnote";
}
export function isHorizontalRuler(
  c: ArticleComponent
): c is HorizontalRulerComponent {
  return c.type === "horizontal_ruler";
}
export function isList(c: ArticleComponent): c is ListComponent {
  return c.type === "list";
}
export function isPoll(c: ArticleComponent): c is PollComponent {
  return c.type === "poll";
}
export function isTable(c: ArticleComponent): c is TableComponent {
  return c.type === "table";
}
export function isVideo(c: ArticleComponent): c is VideoComponent {
  return c.type === "video";
}

export function getComponentType(
  component: ArticleComponent
): ArticleComponentType {
  return component.type as ArticleComponentType;
}
