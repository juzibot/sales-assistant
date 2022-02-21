#!/bin/bash

echo -e "${green}Building Image..${clear}"
docker build -t salesbot .
