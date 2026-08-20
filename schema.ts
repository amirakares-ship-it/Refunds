import { pgTable, text, serial, timestamp, real, integer, boolean } from 'drizzle-orm/pg-core';

// Uploaded Dataset Sheets
export const uploadedSheets = pgTable('uploaded_sheets', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  rowCount: integer('row_count').notNull(),
  totalAmount: real('total_amount').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sheet Record Chunks (for high-performance sync & storage of thousands of rows)
export const sheetRecordChunks = pgTable('sheet_record_chunks', {
  id: serial('id').primaryKey(),
  sheetId: text('sheet_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  totalChunks: integer('total_chunks').notNull(),
  records: text('records').notNull(), // JSON stringified chunk of records
  updatedAt: text('updated_at').notNull(),
});

// System Active State
export const systemState = pgTable('system_state', {
  key: text('key').primaryKey(), // 'active_dataset_state'
  activeSheetId: text('active_sheet_id').notNull(),
  fileName: text('file_name'),
  rowCount: integer('row_count'),
  updatedAt: text('updated_at').notNull(),
});
