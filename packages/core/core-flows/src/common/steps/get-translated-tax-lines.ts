import { ItemTaxLineDTO, ShippingTaxLineDTO } from "@medusajs/framework/types"
import {
  applyTranslationsToTaxLines,
  FeatureFlag,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
export const getTranslatedTaxLinesStepId = "get-translated-tax-lines-step"

export interface GetTranslatedTaxLinesStepInput {
  itemTaxLines: ItemTaxLineDTO[]
  shippingTaxLines: ShippingTaxLineDTO[]
  locale: string
}

export const getTranslatedTaxLinesStep = createStep(
  getTranslatedTaxLinesStepId,
  async (
    { itemTaxLines, shippingTaxLines, locale }: GetTranslatedTaxLinesStepInput,
    { container }
  ) => {
    const isTranslationEnabled = FeatureFlag.isFeatureEnabled("translation")

    if (!isTranslationEnabled) {
      return new StepResponse({
        itemTaxLines,
        shippingTaxLines,
      })
    }

    const translatedItemTaxLines = await applyTranslationsToTaxLines(
      itemTaxLines,
      locale,
      container
    )
    const translatedShippingTaxLines = await applyTranslationsToTaxLines(
      shippingTaxLines,
      locale,
      container
    )

    return new StepResponse({
      itemTaxLines: translatedItemTaxLines,
      shippingTaxLines: translatedShippingTaxLines,
    })
  }
)
