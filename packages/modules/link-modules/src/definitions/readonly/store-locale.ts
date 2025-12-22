import { ModuleJoinerConfig } from "@medusajs/framework/types"
import {
  FeatureFlag,
  MEDUSA_SKIP_FILE,
  Modules,
} from "@medusajs/framework/utils"
import TranslationFeatureFlag from "@medusajs/medusa/feature-flags/translation"
export const StoreLocales: ModuleJoinerConfig = {
  [MEDUSA_SKIP_FILE]: !(
    FeatureFlag.isFeatureEnabled(TranslationFeatureFlag.key) ||
    process.env.MEDUSA_FF_TRANSLATION === "true"
  ),
  isLink: true,
  isReadOnlyLink: true,
  extends: [
    {
      serviceName: Modules.STORE,
      entity: "StoreLocale",
      relationship: {
        serviceName: Modules.TRANSLATION,
        entity: "Locale",
        primaryKey: "code",
        foreignKey: "locale_code",
        alias: "locale",
        args: {
          methodSuffix: "Locales",
        },
      },
    },
  ],
} as ModuleJoinerConfig
