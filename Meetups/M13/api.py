import sys
import os
from os import path

from flask import Flask
from flask import jsonify
from flask import request
from webargs import fields
from webargs.flaskparser import use_args
from flask_rabbitmq import Queue
from flask_rabbitmq import RabbitMQ
from flask_rabbitmq import ExchangeType
from werkzeug.contrib.cache import SimpleCache
from werkzeug.utils import secure_filename
from joblib import load

from rabbitmq_util import consume
from rabbitmq_util import publish
from ml import predict

UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'png'}

cache = SimpleCache()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

app.config['RABBITMQ_HOST'] = os.environ['RABBITMQ_HOST']
app.config['RABBITMQ_USERNAME'] = os.environ['RABBITMQ_USER']
app.config['RABBITMQ_PASSWORD'] = os.environ['RABBITMQ_PASS']

queue = Queue()
rpc = RabbitMQ(app, queue)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/predict', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:

            response = {
                'error': 'No file part'
            }

            return jsonify(response)

        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            response = {
                'error': 'No selected file'
            }

            return jsonify(response)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            cls = predict.predict(file_path, 'models/digits.joblib')
            response = {
                'class': str(cls)
            }

            return jsonify(response)

    return '''
        <!doctype html>
        <title>Upload new File</title>
        <h1>Upload new File</h1>
        <form method=post enctype=multipart/form-data>
          <input type=file name=file>
          <input type=submit value=Upload>
        </form>
        '''


@app.route('/train', methods=['POST'])
@use_args({"action": fields.Str(required=True)}, location="json")
def train(args):
    action = args['action']

    if action == 'train':
        publish.publish('train_mnist', os.environ['WORKER_EXCHANGE'])

    response = {
        'status': 'started'
    }

    return jsonify(response)


# declare the queue of topic exchange, flask-rabbitmq will bind automatically by key
@queue(type=ExchangeType.FANOUT, exchange=os.environ['API_EXCHANGE'], queue="", routing_key='')
def reload_cache_callback(ch, method, props, body):
    reload_cache()

    consume.ack_message(ch, method.delivery_tag)


def reload_cache():
    model = load('models/digits.joblib')
    cache.set('models/digits.joblib', model)

    print("Reloaded cache")
    sys.stdout.flush()


if __name__ == '__main__':
    if path.exists('from os import path'):
        reload_cache()

    rpc.run_with_flask_app(port=80, host='0.0.0.0')
