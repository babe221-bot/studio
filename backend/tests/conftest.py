"""
Shared pytest configuration for backend tests.

Sets pytest-asyncio to auto mode so every async test function is
automatically treated as an asyncio test without @pytest.mark.asyncio.

Also patches the database engine so API endpoint tests run without
a live database connection.
"""
import sys
import pytest
from unittest.mock import AsyncMock, MagicMock


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
