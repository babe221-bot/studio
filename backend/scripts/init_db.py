import asyncio
import os
import sys

# Add the backend directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database import init_db


async def main():
    print("Initializing database...")
    await init_db()
    print("Database initialized successfully.")

if __name__ == "__main__":
    asyncio.run(main())
