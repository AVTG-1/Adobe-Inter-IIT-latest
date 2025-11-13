"""Pytest configuration."""

import pytest


@pytest.fixture
def sample_image_url():
    """Sample image URL for testing."""
    return "https://picsum.photos/512/512"


@pytest.fixture
def inpaint_request():
    """Sample inpainting request."""
    return {
        "image_url": "https://picsum.photos/512/512",
        "prompt": "Remove the object from the center",
        "mask_coordinates": {
            "x": 100,
            "y": 100,
            "width": 200,
            "height": 200
        }
    }


@pytest.fixture
def relight_request():
    """Sample relighting request."""
    return {
        "image_url": "https://picsum.photos/512/512",
        "prompt": "Add warm golden hour lighting",
        "intensity": 0.7
    }
