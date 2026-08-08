terraform {
  required_version = ">= 1.5"
  backend "s3" {}
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

module "network" {
  source             = "./modules/network"
  name               = local.name
  region             = var.region
  vpc_cidr           = var.vpc_cidr
  single_nat_gateway = var.environment != "prod"
}

module "eks" {
  source              = "./modules/eks"
  name                = local.name
  kubernetes_version  = var.kubernetes_version
  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids
  node_instance_types = var.node_instance_types
  node_min_size       = var.min_nodes
  node_max_size       = var.max_nodes
  node_desired_size   = var.desired_nodes
  public_access_cidrs = var.cluster_public_access_cidrs
}

module "ecr" {
  source       = "./modules/ecr"
  name         = local.name
  repositories = var.service_repositories
}

module "rds" {
  source                     = "./modules/rds"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
  instance_class             = var.db_instance_class
  deletion_protection        = var.environment == "prod"
}

module "elasticache" {
  source                     = "./modules/elasticache"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
  node_type                  = var.redis_node_type
}

module "platform" {
  source               = "./modules/platform"
  name                 = local.name
  cluster_name         = module.eks.cluster_name
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_provider_url    = module.eks.oidc_provider_url
  secrets_manager_arns = var.secrets_manager_arns
}

locals {
  name = "aurixa-${var.environment}"
}
