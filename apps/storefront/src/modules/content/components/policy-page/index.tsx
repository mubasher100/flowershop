import { getTranslations, TranslationKey } from "@lib/i18n/dictionary"
import ContentPage, {
  ContentBlock,
} from "@modules/content/components/content-page"
import LegalIdentity from "@modules/content/components/legal-identity"

/**
 * A policy page: numbered sections of heading + paragraph, with the trader's
 * identity where the policy calls for it. The three legal pages differ only
 * in their strings, so the shape lives here once.
 */
export type PolicySection = {
  heading: TranslationKey
  /** Omitted for the "who we are" section, which renders the identity block. */
  body?: TranslationKey
  /** Links appended after the body, for policies that reference each other. */
  links?: { label: TranslationKey; href: string }[]
}

export default function PolicyPage({
  segment,
  title,
  intro,
  sections,
  LinkComponent,
}: {
  segment: string
  title: TranslationKey
  intro: TranslationKey
  sections: PolicySection[]
  LinkComponent: React.ComponentType<{
    href: string
    className?: string
    children: React.ReactNode
  }>
}) {
  const { t } = getTranslations(segment)

  return (
    <ContentPage
      title={t(title)}
      intro={t(intro)}
      backLabel={t("page.backToShop")}
    >
      {sections.map((s) => (
        <ContentBlock key={s.heading} heading={t(s.heading)}>
          {s.body ? (
            <p className="text-base leading-relaxed text-ink-600">{t(s.body)}</p>
          ) : (
            <LegalIdentity segment={segment} />
          )}
          {s.links?.map((l) => (
            <LinkComponent
              key={l.href}
              href={l.href}
              className="inline-flex min-h-[2.75rem] w-fit items-center text-sm font-semibold text-blush-700 underline-offset-4 hover:underline"
            >
              {t(l.label)}
            </LinkComponent>
          ))}
        </ContentBlock>
      ))}
      <p className="text-xs text-ink-500">{t("legal.lastUpdated")}</p>
    </ContentPage>
  )
}
