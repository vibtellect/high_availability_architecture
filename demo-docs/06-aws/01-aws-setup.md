# ☁️ AWS Production Setup - Cloud Deployment

*⏱️ Dauer: 10-15 Minuten | 🎯 Zielgruppe: Cloud Architects, DevOps Teams*

---

## 🎯 **Production Deployment Ziele**

Zeigen wie das **lokale Demo-System auf AWS Production** deployed wird mit **Enterprise-Grade Services** und **Auto-Scaling**.

### **🌟 AWS Services die wir nutzen:**
- ✅ **EKS (Kubernetes)** → Container Orchestration
- ✅ **RDS Multi-AZ** → Production Database mit Failover
- ✅ **ElastiCache** → Redis Cluster für Caching  
- ✅ **Application Load Balancer** → Traffic Distribution
- ✅ **CloudWatch** → Monitoring & Alerting
- ✅ **X-Ray** → Distributed Tracing (zusätzlich zu Jaeger)

---

## 🚀 **AWS Architecture Überblick**

```
┌─────────────────── AWS Cloud ──────────────────┐
│                                                │
│  🌐 Route 53 DNS                               │
│          ↓                                     │
│  🔥 CloudFront CDN                             │
│          ↓                                     │
│  ⚖️  Application Load Balancer                 │
│          ↓                                     │
│  ┌─────────────────────────────────────────┐  │
│  │           EKS Cluster                   │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐   │  │
│  │  │ Pod │ │ Pod │ │ Pod │ │ Grafana │   │  │
│  │  │ 1-5 │ │ 1-3 │ │ 1-4 │ │ Stack   │   │  │
│  │  └─────┘ └─────┘ └─────┘ └─────────┘   │  │
│  └─────────────────────────────────────────┘  │
│          ↓                                     │
│  💾 RDS Multi-AZ + ElastiCache                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🔧 **1. AWS Prerequisites Setup**

### **IAM Permissions & AWS CLI**
```bash
# AWS CLI konfigurieren
aws configure

# EKS Service Role erstellen
aws iam create-role --role-name eks-service-role \
  --assume-role-policy-document file://aws/eks-trust-policy.json

# Node Group Role erstellen  
aws iam create-role --role-name eks-nodegroup-role \
  --assume-role-policy-document file://aws/nodegroup-trust-policy.json
```

### **VPC & Networking Setup**
```bash
# VPC mit EKS-optimierten Subnets erstellen
aws cloudformation create-stack \
  --stack-name high-availability-vpc \
  --template-body file://aws/vpc-template.yaml

# Security Groups für Services
aws ec2 create-security-group \
  --group-name eks-cluster-sg \
  --description "EKS Cluster Security Group"
```

---

## ☸️ **2. EKS Cluster Deployment**

### **Cluster Creation**
```bash
# EKS Cluster erstellen (15-20 min)
aws eks create-cluster \
  --name high-availability-cluster \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy

# Kubeconfig aktualisieren
aws eks update-kubeconfig --name high-availability-cluster

# Node Group hinzufügen
aws eks create-nodegroup \
  --cluster-name high-availability-cluster \
  --nodegroup-name production-nodes \
  --scaling-config minSize=2,maxSize=10,desiredSize=3 \
  --instance-types=m5.large
```

### **Kubernetes Dashboard Setup**
```bash
# Kubernetes Dashboard installieren
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Service Account für Admin Access
kubectl apply -f aws/dashboard-admin.yaml

# Dashboard Token generieren
kubectl -n kubernetes-dashboard create token admin-user
```

---

## 🗄️ **3. Database & Cache Setup**

### **RDS Multi-AZ Deployment**
```bash
# RDS Subnet Group erstellen
aws rds create-db-subnet-group \
  --db-subnet-group-name ha-db-subnet-group \
  --db-subnet-group-description "High Availability DB Subnet Group" \
  --subnet-ids subnet-xxx subnet-yyy

# PostgreSQL Multi-AZ Instance
aws rds create-db-instance \
  --db-instance-identifier ha-postgres-primary \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username postgres \
  --master-user-password SecurePassword123! \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxx \
  --multi-az \
  --storage-encrypted
```

### **ElastiCache Redis Cluster**
```bash
# Redis Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name ha-redis-subnet-group \
  --cache-subnet-group-description "Redis Subnet Group" \
  --subnet-ids subnet-xxx subnet-yyy

# Redis Cluster mit Failover
aws elasticache create-replication-group \
  --replication-group-id ha-redis-cluster \
  --description "High Availability Redis" \
  --num-cache-clusters 3 \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --cache-subnet-group-name ha-redis-subnet-group
