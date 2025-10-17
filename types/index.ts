export type MediaType = 'image' | 'video';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface AssetDTO {
  id: string;
  url: string;
  thumbUrl?: string | null;
  aspect: AspectRatio;
  mediaType: MediaType;
}

export interface GenerateImagesRequest {
  projectId: string;
  prompt: string;
  aspect: AspectRatio;
  count?: number;
}

export interface GenerateImagesResponse {
  assets: AssetDTO[];
}

export interface ListAssetsOptions {
  page?: number;
  limit?: number;
}

export interface ListAssetsResponse {
  assets: AssetDTO[];
  page: number;
  total: number;
  hasMore: boolean;
}
