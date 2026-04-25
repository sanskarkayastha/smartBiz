#!/bin/bash

# Create all microservice databases
echo "Creating SmartBiz databases..."

psql -U postgres <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE inventory_db;
    CREATE DATABASE crm_db;
    CREATE DATABASE sales_db;
    CREATE DATABASE messaging_db;
    CREATE DATABASE ai_db;

    -- Grant privileges to postgres user
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE inventory_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE crm_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE sales_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE messaging_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE ai_db TO postgres;
EOSQL

echo "Databases created successfully!"
