terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable required APIs
resource "google_project_service" "run_api" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sqladmin_api" {
  service = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "redis_api" {
  service = "redis.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess_api" {
  service = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

# 2. VPC and Serverless Connector for Private IP access
resource "google_compute_network" "main" {
  name                    = "cogniquest-vpc"
  auto_create_subnetworks = true
}

resource "google_vpc_access_connector" "connector" {
  name          = "cogniquest-connector"
  region        = var.region
  network       = google_compute_network.main.name
  ip_cidr_range = "10.8.0.0/28"
  depends_on    = [google_project_service.vpcaccess_api]
}

# 3. Cloud SQL (PostgreSQL)
resource "google_sql_database_instance" "postgres" {
  name             = "cogniquest-db-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    # f1-micro (0.6GB, ~25 conexões) é frágil sob carga. g1-small (1.7GB) dá folga.
    # Lembre de capar o pool de conexões da app (Drizzle/pg) por instância (~5).
    tier = "db-g1-small"
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }
  }
  depends_on = [google_project_service.sqladmin_api]
}

resource "google_sql_database" "database" {
  name     = "cogniquest"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "users" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# 4. Cloud Memorystore (Redis)
resource "google_redis_instance" "cache" {
  name           = "cogniquest-redis"
  memory_size_gb = 1
  region         = var.region
  authorized_network = google_compute_network.main.id
  redis_version  = "REDIS_6_X"
  depends_on     = [google_project_service.redis_api]
}

# 5. Cloud Run: Web
resource "google_cloud_run_v2_service" "web" {
  name     = "cogniquest-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1  # evita cold start na 1ª visita após ocioso
      max_instance_count = 10
    }
    max_instance_request_concurrency = 80
    containers {
      image = "gcr.io/${var.project_id}/cogniquest-web:latest"
      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@${google_sql_database_instance.postgres.private_ip_address}:5432/cogniquest"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
      }
      # Other env vars should come from Secret Manager in production
      env {
        name = "NEXTAUTH_URL"
        value = "https://cogniquest-web-${var.project_id}.run.app"
      }
    }
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
  depends_on = [google_project_service.run_api]
}

# 6. Cloud Run: Game Server
resource "google_cloud_run_v2_service" "game_server" {
  name     = "cogniquest-game-server"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    session_affinity = true # Required for Socket.io long-polling fallback
    scaling {
      min_instance_count = 1  # sempre quente: sem cold start e timers/heartbeats confiáveis
      max_instance_count = 10
    }
    timeout                          = "3600s" # mantém o WebSocket vivo (default derruba a conexão em minutos)
    max_instance_request_concurrency = 500     # conexões WS ficam ociosas; 1 instância segura muitas
    containers {
      image = "gcr.io/${var.project_id}/cogniquest-game-server:latest"
      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = false # CPU sempre alocada — necessário p/ Socket.io e timers do servidor (IA, disconnect grace)
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@${google_sql_database_instance.postgres.private_ip_address}:5432/cogniquest"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
      }
    }
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
  depends_on = [google_project_service.run_api]
}

# Allow public access
resource "google_cloud_run_service_iam_member" "web_public" {
  location = google_cloud_run_v2_service.web.location
  project  = google_cloud_run_v2_service.web.project
  service  = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "game_server_public" {
  location = google_cloud_run_v2_service.game_server.location
  project  = google_cloud_run_v2_service.game_server.project
  service  = google_cloud_run_v2_service.game_server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
