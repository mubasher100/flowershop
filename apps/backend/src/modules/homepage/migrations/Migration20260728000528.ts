import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728000528 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "homepage_section" ("id" text not null, "type" text not null, "title" text not null, "title_ar" text null, "resource_handle" text null, "subtitle" text null, "image_url" text null, "cta_label" text null, "cta_href" text null, "rank" integer not null default 0, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_section_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_homepage_section_deleted_at" ON "homepage_section" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "homepage_section" cascade;`);
  }

}
