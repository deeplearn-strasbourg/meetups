1. Install PyCharm CE (it's free)
2. Install python 3.7 (should come with pip)
3. Configure interpreter and venv in PyCharm CE 
https://www.jetbrains.com/help/pycharm/configuring-local-python-interpreters.html
https://www.jetbrains.com/help/pycharm/creating-virtual-environment.html
4. Install dependencies from terminal from project folder:
```pip install -r requirements.txt```
5. Install docker
6. Install GitBash if using Windows
7. Install a package manager: brew (Mac) / choco (Windows) / use apt-get (Linux)
8. Install using the package manager:
    - minikube
    - kubernetes-cli
    - kubernetes-helm (version 2.14)
    - https://github.com/derailed/k9s
9. Create a minikube cluster:
```minikube start --memory 2048 --cpus 2 --kubernetes-version v1.14.7```
10. Install Helm in cluster
    - ```helm init```
    - For Azure Cluster also run this fix: ```kubectl --namespace kube-system patch deploy tiller-deploy -p '{"spec":{"template":{"spec":{"serviceAccount":"tiller"}}}}'```
11. Install RabbitMQ and Ingress helm charts
    - ```helm repo add bitnami https://charts.bitnami.com/bitnami```
    - ```helm install --name rabbitmq --version 5.3.0 --set rabbitmq.password=pass bitnami/rabbitmq```
    - For Minikube: ```helm install --name ingress --set controller.service.externalIPs={"$(minikube ip)"} stable/nginx-ingress```
    - For Azure: ```helm install --name ingress stable/nginx-ingress```
12. Install ScaleML helm chart
```helm install --name scaleml scaleml```
13. Set "<ip>   scaleml.demo" in your hosts file on your machine (/etc/hosts on Unix systems)
    - For Minikube ip is: ```minikube ip```
    - For Azure ip is: ```kubectl -n et-it get services -l app=nginx-ingress,component=controller --output jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'```

13. Install Azure CLI https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
14. Create an Azure account and an AKS (Azure Kubernetes Cluster) with name <name> in resource group named <resource-group>
15. Get the credentials for that cluster with name <name> in resource group <resource-group>
    - ```az login```
    - ```az aks get-credentials --resource-group <resource-group> --name <name> --admin --overwrite-existing```
16. Redo 10, 11 and 12