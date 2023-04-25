# https://scikit-learn.org/stable/auto_examples/classification/plot_digits_classification.html

# Author: Gael Varoquaux <gael dot varoquaux at normalesup dot org>
# License: BSD 3 clause


from PIL import Image, ImageOps
import numpy as np
from joblib import load


def predict(image_path, model_path='../models/digits.joblib'):
    clf = load(model_path)

    image = Image.open(image_path)
    image_ = image.convert('L')
    image_ = image_.resize((8, 8))
    image_ = ImageOps.invert(image_)
    image_ = np.array(image_)
    image_ = np.trunc(image_ / 16)
    image_.astype(int)
    image_ = image_.reshape(1, -1)
    
    return clf.predict(image_)[0]
    

if __name__ == '__main__':
    cls = predict('../images/5.png')

    print(cls)
