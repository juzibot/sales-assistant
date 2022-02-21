#!/bin/bash

docker run \
    -d \
    --name=salesbot \
    -e TZ=Asia/Shanghai \
    -e WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT=true \
    -e WECHATY_LOG=error \
    -e WECHATY_PUPPET=wechaty-puppet-service \
    --network=host \
    --restart=always \
    salesbot
docker run \
    -d \
    --name=update-vika \
    -e TZ=Asia/Shanghai
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/update-vika.js
docker run \
    -d \
    --name=vika-update-roomdb \
    -e TZ=Asia/Shanghai
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/vika-update-roomdb.js
docker run \
    -d \
    --name=vika-to-feishu \
    -e TZ=Asia/Shanghai
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/vika-to-feishu.js
