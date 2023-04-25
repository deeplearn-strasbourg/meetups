import os

from rabbitmq_util import consume
from rabbitmq_util import publish
from ml import train


def worker_callback(body):
    if body == 'train_mnist':
        train.train('models/digits.joblib')

        publish.publish('cache_mnist', os.environ['API_EXCHANGE'], 'fanout', durable=False, delivery_mode=2)


if __name__ == '__main__':
    consume.consume(worker_callback, os.environ['WORKER_EXCHANGE'], os.environ['WORKER_QUEUE'])
