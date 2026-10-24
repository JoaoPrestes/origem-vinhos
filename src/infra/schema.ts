import { pgTable, uuid, text, timestamp, integer, numeric, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Tabela de Usuários (Identity)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  birthDate: timestamp('birth_date', { mode: 'date' }).notNull(),
  profile: text('profile').$type<'Customer' | 'Admin'>().notNull().default('Customer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 2. Tabela de Produtos (Catalog)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  image: text('image').notNull(),
  type: text('type').$type<'Tinto' | 'Branco' | 'Rosé' | 'Espumante' | 'Sobremesa'>().notNull(),
  grape: text('grape').notNull(),
  country: text('country').notNull(),
  harvest: integer('harvest').notNull(), // Safra (ano)
  alcohol: numeric('alcohol', { precision: 4, scale: 2 }).notNull(), // Ex: 13.50
  stock: integer('stock').notNull().default(0), // Unidades disponíveis para venda imediata
  sensory_profile: text('sensory_profile'),      // Ex: "Corpo cheio, taninos firmes, notas de ameixa e carvalho"
  pairing: text('pairing'),                      // Ex: "Carnes grelhadas, picanha, queijos maturados"
  harvest_notes: text('harvest_notes'),          // Ex: "Verão seco com colheita manual em março; safra de guarda excepcional"
  version: integer('version').notNull().default(1), // Versão monotônica para controle de concorrência e idempotência
  deletedAt: timestamp('deleted_at'), // Campo para Soft Delete (nulo se ativo)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 3. Tabela de Itens do Carrinho (Cart)
export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id), // Sem cascade físico, pois faremos soft delete lógico
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 4. Tabela de Endereços (Address)
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  zipCode: text('zip_code').notNull(),
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  label: text('label').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 5. Tabela de Favoritos (Favorites)
export const favorites = pgTable('favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id), // Sem cascade físico para suportar soft delete do catálogo
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userProductUniqueIdx: uniqueIndex('favorites_user_product_unique_idx').on(table.userId, table.productId),
  userIdIdx: index('favorites_user_id_idx').on(table.userId),
}));

// 6. Relações entre as tabelas (Drizzle Relations)
export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  addresses: many(addresses),
  favorites: many(favorites),
}));

export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  favorites: many(favorites),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id],
  }),
}));

// ==========================================
// 6. Tabela de Pedidos (Orders - spec08)
// ==========================================
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  displayCode: text('display_code').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  status: text('status')
    .$type<'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'>()
    .notNull()
    .default('PENDING_PAYMENT'),
  totalCents: integer('total_cents').notNull(),
  itemsCount: integer('items_count').notNull(),
  currency: text('currency').notNull().default('BRL'),
  shippingRecipientName: text('shipping_recipient_name').notNull(),
  shippingZipCode: text('shipping_zip_code').notNull(),
  shippingStreet: text('shipping_street').notNull(),
  shippingNumber: text('shipping_number').notNull(),
  shippingComplement: text('shipping_complement'),
  shippingNeighborhood: text('shipping_neighborhood').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingState: text('shipping_state').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ordersUserCreatedIdx: index('orders_user_created_idx').on(table.userId, table.createdAt),
  ordersStatusIdx: index('orders_status_idx').on(table.status),
  ordersDisplayCodeIdx: uniqueIndex('orders_display_code_idx').on(table.displayCode),
}));

// ==========================================
// 7. Tabela de Itens do Pedido (Order Items - Snapshot)
// ==========================================
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'restrict' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  cartItemId: uuid('cart_item_id').notNull(),
  productName: text('product_name').notNull(),
  productImage: text('product_image').notNull(),
  productType: text('product_type').notNull(),
  productGrape: text('product_grape').notNull(),
  productHarvest: integer('product_harvest').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderItemsOrderIdIdx: index('order_items_order_id_idx').on(table.orderId),
  orderItemsCartItemIdx: index('order_items_cart_item_idx').on(table.cartItemId),
}));

// ==========================================
// 8. Tabela de Trilha de Auditoria (Order History)
// ==========================================
export const orderHistory = pgTable('order_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'restrict' }),
  recordType: text('record_type')
    .$type<'STATE_TRANSITION' | 'OPERATIONAL_ALERT' | 'RECONCILIATION_LOG'>()
    .notNull()
    .default('STATE_TRANSITION'),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  reason: text('reason').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderHistoryOrderIdIdx: index('order_history_order_id_idx').on(table.orderId),
}));

