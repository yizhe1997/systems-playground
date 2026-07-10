# Systems Playground
# Run from the repo root with a Unix-like shell (WSL/Git Bash) — same assumption
# the rest of the self-hosted tooling in this repo already makes.

.DEFAULT_GOAL := help

APPS_DIR := self-host/apps
APPS_TEMPLATE_DIR := $(APPS_DIR)/_template

INFRA_DIR := self-host/infra
INFRA_TEMPLATE_DIR := $(INFRA_DIR)/_template
WORKFLOWS_DIR := .github/workflows

.PHONY: help new-app new-infra

help:
	@echo "Systems Playground"
	@echo ""
	@echo "  make new-app slug=<project-slug> [name=\"Project Name\"]"
	@echo "      Scaffold a new showcase project under $(APPS_DIR)/ from $(APPS_TEMPLATE_DIR)/."
	@echo "      Example: make new-app slug=recipe-finder name=\"Recipe Finder\""
	@echo ""
	@echo "  make new-infra slug=<infra-slug> [name=\"Infra Name\"]"
	@echo "      Scaffold a new platform infra service under $(INFRA_DIR)/ from $(INFRA_TEMPLATE_DIR)/,"
	@echo "      plus a matching $(WORKFLOWS_DIR)/deploy-infra-<infra-slug>.yml."
	@echo "      Example: make new-infra slug=grafana name=\"Grafana\""

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
