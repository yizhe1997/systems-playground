# Systems Playground
# Run from the repo root with a Unix-like shell (WSL/Git Bash) — same assumption
# the rest of the self-hosted tooling in this repo already makes.

.DEFAULT_GOAL := help

APPS_DIR := self-host/apps
APPS_TEMPLATE_DIR := $(APPS_DIR)/_template

INFRA_DIR := self-host/infra
INFRA_TEMPLATE_DIR := $(INFRA_DIR)/_template
WORKFLOWS_DIR := .github/workflows

BOOTSTRAP_SCRIPT := scripts/bootstrap.sh
TEST_SCRIPTS_DIR := scripts/tests
BATS := $(TEST_SCRIPTS_DIR)/vendor/bats-core/bin/bats

.PHONY: help new-app new-infra bootstrap test test-bootstrap test-infra test-apps check-bats

help:
	@echo "Systems Playground"
	@echo ""
	@echo "  make bootstrap"
	@echo "      Fresh-host setup: install prerequisites, clone the repo, scaffold deploy"
	@echo "      directories, and pause with instructions at manual/interactive steps"
	@echo "      (cloudflared login, tunnel creation, GH runner registration). Re-run to"
	@echo "      pick up where it left off. See $(BOOTSTRAP_SCRIPT)."
	@echo ""
	@echo "  make new-app slug=<project-slug> [name=\"Project Name\"]"
	@echo "      Scaffold a new showcase project under $(APPS_DIR)/ from $(APPS_TEMPLATE_DIR)/."
	@echo "      Example: make new-app slug=recipe-finder name=\"Recipe Finder\""
	@echo ""
	@echo "  make new-infra slug=<infra-slug> [name=\"Infra Name\"]"
	@echo "      Scaffold a new platform infra service under $(INFRA_DIR)/ from $(INFRA_TEMPLATE_DIR)/,"
	@echo "      plus a matching $(WORKFLOWS_DIR)/deploy-infra-<infra-slug>.yml."
	@echo "      Example: make new-infra slug=grafana name=\"Grafana\""
	@echo ""
	@echo "  make test"
	@echo "      Run every container-based script test (bootstrap + infra + apps) via bats, with"
	@echo "      per-case pass/fail reporting. Needs only Docker + the bats-core submodule (run"
	@echo "      'git submodule update --init --recursive' once) — no GitHub runner or push"
	@echo "      required. Same .bats files CI calls, see $(TEST_SCRIPTS_DIR)/."
	@echo ""
	@echo "  make test-bootstrap / test-infra / test-apps"
	@echo "      Run just one group. See $(TEST_SCRIPTS_DIR)/ for what each covers."
	@echo ""
	@echo "  Pre-push test gating is handled by Husky (.husky/pre-push), which runs 'make test'"
	@echo "  automatically before a push that touches the tested scripts. Installed the same way"
	@echo "  as the pre-commit hook -- run 'npm install' once per clone, no separate make target."

bootstrap:
	@bash $(BOOTSTRAP_SCRIPT)

check-bats:
	@if [ ! -x "$(BATS)" ]; then \
		echo "❌ bats-core isn't set up yet (it's a git submodule, not committed directly). Run this once:"; \
		echo "     git submodule update --init --recursive"; \
		exit 1; \
	fi

test: check-bats test-bootstrap test-infra test-apps

test-bootstrap: check-bats
	@$(BATS) $(TEST_SCRIPTS_DIR)/test-bootstrap.bats

test-infra: check-bats
	@$(BATS) $(TEST_SCRIPTS_DIR)/test-infra-startup-shutdown.bats $(TEST_SCRIPTS_DIR)/test-infra-backup-restore.bats

test-apps: check-bats
	@$(BATS) $(TEST_SCRIPTS_DIR)/test-apps-startup-shutdown.bats $(TEST_SCRIPTS_DIR)/test-apps-backup-restore.bats

new-app:
ifndef slug
	$(error Usage: make new-app slug=<project-slug> [name="Project Name"])
