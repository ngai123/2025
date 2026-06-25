import psycopg2
import os
from dotenv import load_dotenv

"""
File: test_connection.py
Author: Christian Lew
Date: October 21, 2025
Description: This script tests the connection to the Cloud SQL PostgreSQL database
             using the credentials provided in the .env file.
"""

# Load environment variables from .env file
load_dotenv()

# Get credentials from environment variables
DB_CONFIG = {
    "host": os.getenv("DATABASE_HOST"),
    "port": os.getenv("DATABASE_PORT", "1234"),
    "database": os.getenv("DATABASE_NAME"),
    "user": os.getenv("DATABASE_USER"),
    "password": os.getenv("DATABASE_PASSWORD")
}

# Validate that all required variables are loaded
required_vars = ["DATABASE_HOST", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD"]
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print("❌ ERROR: Missing required environment variables:")
    for var in missing_vars:
        print(f"   - {var}")
    print("\n💡 Make sure your .env file exists and contains all required variables.")
    exit(1)

print("🔄 Attempting to connect to Cloud SQL...")
print(f"Host: {DB_CONFIG['host']}")
print(f"Database: {DB_CONFIG['database']}")
print(f"User: {DB_CONFIG['user']}")
print(f"Port: {DB_CONFIG['port']}\n")

try:
    conn = psycopg2.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        database=DB_CONFIG["database"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        connect_timeout=10
    )
    
    print("✅ CONNECTION SUCCESSFUL!\n")
    
    cursor = conn.cursor()
    
    # Get PostgreSQL version
    cursor.execute("SELECT version();")
    db_version = cursor.fetchone()
    print(f"📊 PostgreSQL version:")
    print(f"   {db_version[0][:80]}...\n")
    
    # List all tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = cursor.fetchall()
    
    print(f"📋 Tables found: {len(tables)}")
    if tables:
        for table in tables:
            print(f"   • {table[0]}")
        
        print("\n" + "="*60)
        print("📝 Getting detailed structure of each table...")
        print("="*60 + "\n")
        
        # Get detailed structure for each table
        for table in tables:
            table_name = table[0]
            print(f"\n{'='*60}")
            print(f"TABLE: {table_name}")
            print(f"{'='*60}")
            
            cursor.execute(f"""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM 
                    information_schema.columns
                WHERE 
                    table_schema = 'public'
                    AND table_name = '{table_name}'
                ORDER BY 
                    ordinal_position;
            """)
            
            columns = cursor.fetchall()
            for col in columns:
                col_name, data_type, max_length, nullable, default = col
                length_info = f"({max_length})" if max_length else ""
                nullable_info = "NULL" if nullable == "YES" else "NOT NULL"
                default_info = f", default: {default}" if default else ""
                
                print(f"  • {col_name}: {data_type}{length_info} - {nullable_info}{default_info}")
        
        # Get foreign key relationships
        print("\n" + "="*60)
        print("🔗 FOREIGN KEY RELATIONSHIPS")
        print("="*60)
        
        cursor.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name;
        """)
        
        fks = cursor.fetchall()
        if fks:
            for fk in fks:
                print(f"  • {fk[0]}.{fk[1]} → {fk[2]}.{fk[3]}")
        else:
            print("  (No foreign keys found)")
    
    else:
        print("   (No tables found - you may need to create them first)")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*60)
    print("✅ Connection test completed successfully!")
    print("="*60)
    
except psycopg2.OperationalError as e:
    print(f"❌ CONNECTION FAILED - Operational Error:")
    print(f"   {e}")
    print("\n🔍 Troubleshooting steps:")
    print("   1. Check if your IP is whitelisted in Google Cloud SQL")
    print("   2. Verify the database credentials in .env are correct")
    print("   3. Ensure the Cloud SQL instance is running")
    print("   4. Check if the public IP is correct")
    
except Exception as e:
    print(f"❌ CONNECTION FAILED - Unexpected Error:")
    print(f"   {e}")