-- alter column username 
ALTER TABLE tb_users 
ADD COLUMN username TEXT;

UPDATE public.tb_users
SET username = split_part(email, '@', 1)
WHERE email IS NOT NULL;

ALTER TABLE tb_users 
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT tb_users_username_key UNIQUE (username);