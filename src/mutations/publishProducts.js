/* eslint-disable no-undef */
import _ from "lodash";
import Logger from "@reactioncommerce/logger";
import ReactionError from "@reactioncommerce/reaction-error";
import publishProductsToCatalog from "../utils/publishProductsToCatalog.js";

const LIMIT = 1000;

async function getProductIds(collections) {
  const products = await collections
    .Products
    .find({ type: "simple" }, { _id: 1 })
    .limit(LIMIT)
    .toArray();
  return (products).map(({ _id }) => _id);
}

/**
 *
 * @method publishProducts
 * @summary Publish an array of products to the Catalog collection by Product ID
 * @param {Object} context -  an object containing the per-request state
 * @param {Array} productIds - An array of product IDs
 * @returns {Promise<Object[]>} Array of CatalogItemProduct objects
 */

export default async function publishProducts(context, _productIds) {
  const { collections } = context;
  const { Catalog, Products } = collections;

  const productIds = await getProductIds(collections);

  console.time("Publish all products");

  // Find all products
  const products = await Products.find(
    {
      _id: { $in: productIds }
    },
    { _id: 1, shopId: 1 }
  ).toArray();

  console.log("Got all products ids and shopIds");
  console.timeLog("Publish all products");
  if (products.length !== productIds.length) {
    throw new ReactionError("not-found", "Some products not found");
  }

  const uniqueShopIds = _.uniq(products.map((product) => product.shopId));
  for (const shopId of uniqueShopIds) {
    // TODO(pod-auth): create helper to handle multiple permissions checks for multiple items
    for (const product of products) {
      // eslint-disable-next-line no-await-in-loop
      await context.validatePermissions(
        `reaction:legacy:products:${product._id}`,
        "publish",
        { shopId }
      );
    }
  }
  console.log("Validated permissions");
  console.timeLog("Publish all products");

  const success = await publishProductsToCatalog(productIds, context);
  if (!success) {
    Logger.error("Some Products could not be published to the Catalog.");
    throw new ReactionError(
      "server-error",
      "Some Products could not be published to the Catalog. Make sure the parent product and its variants and options are visible."
    );
  }
  console.log("Published all products");
  console.timeEnd("Publish all products");
  return null;
  // return Catalog.find({ "product.productId": { $in: productIds } }).toArray();
}
