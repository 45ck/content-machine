export type MediaSynthesisCapability = 'text-to-video' | 'image-to-video';

export interface TextToVideoRequest {
  kind: 'text-to-video';
  prompt: string;
  durationSeconds: number;
  width: number;
  height: number;
  outputPath: string;
}

export interface ImageToVideoRequest {
  kind: 'image-to-video';
  inputImagePath: string;
  prompt?: string;
  durationSeconds: number;
  width: number;
  height: number;
  outputPath: string;
}

export type MediaSynthesisRequest = TextToVideoRequest | ImageToVideoRequest;

export interface MediaSynthesisResult {
  outputPath: string;
}

export type MediaSynthesisJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface MediaSynthesisJobRecord {
  id: string;
  adapter: string;
  status: MediaSynthesisJobStatus;
  createdAt: string;
  updatedAt: string;
  request: MediaSynthesisRequest;
  result?: MediaSynthesisResult;
  error?: string;
}

export interface MediaSynthesisAdapter {
  readonly name: string;
  readonly capabilities: readonly MediaSynthesisCapability[];
  submit(request: MediaSynthesisRequest): Promise<MediaSynthesisResult>;
}
