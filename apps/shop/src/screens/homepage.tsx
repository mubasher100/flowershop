/**
 * The homepage, block by block: the carousel slides at the top, then the
 * rails, tiles and banners beneath, in order. Add, edit (English and
 * Arabic), show/hide, reorder and delete — the full admin's Homepage page,
 * at phone size, through the same /admin/homepage-sections routes.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type FormEvent } from "react"

import { SubPage } from "../components/page"
import { PhotoField } from "../components/photo"
import { Button, Field, Sheet, Toggle, cx, inputClass, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { useCatalogue } from "../lib/data"
import { clock, liveBy, recordChange } from "../lib/live"
import { STOREFRONT, sdk } from "../lib/sdk"

type SectionType = "hero_slide" | "product_rail" | "category_rail" | "category_tiles" | "banner"

type Section = {
  id: string
  type: SectionType
  title: string
  title_ar: string | null
  resource_handle: string | null
  subtitle: string | null
  subtitle_ar: string | null
  image_url: string | null
  cta_label: string | null
  cta_label_ar: string | null
  cta_href: string | null
  rank: number
  enabled: boolean
}

const TYPES: { value: SectionType; label: string; hint: string }[] = [
  { value: "hero_slide", label: "Big photo at the top", hint: "One slide of the carousel that opens the homepage." },
  { value: "category_rail", label: "Row of flowers from a category", hint: "Six flowers from one category, e.g. Black Friday." },
  { value: "product_rail", label: "Row of flowers from a collection", hint: "Six flowers from a collection, e.g. Best Sellers." },
  { value: "banner", label: "Banner", hint: "A photo with a line of text and a button." },
  { value: "category_tiles", label: "Occasion tiles", hint: "The round Shop by occasion tiles." },
]
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t

const KEY = ["homepage-sections"]
const fetchSections = () => sdk.client.fetch<{ sections: Section[] }>("/admin/homepage-sections")
const fetchCollections = () =>
  sdk.client.fetch<{ collections: { id: string; title: string; handle: string }[] }>("/admin/collections?limit=100&fields=id,title,handle")

/** Saves here change the homepage, which the website caches like everything else. */
function useHomepageSaved() {
  const qc = useQueryClient()
  return async (what: string, message = "Saved.") => {
    await qc.invalidateQueries({ queryKey: KEY })
    const change = recordChange(what)
    toast(`${message} On the website by ${clock(liveBy(change.at))}.`)
  }
}

