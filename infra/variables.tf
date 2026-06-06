variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region to deploy to"
  type        = string
  default     = "us-central1"
}

variable "db_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "cogniquest"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}
