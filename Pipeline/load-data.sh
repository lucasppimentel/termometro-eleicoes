#!/bin/bash
# filepath: Pipeline/load-data.sh

# Load the dump if it exists
if [ -f /data/neo4j.dump ]; then
  neo4j-admin database load neo4j --from-path=/data/ --overwrite-destination
  neo4j-admin database load system --from-path=/data/ --overwrite-destination
fi

# Configure Neo4j to listen on all interfaces
# Neo4j's default config location is /var/lib/neo4j/conf/neo4j.conf
# We also write to /conf/neo4j.conf for persistence via volume mount
DEFAULT_CONFIG="/var/lib/neo4j/conf/neo4j.conf"
MOUNTED_CONFIG="/conf/neo4j.conf"
mkdir -p /var/lib/neo4j/conf
mkdir -p /conf

# Function to update config file
update_config() {
  local config_file=$1
  if [ -f "$config_file" ]; then
    # Remove existing listen address settings if they exist
    sed -i '/^server\.bolt\.listen_address=/d' "$config_file"
    sed -i '/^server\.http\.listen_address=/d' "$config_file"
  fi
  # Add listen addresses to allow external connections
  echo "server.bolt.listen_address=0.0.0.0:7687" >> "$config_file"
  echo "server.http.listen_address=0.0.0.0:7474" >> "$config_file"
}

# Update both config locations
update_config "$DEFAULT_CONFIG"
update_config "$MOUNTED_CONFIG"

# Start Neo4j
exec neo4j console