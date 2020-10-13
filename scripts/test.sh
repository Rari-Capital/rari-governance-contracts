#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

ganache_port=8546

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  echo "Starting ganache..."

  node scripts/ganache.js > /dev/null &

  ganache_pid=$!

  echo "Waiting for ganache to launch on port "$ganache_port"..."

  while ! ganache_running; do
    sleep 0.1 # wait for 1/10 of the second before check again
  done

  echo "Ganache launched!"
}

if ganache_running; then
  echo "Ganache already running!"
  exit 1;
fi

# Import .env file
export $(egrep -v '^#' .env | xargs)

truffle version
start_ganache
governance_contracts_directory=$PWD
if [ "$DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY" ]; then
  cd $DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY
  truffle migrate --network development --skip-dry-run --reset
fi
if [ "$DEVELOPMENT_POOL_YIELD_CONTRACTS_DIRECTORY" ]; then
  cd $DEVELOPMENT_POOL_YIELD_CONTRACTS_DIRECTORY
  truffle migrate --network development --skip-dry-run --reset
fi
if [ "$DEVELOPMENT_POOL_ETHEREUM_CONTRACTS_DIRECTORY" ]; then
  cd $DEVELOPMENT_POOL_ETHEREUM_CONTRACTS_DIRECTORY
  truffle migrate --network development --skip-dry-run --reset
fi
cd $governance_contracts_directory
export DEVELOPMENT_POOL_CONTRACTS_FROM_ARTIFACTS=1
truffle test --network development
