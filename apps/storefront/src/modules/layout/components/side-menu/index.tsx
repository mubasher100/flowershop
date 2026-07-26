"use client"

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { Fragment, useState } from "react"

import { BRAND_NAME } from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Navigation drawer.
 *
 * Replaces the starter's dark translucent overlay, which floated a rounded
 * card of 30px links over a blurred page and offered only Home / Store /
 * Account / Cart — none of which is what someone opening a flower shop's
 * menu is looking for.
 *
 * This one slides in from the left as a solid white panel and leads with the
 * catalogue: types, then occasions, then help. The menu should answer "what
 * do you sell", not "where are this app's pages".
 */

export type MenuLink = { name: string; handle: string }

type SideMenuProps = {
  categories: MenuLink[]
  occasions: MenuLink[]
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="px-5 pb-1 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
    {children}
  </h2>
)

const MenuItem = ({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) => (
  <LocalizedClientLink
    href={href}
    onClick={onClick}
    className="flex min-h-[3rem] items-center px-5 text-base text-ink-800 transition-colors hover:bg-blush-50 hover:text-blush-700 focus-visible:bg-blush-50 focus-visible:outline-none"
  >
    {children}
  </LocalizedClientLink>
)

const SideMenu = ({ categories, occasions }: SideMenuProps) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="nav-menu-button"
        aria-label="Open menu"
        className="inline-flex min-h-[2.75rem] items-center gap-2 text-ink-700 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
      >
        {/* Drawn rather than imported so its weight matches the type beside it. */}
        <span aria-hidden="true" className="flex flex-col gap-[3px]">
          <span className="block h-[2px] w-4 rounded-full bg-current" />
          <span className="block h-[2px] w-4 rounded-full bg-current" />
          <span className="block h-[2px] w-4 rounded-full bg-current" />
        </span>
        Menu
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={close} className="relative z-[60]">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink-900/40" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 flex">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in duration-150"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel
                data-testid="nav-menu-popup"
                className="flex h-full w-[86vw] max-w-sm flex-col bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-3">
                  <span className="font-display text-2xl text-ink-900">
                    {BRAND_NAME}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    data-testid="close-menu-button"
                    aria-label="Close menu"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-blush-50 hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blush-700"
                  >
                    <XMark />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto pb-6">
                  <div className="px-5 pt-4">
                    <LocalizedClientLink
                      href="/store"
                      onClick={close}
                      className="flex min-h-[3rem] items-center justify-center rounded-full bg-blush-600 px-6 font-semibold text-white transition-colors hover:bg-blush-700"
                    >
                      Shop all flowers
                    </LocalizedClientLink>
                  </div>

                  {categories.length > 0 && (
                    <>
                      <SectionHeading>Shop by type</SectionHeading>
                      {categories.map((c) => (
                        <MenuItem
                          key={c.handle}
                          href={`/categories/${c.handle}`}
                          onClick={close}
                        >
                          {c.name}
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {occasions.length > 0 && (
                    <>
                      <SectionHeading>Shop by occasion</SectionHeading>
                      {occasions.map((o) => (
                        <MenuItem
                          key={o.handle}
                          href={`/categories/${o.handle}`}
                          onClick={close}
                        >
                          {o.name}
                        </MenuItem>
                      ))}
                    </>
                  )}

                  <SectionHeading>Help</SectionHeading>
                  <MenuItem href="/cart" onClick={close}>
                    Your bag
                  </MenuItem>
                  <MenuItem href="/delivery" onClick={close}>
                    Delivery &amp; areas
                  </MenuItem>
                  <MenuItem href="/contact" onClick={close}>
                    Contact us
                  </MenuItem>
                </nav>

                <div className="border-t border-ink-200/70 bg-blush-50 px-5 py-4">
                  <p className="text-sm font-medium text-ink-800">
                    Same-day delivery across Doha
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    Order before 6pm and it arrives today.
                  </p>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SideMenu
