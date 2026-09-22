import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260922081536 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "delivery_day" drop constraint if exists "delivery_day_date_unique";`);
    this.addSql(`create table if not exists "delivery_day" ("id" text not null, "date" text not null, "closed" boolean not null default false, "max_orders" integer null, "max_per_window" integer null, "booked" integer not null default 0, "window_counts" jsonb null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "delivery_day_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_delivery_day_date_unique" ON "delivery_day" ("date") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_delivery_day_deleted_at" ON "delivery_day" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "delivery_day" cascade;`);
  }

}
