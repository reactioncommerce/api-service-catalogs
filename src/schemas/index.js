import importAsString from "@reactioncommerce/api-utils/importAsString.js";

const schema = importAsString("./schema.graphql");
const PromotionPrice = importAsString("./promotionPrice.graphql");

export default [schema, PromotionPrice];
