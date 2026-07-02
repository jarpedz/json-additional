-- =========================================================================
-- 1. TABLE: tb_users (สร้างก่อนเพื่อให้ตารางอื่นสามารถใช้อ้างอิง create_by ได้ในอนาคต)
-- =========================================================================
CREATE TABLE tb_users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    create_by TEXT NOT NULL DEFAULT 'system',
    create_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- แก้ไขจาก datatime timestamp(now())
    update_by TEXT,                                  -- แก้ไขจาก update_ay เป็น update_by
    update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- แก้ไขจาก datatime timestamp(now())
);

-- ============== start idx tb_users
CREATE INDEX idx_users_id ON tb_users(id);
CREATE INDEX idx_users_email ON tb_users(email);
-- ============== end idx tb_users


-- =========================================================================
-- 2. TABLE: tb_queries
-- =========================================================================
CREATE TABLE tb_queries (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    query TEXT NOT NULL,
    hos_use TEXT,
    create_by TEXT NOT NULL DEFAULT 'system',
    create_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- แก้ไขจาก datatime timestamp(now())
    update_by TEXT,                                  -- แก้ไขจาก update_ay เป็น update_by
    update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- แก้ไขจาก datatime timestamp(now())
);

-- ============== start idx tb_queries
CREATE INDEX idx_queries_create_by ON tb_queries(create_by); -- สำหรับดึงว่า User คนไหนสร้างบ้าง
CREATE INDEX idx_queries_hos_use ON tb_queries(hos_use);     -- สำหรับ Filter แยกตามโรงพยาบาลที่นำไปใช้
CREATE INDEX idx_queries_title ON tb_queries(title);         -- สำหรับการ Search หาชื่อ Query
CREATE INDEX idx_queries_id ON tb_queries(id);         -- สำหรับการ Edit หาชื่อ Query
-- ============== end idx tb_queries


-- =========================================================================
-- 3. TABLE: tb_note
-- =========================================================================
CREATE TABLE tb_note (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    note TEXT NOT NULL,
    description TEXT NOT NULL,
    create_by TEXT NOT NULL DEFAULT 'system',
    create_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- แก้ไขจาก datatime timestamp(now())
    update_by TEXT,                                  -- แก้ไขจาก update_ay เป็น update_by
    update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- แก้ไขจาก datatime timestamp(now())
);

-- ============== start idx tb_note
CREATE INDEX idx_note_id ON tb_note(id);
CREATE INDEX idx_note_create_by ON tb_note(create_by);
-- ============== end idx tb_note