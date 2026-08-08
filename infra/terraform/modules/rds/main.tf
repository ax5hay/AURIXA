variable "name" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "eks_node_security_group_id" { type = string }
variable "instance_class" { type = string }
variable "deletion_protection" { type = bool }

resource "aws_security_group" "database" {
  name_prefix = "${var.name}-postgres-"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "eks" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = var.eks_node_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

module "database" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier                  = var.name
  engine                      = "postgres"
  engine_version              = "16"
  family                      = "postgres16"
  major_engine_version        = "16"
  instance_class              = var.instance_class
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_encrypted           = true
  db_name                     = "aurixa"
  username                    = "aurixa_admin"
  manage_master_user_password = true
  port                        = 5432
  subnet_ids                  = var.private_subnet_ids
  create_db_subnet_group      = true
  vpc_security_group_ids      = [aws_security_group.database.id]
  multi_az                    = var.deletion_protection
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = !var.deletion_protection
  backup_retention_period     = var.deletion_protection ? 14 : 3
}

output "endpoint" { value = module.database.db_instance_endpoint }
