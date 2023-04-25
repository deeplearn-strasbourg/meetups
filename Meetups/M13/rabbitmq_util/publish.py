import pika
import logging
import os
import sys

def publish(body, exchange, exchange_type='direct', durable=True, delivery_mode=1):
    logging.basicConfig(level=logging.WARN)

    credentials = pika.PlainCredentials(os.environ['RABBITMQ_USER'], os.environ['RABBITMQ_PASS'])
    parameters =  pika.ConnectionParameters(os.environ['RABBITMQ_HOST'], credentials=credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type=exchange_type,
                             passive=False, durable=durable, auto_delete=False)

    print("Sending text message: " + body)
    sys.stdout.flush()
    channel.basic_publish(exchange, 'standard_key', body,
                          pika.BasicProperties(content_type='text/plain',
                                               delivery_mode=delivery_mode))

    connection.close()


if __name__ == '__main__':
    publish('train_mnist', 'worker_exchange')
