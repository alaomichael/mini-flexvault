#!/usr/bin/env bash
# Use this script to test if a given TCP host/port are available

host="$1"
shift
port="$1"
shift

timeout=15
quiet=0
cmd="$@"

until nc -z "$host" "$port"; do
  if [ $quiet -eq 0 ]; then
    echo "Waiting for $host:$port..."
  fi
  timeout=$((timeout - 1))
  if [ $timeout -le 0 ]; then
    echo "Timeout waiting for $host:$port"
    exit 1
  fi
  sleep 1
done

exec $cmd
