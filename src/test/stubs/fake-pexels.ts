/**
 * Fake Pexels Provider for Testing
 */
import { PexelsVideo, PexelsSearchOptions } from '../../visuals/providers/pexels';

export class FakePexelsProvider {
  private responses: PexelsVideo[][] = [];
  private calls: PexelsSearchOptions[] = [];
  private shouldError = false;
  private errorMessage = '';
  
  /**
   * Queue videos for the next search
   */
  queueVideos(videos: PexelsVideo[]): void {
    this.responses.push(videos);
  }
  
  /**
   * Queue a default video response
   */
  queueDefaultVideos(count: number = 3): void {
    const videos: PexelsVideo[] = [];
    for (let i = 0; i < count; i++) {
      videos.push({
        id: 1000 + i,
        url: `https://videos.pexels.com/video-files/test-${i}.mp4`,
        thumbnailUrl: `https://images.pexels.com/photos/test-${i}.jpg`,
        duration: 10 + i * 5,
        width: 1080,
        height: 1920,
        user: `TestUser${i}`,
      });
    }
    this.responses.push(videos);
  }
  
  /**
   * Queue an error for the next call
   */
  queueError(message: string): void {
    this.shouldError = true;
    this.errorMessage = message;
  }
  
  /**
   * Search for videos (mock implementation)
   */
  async search(options: PexelsSearchOptions): Promise<PexelsVideo[]> {
    this.calls.push(options);
    
    if (this.shouldError) {
      this.shouldError = false;
      throw new Error(this.errorMessage);
    }
    
    if (this.responses.length === 0) {
      // Default response
      return [{
        id: 12345,
        url: 'https://videos.pexels.com/video-files/default.mp4',
        thumbnailUrl: 'https://images.pexels.com/photos/default.jpg',
        duration: 15,
        width: 1080,
        height: 1920,
        user: 'DefaultUser',
      }];
    }
    
    return this.responses.shift()!;
  }
  
  /**
   * Get all recorded calls
   */
  getCalls(): PexelsSearchOptions[] {
    return [...this.calls];
  }
  
  /**
   * Get the last call
   */
  getLastCall(): PexelsSearchOptions | undefined {
    return this.calls[this.calls.length - 1];
  }
  
  /**
   * Get all search queries
   */
  getQueries(): string[] {
    return this.calls.map(c => c.query);
  }
  
  /**
   * Reset the provider
   */
  reset(): void {
    this.responses = [];
    this.calls = [];
    this.shouldError = false;
    this.errorMessage = '';
  }
}
