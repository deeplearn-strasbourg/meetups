# https://scikit-learn.org/stable/auto_examples/classification/plot_digits_classification.html

# Author: Gael Varoquaux <gael dot varoquaux at normalesup dot org>
# License: BSD 3 clause

import sys

# Import datasets, classifiers and performance metrics
from sklearn import datasets, svm, metrics
from sklearn.model_selection import train_test_split

from joblib import dump


def train(model_path='models/digits.joblib'):
    # The digits dataset
    digits = datasets.load_digits()

    # To apply a classifier on this data, we need to flatten the image, to
    # turn the data in a (samples, feature) matrix:
    n_samples = len(digits.images)
    data = digits.images.reshape((n_samples, -1))

    # Create a classifier: a support vector classifier
    classifier = svm.SVC(gamma=0.001)

    # Split data into train and test subsets
    X_train, X_test, y_train, y_test = train_test_split(
        data, digits.target, test_size=0.5, shuffle=False)

    # We learn the digits on the first half of the digits
    classifier.fit(X_train, y_train)

    # Now predict the value of the digit on the second half:
    predicted = classifier.predict(X_test)

    print("Classification report for classifier %s:\n%s\n"
          % (classifier, metrics.classification_report(y_test, predicted)))

    dump(classifier, model_path)
    print('Saved model to: ' + model_path)

    sys.stdout.flush()


if __name__ == '__main__':
    train()
