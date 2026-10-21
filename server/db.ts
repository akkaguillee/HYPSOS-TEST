import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Address } from '../shared/schemas';
import type { OrderTotals } from '../shared/types';

/**
 * Persistencia con SQLite (módulo nativo de Node 22, sin dependencias).
 * Toda la aplicación usa la interfaz `Repositories`: para escalar a varias
 * instancias se sustituye este módulo por Postgres sin tocar las rutas.
 */

const migrations: string[] = [
  `CREATE TABLE orders (
     id TEXT PRIMARY KEY,
     number TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL,
     email TEXT NOT NULL,
     shipping_address TEXT NOT NULL,
     shipping_method TEXT NOT NULL,
     items TEXT NOT NULL,
     subtotal INTEGER NOT NULL,
     shipping INTEGER NOT NULL,
     total INTEGER NOT NULL,
     currency TEXT NOT NULL,
     marketing_opt_in INTEGER NOT NULL DEFAULT 0,
     payment_session_id TEXT UNIQUE,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE newsletter_subscribers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL,
     source TEXT,
     consent_at TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE contact_messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     subject TEXT NOT NULL,
     order_number TEXT,
     message TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'nuevo',
     created_at TEXT NOT NULL
   );`,
  // v2 — inventario con reservas, cuentas de usuario y pedidos vinculados.
  `CREATE TABLE inventory (
     variant_id TEXT PRIMARY KEY,
     product_id TEXT NOT NULL,
     stock INTEGER NOT NULL CHECK (stock >= 0),
     reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
     updated_at TEXT NOT NULL
   );
   CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     name TEXT NOT NULL,
     marketing_opt_in INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE password_resets (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TEXT NOT NULL,
     used_at TEXT
   );
   CREATE TABLE addresses (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     data TEXT NOT NULL,
     is_default INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL
   );
   CREATE INDEX addresses_user ON addresses(user_id);
   CREATE TABLE wishlists (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     product_id TEXT NOT NULL,
     created_at TEXT NOT NULL,
     PRIMARY KEY (user_id, product_id)
   );
   ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
   ALTER TABLE orders ADD COLUMN checkout_id TEXT;
   ALTER TABLE orders ADD COLUMN reservation TEXT NOT NULL DEFAULT 'none';
   ALTER TABLE orders ADD COLUMN expires_at TEXT;
   ALTER TABLE orders ADD COLUMN payment_url TEXT;
   ALTER TABLE orders ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;
   CREATE UNIQUE INDEX orders_checkout_id ON orders(checkout_id);
   CREATE INDEX orders_user ON orders(user_id);
   CREATE TABLE stock_alerts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL,
     variant_id TEXT NOT NULL,
     created_at TEXT NOT NULL,
     notified_at TEXT,
     UNIQUE (email, variant_id)
   );`,
];

export type OrderStatus = 'pending_payment' | 'paid' | 'expired' | 'cancelled' | 'shipped';
export type ReservationState = 'none' | 'held' | 'released' | 'committed';

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  colorId: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderRecord {
  id: string;
  number: string;
  status: OrderStatus;
  email: string;
  userId: number | null;
  checkoutId: string | null;
  shippingAddress: Record<string, string>;
  shippingMethod: string;
  items: OrderItem[];
  totals: Pick<OrderTotals, 'subtotal' | 'shipping' | 'total'>;
  currency: string;
  marketingOptIn: boolean;
  paymentSessionId: string | null;
  paymentUrl: string | null;
  reservation: ReservationState;
  expiresAt: string | null;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewOrder = Omit<OrderRecord, 'createdAt' | 'updatedAt' | 'paymentSessionId' | 'paymentUrl' | 'reservation' | 'needsReview'>;

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  marketingOptIn: boolean;
  passwordHash: string;
  createdAt: string;
}

export interface AddressRecord extends Address {
  id: number;
}

export class InsufficientStockError extends Error {
  constructor(readonly variantId: string, readonly available: number) {
    super(`Stock insuficiente para ${variantId}`);
  }
}

