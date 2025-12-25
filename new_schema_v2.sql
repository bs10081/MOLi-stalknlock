-- ==================================================
-- MOLi 實驗室門禁系統 SQLite 資料表結構 v2.0
-- 設計目標：支援一人多卡、單卡停用、完整刷卡紀錄追蹤
-- 作者：你的名字 或 MOLi 團隊
-- 日期：2025-12-21
-- ==================================================

-- 1. 使用者（學生）基本資料表
CREATE TABLE IF NOT EXISTS users (
    student_id TEXT(20) PRIMARY KEY,                  -- 學號，如 B0123456
    name       TEXT(50) NOT NULL,                     -- 姓名
    email      TEXT(100),                             -- 可選：未來寄通知用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引（雖然 PRIMARY KEY 已自動建立索引，但明確寫出便於閱讀）
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- 2. 卡片資料表（支援一人多卡）
CREATE TABLE IF NOT EXISTS cards (
    card_id    INTEGER PRIMARY KEY AUTOINCREMENT,      -- 卡片系統流水號
    student_id TEXT(20) NOT NULL,                     -- 所属學生
    rfid_uid   TEXT(50) NOT NULL UNIQUE,              -- 卡片硬體 UID（唯一）
    status     TEXT(10) DEFAULT 'active' 
               CHECK(status IN ('active', 'inactive', 'lost', 'expired')),  -- 卡片狀態
    issued_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- 發卡時間
    note       TEXT,                                          -- 備註，例如：主卡、2025補發、臨時卡
    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
);

-- 高效查詢索引
CREATE INDEX IF NOT EXISTS idx_cards_rfid_uid    ON cards(rfid_uid);        -- 刷卡時最常用
CREATE INDEX IF NOT EXISTS idx_cards_student_id  ON cards(student_id);      -- 管理員查學生所有卡
CREATE INDEX IF NOT EXISTS idx_cards_status      ON cards(status);          -- 快速找出失效卡

-- 3. 門禁刷卡記錄表（完整追蹤哪張卡片、何時、何動作）
CREATE TABLE IF NOT EXISTS access_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id    INTEGER NOT NULL,                       -- 指向哪張卡
    student_id TEXT(20) NOT NULL,                      -- 冗餘欄位，方便快速查詢不需 JOIN
    rfid_uid   TEXT(50) NOT NULL,                      -- 冗餘欄位，方便除錯
    action     TEXT(10) NOT NULL,                     -- entry, exit, deny, bind 等
    timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id)    REFERENCES cards(card_id)    ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
);

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp     ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_student_id    ON access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_card_id       ON access_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action        ON access_logs(action);

-- 4. 卡片註冊暫存表（處理「刷兩次確認」邏輯）
CREATE TABLE IF NOT EXISTS registration_sessions (
    student_id    TEXT(20) PRIMARY KEY,               -- 正在註冊的學生
    temp_rfid_uid TEXT(50),                            -- 第一次刷卡取得的 UID（等待第二次確認）
    step          INTEGER DEFAULT 0,                   -- 0=等待第一刷, 1=等待第二刷
    expires_at    TIMESTAMP,                           -- 逾時時間
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
);

