@echo off
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root nexus_dev < %~dp0create_vendas_tables.sql