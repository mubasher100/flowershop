import { useTranslations } from "@lib/i18n/use-translations"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)
  const { t } = useTranslations()

  return (
    <div className="flex flex-col gap-y-3">
      {/* Size is the only option in this catalogue, so the label is a fixed
          translated string. Interpolating the option title would read as
          "اختر Size" in Arabic, since the title comes from Medusa in English. */}
      <span className="text-sm">{t("product.selectSize")}</span>
      <div
        className="flex flex-wrap justify-between gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                // min-h rather than h-10: 40px is under the 44px a thumb can
                // reliably hit, and this is the control every purchase goes
                // through.
                "border-ui-border-base bg-ui-bg-subtle flex min-h-[2.75rem] flex-1 items-center justify-center rounded-rounded border p-2 text-small-regular",
                {
                  "border-ui-border-interactive": v === current,
                  "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
                    v !== current,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
