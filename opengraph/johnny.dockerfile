FROM oven/bun:alpine

USER root

RUN apk update && apk upgrade && apk add --no-cache bash

# Install latest Chromium package
RUN apk upgrade --no-cache --available \
    && apk add --no-cache \
      chromium-swiftshader \
      ttf-freefont \
      font-noto-emoji \
    && apk add --no-cache \
      --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
      font-wqy-zenhei

# Add Chrome as a user
RUN mkdir -p /usr/src/app \
    && adduser -D chrome \
    && chown -R chrome:chrome /usr/src/app

# Run Chrome as non-privileged
USER chrome

WORKDIR /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# Autorun chrome headless
ENV CHROMIUM_FLAGS="--disable-software-rasterizer --disable-dev-shm-usage"

ENTRYPOINT ["bash"]

# NOTICE

# 1. to build the image
# docker build -t bun-chromium -f johnny.dockerfile .

# 2. to run the image in interactive mode
# docker run -it --rm bun-chromium

# 3. to take a screenshot, which is saved as .png to the current directory
# chromium-browser --headless --no-sandbox --screenshot --hide-scrollbars https://www.chromestatus.com/