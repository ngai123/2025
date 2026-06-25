import psycopg2
import os
from dotenv import load_dotenv

"""
File: test_connection_2.py
Author: Project Aura
Date: October 2025
Description: Tests connection to a SECOND Cloud SQL PostgreSQL database using
             environment variables (DATABASE2_*). Falls back to primary
             DATABASE_* vars if the secondary ones are not set.
"""

# Load environment variables from .env file
load_dotenv()

# Resolve secondary DB configuration (fallback to primary if unset)
DB2_CONFIG = {
    "host": os.getenv("DATABASE2_HOST") or os.getenv("DATABASE_HOST"),
    "port": os.getenv("DATABASE2_PORT") or os.getenv("DATABASE_PORT", "5432"),
    "database": os.getenv("DATABASE2_NAME") or os.getenv("DATABASE_NAME"),
    "user": os.getenv("DATABASE2_USER") or os.getenv("DATABASE_USER"),
    "password": os.getenv("DATABASE2_PASSWORD") or os.getenv("DATABASE_PASSWORD"),
}

# Prefer the dedicated secondary variables; warn if we are falling back
secondary_vars = ["DATABASE2_HOST", "DATABASE2_NAME", "DATABASE2_USER", "DATABASE2_PASSWORD"]
missing_secondary = [var for var in secondary_vars if not os.getenv(var)]
if missing_secondary:
    print("⚠️  Using primary DATABASE_* variables for missing secondary values:")
    for var in missing_secondary:
        print(f"   - {var} not set")
    print("   Set DATABASE2_* in .env to target a different instance.\n")

# Validate we have a complete config after fallback
required_keys = ["host", "database", "user", "password"]
missing = [k for k in required_keys if not DB2_CONFIG.get(k)]
if missing:
    print("❌ ERROR: Missing required DB configuration values:")
    for k in missing:
        print(f"   - {k}")
    print("\n💡 Ensure .env has DATABASE2_* (or primary DATABASE_*) filled.")
    raise SystemExit(1)

print("🔄 Attempting to connect to SECOND Cloud SQL database...")
print(f"Host: {DB2_CONFIG['host']}")
print(f"Database: {DB2_CONFIG['database']}")
print(f"User: {DB2_CONFIG['user']}")
print(f"Port: {DB2_CONFIG['port']}\n")

try:
    conn = psycopg2.connect(
        host=DB2_CONFIG["host"],
        port=DB2_CONFIG["port"],
        database=DB2_CONFIG["database"],
        user=DB2_CONFIG["user"],
        password=DB2_CONFIG["password"],
        connect_timeout=10,
    )

    print("✅ CONNECTION SUCCESSFUL (secondary DB)!\n")
    cursor = conn.cursor()

    # PostgreSQL version
    cursor.execute("SELECT version();")
    db_version = cursor.fetchone()
    print("📊 PostgreSQL version:")
    print(f"   {db_version[0][:80]}...\n")

    # List tables in public schema
    cursor.execute(
        """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
        """
    )
    tables = cursor.fetchall()
    print(f"📋 Tables found: {len(tables)}")
    if tables:
        for (tname,) in tables:
            print(f"   • {tname}")

        print("\n" + "=" * 60)
        print("📝 Getting detailed structure of each table...")
        print("=" * 60 + "\n")

        for (tname,) in tables:
            print(f"\n{'='*60}")
            print(f"TABLE: {tname}")
            print(f"{'='*60}")

            cursor.execute(
                f"""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position;
                """,
                (tname,),
            )
            for col_name, data_type, max_len, nullable, default in cursor.fetchall():
                length_info = f"({max_len})" if max_len else ""
                nullable_info = "NULL" if nullable == "YES" else "NOT NULL"
                default_info = f", default: {default}" if default else ""
                print(f"  • {col_name}: {data_type}{length_info} - {nullable_info}{default_info}")

        # Foreign key relationships
        print("\n" + "=" * 60)
        print("🔗 FOREIGN KEY RELATIONSHIPS")
        print("=" * 60)
        cursor.execute(
            """
            SELECT
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name;
            """
        )
        fks = cursor.fetchall()
        if fks:
            for fk in fks:
                print(f"  • {fk[0]}.{fk[1]} → {fk[2]}.{fk[3]}")
        else:
            print("  (No foreign keys found)")
    else:
        print("   (No tables found in public schema)")

    cursor.close()
    conn.close()

    print("\n" + "=" * 60)
    print("✅ Secondary DB connection test completed successfully!")
    print("=" * 60)

except psycopg2.OperationalError as e:
    print("❌ CONNECTION FAILED - Operational Error:")
    print(f"   {e}")
    print("\n🔍 Troubleshooting:")
    print("   1) Is Cloud SQL Auth Proxy running for the SECOND instance?")
    print("   2) Are DATABASE2_* env vars set correctly in backend/.env?")
    print("   3) Is the instance reachable and database name correct?")

except Exception as e:
    print("❌ CONNECTION FAILED - Unexpected Error:")
    print(f"   {e}")