import { getSql } from "@/lib/db";

type SqlClient = any;

export type CartItemInput = {
  productId: string;
  quantity: number;
  optionIds?: string[];
  addonIds?: string[];
  note?: string;
};

export type CheckoutPayload = {
  items: CartItemInput[];
  orderType: "dine_in" | "take_away";
  tableNumber?: string;
  customerName?: string;
  discount?: number;
  note?: string;
  payment: { method: string; amount?: number };
};

type ProductRow = {
  id: string;
  name: string;
  kind: "goods" | "recipe";
  price: string;
  status: string;
  stock_status: string;
  current_stock: string;
};

function n(v: string | number | null | undefined) {
  return Number(v ?? 0);
}

async function nextTransactionNumber(sql: SqlClient) {
  const [row] = await sql<{ last_seq: number }[]>`
    INSERT INTO transaction_counters (day, last_seq)
    VALUES ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date, 1)
    ON CONFLICT (day) DO UPDATE
      SET last_seq = transaction_counters.last_seq + 1
    RETURNING last_seq, day
  `;
  const [dayRow] = await sql<{ day: string }[]>`
    SELECT to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date, 'YYYYMMDD') AS day
  `;
  return `CS-${dayRow.day}-${String(row.last_seq).padStart(5, "0")}`;
}

async function deductGoods(
  sql: SqlClient,
  product: ProductRow,
  qty: number,
  allowNegative: boolean,
) {
  const [locked] = await sql<ProductRow[]>`
    SELECT id, name, kind, price::text, status, stock_status, current_stock::text
    FROM products WHERE id = ${product.id} FOR UPDATE
  `;
  const before = n(locked.current_stock);
  const after = before - qty;
  if (after < 0 && !allowNegative) {
    throw new Error(`Stok '${locked.name}' tidak mencukupi.`);
  }
  const stockStatus = after <= 0 ? "sold_out" : "available";
  await sql`
    UPDATE products
    SET current_stock = ${after}, stock_status = ${stockStatus}, updated_at = NOW()
    WHERE id = ${product.id}
  `;
}

async function restoreGoods(sql: SqlClient, productId: string, qty: number) {
  const [locked] = await sql<ProductRow[]>`
    SELECT id, name, kind, price::text, status, stock_status, current_stock::text
    FROM products WHERE id = ${productId} FOR UPDATE
  `;
  if (!locked) return;
  const after = n(locked.current_stock) + qty;
  await sql`
    UPDATE products
    SET current_stock = ${after}, stock_status = ${after > 0 ? "available" : "sold_out"}, updated_at = NOW()
    WHERE id = ${productId}
  `;
}

async function deductRecipe(
  sql: SqlClient,
  productId: string,
  qty: number,
  reference: string,
  userId: string,
  allowNegative: boolean,
) {
  const [recipe] = await sql<{ id: string }[]>`
    SELECT id FROM recipes WHERE product_id = ${productId}
  `;
  if (!recipe) {
    throw new Error("Produk racikan belum punya resep.");
  }
  const items = await sql<{ inventory_item_id: string; quantity: string }[]>`
    SELECT inventory_item_id, quantity::text FROM recipe_items WHERE recipe_id = ${recipe.id}
  `;
  if (items.length === 0) {
    throw new Error("Resep racikan kosong.");
  }
  for (const item of items) {
    const needed = n(item.quantity) * qty;
    const [inv] = await sql<{ id: string; name: string; current_stock: string }[]>`
      SELECT id, name, current_stock::text FROM inventory_items WHERE id = ${item.inventory_item_id} FOR UPDATE
    `;
    const before = n(inv.current_stock);
    const after = before - needed;
    if (after < 0 && !allowNegative) {
      throw new Error(`Stok bahan '${inv.name}' tidak mencukupi.`);
    }
    await sql`UPDATE inventory_items SET current_stock = ${after}, updated_at = NOW() WHERE id = ${inv.id}`;
    await sql`
      INSERT INTO inventory_movements
        (inventory_item_id, type, quantity, stock_before, stock_after, reference, note, user_id)
      VALUES (${inv.id}, 'sale', ${needed}, ${before}, ${after}, ${reference}, 'Terpakai untuk penjualan', ${userId})
    `;
  }
}

