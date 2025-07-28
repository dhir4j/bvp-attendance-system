
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables from a .env file if it exists
# In a real app, you might use a more robust configuration system
load_dotenv()

# --- Database Connection ---
# Construct the database URI from environment variables or use a default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://user:password@host:port/database')

if not DATABASE_URL:
    print("Error: DATABASE_URL is not set. Please create a .env file or set the environment variable.")
    exit(1)

try:
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
except Exception as e:
    print(f"Error connecting to the database: {e}")
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

    print("--- Starting Data Deletion ---")
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
        transaction.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    print("Database Cleanup Utility")
    print("========================")
    print(f"Connected to: {engine.url.database}")
    clear_all_data()

    