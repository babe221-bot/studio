"""
Shared pytest configuration for backend tests.

Sets pytest-asyncio to auto mode so every async test function is
automatically treated as an asyncio test without @pytest.mark.asyncio.
"""
import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
