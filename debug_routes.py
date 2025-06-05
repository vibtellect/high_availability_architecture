#!/usr/bin/env python3

import sys
import os
sys.path.append('/app')

from app import create_app

app = create_app()

print("Available routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule.methods} {rule.rule}") 