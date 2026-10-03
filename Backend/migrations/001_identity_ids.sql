-- 001: switch primary keys from Hibernate's table-backed sequences to MySQL AUTO_INCREMENT.
--
-- Why: with GenerationType.AUTO, every 50th insert needs a second DB connection
-- to fetch the next ID block while holding a lock. With a 10-connection pool
-- that deadlocks under ~10 concurrent writes. See IMPROVEMENTS.md.
--
-- When: run ONCE against an existing database, BEFORE starting the backend
-- built with GenerationType.IDENTITY. (A brand-new, empty database does not
-- need this: Hibernate creates the columns with AUTO_INCREMENT itself.)
--
-- Safe for existing data: ids are kept, and MySQL continues numbering from the
-- current highest id. Back up first anyway:
--   mysqldump -u root -p whatsapp > backup-before-001.sql
--
-- Run:
--   mysql -u root -p whatsapp < Backend/migrations/001_identity_ids.sql

-- The ids are referenced by foreign keys (message.chat_id, chat_users, ...);
-- MySQL refuses to modify a referenced column unless checks are paused.
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `user`           MODIFY `id` INT NOT NULL AUTO_INCREMENT;
ALTER TABLE `chat`           MODIFY `id` INT NOT NULL AUTO_INCREMENT;
ALTER TABLE `message`        MODIFY `id` INT NOT NULL AUTO_INCREMENT;
ALTER TABLE `one_time_pre_key` MODIFY `id` INT NOT NULL AUTO_INCREMENT;
ALTER TABLE `signal_identity`  MODIFY `id` INT NOT NULL AUTO_INCREMENT;
ALTER TABLE `key_backup`       MODIFY `id` INT NOT NULL AUTO_INCREMENT;

SET FOREIGN_KEY_CHECKS = 1;

-- The old sequence tables are no longer used by anything.
DROP TABLE IF EXISTS `user_seq`, `chat_seq`, `message_seq`,
                     `one_time_pre_key_seq`, `signal_identity_seq`, `key_backup_seq`;
