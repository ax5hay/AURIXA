variable "name" { type = string }
variable "kubernetes_version" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "node_instance_types" { type = list(string) }
variable "node_min_size" { type = number }
variable "node_max_size" { type = number }
variable "node_desired_size" { type = number }
variable "public_access_cidrs" { type = list(string) }

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name                             = var.name
  cluster_version                          = var.kubernetes_version
  vpc_id                                   = var.vpc_id
  subnet_ids                               = var.private_subnet_ids
  enable_irsa                              = true
  cluster_endpoint_private_access          = true
  cluster_endpoint_public_access           = length(var.public_access_cidrs) > 0
  cluster_endpoint_public_access_cidrs     = var.public_access_cidrs
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns              = { most_recent = true }
    "kube-proxy"         = { most_recent = true }
    "vpc-cni"            = { most_recent = true, before_compute = true }
    "aws-ebs-csi-driver" = { most_recent = true }
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
    }
  }
}

output "cluster_name" { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "node_security_group_id" { value = module.eks.node_security_group_id }
output "oidc_provider_arn" { value = module.eks.oidc_provider_arn }
output "oidc_provider_url" { value = module.eks.cluster_oidc_issuer_url }
