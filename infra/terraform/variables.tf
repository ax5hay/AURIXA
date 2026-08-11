variable "region" {
  description = "AWS region for this environment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Short environment name."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "cluster_public_access_cidrs" {
  description = "CIDRs allowed to reach the EKS public API. Keep restricted."
  type        = list(string)
}

variable "node_instance_types" {
  type    = list(string)
  default = ["t3.large"]
}

variable "min_nodes" {
  type    = number
  default = 2
}

variable "max_nodes" {
  type    = number
  default = 10
}

variable "desired_nodes" {
  type    = number
  default = 3
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "service_repositories" {
  type = set(string)
  default = [
    "api-gateway", "orchestration-engine", "llm-router", "agent-runtime",
    "rag-service", "safety-guardrails", "streaming-voice", "execution-engine",
    "observability-core", "deployment-controller", "dashboard",
    "client-portal", "agent-workspace", "db-migrations"
  ]
}

variable "secrets_manager_arns" {
  description = "Secret ARNs readable by the External Secrets service account."
  type        = list(string)
  default     = []
}
