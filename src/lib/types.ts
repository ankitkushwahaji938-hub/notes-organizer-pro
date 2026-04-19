export type BlockType = 'heading' | 'subheading' | 'point' | 'definition' | 'plain';

export interface NoteBlock {
  id: string;
  type: BlockType;
  text: string;
  key?: string;
  value?: string;
  number?: number;
}

export interface OrganizerOptions {
  autoHeadings: boolean;
  bulletPoints: boolean;
  keyValues: boolean;
  numberedList: boolean;
  userName: string;
  pageTitle: string;
  seoDescription: string;
  seoKeywords: string;
}
