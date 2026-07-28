import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ArrowDownMini,
  ArrowUpMini,
  EllipsisHorizontal,
  PencilSquare,
  Plus,
  SquaresPlus,
  Trash,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  DropdownMenu,
  Drawer,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../../lib/sdk"

/**
 * Homepage layout editor.
 *
 * Which collections get a rail, in what order and under what heading used to
 * live in the storefront source, so renaming "Best Sellers" was a code change
 * and a deploy. This is the same list, editable.
 *
 * Sections are ordered, not positioned — the storefront decides how a rail or
 * a banner looks, this decides which ones exist and in what sequence.
 */

type Section = {
  id: string
  type: "hero_slide" | "product_rail" | "category_tiles" | "banner"
  title: string
  title_ar: string | null
  resource_handle: string | null
  subtitle: string | null
  image_url: string | null
  cta_label: string | null
  cta_href: string | null
  rank: number
  enabled: boolean
}

const TYPE_LABELS: Record<Section["type"], string> = {
  hero_slide: "Hero slide",
  product_rail: "Product rail",
  category_tiles: "Category tiles",
  banner: "Banner",
}

const QUERY_KEY = ["homepage-sections"]

const emptyDraft = {
  type: "product_rail" as Section["type"],
  title: "",
  title_ar: "",
  resource_handle: "",
  subtitle: "",
  image_url: "",
  cta_label: "",
  cta_href: "",
  enabled: true,
}

type Draft = typeof emptyDraft

/** Empty strings mean "not set" in the form but should reach the API as null. */
const toPayload = (draft: Draft) => ({
  type: draft.type,
  title: draft.title.trim(),
  title_ar: draft.title_ar.trim() || null,
  resource_handle: draft.resource_handle.trim() || null,
  subtitle: draft.subtitle.trim() || null,
  image_url: draft.image_url.trim() || null,
  cta_label: draft.cta_label.trim() || null,
  cta_href: draft.cta_href.trim() || null,
  enabled: draft.enabled,
})

