import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261103161133 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "homepage_section" add column if not exists "subtitle_ar" text null, add column if not exists "cta_label_ar" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "homepage_section" drop column if exists "subtitle_ar", drop column if exists "cta_label_ar";`);
  }

}
