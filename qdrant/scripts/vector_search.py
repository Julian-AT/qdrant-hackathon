#!/usr/bin/env python3
"""Entry point script for the vector search engine."""

import sys
from pathlib import Path

src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from vector_search.cli.main import main

if __name__ == "__main__":
    sys.exit(main())