export interface Repositories {
  inventory: {
    /** Inserta las variantes nuevas con su stock inicial; no toca las existentes. */
    seed(variants: { variantId: string; productId: string; stock: number }[]): number;
    /** Unidades disponibles (stock − reservadas) por variante. */
    available(): Map<string, number>;
    get(variantId: string): { stock: number; reserved: number } | undefined;
    set(variantId: string, stock: number): boolean;
  };
  orders: {
    /** Crea el pedido y reserva su stock en una sola transacción. */
    createWithReservation(order: NewOrder): OrderRecord;
    attachPaymentSession(id: string, sessionId: string, url: string): void;
    findById(id: string): OrderRecord | undefined;
    findByNumber(number: string): OrderRecord | undefined;
    findByCheckoutId(checkoutId: string): OrderRecord | undefined;
    findByPaymentSession(sessionId: string): OrderRecord | undefined;
    listByUser(userId: number): OrderRecord[];
    list(limit?: number): OrderRecord[];
    /** Pago confirmado: descuenta el stock reservado de forma definitiva. */
    markPaid(id: string): OrderRecord;
    /** Pago no completado: libera la reserva. */
    release(id: string, status: Extract<OrderStatus, 'expired' | 'cancelled'>): void;
    /** Pedidos con reserva caducada (por si un webhook no llega). */
    expiredReservations(now?: Date): OrderRecord[];
    updateStatus(id: string, status: OrderStatus): void;
    delete(id: string): void;
  };
  users: {
    create(user: { email: string; name: string; passwordHash: string; marketingOptIn: boolean }): UserRecord;
    findByEmail(email: string): UserRecord | undefined;
    findById(id: number): UserRecord | undefined;
    update(id: number, data: { name: string; marketingOptIn: boolean }): void;
    setPassword(id: number, passwordHash: string): void;
    delete(id: number): void;
  };
  sessions: {
    create(tokenHash: string, userId: number, expiresAt: Date): void;
    findUser(tokenHash: string, now?: Date): UserRecord | undefined;
    delete(tokenHash: string): void;
    deleteForUser(userId: number): void;
  };
  passwordResets: {
    create(tokenHash: string, userId: number, expiresAt: Date): void;
    /** Consume un token válido y devuelve su usuario (un solo uso). */
    consume(tokenHash: string, now?: Date): number | undefined;
  };
  addresses: {
    list(userId: number): AddressRecord[];
    create(userId: number, address: Address): AddressRecord;
    update(userId: number, id: number, address: Address): AddressRecord | undefined;
    delete(userId: number, id: number): boolean;
  };
  wishlists: {
    list(userId: number): string[];
    replace(userId: number, productIds: string[]): string[];
  };
  newsletter: {
    /** Devuelve `false` si el email ya estaba suscrito. */
    subscribe(email: string, source: string | undefined): boolean;
  };
  stockAlerts: {
    create(email: string, variantId: string): void;
    pending(variantId: string): { id: number; email: string }[];
    markNotified(ids: number[]): void;
  };
  contact: {
    create(message: { name: string; email: string; subject: string; orderNumber: string; message: string }): number;
  };
  close(): void;
}

type Row = Record<string, string | number | null>;

function rowToOrder(row: Row): OrderRecord {
  return {
    id: String(row.id),
    number: String(row.number),
    status: row.status as OrderStatus,
    email: String(row.email),
    userId: row.user_id === null ? null : Number(row.user_id),
    checkoutId: row.checkout_id === null ? null : String(row.checkout_id),
    shippingAddress: JSON.parse(String(row.shipping_address)),
    shippingMethod: String(row.shipping_method),
    items: JSON.parse(String(row.items)),
    totals: { subtotal: Number(row.subtotal), shipping: Number(row.shipping), total: Number(row.total) },
    currency: String(row.currency),
    marketingOptIn: Number(row.marketing_opt_in) === 1,
    paymentSessionId: row.payment_session_id === null ? null : String(row.payment_session_id),
    paymentUrl: row.payment_url === null ? null : String(row.payment_url),
    reservation: row.reservation as ReservationState,
    expiresAt: row.expires_at === null ? null : String(row.expires_at),
    needsReview: Number(row.needs_review) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToUser(row: Row): UserRecord {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    marketingOptIn: Number(row.marketing_opt_in) === 1,
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
  };
}

function rowToAddress(row: Row): AddressRecord {
  return { ...(JSON.parse(String(row.data)) as Address), id: Number(row.id), isDefault: Number(row.is_default) === 1 };
}

function migrate(db: DatabaseSync) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let version = current; version < migrations.length; version++) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function openDatabase(path: string): Repositories {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);

  const now = () => new Date().toISOString();

  /** Ejecuta `fn` en una transacción inmediata (bloquea escrituras concurrentes). */
  const transaction = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  const q = {
    seedVariant: db.prepare(
      `INSERT INTO inventory (variant_id, product_id, stock, reserved, updated_at) VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(variant_id) DO NOTHING`,
    ),
    inventoryAll: db.prepare('SELECT variant_id, stock, reserved FROM inventory'),
    inventoryOne: db.prepare('SELECT stock, reserved FROM inventory WHERE variant_id = ?'),
    inventorySet: db.prepare('UPDATE inventory SET stock = ?, updated_at = ? WHERE variant_id = ? AND ? >= reserved'),
    reserve: db.prepare(
      'UPDATE inventory SET reserved = reserved + ?, updated_at = ? WHERE variant_id = ? AND stock - reserved >= ?',
    ),
    unreserve: db.prepare('UPDATE inventory SET reserved = MAX(0, reserved - ?), updated_at = ? WHERE variant_id = ?'),
    commit: db.prepare(
      'UPDATE inventory SET stock = stock - ?, reserved = MAX(0, reserved - ?), updated_at = ? WHERE variant_id = ? AND stock >= ?',
    ),
    insertOrder: db.prepare(
      `INSERT INTO orders (id, number, status, email, user_id, checkout_id, shipping_address, shipping_method, items, subtotal, shipping, total, currency,
         marketing_opt_in, reservation, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?)`,
    ),
    attachSession: db.prepare('UPDATE orders SET payment_session_id = ?, payment_url = ?, updated_at = ? WHERE id = ?'),
    orderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
    orderByNumber: db.prepare('SELECT * FROM orders WHERE number = ?'),
    orderByCheckout: db.prepare('SELECT * FROM orders WHERE checkout_id = ?'),
    orderBySession: db.prepare('SELECT * FROM orders WHERE payment_session_id = ?'),
    ordersByUser: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'),
    ordersList: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'),
    expiredHeld: db.prepare("SELECT * FROM orders WHERE reservation = 'held' AND expires_at IS NOT NULL AND expires_at < ?"),
    setOrderState: db.prepare('UPDATE orders SET status = ?, reservation = ?, needs_review = ?, updated_at = ? WHERE id = ?'),
    updateStatus: db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
    deleteOrder: db.prepare('DELETE FROM orders WHERE id = ?'),
    insertUser: db.prepare(
      'INSERT INTO users (email, password_hash, name, marketing_opt_in, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    updateUser: db.prepare('UPDATE users SET name = ?, marketing_opt_in = ?, updated_at = ? WHERE id = ?'),
    setPassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
    unlinkOrders: db.prepare('UPDATE orders SET user_id = NULL WHERE user_id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    sessionUser: db.prepare(
      'SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?',
    ),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    insertReset: db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    findReset: db.prepare('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?'),
    useReset: db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?'),
    addressesByUser: db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC'),
    insertAddress: db.prepare('INSERT INTO addresses (user_id, data, is_default, created_at) VALUES (?, ?, ?, ?)'),
    updateAddress: db.prepare('UPDATE addresses SET data = ?, is_default = ? WHERE id = ? AND user_id = ?'),
    clearDefaultAddress: db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?'),
    addressById: db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?'),
    deleteAddress: db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?'),
    wishlist: db.prepare('SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC'),
    clearWishlist: db.prepare('DELETE FROM wishlists WHERE user_id = ?'),
    addWishlist: db.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id, created_at) VALUES (?, ?, ?)'),
    insertAlert: db.prepare(
      `INSERT INTO stock_alerts (email, variant_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email, variant_id) DO UPDATE SET notified_at = NULL, created_at = excluded.created_at`,
    ),
    pendingAlerts: db.prepare('SELECT id, email FROM stock_alerts WHERE variant_id = ? AND notified_at IS NULL'),
    notifyAlert: db.prepare('UPDATE stock_alerts SET notified_at = ? WHERE id = ?'),
    subscribe: db.prepare(
      `INSERT INTO newsletter_subscribers (email, status, source, consent_at, created_at) VALUES (?, 'subscribed', ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    ),
    insertContact: db.prepare(
      'INSERT INTO contact_messages (name, email, subject, order_number, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
  };

  const releaseItems = (order: OrderRecord) => {
    const timestamp = now();
    for (const item of order.items) q.unreserve.run(item.quantity, timestamp, item.variantId);
  };

  return {
    inventory: {
      seed(variants) {
        return transaction(() => {
          const timestamp = now();
          let inserted = 0;
          for (const variant of variants) {
            inserted += Number(q.seedVariant.run(variant.variantId, variant.productId, variant.stock, timestamp).changes);
          }
          return inserted;
        });
      },
      available() {
        const rows = q.inventoryAll.all() as { variant_id: string; stock: number; reserved: number }[];
        return new Map(rows.map((row) => [row.variant_id, Math.max(0, row.stock - row.reserved)]));
      },
      get(variantId) {
        return q.inventoryOne.get(variantId) as { stock: number; reserved: number } | undefined;
      },
      set(variantId, stock) {
        return Number(q.inventorySet.run(stock, now(), variantId, stock).changes) > 0;
      },
    },
    orders: {
      createWithReservation(order) {
        return transaction(() => {
          const timestamp = now();
          for (const item of order.items) {
            const reserved = Number(q.reserve.run(item.quantity, timestamp, item.variantId, item.quantity).changes);
            if (!reserved) {
              const row = q.inventoryOne.get(item.variantId) as { stock: number; reserved: number } | undefined;
              throw new InsufficientStockError(item.variantId, row ? Math.max(0, row.stock - row.reserved) : 0);
            }
          }
          q.insertOrder.run(
            order.id,
            order.number,
            order.status,
            order.email,
            order.userId,
            order.checkoutId,
            JSON.stringify(order.shippingAddress),
            order.shippingMethod,
            JSON.stringify(order.items),
            order.totals.subtotal,
            order.totals.shipping,
            order.totals.total,
            order.currency,
            order.marketingOptIn ? 1 : 0,
            order.expiresAt,
            timestamp,
            timestamp,
          );
          return rowToOrder(q.orderById.get(order.id) as Row);
        });
      },
      attachPaymentSession(id, sessionId, url) {
        q.attachSession.run(sessionId, url, now(), id);
      },
      findById(id) {
        const row = q.orderById.get(id) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      findByNumber(number) {
        const row = q.orderByNumber.get(number) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      findByCheckoutId(checkoutId) {
        const row = q.orderByCheckout.get(checkoutId) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      findByPaymentSession(sessionId) {
        const row = q.orderBySession.get(sessionId) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      listByUser(userId) {
        return (q.ordersByUser.all(userId) as Row[]).map(rowToOrder);
      },
      list(limit = 50) {
        return (q.ordersList.all(limit) as Row[]).map(rowToOrder);
      },
      markPaid(id) {
        return transaction(() => {
          const order = rowToOrder(q.orderById.get(id) as Row);
          if (order.status === 'paid' || order.reservation === 'committed') return order; // webhook repetido
          const timestamp = now();
          let needsReview = false;
          for (const item of order.items) {
            const reservedQty = order.reservation === 'held' ? item.quantity : 0;
            const done = Number(q.commit.run(item.quantity, reservedQty, timestamp, item.variantId, item.quantity).changes);
            // Pago tras caducar la reserva y sin stock suficiente: requiere revisión manual.
            if (!done) needsReview = true;
          }
          q.setOrderState.run('paid', 'committed', needsReview ? 1 : 0, timestamp, id);
          return rowToOrder(q.orderById.get(id) as Row);
        });
      },
      release(id, status) {
        transaction(() => {
          const order = rowToOrder(q.orderById.get(id) as Row);
          if (order.reservation === 'held') releaseItems(order);
          if (order.status === 'pending_payment') q.setOrderState.run(status, 'released', 0, now(), id);
        });
      },
      expiredReservations(at = new Date()) {
        return (q.expiredHeld.all(at.toISOString()) as Row[]).map(rowToOrder);
      },
      updateStatus(id, status) {
        q.updateStatus.run(status, now(), id);
      },
      delete(id) {
        transaction(() => {
          const row = q.orderById.get(id) as Row | undefined;
          if (!row) return;
          const order = rowToOrder(row);
          if (order.reservation === 'held') releaseItems(order);
          q.deleteOrder.run(id);
        });
      },
    },
    users: {
      create(user) {
        const timestamp = now();
        const result = q.insertUser.run(user.email, user.passwordHash, user.name, user.marketingOptIn ? 1 : 0, timestamp, timestamp);
        return rowToUser(q.userById.get(Number(result.lastInsertRowid)) as Row);
      },
      findByEmail(email) {
        const row = q.userByEmail.get(email) as Row | undefined;
        return row ? rowToUser(row) : undefined;
      },
      findById(id) {
        const row = q.userById.get(id) as Row | undefined;
        return row ? rowToUser(row) : undefined;
      },
      update(id, data) {
        q.updateUser.run(data.name, data.marketingOptIn ? 1 : 0, now(), id);
      },
      setPassword(id, passwordHash) {
        q.setPassword.run(passwordHash, now(), id);
      },
      delete(id) {
        transaction(() => {
          // Los pedidos se conservan (obligación fiscal) pero se desvinculan de la cuenta.
          q.unlinkOrders.run(id);
          q.deleteUser.run(id);
        });
      },
    },
    sessions: {
      create(tokenHash, userId, expiresAt) {
        q.insertSession.run(tokenHash, userId, now(), expiresAt.toISOString());
      },
      findUser(tokenHash, at = new Date()) {
        const row = q.sessionUser.get(tokenHash, at.toISOString()) as Row | undefined;
        return row ? rowToUser(row) : undefined;
      },
      delete(tokenHash) {
        q.deleteSession.run(tokenHash);
      },
      deleteForUser(userId) {
        q.deleteUserSessions.run(userId);
      },
    },
    passwordResets: {
      create(tokenHash, userId, expiresAt) {
        q.insertReset.run(tokenHash, userId, expiresAt.toISOString());
      },
      consume(tokenHash, at = new Date()) {
        return transaction(() => {
          const row = q.findReset.get(tokenHash, at.toISOString()) as { user_id: number } | undefined;
          if (!row) return undefined;
          q.useReset.run(at.toISOString(), tokenHash);
          return Number(row.user_id);
        });
      },
    },
    addresses: {
      list(userId) {
        return (q.addressesByUser.all(userId) as Row[]).map(rowToAddress);
      },
      create(userId, address) {
        return transaction(() => {
          const isFirst = (q.addressesByUser.all(userId) as Row[]).length === 0;
          const isDefault = address.isDefault || isFirst;
          if (isDefault) q.clearDefaultAddress.run(userId);
          const result = q.insertAddress.run(userId, JSON.stringify({ ...address, isDefault }), isDefault ? 1 : 0, now());
          return rowToAddress(q.addressById.get(Number(result.lastInsertRowid), userId) as Row);
        });
      },
      update(userId, id, address) {
        return transaction(() => {
          if (!q.addressById.get(id, userId)) return undefined;
          if (address.isDefault) q.clearDefaultAddress.run(userId);
          q.updateAddress.run(JSON.stringify(address), address.isDefault ? 1 : 0, id, userId);
          return rowToAddress(q.addressById.get(id, userId) as Row);
        });
      },
      delete(userId, id) {
        return Number(q.deleteAddress.run(id, userId).changes) > 0;
      },
    },
    wishlists: {
      list(userId) {
        return (q.wishlist.all(userId) as { product_id: string }[]).map((row) => row.product_id);
      },
      replace(userId, productIds) {
        return transaction(() => {
          q.clearWishlist.run(userId);
          // Se guardan en orden inverso para que el primero quede como el más reciente.
          const base = Date.now();
          productIds.forEach((productId, index) =>
            q.addWishlist.run(userId, productId, new Date(base - index).toISOString()),
          );
          return (q.wishlist.all(userId) as { product_id: string }[]).map((row) => row.product_id);
        });
      },
    },
    newsletter: {
      subscribe(email, source) {
        const timestamp = now();
        const result = q.subscribe.run(email, source ?? null, timestamp, timestamp);
        return Number(result.changes) > 0;
      },
    },
    stockAlerts: {
      create(email, variantId) {
        q.insertAlert.run(email, variantId, now());
      },
      pending(variantId) {
        return (q.pendingAlerts.all(variantId) as { id: number; email: string }[]).map((row) => ({ id: Number(row.id), email: String(row.email) }));
      },
      markNotified(ids) {
        transaction(() => {
          const timestamp = now();
          for (const id of ids) q.notifyAlert.run(timestamp, id);
        });
      },
    },
    contact: {
      create(message) {
        const result = q.insertContact.run(message.name, message.email, message.subject, message.orderNumber || null, message.message, now());
        return Number(result.lastInsertRowid);
      },
    },
    close() {
      db.close();
    },
  };
}
