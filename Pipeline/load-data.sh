#!/bin/bash
# filepath: Pipeline/load-data.sh

# Load the dump if it exists
if [ -f /data/neo4j.dump ]; then
  neo4j-admin database load neo4j --from-path=/data/ --overwrite-destination
  neo4j-admin database load system --from-path=/data/ --overwrite-destination
fi

# Start Neo4j
exec neo4j console