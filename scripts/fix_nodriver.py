#!/usr/bin/env python3
"""Fix nodriver encoding issue for Python 3.14"""
import pathlib

p = pathlib.Path("/home/ubuntu/.local/lib/python3.14/site-packages/nodriver/cdp/network.py")
data = p.read_bytes()

# Add encoding declaration at top if missing
if not data.startswith(b"# -*- coding: utf-8 -*-") or b"coding=utf-8" not in data[:200]:
    data = b"# -*- coding: utf-8 -*-\n" + data

# Replace the problematic line (non-UTF-8 ±Inf)
data = data.replace(b"#: JSON (\xb1Inf).", b"#: JSON (+/- Inf).")

p.write_bytes(data)
print("Fixed! Testing import...")
import nodriver
print(f"nodriver {nodriver.__version__} loaded successfully!")
