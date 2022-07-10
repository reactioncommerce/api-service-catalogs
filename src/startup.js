import Logger from "@reactioncommerce/logger";
import hashProduct from "./mutations/hashProduct.js";

/**
 * @summary Extend the schema with updated allowedValues
 * @param {Object} context Startup context
 * @returns {undefined}
 */
async function extendSchemas(context) {
  let allFulfillmentTypesArray = await context.queries.allFulfillmentTypes(context);

  if (!allFulfillmentTypesArray || allFulfillmentTypesArray.length === 0) {
    Logger.warn("No fulfillment types available, setting 'shipping' as default");
    allFulfillmentTypesArray = ["shipping"];
  }

  const { simpleSchemas: { CatalogProduct } } = context;

  const schemaCatalogProductExtension = {
    "supportedFulfillmentTypes.$": {
      allowedValues: allFulfillmentTypesArray
    }
  };
  CatalogProduct.extend(schemaCatalogProductExtension);
}

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default async function catalogStartup(context) {
  const { appEvents, collections } = context;

  await extendSchemas(context);

  appEvents.on("afterMediaInsert", ({ mediaRecord }) => {
    const { productId } = mediaRecord.metadata || {};
    if (productId) {
      hashProduct(productId, collections, false).catch((error) => {
        Logger.error(`Error updating currentProductHash for product with ID ${productId}`, error);
      });
    }
  });

  appEvents.on("afterMediaUpdate", ({ mediaRecord }) => {
    const { productId } = mediaRecord.metadata || {};
    if (productId) {
      hashProduct(productId, collections, false).catch((error) => {
        Logger.error(`Error updating currentProductHash for product with ID ${productId}`, error);
      });
    }
  });

  appEvents.on("afterMediaRemove", ({ mediaRecord }) => {
    const { productId } = mediaRecord.metadata || {};
    if (productId) {
      hashProduct(productId, collections, false).catch((error) => {
        Logger.error(`Error updating currentProductHash for product with ID ${productId}`, error);
      });
    }
  });

  appEvents.on("afterProductSoftDelete", ({ product }) => {
    collections.Catalog.updateOne({
      "product.productId": product._id
    }, {
      $set: {
        "product.isDeleted": true
      }
    });
  });

  const productOrVariantUpdateHandler = ({ productId }) => {
    if (productId) {
      hashProduct(productId, collections, false).catch((error) => {
        Logger.error(`Error updating currentProductHash for product with ID ${productId}`, error);
      });
    }
  };

  appEvents.on("afterProductUpdate", productOrVariantUpdateHandler);
  appEvents.on("afterVariantUpdate", productOrVariantUpdateHandler);
}
