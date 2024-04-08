#!/bin/bash
aws s3 sync . s3://apps.neotomadb.org/explorer/ --exclude '.git/*' --exclude pushs3.sh