async function restoreRecipe(
  sql: SqlClient,
  productId: string,
  qty: number,
  reference: string,
  userId: string | null,
) {
  const [recipe] = await sql<{ id: string }[]>`
    SELECT id FROM recipes WHERE product_id = ${productId}
  `;
  if (!recipe) return;
  const items = await sql<{ inventory_item_id: string; quantity: string }[]>`
    SELECT inventory_item_id, quantity::text FROM recipe_items WHERE recipe_id = ${recipe.id}
  `;
  for (const item of items) {
    const restore = n(item.quantity) * qty;
    const [inv] = await sql<{ id: string; current_stock: string }[]>`
      SELECT id, current_stock::text FROM inventory_items WHERE id = ${item.inventory_item_id} FOR UPDATE
    `;
    const before = n(inv.current_stock);
    const after = before + restore;
    await sql`UPDATE inventory_items SET current_stock = ${after}, updated_at = NOW() WHERE id = ${inv.id}`;
    await sql`
      INSERT INTO inventory_movements
        (inventory_item_id, type, quantity, stock_before, stock_after, reference, note, user_id)
      VALUES (${inv.id}, 'adjustment', ${restore}, ${before}, ${after}, ${reference}, 'Pengembalian stok dari transaksi dibatalkan', ${userId})
    `;
  }
}

