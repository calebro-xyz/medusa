import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/types"
import {
  ClaimType,
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/utils"
import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"
import { setupTaxStructure } from "../../../modules/__tests__/fixtures"

jest.setTimeout(30000)

process.env.MEDUSA_FF_TRANSLATION = "true"

medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, getContainer, api }) => {
    let appContainer: MedusaContainer
    let order
    let product
    let productExtra
    let shippingProfile
    let stockLocation
    let fulfillmentSet
    let inventoryItem
    let inventoryItemExtra
    let taxRate
    let salesChannel
    let region
    let customer
    let shippingOption
    const shippingProviderId = "manual_test-provider"

    beforeEach(async () => {
      appContainer = getContainer()
      await createAdminUser(dbConnection, adminHeaders, appContainer)

      const taxStructure = await setupTaxStructure(
        appContainer.resolve(Modules.TAX)
      )

      const storeModule = appContainer.resolve(Modules.STORE)
      const [defaultStore] = await storeModule.listStores(
        {},
        { select: ["id"], take: 1 }
      )
      await storeModule.updateStores(defaultStore.id, {
        supported_locales: [
          { locale_code: "en-US" },
          { locale_code: "fr-FR" },
          { locale_code: "de-DE" },
        ],
      })

      region = (
        await api.post(
          "/admin/regions",
          {
            name: "test-region",
            currency_code: "usd",
          },
          adminHeaders
        )
      ).data.region

      customer = (
        await api.post(
          "/admin/customers",
          {
            first_name: "joe",
            email: "joe@admin.com",
          },
          adminHeaders
        )
      ).data.customer

      salesChannel = (
        await api.post(
          "/admin/sales-channels",
          {
            name: "Test channel",
          },
          adminHeaders
        )
      ).data.sales_channel

      shippingProfile = (
        await api.post(
          `/admin/shipping-profiles`,
          {
            name: "Test",
            type: "default",
          },
          adminHeaders
        )
      ).data.shipping_profile

      product = (
        await api.post(
          "/admin/products",
          {
            title: "Test product",
            status: ProductStatus.PUBLISHED,
            options: [{ title: "size", values: ["large", "small"] }],
            shipping_profile_id: shippingProfile.id,
            variants: [
              {
                title: "Test variant",
                sku: "test-variant",
                options: { size: "large" },
                prices: [
                  {
                    currency_code: "usd",
                    amount: 10,
                  },
                ],
              },
            ],
          },
          adminHeaders
        )
      ).data.product

      productExtra = (
        await api.post(
          "/admin/products",
          {
            title: "Extra product",
            status: ProductStatus.PUBLISHED,
            options: [{ title: "size", values: ["large", "small"] }],
            shipping_profile_id: shippingProfile.id,
            variants: [
              {
                title: "my variant",
                sku: "variant-sku",
                options: { size: "large" },
                prices: [
                  {
                    currency_code: "usd",
                    amount: 50.25,
                  },
                ],
              },
            ],
          },
          adminHeaders
        )
      ).data.product

      stockLocation = (
        await api.post(
          `/admin/stock-locations`,
          {
            name: "Test location",
          },
          adminHeaders
        )
      ).data.stock_location

      stockLocation = (
        await api.post(
          `/admin/stock-locations/${stockLocation.id}/fulfillment-sets?fields=*fulfillment_sets`,
          {
            name: "Test",
            type: "test-type",
          },
          adminHeaders
        )
      ).data.stock_location

      fulfillmentSet = (
        await api.post(
          `/admin/fulfillment-sets/${stockLocation.fulfillment_sets[0].id}/service-zones`,
          {
            name: "Test",
            geo_zones: [{ type: "country", country_code: "us" }],
          },
          adminHeaders
        )
      ).data.fulfillment_set

      inventoryItem = (
        await api.get(`/admin/inventory-items?sku=test-variant`, adminHeaders)
      ).data.inventory_items[0]

      await api.post(
        `/admin/inventory-items/${inventoryItem.id}/location-levels`,
        {
          location_id: stockLocation.id,
          stocked_quantity: 10,
        },
        adminHeaders
      )

      inventoryItemExtra = (
        await api.get(`/admin/inventory-items?sku=variant-sku`, adminHeaders)
      ).data.inventory_items[0]

      await api.post(
        `/admin/inventory-items/${inventoryItemExtra.id}/location-levels`,
        {
          location_id: stockLocation.id,
          stocked_quantity: 10,
        },
        adminHeaders
      )

      const remoteLink = appContainer.resolve(
        ContainerRegistrationKeys.REMOTE_LINK
      )

      await api.post(
        `/admin/stock-locations/${stockLocation.id}/fulfillment-providers`,
        { add: [shippingProviderId] },
        adminHeaders
      )

      shippingOption = (
        await api.post(
          "/admin/shipping-options",
          {
            name: "Test shipping option",
            service_zone_id: fulfillmentSet.service_zones[0].id,
            shipping_profile_id: shippingProfile.id,
            provider_id: shippingProviderId,
            price_type: "flat",
            type: {
              label: "Test type",
              description: "Test description",
              code: "test-code",
            },
            prices: [
              {
                currency_code: "usd",
                amount: 10,
              },
            ],
            rules: [],
          },
          adminHeaders
        )
      ).data.shipping_option

      await remoteLink.create([
        {
          [Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
          },
          [Modules.FULFILLMENT]: {
            fulfillment_provider_id: shippingProviderId,
          },
        },
        {
          [Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
          },
          [Modules.FULFILLMENT]: {
            fulfillment_set_id: fulfillmentSet.id,
          },
        },
        {
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: salesChannel.id,
          },
          [Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
          },
        },
        {
          [Modules.PRODUCT]: {
            variant_id: product.variants[0].id,
          },
          [Modules.INVENTORY]: {
            inventory_item_id: inventoryItem.id,
          },
        },
        {
          [Modules.PRODUCT]: {
            variant_id: productExtra.variants[0].id,
          },
          [Modules.INVENTORY]: {
            inventory_item_id: inventoryItemExtra.id,
          },
        },
      ])

      const taxRatesResponse = await api.get(
        `/admin/tax-rates?tax_region_id=${taxStructure.us.children.cal.province.id}`,
        adminHeaders
      )
      taxRate = taxRatesResponse.data.tax_rates.find(
        (rate: { code: string }) => rate.code === "CADEFAULT"
      )

      await api.post(
        "/admin/translations/batch",
        {
          create: [
            {
              reference_id: taxRate.id,
              reference: "tax_rate",
              locale_code: "fr-FR",
              translations: {
                name: "Taux par défaut CA",
              },
            },
            {
              reference_id: taxRate.id,
              reference: "tax_rate",
              locale_code: "de-DE",
              translations: {
                name: "CA Standardsteuersatz",
              },
            },
          ],
        },
        adminHeaders
      )

      const orderModule = appContainer.resolve(Modules.ORDER)
      order = await orderModule.createOrders({
        region_id: region.id,
        email: "foo@bar.com",
        items: [
          {
            title: "Custom Item",
            variant_id: product.variants[0].id,
            quantity: 2,
            unit_price: 25,
          },
        ],
        sales_channel_id: salesChannel.id,
        shipping_address: {
          first_name: "Test",
          last_name: "Test",
          address_1: "Test",
          city: "Test",
          country_code: "US",
          province: "CA",
          postal_code: "12345",
          phone: "12345",
        },
        billing_address: {
          first_name: "Test",
          last_name: "Test",
          address_1: "Test",
          city: "Test",
          country_code: "US",
          province: "CA",
          postal_code: "12345",
        },
        shipping_methods: [
          {
            name: "Test shipping method",
            amount: 10,
            data: {},
            shipping_option_id: shippingOption.id,
          },
        ],
        currency_code: "usd",
        customer_id: customer.id,
      })

      const inventoryModule = appContainer.resolve(Modules.INVENTORY)
      await inventoryModule.createReservationItems([
        {
          inventory_item_id: inventoryItem.id,
          location_id: stockLocation.id,
          quantity: 2,
          line_item_id: order.items[0].id,
        },
      ])

      await api.post(
        `/admin/orders/${order.id}/fulfillments`,
        {
          items: [
            {
              id: order.items[0].id,
              quantity: 2,
            },
          ],
        },
        adminHeaders
      )
    })

    describe("Claims tax line translations", () => {
      describe("when adding outbound items to a claim", () => {
        it("should translate tax lines based on order locale when adding new items", async () => {
          await api.post(
            `/admin/orders/${order.id}`,
            { locale: "fr-FR" },
            adminHeaders
          )

          const claim = (
            await api.post(
              "/admin/claims",
              {
                order_id: order.id,
                type: ClaimType.REPLACE,
                description: "Test claim",
              },
              adminHeaders
            )
          ).data.claim

          await api.post(
            `/admin/claims/${claim.id}/outbound/items`,
            {
              items: [
                {
                  variant_id: productExtra.variants[0].id,
                  quantity: 1,
                },
              ],
            },
            adminHeaders
          )

          await api.post(`/admin/claims/${claim.id}/request`, {}, adminHeaders)

          const updatedOrder = (
            await api.get(`/admin/orders/${order.id}`, adminHeaders)
          ).data.order

          const newItem = updatedOrder.items.find(
            (item) => item.title === "Extra product"
          )

          expect(newItem).toBeDefined()
          expect(newItem.tax_lines).toBeDefined()
          expect(newItem.tax_lines.length).toBeGreaterThan(0)

          const taxLine = newItem.tax_lines.find(
            (tl) => tl.code === "CADEFAULT"
          )
          expect(taxLine).toBeDefined()
          expect(taxLine.description).toEqual("Taux par défaut CA")
        })

        it("should use original tax line description when order has no locale", async () => {
          const claim = (
            await api.post(
              "/admin/claims",
              {
                order_id: order.id,
                type: ClaimType.REPLACE,
                description: "Test claim",
              },
              adminHeaders
            )
          ).data.claim

          await api.post(
            `/admin/claims/${claim.id}/outbound/items`,
            {
              items: [
                {
                  variant_id: productExtra.variants[0].id,
                  quantity: 1,
                },
              ],
            },
            adminHeaders
          )

          await api.post(`/admin/claims/${claim.id}/request`, {}, adminHeaders)

          const updatedOrder = (
            await api.get(`/admin/orders/${order.id}`, adminHeaders)
          ).data.order

          const newItem = updatedOrder.items.find(
            (item) => item.title === "Extra product"
          )

          expect(newItem).toBeDefined()
          expect(newItem.tax_lines).toBeDefined()
          expect(newItem.tax_lines.length).toBeGreaterThan(0)

          const taxLine = newItem.tax_lines.find(
            (tl) => tl.code === "CADEFAULT"
          )
          expect(taxLine).toBeDefined()
          expect(taxLine.description).toEqual("CA Default Rate")
        })
      })

      describe("when updating outbound items in a claim", () => {
        it("should preserve tax line translations when updating item quantity", async () => {
          await api.post(
            `/admin/orders/${order.id}`,
            { locale: "fr-FR" },
            adminHeaders
          )

          const claim = (
            await api.post(
              "/admin/claims",
              {
                order_id: order.id,
                type: ClaimType.REPLACE,
                description: "Test claim",
              },
              adminHeaders
            )
          ).data.claim

          const addItemResponse = await api.post(
            `/admin/claims/${claim.id}/outbound/items`,
            {
              items: [
                {
                  variant_id: productExtra.variants[0].id,
                  quantity: 1,
                },
              ],
            },
            adminHeaders
          )

          const actionId = addItemResponse.data.order_preview.items.find(
            (item) =>
              !!item.actions?.find((action) => action.action === "ITEM_ADD")
          ).actions[0].id

          await api.post(
            `/admin/claims/${claim.id}/outbound/items/${actionId}`,
            {
              quantity: 2,
            },
            adminHeaders
          )

          await api.post(`/admin/claims/${claim.id}/request`, {}, adminHeaders)

          const updatedOrder = (
            await api.get(`/admin/orders/${order.id}`, adminHeaders)
          ).data.order

          const newItem = updatedOrder.items.find(
            (item) => item.title === "Extra product"
          )

          expect(newItem).toBeDefined()
          expect(newItem.tax_lines).toBeDefined()
          expect(newItem.tax_lines.length).toBeGreaterThan(0)

          const taxLine = newItem.tax_lines.find(
            (tl) => tl.code === "CADEFAULT"
          )
          expect(taxLine).toBeDefined()
          expect(taxLine.description).toEqual("Taux par défaut CA")
        })
      })
    })
  },
})
