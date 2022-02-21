#!/bin/bash

docker stop salesbot
docker rm salesbot
docker stop update-vika
docker rm update-vika
docker stop vika-update-roomdb
docker rm vika-update-roomdb
docker stop vika-to-feishu
docker rm vika-to-feishu