export async function checkoutTransaction(userId: string, payload: CheckoutPayload) {
  if (!payload.items?.length) {
    throw new Error("Keranjang masih kosong.");
  }

  const sql = getSql();
  return sql.begin(async (tx) => {
    const [shift] = await tx<{ id: string }[]>`
      SELECT id FROM shifts WHERE user_id = ${userId} AND status = 'open' LIMIT 1
    `;
    if (!shift) {
      throw new Error("Shift belum dibuka. Buka shift sebelum checkout.");
    }

    const [neg] = await tx<{ setting_value: string | null }[]>`
      SELECT setting_value FROM settings WHERE setting_key = 'allow_negative_stock' LIMIT 1
    `;
    const allowNegative = neg?.setting_value === "1";
    const [taxRow] = await tx<{ setting_value: string | null }[]>`
      SELECT setting_value FROM settings WHERE setting_key = 'tax_percent' LIMIT 1
    `;
    const [svcRow] = await tx<{ setting_value: string | null }[]>`
      SELECT setting_value FROM settings WHERE setting_key = 'service_charge_percent' LIMIT 1
    `;
    const taxPercent = n(taxRow?.setting_value);
    const servicePercent = n(svcRow?.setting_value);

    const built: Array<{
      productId: string;
      productName: string;
      kind: "goods" | "recipe";
      unitPrice: number;
      variantPrice: number;
      addonPrice: number;
      quantity: number;
      note: string;
      subtotal: number;
      variants: { variantName: string; optionName: string; priceAdjustment: number }[];
      addons: { addonName: string; price: number }[];
    }> = [];

    let subtotal = 0;

    for (const raw of payload.items) {
      const qty = Math.max(1, Math.floor(Number(raw.quantity) || 1));
      const [product] = await tx<ProductRow[]>`
        SELECT id, name, kind, price::text, status, stock_status, current_stock::text
        FROM products WHERE id = ${raw.productId} AND status = 'active' LIMIT 1
      `;
      if (!product) throw new Error("Produk tidak ditemukan atau tidak aktif.");
      if (product.stock_status === "sold_out") {
        throw new Error(`Produk ${product.name} sedang habis.`);
      }

      let variantPrice = 0;
      const variantSnapshots: { variantName: string; optionName: string; priceAdjustment: number }[] = [];
      {
        for (const optionId of raw.optionIds ?? []) {
          const [option] = await tx<
            { name: string; price_adjustment: string; variant_name: string; product_id: string }[]
          >`
            SELECT pvo.name, pvo.price_adjustment::text, pv.name AS variant_name, pv.product_id
            FROM product_variant_options pvo
            JOIN product_variants pv ON pv.id = pvo.variant_id
            WHERE pvo.id = ${optionId} LIMIT 1
          `;
          if (!option || option.product_id !== product.id) {
            throw new Error("Variant produk tidak valid.");
          }
          variantPrice += n(option.price_adjustment);
          variantSnapshots.push({
            variantName: option.variant_name,
            optionName: option.name,
            priceAdjustment: n(option.price_adjustment),
          });
        }
      }

      let addonPrice = 0;
      const addonSnapshots: { addonName: string; price: number }[] = [];
      {
        for (const addonId of raw.addonIds ?? []) {
          const [addon] = await tx<{ name: string; price: string }[]>`
            SELECT a.name, a.price::text
            FROM addons a
            JOIN product_addons pa ON pa.addon_id = a.id
            WHERE a.id = ${addonId} AND pa.product_id = ${product.id} AND a.status = 'active'
            LIMIT 1
          `;
          if (!addon) throw new Error("Add-on tidak valid untuk produk ini.");
          addonPrice += n(addon.price);
          addonSnapshots.push({ addonName: addon.name, price: n(addon.price) });
        }
      }

      const unitPrice = n(product.price);
      const line = (unitPrice + variantPrice + addonPrice) * qty;
      subtotal += line;
      built.push({
        productId: product.id,
        productName: product.name,
        kind: product.kind,
        unitPrice,
        variantPrice,
        addonPrice,
        quantity: qty,
        note: (raw.note ?? "").trim(),
        subtotal: line,
        variants: variantSnapshots,
        addons: addonSnapshots,
      });
    }

    let discount = Math.max(0, n(payload.discount));
    if (discount > subtotal) discount = subtotal;
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * taxPercent) / 100;
    const service = Math.round(taxable * servicePercent) / 100;
    const total = taxable + tax + service;

    const methods = ["cash", "qris", "debit", "credit", "ewallet"];
    const method = methods.includes(payload.payment.method) ? payload.payment.method : "cash";
    let amountTendered = n(payload.payment.amount ?? total);
    let changeAmount = 0;
    if (method === "cash") {
      if (amountTendered < total) {
        throw new Error("Uang diterima kurang dari total pembayaran.");
      }
      changeAmount = Math.round((amountTendered - total) * 100) / 100;
    } else {
      amountTendered = total;
    }

    const orderType = payload.orderType === "dine_in" ? "dine_in" : "take_away";
    const tableNumber = orderType === "dine_in" ? (payload.tableNumber ?? "").trim() || null : null;
    const customerName = (payload.customerName ?? "").trim() || null;
    const orderNote = (payload.note ?? "").trim().slice(0, 500) || null;
    const number = await nextTransactionNumber(tx);

    const [trx] = await tx<{ id: string }[]>`
      INSERT INTO transactions (
        transaction_number, shift_id, user_id, order_type, table_number, customer_name,
        subtotal, discount, tax, service_charge, total, status, note
      ) VALUES (
        ${number}, ${shift.id}, ${userId}, ${orderType}, ${tableNumber}, ${customerName},
        ${subtotal}, ${discount}, ${tax}, ${service}, ${total}, 'completed', ${orderNote}
      )
      RETURNING id
    `;

    for (const item of built) {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO transaction_items (
          transaction_id, product_id, product_name, unit_price, variant_price, addon_price,
          quantity, discount, note, subtotal
        ) VALUES (
          ${trx.id}, ${item.productId}, ${item.productName}, ${item.unitPrice}, ${item.variantPrice},
          ${item.addonPrice}, ${item.quantity}, 0, ${item.note || null}, ${item.subtotal}
        )
        RETURNING id
      `;
      for (const v of item.variants) {
        await tx`
          INSERT INTO transaction_item_variants (transaction_item_id, variant_name, option_name, price_adjustment)
          VALUES (${row.id}, ${v.variantName}, ${v.optionName}, ${v.priceAdjustment})
        `;
      }
      for (const a of item.addons) {
        await tx`
          INSERT INTO transaction_item_addons (transaction_item_id, addon_name, price)
          VALUES (${row.id}, ${a.addonName}, ${a.price})
        `;
      }

      if (item.kind === "goods") {
        await deductGoods(tx, {
          id: item.productId,
          name: item.productName,
          kind: "goods",
          price: String(item.unitPrice),
          status: "active",
          stock_status: "available",
          current_stock: "0",
        }, item.quantity, allowNegative);
      } else {
        await deductRecipe(tx, item.productId, item.quantity, number, userId, allowNegative);
      }
    }

    await tx`
      INSERT INTO payments (transaction_id, method, amount, change_amount)
      VALUES (${trx.id}, ${method}, ${amountTendered}, ${changeAmount})
    `;

    if (method === "cash") {
      await tx`
        UPDATE shifts SET cash_sales = cash_sales + ${total} WHERE id = ${shift.id}
      `;
    }

    return { id: trx.id, transactionNumber: number, total, changeAmount };
  });
}

export async function cancelTransaction(id: string, userId: string | null) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [trx] = await tx<
      { id: string; status: string; transaction_number: string; shift_id: string | null; total: string }[]
    >`
      SELECT id, status, transaction_number, shift_id, total::text
      FROM transactions WHERE id = ${id} FOR UPDATE
    `;
    if (!trx || trx.status === "cancelled") {
      throw new Error("Transaksi tidak ditemukan atau sudah dibatalkan.");
    }

    const items = await tx<{ product_id: string; quantity: number }[]>`
      SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ${id}
    `;
    for (const item of items) {
      const [product] = await tx<{ kind: "goods" | "recipe" }[]>`
        SELECT kind FROM products WHERE id = ${item.product_id}
      `;
      if (!product) continue;
      if (product.kind === "goods") {
        await restoreGoods(tx, item.product_id, item.quantity);
      } else {
        await restoreRecipe(tx, item.product_id, item.quantity, trx.transaction_number, userId);
      }
    }

    const [pay] = await tx<{ method: string }[]>`
      SELECT method FROM payments WHERE transaction_id = ${id} LIMIT 1
    `;
    if (pay?.method === "cash" && trx.shift_id) {
      await tx`
        UPDATE shifts SET cash_sales = GREATEST(0, cash_sales - ${n(trx.total)})
        WHERE id = ${trx.shift_id}
      `;
    }

    await tx`UPDATE transactions SET status = 'cancelled' WHERE id = ${id}`;
  });
}
