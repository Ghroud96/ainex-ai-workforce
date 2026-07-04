export interface EmbeddingVector {
  values: number[];
  dimensions: number;
}

export interface EmbeddingProvider {
  name: string;
  isImplemented: boolean;
  embed(text: string): Promise<EmbeddingVector>;
}
