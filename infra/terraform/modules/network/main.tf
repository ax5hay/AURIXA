variable "name" { type = string }
variable "region" { type = string }
variable "vpc_cidr" { type = string }
variable "single_nat_gateway" { type = bool }

data "aws_availability_zones" "available" { state = "available" }

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = var.name
  cidr = var.vpc_cidr
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)

  private_subnets = [for index in range(3) : cidrsubnet(var.vpc_cidr, 4, index)]
  public_subnets  = [for index in range(3) : cidrsubnet(var.vpc_cidr, 4, index + 8)]

  enable_nat_gateway      = true
  single_nat_gateway      = var.single_nat_gateway
  enable_dns_hostnames    = true
  enable_dns_support      = true
  map_public_ip_on_launch = false

  public_subnet_tags  = { "kubernetes.io/role/elb" = "1" }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = "1" }
}

output "vpc_id" { value = module.vpc.vpc_id }
output "private_subnet_ids" { value = module.vpc.private_subnets }
