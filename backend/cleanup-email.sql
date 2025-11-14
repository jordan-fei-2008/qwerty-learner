-- 清理数据库中空字符串的 email，将其转换为 NULL
UPDATE users SET email = NULL WHERE email = '';
