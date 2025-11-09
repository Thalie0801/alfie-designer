const LOVABLE_PROXY_BASE = "/api/lovable";
const MAX_ERROR_DETAILS = 500;

function buildLovableProjectUrl(projectId: string, path: string) {
  const sanitizedProjectId = projectId?.trim();
  if (!sanitizedProjectId) {
    throw new Error("Missing projectId before calling collaborators API");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const encodedProjectId = encodeURIComponent(sanitizedProjectId);
  return `${LOVABLE_PROXY_BASE}/projects/${encodedProjectId}${normalizedPath}`;
}

async function handleLovableResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const snippet = text.slice(0, MAX_ERROR_DETAILS);
    throw new Error(
      `Collaborators API failed: ${response.status} ${response.statusText || ""} — ${snippet}`.trim(),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function listProjectCollaborators<T = unknown>(projectId: string): Promise<T> {
  const url = buildLovableProjectUrl(projectId, "/collaborators");
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  return handleLovableResponse<T>(response);
}

export async function inviteProjectCollaborator<T = unknown>(
  projectId: string,
  email: string,
): Promise<T> {
  if (!email) {
    throw new Error("Email is required to invite a collaborator");
  }

  const url = buildLovableProjectUrl(projectId, "/collaborators");
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return handleLovableResponse<T>(response);
}