endif
	@if [ -e "$(APPS_DIR)/$(slug)" ]; then \
		echo "❌ $(APPS_DIR)/$(slug) already exists — pick a different slug or remove it first."; \
		exit 1; \
	fi
	@echo "📦 Scaffolding $(APPS_DIR)/$(slug) from $(APPS_TEMPLATE_DIR)/..."
	@cp -r "$(APPS_TEMPLATE_DIR)" "$(APPS_DIR)/$(slug)"
	@find "$(APPS_DIR)/$(slug)" -type f \( -name "*.md" -o -name "*.yml" -o -name "*.sh" -o -name "*.example" \) -print0 | \
		xargs -0 sed -i \
			-e "s/<project-slug>/$(slug)/g" \
			-e "s/<project-name>/$(if $(name),$(name),$(slug))/g"
	@chmod +x "$(APPS_DIR)/$(slug)"/scripts/*.sh 2>/dev/null || true
	@echo "✅ Created $(APPS_DIR)/$(slug)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Fill in $(APPS_DIR)/$(slug)/README.md and ARCHITECTURE.md"
	@echo "  2. Add backend/ and/or frontend/ folders (with their own .env.example) as the project needs them"
	@echo "  3. Register it in self-host/apps/portfolio/frontend/src/app/projects/page.tsx"
	@echo "  4. Update docs/MONOREPO_GUIDE.md if platform integration changes"

new-infra:
ifndef slug
	$(error Usage: make new-infra slug=<infra-slug> [name="Infra Name"])
endif
	@if [ -e "$(INFRA_DIR)/$(slug)" ]; then \
		echo "❌ $(INFRA_DIR)/$(slug) already exists — pick a different slug or remove it first."; \
		exit 1; \
	fi
	@if [ -e "$(WORKFLOWS_DIR)/deploy-infra-$(slug).yml" ]; then \
		echo "❌ $(WORKFLOWS_DIR)/deploy-infra-$(slug).yml already exists — pick a different slug or remove it first."; \
		exit 1; \
	fi
	@echo "📦 Scaffolding $(INFRA_DIR)/$(slug) from $(INFRA_TEMPLATE_DIR)/..."
	@mkdir -p "$(INFRA_DIR)/$(slug)"
	@cp "$(INFRA_TEMPLATE_DIR)/README.md" "$(INFRA_DIR)/$(slug)/README.md"
	@cp "$(INFRA_TEMPLATE_DIR)/docker-compose.yml" "$(INFRA_DIR)/$(slug)/docker-compose.yml"
	@cp "$(INFRA_TEMPLATE_DIR)/.env.example" "$(INFRA_DIR)/$(slug)/.env.example"
	@sed -i \
		-e "s/<infra-slug>/$(slug)/g" \
		-e "s/<infra-name>/$(if $(name),$(name),$(slug))/g" \
		"$(INFRA_DIR)/$(slug)/README.md" "$(INFRA_DIR)/$(slug)/docker-compose.yml" "$(INFRA_DIR)/$(slug)/.env.example"
	@echo "📦 Scaffolding $(WORKFLOWS_DIR)/deploy-infra-$(slug).yml..."
	@sed \
		-e "s/<infra-slug>/$(slug)/g" \
		-e "s/<infra-name>/$(if $(name),$(name),$(slug))/g" \
		"$(INFRA_TEMPLATE_DIR)/deploy-workflow.yml.template" > "$(WORKFLOWS_DIR)/deploy-infra-$(slug).yml"
	@echo "✅ Created $(INFRA_DIR)/$(slug) and $(WORKFLOWS_DIR)/deploy-infra-$(slug).yml"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Fill in $(INFRA_DIR)/$(slug)/docker-compose.yml with the real service(s)"
	@echo "  2. Fill in $(INFRA_DIR)/$(slug)/README.md and .env.example"
	@echo "  3. This service is auto-discovered on host boot by self-host/infra/scripts/wsl-startup.sh — no extra registration needed there"
	@echo "  4. Update docs/MONOREPO_GUIDE.md if the infra/apps boundary changes"
