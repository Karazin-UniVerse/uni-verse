#!/bin/bash
set -eu

PORT=${PORT:-8080}
case "$PORT" in
  *[!0-9]*|'') echo 'Invalid PORT' >&2; exit 1 ;;
esac
PORT=$((10#$PORT))
if (( PORT < 1 || PORT > 65535 || PORT == 3000 || PORT == 3002 )); then
  echo 'PORT must be between 1 and 65535 and differ from internal ports' >&2
  exit 1
fi
mkdir -p /tmp/nginx
sed "s/__PORT__/$PORT/g" /app/docker/frontend/nginx.conf.template > /tmp/frontend-nginx.conf

pids=()
cleanup() {
  trap '' TERM INT
  if ((${#pids[@]} == 3)); then
    kill -QUIT "${pids[2]}" 2>/dev/null || true
    wait "${pids[2]}" 2>/dev/null || true
  fi
  kill -TERM "${pids[@]:0:2}" 2>/dev/null || true
  wait || true
}
trap 'cleanup; exit 0' TERM INT
trap cleanup EXIT
(cd /app/packages/uni-hub && export PORT=3000 && exec pnpm start -H 127.0.0.1) & pids+=("$!")
(cd /app/packages/grip/frontend && export PORT=3002 && exec pnpm start -H 127.0.0.1) & pids+=("$!")
nginx -c /tmp/frontend-nginx.conf -g 'daemon off;' & pids+=("$!")
set +e
wait -n "${pids[@]}"
set -e
echo 'A frontend process exited unexpectedly' >&2
exit 1
