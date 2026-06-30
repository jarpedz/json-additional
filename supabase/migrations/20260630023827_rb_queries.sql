 -- ============== start tb_queris
CREATE TABLE tb_queries (
    id uuid primary key not null default gen_random_uuid(),
    title text not null,
    query text not null,
    create_by text not null default 'system',
    create_at datatime timestamp(now()),
    update_ay text,
    update_at datatime timestamp(now())
)

 -- ============== end tb_queris