function SectionForm({
  draft,
  setDraft,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value })

  const isRail = draft.type === "product_rail"
  const isTiles = draft.type === "category_tiles"
  const isBanner = draft.type === "banner"
  const isHero = draft.type === "hero_slide"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label size="small" weight="plus">
          Type
        </Label>
        <Select
          value={draft.type}
          onValueChange={(v) => set("type", v as Section["type"])}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label size="small" weight="plus">
          Heading
        </Label>
        <Input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Best Sellers"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label size="small" weight="plus">
          Heading (Arabic)
        </Label>
        <Input
          dir="rtl"
          value={draft.title_ar}
          onChange={(e) => set("title_ar", e.target.value)}
          placeholder="الأكثر مبيعاً"
        />
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Left blank, the Arabic storefront shows the English heading.
        </Text>
      </div>

      {(isRail || isTiles) && (
        <div className="flex flex-col gap-2">
          <Label size="small" weight="plus">
            {isRail ? "Collection handle" : "Category handle"}
          </Label>
          <Input
            value={draft.resource_handle}
            onChange={(e) => set("resource_handle", e.target.value)}
            placeholder={isRail ? "best-sellers" : "birthday"}
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {isRail
              ? "The handle of the collection whose products this rail shows."
              : "Leave blank to show every occasion category."}
          </Text>
        </div>
      )}

      {/* Hero slides and banners carry the same shape: a photograph, a line
          of supporting copy and a link. The only difference is where they
          render — hero slides become the carousel at the top of the page,
          in the order listed here. */}
      {(isBanner || isHero) && (
        <>
          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Subtitle
            </Label>
            <Input
              value={draft.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
            />
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {isHero
                ? "The line under the slide heading."
                : "The line under the banner heading."}
            </Text>
          </div>
          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Image URL
            </Label>
            <Input
              value={draft.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="/hero/hero-01.jpg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Button label
            </Label>
            <Input
              value={draft.cta_label}
              onChange={(e) => set("cta_label", e.target.value)}
              placeholder="Shop the season"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Button link
            </Label>
            <Input
              value={draft.cta_href}
              onChange={(e) => set("cta_href", e.target.value)}
              placeholder="/collections/new-this-week"
            />
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              A path on the storefront, without the language prefix.
            </Text>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label size="small" weight="plus">
            Visible
          </Label>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Switch off to keep a seasonal section without showing it.
          </Text>
        </div>
        <Switch
          checked={draft.enabled}
          onCheckedChange={(v) => set("enabled", v)}
        />
      </div>
    </div>
  )
}

const HomepageSectionsPage = () => {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Section | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  // Loads on mount, with no `enabled` condition — this is the display query.
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      sdk.client.fetch<{ sections: Section[] }>("/admin/homepage-sections"),
  })

  const sections = data?.sections ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const onError = (error: unknown) =>
    toast.error(
      error instanceof Error ? error.message : "Something went wrong."
    )

  const createSection = useMutation({
    mutationFn: (d: Draft) =>
      sdk.client.fetch("/admin/homepage-sections", {
        method: "POST",
        body: toPayload(d),
      }),
    onSuccess: () => {
      toast.success("Section added.")
      setCreateOpen(false)
      setDraft(emptyDraft)
      refresh()
    },
    onError,
  })

  const updateSection = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Draft }) =>
      sdk.client.fetch(`/admin/homepage-sections/${id}`, {
        method: "POST",
        body: toPayload(d),
      }),
    onSuccess: () => {
      toast.success("Section saved.")
      setEditing(null)
      refresh()
    },
    onError,
  })

  const deleteSection = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/homepage-sections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Section removed.")
      refresh()
    },
    onError,
  })

  const reorder = useMutation({
    mutationFn: (order: string[]) =>
      sdk.client.fetch("/admin/homepage-sections/reorder", {
        method: "POST",
        body: { order },
      }),
    onSuccess: refresh,
    onError,
  })

  // Up/down rather than drag: the list is short, and buttons work on a phone
  // and with a keyboard, which a drag handle does not.
  const move = (index: number, direction: -1 | 1) => {
    const next = [...sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder.mutate(next.map((s) => s.id))
  }

  const startEditing = (section: Section) => {
    setEditing(section)
    setDraft({
      type: section.type,
      title: section.title,
      title_ar: section.title_ar ?? "",
      resource_handle: section.resource_handle ?? "",
      subtitle: section.subtitle ?? "",
      image_url: section.image_url ?? "",
      cta_label: section.cta_label ?? "",
      cta_href: section.cta_href ?? "",
      enabled: section.enabled,
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Homepage sections</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The blocks on the storefront homepage, in the order they appear.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
          <Plus />
          Add section
        </Button>
      </div>

      {isLoading ? (
        <div className="px-6 py-8">
          <Text size="small" className="text-ui-fg-subtle">
            Loading sections…
          </Text>
        </div>
      ) : sections.length === 0 ? (
        <div className="px-6 py-8">
          <Text size="small" className="text-ui-fg-subtle">
            No sections yet. Add one and it appears on the homepage.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col divide-y">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="flex items-center justify-between gap-3 px-6 py-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Text size="small" leading="compact" weight="plus">
                    {section.title}
                  </Text>
                  <Badge size="2xsmall">{TYPE_LABELS[section.type]}</Badge>
                  {!section.enabled && (
                    <Badge size="2xsmall" color="grey">
                      Hidden
                    </Badge>
                  )}
                </div>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  {section.resource_handle
                    ? section.resource_handle
                    : section.type === "banner"
                    ? section.cta_href ?? "No link"
                    : "All categories"}
                  {section.title_ar ? ` · ${section.title_ar}` : ""}
                </Text>
              </div>

              <div className="flex flex-none items-center gap-1">
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label="Move up"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpMini />
                </IconButton>
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label="Move down"
                  disabled={index === sections.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownMini />
                </IconButton>

                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <IconButton size="small" variant="transparent" aria-label="Actions">
                      <EllipsisHorizontal />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item onClick={() => startEditing(section)}>
                      <PencilSquare className="text-ui-fg-subtle" />
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove "${section.title}" from the homepage?`
                          )
                        ) {
                          deleteSection.mutate(section.id)
                        }
                      }}
                    >
                      <Trash className="text-ui-fg-subtle" />
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FocusModal for creating, Drawer for editing. */}
      <FocusModal open={createOpen} onOpenChange={setCreateOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              size="small"
              onClick={() => createSection.mutate(draft)}
              disabled={createSection.isPending || !draft.title.trim()}
              isLoading={createSection.isPending}
            >
              Add section
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-10">
            <div className="flex w-full max-w-lg flex-col gap-4">
              <Heading level="h2">New homepage section</Heading>
              <SectionForm draft={draft} setDraft={setDraft} />
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <Drawer open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit section</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto">
            <SectionForm draft={draft} setDraft={setDraft} />
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={() =>
                editing && updateSection.mutate({ id: editing.id, d: draft })
              }
              disabled={updateSection.isPending || !draft.title.trim()}
              isLoading={updateSection.isPending}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Homepage",
  icon: SquaresPlus,
})

export default HomepageSectionsPage
