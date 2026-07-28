import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "../localized-client-link"
type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      // min-h keeps it a reachable target on a phone. As a bare flex row it
      // was only as tall as its text, well under 44px.
      className="group inline-flex min-h-[2.75rem] items-center gap-x-1"
      href={href}
      onClick={onClick}
      {...props}
    >
      <Text className="text-blush-700">{children}</Text>
      <ArrowUpRightMini
        className="group-hover:rotate-45 ease-in-out duration-150"
        color="var(--fg-interactive)"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink
