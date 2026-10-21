import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { OrderTotals, ShippingMethodId } from '../shared/types';

/**
 * Persistencia con SQLite (módulo nativo de Node 22, sin dependencias).
 * Para escalar a varias instancias, sustituir este módulo por Postgres manteniendo
 * la misma interfaz `Repositories`.
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
];

export type OrderStatus = 'pending_payment' | 'paid' | 'expired' | 'cancelled';

export interface OrderItem {
  productId: string;
  code: string;
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
  shippingAddress: Record<string, string>;
  shippingMethod: ShippingMethodId;
  items: OrderItem[];
  totals: Pick<OrderTotals, 'subtotal' | 'shipping' | 'total'>;
  currency: string;
  marketingOptIn: boolean;
  paymentSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repositories {
  orders: {
    create(order: Omit<OrderRecord, 'createdAt' | 'updatedAt' | 'paymentSessionId'>): OrderRecord;
    attachPaymentSession(id: string, sessionId: string): void;
    findById(id: string): OrderRecord | undefined;
    findByPaymentSession(sessionId: string): OrderRecord | undefined;
    updateStatus(id: string, status: OrderStatus): void;
    delete(id: string): void;
  };
  newsletter: {
    /** Devuelve `false` si el email ya estaba suscrito. */
    subscribe(email: string, source: string | undefined): boolean;
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
    shippingAddress: JSON.parse(String(row.shipping_address)),
    shippingMethod: row.shipping_method as ShippingMethodId,
    items: JSON.parse(String(row.items)),
    totals: { subtotal: Number(row.subtotal), shipping: Number(row.shipping), total: Number(row.total) },
    currency: String(row.currency),
    marketingOptIn: Number(row.marketing_opt_in) === 1,
    paymentSessionId: row.payment_session_id === null ? null : String(row.payment_session_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
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

  const statements = {
    insertOrder: db.prepare(
      `INSERT INTO orders (id, number, status, email, shipping_address, shipping_method, items, subtotal, shipping, total, currency, marketing_opt_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    attachSession: db.prepare('UPDATE orders SET payment_session_id = ?, updated_at = ? WHERE id = ?'),
    orderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
    orderBySession: db.prepare('SELECT * FROM orders WHERE payment_session_id = ?'),
    updateStatus: db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
    deleteOrder: db.prepare('DELETE FROM orders WHERE id = ?'),
    subscribe: db.prepare(
      `INSERT INTO newsletter_subscribers (email, status, source, consent_at, created_at) VALUES (?, 'subscribed', ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    ),
    insertContact: db.prepare(
      'INSERT INTO contact_messages (name, email, subject, order_number, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
  };

  return {
    orders: {
      create(order) {
        const timestamp = now();
        statements.insertOrder.run(
          order.id,
          order.number,
          order.status,
          order.email,
          JSON.stringify(order.shippingAddress),
          order.shippingMethod,
          JSON.stringify(order.items),
          order.totals.subtotal,
          order.totals.shipping,
          order.totals.total,
          order.currency,
          order.marketingOptIn ? 1 : 0,
          timestamp,
          timestamp,
        );
        return { ...order, paymentSessionId: null, createdAt: timestamp, updatedAt: timestamp };
      },
      attachPaymentSession(id, sessionId) {
        statements.attachSession.run(sessionId, now(), id);
      },
      findById(id) {
        const row = statements.orderById.get(id) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      findByPaymentSession(sessionId) {
        const row = statements.orderBySession.get(sessionId) as Row | undefined;
        return row ? rowToOrder(row) : undefined;
      },
      updateStatus(id, status) {
        statements.updateStatus.run(status, now(), id);
      },
      delete(id) {
        statements.deleteOrder.run(id);
      },
    },
    newsletter: {
      subscribe(email, source) {
        const timestamp = now();
        const result = statements.subscribe.run(email, source ?? null, timestamp, timestamp);
        return Number(result.changes) > 0;
      },
    },
    contact: {
      create(message) {
        const result = statements.insertContact.run(
          message.name,
          message.email,
          message.subject,
          message.orderNumber || null,
          message.message,
          now(),
        );
        return Number(result.lastInsertRowid);
      },
    },
    close() {
      db.close();
    },
  };
}
