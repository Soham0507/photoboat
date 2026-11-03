// Local stand-in for the missing "@workspace/api-client-react" workspace
// package (not present in this copied project). Simulates the backend
// in-memory so the UI can be previewed end to end without a real server.
// Aliased in vite.config.ts — remove the alias once the real package/backend
// is available again.
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";

export interface Scene {
  id: string;
  name: string;
  tagline: string;
  description: string;
}

export type GenerationStatus = "idle" | "pending" | "ready" | "failed";

export interface Generation {
  id: string;
  sceneId: string;
  sceneName: string;
  photoStatus: GenerationStatus;
  photoUrl: string | null;
  /** Short, scannable URL a phone can fetch the full-res photo from. */
  downloadUrl?: string;
  error?: string;
}

const SCENES: Scene[] = [
  {
    id: "pontoon-sunset",
    name: "Pontoon Sunset",
    tagline: "Golden hour on the water",
    description: "Relax on a pontoon as the sun dips below the horizon.",
  },
  {
    id: "wakesurfing",
    name: "Wakesurfing",
    tagline: "Carve the wake",
    description: "Ride the board behind the boat on a glassy lake.",
  },
  {
    id: "bass-fishing",
    name: "Bass Fishing",
    tagline: "Reel in the big one",
    description: "Cast a line from the bow at sunrise.",
  },
];

const generations = new Map<string, Generation>();
let nextId = 1;

function queryClientNotify(queryClient: ReturnType<typeof useQueryClient>, key: unknown[]) {
  queryClient.invalidateQueries({ queryKey: key });
}

export function getGetGenerationQueryKey(id: string) {
  return ["generation", id];
}

export function getListGenerationsQueryKey(params: { limit?: number } = {}) {
  return ["generations", params];
}

export function getGetBoothStatsQueryKey() {
  return ["boothStats"];
}

export function useListScenes() {
  return useQuery({
    queryKey: ["scenes"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return SCENES;
    },
  });
}

export function useCreateGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: { sceneId: string; photoBase64: string } }) => {
      const id = String(nextId++);
      const scene = SCENES.find((s) => s.id === data.sceneId);
      const generation: Generation = {
        id,
        sceneId: data.sceneId,
        sceneName: scene?.name ?? "Boat Day",
        photoStatus: "pending",
        photoUrl: null,
      };
      generations.set(id, generation);

      const notify = () => {
        queryClientNotify(queryClient, getGetGenerationQueryKey(id));
        queryClientNotify(queryClient, ["generations"]);
        queryClientNotify(queryClient, getGetBoothStatsQueryKey());
      };

      // Real call to the dev-server-only xAI proxy (vite.config.ts) — fire
      // and forget here; useGetGeneration's polling picks up the result.
      (async () => {
        try {
          const res = await fetch("/api/generate-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photoBase64: data.photoBase64,
              sceneDescription: scene?.description ?? "a beautiful day out on the water",
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

          const g = generations.get(id);
          if (!g) return;
          generations.set(id, {
            ...g,
            photoStatus: "ready",
            photoUrl: json.photoUrl,
            downloadUrl: json.downloadUrl,
          });
        } catch (err) {
          const g = generations.get(id);
          if (!g) return;
          generations.set(id, {
            ...g,
            photoStatus: "failed",
            error: err instanceof Error ? err.message : "Generation failed",
          });
        } finally {
          notify();
        }
      })();

      return generation;
    },
  });
}

export function useGetGeneration(
  id: string,
  options?: { query?: Partial<UseQueryOptions<Generation | null>> },
) {
  return useQuery({
    queryKey: getGetGenerationQueryKey(id),
    queryFn: async () => generations.get(id) ?? null,
    enabled: !!id,
    ...options?.query,
  });
}

export function useListGenerations(
  params: { limit?: number } = {},
  options?: { query?: Partial<UseQueryOptions<Generation[]>> },
) {
  return useQuery({
    queryKey: getListGenerationsQueryKey(params),
    queryFn: async () => {
      const all = Array.from(generations.values()).reverse();
      return params.limit ? all.slice(0, params.limit) : all;
    },
    ...options?.query,
  });
}

export function useGetBoothStats(options?: {
  query?: Partial<UseQueryOptions<{ totalCreations: number }>>;
}) {
  return useQuery({
    queryKey: getGetBoothStatsQueryKey(),
    queryFn: async () => {
      const all = Array.from(generations.values());
      return {
        totalCreations: all.filter((g) => g.photoStatus === "ready").length,
      };
    },
    ...options?.query,
  });
}
