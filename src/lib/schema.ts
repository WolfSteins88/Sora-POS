import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MANAGER", "CASHIER"]);
export const productKindEnum = pgEnum("product_kind", ["goods", "recipe"]);
export const entityStatusEnum = pgEnum("entity_status", ["active", "inactive"]);
export const stockStatusEnum = pgEnum("stock_status", ["available", "sold_out"]);
export const orderTypeEnum = pgEnum("order_type", ["dine_in", "take_away"]);
export const trxStatusEnum = pgEnum("trx_status", ["completed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "qris",
  "debit",
  "credit",
  "ewallet",
]);
export const shiftStatusEnum = pgEnum("shift_status", ["open", "closed"]);
export const inventoryUnitEnum = pgEnum("inventory_unit", [
  "g",
  "kg",
  "ml",
  "liter",
  "pcs",
]);
export const movementTypeEnum = pgEnum("movement_type", [
  "in",
  "out",
  "adjustment",
  "sale",
]);
export const shopModeEnum = pgEnum("shop_mode", ["fnb", "retail", "mixed"]);
export const catalogPackEnum = pgEnum("catalog_pack", ["fnb", "retail"]);
export const paperSizeEnum = pgEnum("paper_size", ["58mm", "80mm"]);
export const printerConnectionEnum = pgEnum("printer_connection", [
  "web_bluetooth",
  "local_bridge",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRoleEnum("role").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 120 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }),
  image: varchar("image", { length: 255 }),
  status: entityStatusEnum("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  catalogPack: catalogPackEnum("catalog_pack").notNull().default("fnb"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  kind: productKindEnum("kind").notNull().default("goods"),
  name: varchar("name", { length: 150 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  image: varchar("image", { length: 255 }),
  status: entityStatusEnum("status").notNull().default("active"),
  stockStatus: stockStatusEnum("stock_status").notNull().default("available"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  catalogPack: catalogPackEnum("catalog_pack").notNull().default("fnb"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productVariantOptions = pgTable("product_variant_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const addons = pgTable("addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  status: entityStatusEnum("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productAddons = pgTable(
  "product_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    addonId: uuid("addon_id")
      .notNull()
      .references(() => addons.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.productId, t.addonId)],
);

export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  openingCash: numeric("opening_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  openingAt: timestamp("opening_at", { withTimezone: true }).notNull(),
  closingCash: numeric("closing_cash", { precision: 12, scale: 2 }),
  closingAt: timestamp("closing_at", { withTimezone: true }),
  cashSales: numeric("cash_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }),
  difference: numeric("difference", { precision: 12, scale: 2 }),
  status: shiftStatusEnum("status").notNull().default("open"),
  note: varchar("note", { length: 500 }),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionNumber: varchar("transaction_number", { length: 30 }).notNull().unique(),
  shiftId: uuid("shift_id").references(() => shifts.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  orderType: orderTypeEnum("order_type").notNull().default("take_away"),
  tableNumber: varchar("table_number", { length: 20 }),
  customerName: varchar("customer_name", { length: 100 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  serviceCharge: numeric("service_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: trxStatusEnum("status").notNull().default("completed"),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  productName: varchar("product_name", { length: 150 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  variantPrice: numeric("variant_price", { precision: 12, scale: 2 }).notNull().default("0"),
  addonPrice: numeric("addon_price", { precision: 12, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(1),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  note: varchar("note", { length: 255 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const transactionItemVariants = pgTable("transaction_item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionItemId: uuid("transaction_item_id")
    .notNull()
    .references(() => transactionItems.id, { onDelete: "cascade" }),
  variantName: varchar("variant_name", { length: 100 }).notNull(),
  optionName: varchar("option_name", { length: 100 }).notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
});

export const transactionItemAddons = pgTable("transaction_item_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionItemId: uuid("transaction_item_id")
    .notNull()
    .references(() => transactionItems.id, { onDelete: "cascade" }),
  addonName: varchar("addon_name", { length: 100 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  changeAmount: numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  unit: inventoryUnitEnum("unit").notNull().default("pcs"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryItemId: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: movementTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  stockBefore: numeric("stock_before", { precision: 12, scale: 3 }).notNull(),
  stockAfter: numeric("stock_after", { precision: 12, scale: 3 }).notNull(),
  reference: varchar("reference", { length: 50 }),
  note: varchar("note", { length: 255 }),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),
  note: varchar("note", { length: 255 }),
  costLocked: boolean("cost_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
});

export const printers = pgTable("printers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("thermal"),
  paperSize: paperSizeEnum("paper_size").notNull().default("80mm"),
  connectionMode: printerConnectionEnum("connection_mode").notNull().default("web_bluetooth"),
  deviceName: varchar("device_name", { length: 255 }),
  bleServiceUuid: varchar("ble_service_uuid", { length: 60 }),
  bleCharacteristicUuid: varchar("ble_characteristic_uuid", { length: 60 }),
  bridgeUrl: varchar("bridge_url", { length: 255 }),
  isDefault: boolean("is_default").notNull().default(false),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value"),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const heldOrders = pgTable("held_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 150 }).notNull(),
  cartJson: jsonb("cart_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionCounters = pgTable("transaction_counters", {
  day: date("day").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});