// ==========================================
// 9. Tabela de Idempotência de Pedidos (Order Idempotency)
// ==========================================
export const orderIdempotency = pgTable('order_idempotency', {
  idempotencyKey: text('idempotency_key').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  requestHash: text('request_hash').notNull(),
  status: text('status')
    .$type<'PROCESSING' | 'COMPLETED' | 'FAILED'>()
    .notNull()
    .default('PROCESSING'),
  orderId: uuid('order_id').references(() => orders.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: index('order_idempotency_pk').on(table.idempotencyKey, table.userId),
  orderIdempotencyExpiresIdx: index('order_idempotency_expires_idx').on(table.expiresAt),
}));

// ==========================================
// 10. Tabela de Deduplicação Inbox (Order Inbox Events)
// ==========================================
export const orderInboxEvents = pgTable('order_inbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  status: text('status').notNull().default('PROCESSED'),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderInboxEventIdIdx: uniqueIndex('order_inbox_event_id_idx').on(table.eventId),
}));

// ==========================================
// Relações do Domínio de Pedidos
// ==========================================
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  history: many(orderHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ==========================================
// 11. Tabela de Tentativas de Pagamento (Payment Attempts - spec07)
// ==========================================
export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'restrict' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  attemptNumber: integer('attempt_number').notNull().default(1),
  method: text('method')
    .$type<'CREDIT_CARD' | 'PIX' | 'BOLETO'>()
    .notNull(),
  installments: integer('installments').notNull().default(1),
  amountCents: integer('amount_cents').notNull(),
  status: text('status')
    .$type<'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'PAID_AFTER_EXPIRATION'>()
    .notNull()
    .default('PENDING'),
  providerName: text('provider_name').notNull(),
  providerPaymentId: text('provider_payment_id'),
  providerIdempotencyKey: text('provider_idempotency_key').notNull().unique(),
  qrCodePix: text('qr_code_pix'),
  qrCodePixUrl: text('qr_code_pix_url'),
  boletoBarcode: text('boleto_barcode'),
  boletoUrl: text('boleto_url'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  paymentAttemptsOrderIdx: index('payment_attempts_order_idx').on(table.orderId),
  paymentAttemptsProviderIdx: index('payment_attempts_provider_idx').on(table.providerPaymentId),
  paymentAttemptsExpiresIdx: index('payment_attempts_expires_idx').on(table.status, table.expiresAt),
}));

// ==========================================
// 12. Trilha de Auditoria Financeira (Payment History)
// ==========================================
export const paymentHistory = pgTable('payment_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentAttemptId: uuid('payment_attempt_id')
    .notNull()
    .references(() => paymentAttempts.id, { onDelete: 'restrict' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paymentHistoryAttemptIdx: index('payment_history_attempt_idx').on(table.paymentAttemptId),
}));

// ==========================================
// 13. Transactional Outbox Financeira (Payment Outbox)
// ==========================================
export const paymentOutbox = pgTable('payment_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  payload: text('payload').notNull(), // JSON serializado do PaymentOutboxEventPayload
  status: text('status')
    .$type<'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'>()
    .notNull()
    .default('PENDING'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  paymentOutboxPendingIdx: index('payment_outbox_pending_idx').on(table.status, table.createdAt),
}));

// ==========================================
// 14. Idempotência de Pagamento HTTP (Payment Idempotency)
// ==========================================
export const paymentIdempotency = pgTable('payment_idempotency', {
  idempotencyKey: text('idempotency_key').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  requestHash: text('request_hash').notNull(),
  responseCode: integer('response_code'),
  responseBody: text('response_body'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paymentIdempotencyPk: index('payment_idempotency_pk').on(table.idempotencyKey, table.userId),
  paymentIdempotencyExpiresIdx: index('payment_idempotency_expires_idx').on(table.expiresAt),
}));

// Relações de Pagamento
export const paymentAttemptsRelations = relations(paymentAttempts, ({ one, many }) => ({
  order: one(orders, {
    fields: [paymentAttempts.orderId],
    references: [orders.id],
  }),
  history: many(paymentHistory),
}));

// ==========================================
// 15. Tabela catalog_outbox (RAG Ingestion Queue - spec09 §6.1)
// ==========================================
export const catalogOutbox = pgTable(
  'catalog_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull(),
    eventType: text('event_type').notNull(), // 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
    version: integer('version').notNull(),
    status: text('status').$type<'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'>().notNull().default('PENDING'),
    retryCount: integer('retry_count').notNull().default(0),
    lockedUntil: timestamp('locked_until'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    catalogOutboxPendingIdx: index('catalog_outbox_pending_idx').on(table.status, table.createdAt),
    catalogOutboxLeaseIdx: index('catalog_outbox_lease_idx').on(table.status, table.lockedUntil),
    catalogOutboxProductIdx: index('catalog_outbox_product_idx').on(table.productId),
  })
);