export default function Homepage() {
  const sections = useQuery({ queryKey: KEY, queryFn: fetchSections })
  const saved = useHomepageSaved()
  const [editing, setEditing] = useState<Section | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const list = sections.data?.sections ?? []
  const slides = list.filter((s) => s.type === "hero_slide")
  const blocks = list.filter((s) => s.type !== "hero_slide")

  async function move(group: Section[], index: number, by: -1 | 1) {
    const to = index + by
    if (to < 0 || to >= group.length) return
    const next = [...group]
    ;[next[index], next[to]] = [next[to], next[index]]
    // The reorder route takes the whole list; the other group keeps its place.
    const order = (group === slides ? [...next, ...blocks] : [...slides, ...next]).map((s) => s.id)
    setBusy(group[index].id)
    try {
      await sdk.client.fetch("/admin/homepage-sections/reorder", { method: "POST", body: { order } })
      await saved(`Moved ${group[index].title}`, `${group[index].title} moved.`)
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setBusy(null)
    }
  }

  async function show(s: Section, enabled: boolean) {
    setBusy(s.id)
    try {
      await sdk.client.fetch(`/admin/homepage-sections/${s.id}`, { method: "POST", body: { enabled } })
      await saved(`${enabled ? "Showed" : "Hid"} ${s.title}`, enabled ? `${s.title} is showing.` : `${s.title} hidden.`)
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setBusy(null)
    }
  }

  const rows = (group: Section[], title: string) =>
    group.length > 0 && (
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{title}</h2>
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
          {group.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1 ps-3">
              <button type="button" onClick={() => setEditing(s)} className="flex min-h-[60px] min-w-0 flex-1 flex-col items-start justify-center text-start">
                <span className={cx("w-full truncate font-medium", !s.enabled && "text-ink-500 line-through")}>{s.title}</span>
                <span className="w-full truncate text-sm text-ink-600">
                  {typeLabel(s.type)}
                  {s.resource_handle ? ` · ${s.resource_handle}` : ""}
                </span>
              </button>
              <Toggle checked={s.enabled} onChange={(v) => show(s, v)} label={`Show ${s.title}`} disabled={busy === s.id} />
              <Button variant="ghost" className="px-2.5" aria-label={`Move ${s.title} up`} disabled={i === 0 || !!busy} onClick={() => move(group, i, -1)}>
                ↑
              </Button>
              <Button variant="ghost" className="px-2.5" aria-label={`Move ${s.title} down`} disabled={i === group.length - 1 || !!busy} onClick={() => move(group, i, 1)}>
                ↓
              </Button>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <SubPage title="Homepage" back="/website" backLabel="Website" action={<Button onClick={() => setAdding(true)}>+ Add</Button>}>
      <p className="text-[15px] text-ink-600">
        Top to bottom, as customers see it. Tap a block to change its words or photo; the switch shows or hides it.
      </p>
      {sections.isPending ? (
        <p className="text-ink-600">Loading…</p>
      ) : sections.error ? (
        <p role="alert" className="text-blush-700">{messageOf(sections.error)}</p>
      ) : (
        <>
          {rows(slides, "Carousel at the top")}
          {rows(blocks, "Below the carousel")}
          <a href={`${STOREFRONT}/en-qa`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
            Open the homepage <span aria-hidden>↗</span>
          </a>
        </>
      )}
      <SectionSheet
        open={!!editing || adding}
        section={editing}
        nextRank={list.length}
        onClose={() => {
          setEditing(null)
          setAdding(false)
        }}
      />
    </SubPage>
  )
}

type Draft = Omit<Section, "id" | "rank">
const empty: Draft = {
  type: "category_rail",
  title: "",
  title_ar: "",
  resource_handle: "",
  subtitle: "",
  subtitle_ar: "",
  image_url: null,
  cta_label: "",
  cta_label_ar: "",
  cta_href: "",
  enabled: true,
}

function SectionSheet({ open, section, nextRank, onClose }: { open: boolean; section: Section | null; nextRank: number; onClose: () => void }) {
  const saved = useHomepageSaved()
  const { categories } = useCatalogue()
  const collections = useQuery({ queryKey: ["collections"], queryFn: fetchCollections, enabled: open })
  const [d, setD] = useState<Draft>(empty)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setD(section ? { ...empty, ...section } : empty)
    setConfirmDelete(false)
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section?.id])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const hasPhoto = d.type === "banner" || d.type === "hero_slide"
  const needsCategory = d.type === "category_rail" || d.type === "category_tiles"
  const linkOptions = [
    ...categories.map((c) => ({ value: `/categories/${c.handle}`, label: `Category: ${c.name}` })),
    ...(collections.data?.collections ?? []).map((c) => ({ value: `/collections/${c.handle}`, label: `Collection: ${c.title}` })),
    { value: "/store", label: "All flowers" },
  ]

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!d.title.trim()) return setError("Give it a heading.")
    if (d.type === "product_rail" && !d.resource_handle) return setError("Choose the collection.")
    if (d.type === "category_rail" && !d.resource_handle) return setError("Choose the category.")
    if (hasPhoto && !d.image_url) return setError("Add a photo.")
    const clean = (v: string | null) => (v ?? "").trim() || null
    const body = {
      type: d.type,
      title: d.title.trim(),
      title_ar: clean(d.title_ar),
      resource_handle: clean(d.resource_handle),
      subtitle: hasPhoto ? clean(d.subtitle) : null,
      subtitle_ar: hasPhoto ? clean(d.subtitle_ar) : null,
      image_url: hasPhoto ? d.image_url : null,
      cta_label: hasPhoto ? clean(d.cta_label) : null,
      cta_label_ar: hasPhoto ? clean(d.cta_label_ar) : null,
      cta_href: hasPhoto ? clean(d.cta_href) : null,
      enabled: d.enabled,
    }
    setBusy(true)
    setError("")
    try {
      if (section) {
        await sdk.client.fetch(`/admin/homepage-sections/${section.id}`, { method: "POST", body })
        await saved(`Changed ${body.title} on the homepage`)
      } else {
        await sdk.client.fetch("/admin/homepage-sections", { method: "POST", body: { ...body, rank: nextRank } })
        await saved(`Added ${body.title} to the homepage`, `${body.title} added.`)
      }
      onClose()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!section) return
    setBusy(true)
    try {
      await sdk.client.fetch(`/admin/homepage-sections/${section.id}`, { method: "DELETE" })
      await saved(`Removed ${section.title} from the homepage`, `${section.title} removed.`)
      onClose()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={section ? "Edit block" : "Add to the homepage"}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-[15px] text-blush-700">{error}</p>}
          <Button type="submit" form="section-form" busy={busy} disabled={uploading} className="w-full">
            Save
          </Button>
        </div>
      }
    >
      <form id="section-form" onSubmit={save} noValidate className="flex flex-col gap-5">
        {!section && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium text-ink-700">What to add</legend>
            {TYPES.map((t) => (
              <label key={t.value} className={cx("flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2", d.type === t.value ? "border-blush-600 bg-blush-50" : "border-ink-200")}>
                <input type="radio" name="type" checked={d.type === t.value} onChange={() => set("type", t.value)} className="h-5 w-5 flex-none accent-blush-600" />
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="block text-sm text-ink-600">{t.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <Field label="Heading">
          <input value={d.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="Best Sellers" />
        </Field>
        <Field label="Heading in Arabic" hint="Leave empty to show the English.">
          <input value={d.title_ar ?? ""} onChange={(e) => set("title_ar", e.target.value)} dir="rtl" lang="ar" className={inputClass} />
        </Field>

        {d.type === "product_rail" && (
          <Field label="Collection">
            <select value={d.resource_handle ?? ""} onChange={(e) => set("resource_handle", e.target.value)} className={inputClass}>
              <option value="">Choose…</option>
              {(collections.data?.collections ?? []).map((c) => (
                <option key={c.id} value={c.handle}>{c.title}</option>
              ))}
            </select>
          </Field>
        )}
        {needsCategory && (
          <Field label={d.type === "category_tiles" ? "Which occasion" : "Category"} hint={d.type === "category_tiles" ? "Leave on Every occasion to show them all." : undefined}>
            <select value={d.resource_handle ?? ""} onChange={(e) => set("resource_handle", e.target.value)} className={inputClass}>
              <option value="">{d.type === "category_tiles" ? "Every occasion" : "Choose…"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.handle}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {hasPhoto && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-700">Photo</span>
              <PhotoField value={d.image_url} onChange={(url) => set("image_url", url)} onBusy={setUploading} />
            </div>
            <Field label="Line under the heading">
              <input value={d.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Line in Arabic">
              <input value={d.subtitle_ar ?? ""} onChange={(e) => set("subtitle_ar", e.target.value)} dir="rtl" lang="ar" className={inputClass} />
            </Field>
            <Field label="Button words">
              <input value={d.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className={inputClass} placeholder="Shop now" />
            </Field>
            <Field label="Button words in Arabic">
              <input value={d.cta_label_ar ?? ""} onChange={(e) => set("cta_label_ar", e.target.value)} dir="rtl" lang="ar" className={inputClass} placeholder="تسوق الآن" />
            </Field>
            <Field label="The button goes to">
              <select value={d.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} className={inputClass}>
                <option value="">Choose…</option>
                {d.cta_href && !linkOptions.some((o) => o.value === d.cta_href) && <option value={d.cta_href}>{d.cta_href}</option>}
                {linkOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-1">
          <span className="font-medium">Show on the homepage</span>
          <Toggle checked={d.enabled} onChange={(v) => set("enabled", v)} label="Show on the homepage" />
        </div>

        {section && (
          <div className="border-t border-ink-100 pt-4">
            {confirmDelete ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-blush-600 p-3">
                <p>Remove {section.title} from the homepage? Hiding it keeps it for later.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>Keep it</Button>
                  <Button type="button" variant="danger" className="flex-1" busy={busy} onClick={remove}>Remove</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="text-blush-700" onClick={() => setConfirmDelete(true)}>
                Remove this block
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  )
}
