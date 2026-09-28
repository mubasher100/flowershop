import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DEFAULT_LOGO, LOGO_METADATA_KEY } from "./brand-mark"
import { sdk } from "./sdk"

/**
 * The logo printed on the delivery label, read from and written to the store's
 * own metadata.
 *
 * Store metadata rather than a module of its own: this is one string, it
 * belongs to the store, and Medusa already persists and serves it. A custom
 * module would mean a data model, a service, a migration and an API route to
 * hold a URL.
 *
 * `logo` is never empty — with nothing uploaded it is the bundled mark, so a
 * label printed on day one is still branded.
 */
export function useLabelLogo() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["store-label-logo"],
    queryFn: () => sdk.admin.store.list(),
    // The logo changes about once a year. Refetching it on every window focus
    // puts a request behind every click in the dashboard for nothing.
    staleTime: 5 * 60 * 1000,
  })

  const store = data?.stores?.[0]
  const uploaded = store?.metadata?.[LOGO_METADATA_KEY]
  const custom = typeof uploaded === "string" && uploaded ? uploaded : null

  const save = useMutation({
    mutationFn: async (url: string | null) => {
      if (!store?.id) {
        throw new Error("No store to save against.")
      }
      return sdk.admin.store.update(store.id, {
        // Spread the existing metadata: an update replaces the whole object,
        // so sending only this key would drop anything else kept there.
        metadata: { ...(store.metadata ?? {}), [LOGO_METADATA_KEY]: url },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-label-logo"] })
    },
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { files } = await sdk.admin.upload.create({ files: [file] })
      const url = files?.[0]?.url
      if (!url) {
        throw new Error("The upload returned no URL.")
      }
      await save.mutateAsync(url)
      return url
    },
  })

  return {
    /** Always a usable image: the uploaded logo, or the bundled mark. */
    logo: custom ?? DEFAULT_LOGO,
    /** Whether the shop has uploaded one, as opposed to using the default. */
    isCustom: !!custom,
    isLoading,
    upload,
    /** Back to the bundled mark. */
    reset: () => save.mutateAsync(null),
    isSaving: upload.isPending || save.isPending,
  }
}
