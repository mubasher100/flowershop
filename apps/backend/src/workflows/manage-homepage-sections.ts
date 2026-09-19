import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  createHomepageSectionStep,
  deleteHomepageSectionStep,
  reorderHomepageSectionsStep,
  SectionInput,
  updateHomepageSectionStep,
} from "./steps/manage-homepage-sections"

/**
 * Every mutation to the homepage layout goes through one of these.
 *
 * The admin routes below them do nothing but validate HTTP input — the
 * ordering rules, the shape checks and the rollback behaviour all live in the
 * steps, so a section created through a script behaves the same as one created
 * through the dashboard.
 */

/**
 * A custom module raises no CRUD events of its own, so each of these emits one
 * explicitly. The revalidate-storefront subscriber listens for it and clears
 * the storefront's `homepage` cache tag — without that the homepage keeps
 * serving its cached copy and an edit looks like it did nothing.
 */
export const HOMEPAGE_SECTION_CHANGED = "homepage-section.changed"
const CHANGED = HOMEPAGE_SECTION_CHANGED

export const createHomepageSectionWorkflow = createWorkflow(
  "create-homepage-section",
  function (input: SectionInput) {
    const section = createHomepageSectionStep(input)
    emitEventStep({ eventName: CHANGED, data: {} })
    return new WorkflowResponse(section)
  }
)

export const updateHomepageSectionWorkflow = createWorkflow(
  "update-homepage-section",
  function (input: { id: string } & Partial<SectionInput>) {
    const section = updateHomepageSectionStep(input)
    emitEventStep({ eventName: CHANGED, data: {} })
    return new WorkflowResponse(section)
  }
)

export const deleteHomepageSectionWorkflow = createWorkflow(
  "delete-homepage-section",
  function (input: { id: string }) {
    const result = deleteHomepageSectionStep(input)
    emitEventStep({ eventName: CHANGED, data: {} })
    return new WorkflowResponse(result)
  }
)

export const reorderHomepageSectionsWorkflow = createWorkflow(
  "reorder-homepage-sections",
  function (input: { order: string[] }) {
    const result = reorderHomepageSectionsStep(input)
    emitEventStep({ eventName: CHANGED, data: {} })
    return new WorkflowResponse(result)
  }
)
