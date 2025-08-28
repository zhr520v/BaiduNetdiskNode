FROM node:22.18.0-alpine

ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /baidu-netdisk-node

COPY . .

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache tzdata dumb-init && \
    echo 'if [ -n "$TZ" ]; then' >> /etc/profile && \
    echo '  export TZ=$TZ' >> /etc/profile && \
    echo "fi" >> /etc/profile && \
    npm install -g pnpm@^10 --registry=$NPM_REGISTRY && \
    pnpm install --registry=$NPM_REGISTRY && \
    pnpm build srv web && \
    mv /baidu-netdisk-node/packages/srv/dist /baidu-netdisk-srv && \
    cd /baidu-netdisk-srv && \
    rm -rf /baidu-netdisk-node && \
    pnpm store prune && \
    pnpm install --prod --registry=$NPM_REGISTRY

WORKDIR /baidu-netdisk-srv

CMD ["dumb-init", "pnpm", "run", "start"]
