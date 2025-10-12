.PHONY: codex migrate cleanup test validate

codex:
	bash scripts/codex/run.sh

migrate:
	psql "$$DATABASE_URL" -f db/migrations/20251012_refonte.sql

cleanup:
	RETENTION_DAYS=30 bash scripts/storage_cleanup.sh

test:
	@if [ ! -d node_modules/jscodeshift ]; then \
	echo "[test] Installing dev dependencies for codemod checks..."; \
	npm install --no-fund --no-audit >/dev/null || echo "[test] npm install failed, proceeding with available modules."; \
	fi
	node --test scripts/codex/refonte-codemod.test.cjs

validate:
	bash scripts/validate_refonte.sh
