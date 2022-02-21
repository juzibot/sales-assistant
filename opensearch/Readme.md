# 启动OpenSearch

增加vm.max_map_count的大小，通过修改` /etc/sysctl.conf `

To increase the value, add the following line to /etc/sysctl.conf:

vm.max_map_count=262144

Then run sudo sysctl -p to reload.

然后在本目录运行 docker-compose up -d
