import type {
  AspectRatio,
  AssetDTO,
  GenerateImagesRequest,
  GenerateImagesResponse,
  ListAssetsOptions,
  ListAssetsResponse,
} from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = (payload as { error?: string } | null)?.error ?? `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function generateImages(
  payload: GenerateImagesRequest,
): Promise<GenerateImagesResponse> {
  const response = await fetch('/api/generate/image', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload satisfies GenerateImagesRequest),
  });

  return handleJsonResponse<GenerateImagesResponse>(response);
}

export async function listAssets(
  projectId: string,
  options: ListAssetsOptions = {},
): Promise<ListAssetsResponse> {
  const params = new URLSearchParams();

  if (options.page) {
    params.set('page', options.page.toString());
  }

  if (options.limit) {
    params.set('limit', options.limit.toString());
  }

  const query = params.toString();
  const url = query ? `/api/projects/${projectId}/assets?${query}` : `/api/projects/${projectId}/assets`;

  const response = await fetch(url, {
    method: 'GET',
  });

  return handleJsonResponse<ListAssetsResponse>(response);
}

export type { AspectRatio, AssetDTO };
