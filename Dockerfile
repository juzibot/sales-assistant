FROM node:16
# RUN sed -i "s@http://deb.debian.org@https://mirrors.163.com@g" /etc/apt/sources.list
# RUN sed -i "s@http://security.debian.org@https://mirrors.163.com@g" /etc/apt/sources.list
# RUN apt-get update && apt-get install -y libvips-dev
WORKDIR /root/bot
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm i --registry=https://registry.npmmirror.com
COPY . .
CMD npm start
