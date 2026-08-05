export interface DiagramVersion {
  id: string;
  documentKey: string;
  versionNumber: number;
  comment: string;
  source: string;
  createdAt: string;
}

export interface CreateDiagramVersionPayload {
  documentKey: string;
  source: string;
  comment?: string;
}
