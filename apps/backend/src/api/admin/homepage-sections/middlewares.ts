import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
// Medusa's re-export, not the bare package: it pins the version the framework
// validates against, and mixing the two produces schemas it will not accept.
import { z } from "@medusajs/framework/zod"

import { SECTION_TYPES } from "../../../workflows/steps/manage-homepage-sections"

/**
 * Shape only. Whether a rail actually has a collection behind it is a business
 * rule, so it is enforced in the workflow step rather than here — that way a
 * section created by a script is checked the same way as one created in the
 * dashboard.
 */
const sectionFields = {
  title: z.string().min(1, "A section needs a heading."),
  title_ar: z.string().nullish(),
  resource_handle: z.string().nullish(),
  subtitle: z.string().nullish(),
  image_url: z.string().nullish(),
  cta_label: z.string().nullish(),
  cta_href: z.string().nullish(),
  rank: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
}

export const CreateHomepageSectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  ...sectionFields,
})
export type CreateHomepageSectionSchema = z.infer<
  typeof CreateHomepageSectionSchema
>

/** Every field optional — the dashboard sends only what changed. */
export const UpdateHomepageSectionSchema = z.object({
  type: z.enum(SECTION_TYPES).optional(),
  ...sectionFields,
  title: sectionFields.title.optional(),
})
export type UpdateHomepageSectionSchema = z.infer<
  typeof UpdateHomepageSectionSchema
>

export const ReorderHomepageSectionsSchema = z.object({
  order: z.array(z.string()).min(1, "Send the section ids in their new order."),
})
export type ReorderHomepageSectionsSchema = z.infer<
  typeof ReorderHomepageSectionsSchema
>

export const homepageSectionMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/homepage-sections",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateHomepageSectionSchema)],
  },
  {
    // Ordering is its own route so it does not collide with the :id matcher
    // below — "reorder" would otherwise be read as a section id.
    matcher: "/admin/homepage-sections/reorder",
    method: "POST",
    middlewares: [validateAndTransformBody(ReorderHomepageSectionsSchema)],
  },
  {
    matcher: "/admin/homepage-sections/:id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateHomepageSectionSchema)],
  },
]
