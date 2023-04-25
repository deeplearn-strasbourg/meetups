# https://github.com/pika/pika/blob/0.12.0/examples/basic_consumer_threaded.py

import functools
import logging
import pika
import threading
import os
import time
import sys

LOG_FORMAT = ('%(levelname) -10s %(asctime)s %(name) -30s %(funcName) '
              '-35s %(lineno) -5d: %(message)s')
LOGGER = logging.getLogger(__name__)

logging.basicConfig(level=logging.WARN, format=LOG_FORMAT)


def ack_message(channel, delivery_tag):
    """Note that `channel` must be the same pika channel instance via which
    the message being ACKed was retrieved (AMQP protocol constraint).
    """
    if channel.is_open:
        channel.basic_ack(delivery_tag)
    else:
        # Channel is already closed, so we can't ACK this message;
        # log and/or do something that makes sense for your app in this case.
        pass


def do_work(final_callback, connection, channel, delivery_tag, body):
    thread_id = threading.get_ident()
    fmt1 = 'Thread id: {} Delivery tag: {} Message body: {}'
    LOGGER.info(fmt1.format(thread_id, delivery_tag, body))
    sys.stdout.flush()

    decoded_body = body.decode("utf-8")
    final_callback(decoded_body)

    sleep_seconds = os.environ.get('SLEEP')
    if sleep_seconds is not None and isinstance(sleep_seconds, int):
        # Sleeping to simulate 10 seconds of work
        print('Sleeping: ' + sleep_seconds)
        time.sleep(sleep_seconds)

    cb = functools.partial(ack_message, channel, delivery_tag)
    connection.add_callback_threadsafe(cb)


def on_message(channel, method_frame, header_frame, body, args):
    (final_callback, connection, threads) = args
    delivery_tag = method_frame.delivery_tag
    t = threading.Thread(target=do_work, args=(final_callback, connection, channel, delivery_tag, body))
    t.start()
    threads.append(t)


def consume(final_callback, exchange, queue):

    credentials = pika.PlainCredentials(os.environ['RABBITMQ_USER'], os.environ['RABBITMQ_PASS'])
    # Note: sending a short heartbeat to prove that heartbeats are still
    # sent even though the worker simulates long-running work
    parameters =  pika.ConnectionParameters(os.environ['RABBITMQ_HOST'], credentials=credentials, heartbeat=5)
    connection = pika.BlockingConnection(parameters)

    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type="direct", passive=False, durable=True, auto_delete=False)
    channel.queue_declare(queue=queue, auto_delete=True)
    channel.queue_bind(queue=queue, exchange=exchange, routing_key="standard_key")
    # Note: prefetch is set to 1 here as an example only and to keep the number of threads created
    # to a reasonable amount. In production you will want to test with different prefetch values
    # to find which one provides the best performance and usability for your solution
    channel.basic_qos(prefetch_count=1)

    threads = []
    on_message_callback = functools.partial(on_message, args=(final_callback, connection, threads))
    channel.basic_consume(on_message_callback, queue)

    try:
        print('Starting to consume!')
        sys.stdout.flush()
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()

    # Wait for all to complete
    for thread in threads:
        thread.join()

    connection.close()


def test_callback(body):
    print(body)


if __name__ == '__main__':
    consume(test_callback, 'worker_exchange', 'worker_queue')
