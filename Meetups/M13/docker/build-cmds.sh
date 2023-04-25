#!/usr/bin/env bash

# build the base image and upload it to https://hub.docker.com/
docker build -t claudiuvintila/scaleml-base:v1 -f docker/DockerfileBase .
docker push claudiuvintila/scaleml-base:v1


# build the app image and upload it to https://hub.docker.com/
docker build -t claudiuvintila/scaleml-api:v1 -f docker/DockerfileApi .
docker push claudiuvintila/scaleml-api:v1
docker run -i -p 80:80 --name api --rm -v /Users/work3/ScaleML/models:/var/www/html/models \
    -e RABBITMQ_HOST="host.docker.internal" \
    -e RABBITMQ_USER="user" \
    -e RABBITMQ_PASS="pass" \
    -e API_EXCHANGE="api_exchange" \
    -e API_QUEUE="api_queue" \
    -e WORKER_EXCHANGE="worker_exchange" \
    -e WORKER_QUEUE="worker_queue" \
    -t claudiuvintila/scaleml-api:v1

# build the worker image and upload it to https://hub.docker.com/
docker build -t claudiuvintila/scaleml-worker:v1 -f docker/DockerfileWorker .
docker push claudiuvintila/scaleml-worker:v1
docker run -i --name worker --rm -v /Users/work3/ScaleML/models:/var/www/html/models \
    -e RABBITMQ_HOST="host.docker.internal" \
    -e RABBITMQ_USER="user" \
    -e RABBITMQ_PASS="pass" \
    -e API_EXCHANGE="api_exchange" \
    -e API_QUEUE="api_queue" \
    -e WORKER_EXCHANGE="worker_exchange" \
    -e WORKER_QUEUE="worker_queue" \
    -t claudiuvintila/scaleml-worker:v1