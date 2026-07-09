#!/bin/bash
aws s3 sync . s3://apps.neotomadb.org/explorer/ --exclude '.git/*' --exclude push_s3.sh
