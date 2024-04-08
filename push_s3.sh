#!/bin/bash
aws s3 sync . s3://neotomaexplorer/ --exclude '.git/*' --exclude pushs3.sh
