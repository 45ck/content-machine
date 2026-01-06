export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(text: string): Promise<Float32Array>;
}

