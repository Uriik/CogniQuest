output "web_url" {
  value = google_cloud_run_v2_service.web.uri
  description = "The public URL of the web service"
}

output "game_server_url" {
  value = google_cloud_run_v2_service.game_server.uri
  description = "The public URL of the game server"
}

output "db_private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
  description = "The private IP address of the database"
}

output "redis_host" {
  value = google_redis_instance.cache.host
  description = "The IP address of the Redis instance"
}
