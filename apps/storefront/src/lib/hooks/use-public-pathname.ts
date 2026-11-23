"use client"

import { usePathname } from "next/navigation"

import { publicPathname } from "@lib/util/filtered-path"

/** usePathname, without the internal /filtered segment (see filtered-path). */
export const usePublicPathname = () => publicPathname(usePathname() ?? "")
