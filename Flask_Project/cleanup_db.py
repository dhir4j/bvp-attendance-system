
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Import the application's config to get the correct database URL
from config import Config

# Load environment variables from a .env file if it exists
load_dotenv()

# --- Database Connection ---
# Use the same DATABASE_URL as the main application
DATABASE_URL = Config.SQLALCHEMY_DATABASE_URI

if not DATABASE_URL or 'user:password@host:port' in DATABASE_URL:
    print("Error: DATABASE_URL is not set correctly in config.py or environment variables.")
    exit(1)

try:
    # Use the same engine options as the main app for compatibility
    engine = create_engine(DATABASE_URL, **getattr(Config, 'SQLALCHEMY_ENGINE_OPTIONS', {}))
    Session = sessionmaker(bind=engine)
    session = Session()
    # Verify connection
    with engine.connect() as connection:
        print("Database connection successful.")
except OperationalError as e:
    print(f"Error connecting to the database: {e}")
    print("Please ensure the database is running and the connection URL is correct.")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred during database connection: {e}")
    exit(1)


# --- Table Deletion Order ---
# This order is important to avoid foreign key constraint violations.
# We delete from tables that are depended on last.
TABLE_ORDER = [
    "attendance_records",
    "total_lectures",
    "staff_subject_assignment",
    "student_batches",
    "students",
    "subjects",
    "staff",
    "semesters",
    "batches",
    "departments"
]


def clear_all_data():
    """
    Deletes all data from the tables in the specified order.
    """
    if input("Are you sure you want to DELETE ALL DATA from the database? This cannot be undone. (yes/no): ").lower() != 'yes':
        print("Operation cancelled.")
        return

    print("\n--- Starting Data Deletion ---")
    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            for table_name in TABLE_ORDER:
                try:
                    print(f"Clearing table: {table_name}...")
                    # Use CASCADE to handle dependencies if any were missed in the ordering
                    connection.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE;'))
                    print(f"  -  OK")
                except Exception as e:
                    # This might happen if a table doesn't exist, which is okay.
                    print(f"  -  Could not clear table '{table_name}': {e}")
            
            transaction.commit()
        print("\n--- All tables have been cleared successfully. ---")
    except Exception as e:
        print(f"\n--- An error occurred during deletion: {e} ---")
        if 'transaction' in locals() and transaction.is_active:
            transaction.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    print("========================")
    print("Database Cleanup Utility")
    print("========================")
    print(f"Connected to: ...{engine.url.database}")
    clear_all_data()
