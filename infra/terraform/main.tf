terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "aurixa-terraform-state"
    key    = "infra/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "aurixa"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ---------- VPC ----------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "aurixa-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# ---------- EKS ----------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "aurixa-${var.environment}"
  cluster_version = "1.31"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      min_size       = var.min_nodes
      max_size       = var.max_nodes
      desired_size   = var.desired_nodes
    }
  }

  cluster_endpoint_public_access = true
}

# ---------- RDS (PostgreSQL) ----------
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "aurixa-${var.environment}"
  engine     = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class
  allocated_storage = 20

  db_name  = "aurixa"
  username = "aurixa"
  port     = 5432

  vpc_security_group_ids = [module.vpc.default_security_group_id]
  subnet_ids             = module.vpc.private_subnets
  create_db_subnet_group = true

  family               = "postgres16"
  major_engine_version = "16"

  deletion_protection = var.environment == "production"
}

# ---------- ElastiCache (Redis) ----------
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "aurixa-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "aurixa-redis-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}