```

---

## 📊 **4. Monitoring & Observability**

### **CloudWatch Setup**
```bash
# Container Insights aktivieren
aws logs create-log-group --log-group-name /aws/eks/high-availability-cluster/cluster

# CloudWatch Agent DaemonSet
kubectl apply -f aws/cloudwatch-agent.yaml

# Custom Metrics Dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "HighAvailabilityMetrics" \
  --dashboard-body file://aws/dashboard-config.json
```

### **AWS X-Ray Integration**
```bash
# X-Ray DaemonSet für Kubernetes
kubectl apply -f aws/xray-daemon.yaml

# Service Mesh mit AWS App Mesh (optional)
kubectl apply -f aws/app-mesh-controller.yaml
```

---

## 🚀 **5. Application Deployment**

### **Microservices auf EKS**
```bash
# Namespace erstellen
kubectl create namespace production

# ConfigMap mit AWS Endpoints
kubectl apply -f aws/configmap-production.yaml

# Services deployen mit Produktion-Config
kubectl apply -f k8s/production/
```

### **Production ConfigMap Beispiel:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_URL: "postgresql://postgres:password@ha-postgres-primary.xxx.eu-central-1.rds.amazonaws.com:5432/ecommerce"
  REDIS_URL: "redis://ha-redis-cluster.xxx.cache.amazonaws.com:6379"
  AWS_REGION: "eu-central-1"
  ENVIRONMENT: "production"
```

---

## ⚖️ **6. Load Balancer & Auto-Scaling**

### **Application Load Balancer**
```bash
# AWS Load Balancer Controller installieren
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=high-availability-cluster

# Ingress mit ALB
kubectl apply -f aws/alb-ingress.yaml
```

### **Horizontal Pod Autoscaler**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 💰 **7. Cost Optimization**

### **Spot Instances für Non-Critical Workloads**
```bash
# Spot Instance Node Group
aws eks create-nodegroup \
  --cluster-name high-availability-cluster \
  --nodegroup-name spot-nodes \
  --capacity-type SPOT \
  --instance-types=m5.large,m5.xlarge,m4.large \
  --scaling-config minSize=0,maxSize=5,desiredSize=1
```

### **Resource Limits & Requests**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

---

## 🔒 **8. Security & Compliance**

### **Pod Security Standards**
```bash
# Pod Security Policy
kubectl apply -f aws/pod-security-policy.yaml

# Network Policies für Segmentierung
kubectl apply -f aws/network-policies.yaml

# RBAC für Service Accounts
kubectl apply -f aws/rbac-config.yaml
```

### **Secrets Management**
```bash
# AWS Secrets Manager Integration
kubectl apply -f aws/secrets-store-csi-driver.yaml

# External Secrets Operator
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

---

## 📋 **Demo Script für AWS**

### **🎬 Live AWS Demo (10 min):**

```bash
# 1. EKS Cluster Status (2 min)
kubectl get nodes
kubectl get pods --all-namespaces

# 2. Load Balancer & Traffic (3 min)  
kubectl get ingress
curl https://your-domain.com/api/v1/products

# 3. Auto-Scaling Demo (3 min)
kubectl apply -f aws/load-test-job.yaml
watch kubectl get hpa

# 4. Monitoring in CloudWatch (2 min)
# Browser: AWS Console → CloudWatch → Dashboards
```

---

## 🤔 **Production FAQ**

**Q: "Wie viel kostet das pro Monat?"**  
**A:** *"Basis-Setup: ~$300-500/Monat. Skaliert mit Traffic. Spot Instances reduzieren Kosten um 60-90%."*

**Q: "Wie lange dauert ein Deployment?"**  
**A:** *"Initial Setup: 45-60 min. Updates: 5-10 min mit Rolling Deployments."*

**Q: "Disaster Recovery Strategy?"**  
**A:** *"Multi-AZ RDS, EKS Cluster Backup, Infrastructure as Code für komplette Wiederherstellung."*

**Q: "Wie handhaben wir Secrets in Production?"**  
**A:** *"AWS Secrets Manager + External Secrets Operator für automatische Rotation."*

---

## 🎯 **Nächste Schritte**

**Nach dem AWS Setup:**
- [🔧 **EKS Deployment Details**](02-eks-deployment.md) - Deep Dive Kubernetes
- [💰 **Cost Optimization**](03-cost-optimization.md) - Kosteneffiziente Strategien  
- [🔐 **Security Hardening**](04-security.md) - Production Security

---

**💡 Key Takeaway:** Mit AWS können wir **Enterprise-Grade Reliability** erreichen und **automatisch skalieren** - von wenigen Requests bis zu Millionen pro Tag. 