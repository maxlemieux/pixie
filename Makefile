# Makefile for the repo.
# This is used to help coordinate some of the tasks around the build process.
# Most of the actual build steps should be managed by Bazel.

## Bazel command to use.
BAZEL     := bazel

## Dep command to use.
DEP       := dep

.PHONY: clean
clean:
	$(BAZEL) clean

.PHONY: pristine
pristine:
	$(BAZEL) clean --expunge

.PHONY: build
build: gazelle ## Run the full build.
	$(BAZEL) build //...

.PHONY: dep-ensure
dep-ensure: ## Ensure that go dependencies exist.
	$(DEP) ensure

gazelle-repos: Gopkg.lock
	$(BAZEL) run //:gazelle -- update-repos -from_file=Gopkg.lock

gazelle: gazelle-repos ## Run gazelle to update go build rules.
	$(BAZEL) run //:gazelle

go-setup: dep-ensure gazelle

help: ## Print help for targets with comments.
	@echo "Usage:"
	@echo "  make [target...] [VAR=foo VAR2=bar...]"
	@echo ""
	@echo "Useful commands:"
# Grab the comment prefixed with "##" after every rule.
	@grep -Eh '^[a-zA-Z._-]+:.*?## .*$$' $(MAKEFILE_LIST) |\
		sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(cyan)%-30s$(term-reset) %s\n", $$1, $$2}'
	@echo ""
	@echo "Useful variables:"
# Grab the comment prefixed with "##" before every variable.
	@awk 'BEGIN { FS = ":=" } /^## /{x = substr($$0, 4); \
    getline; if (NF >= 2) printf "  $(cyan)%-30s$(term-reset) %s\n", $$1, x}' $(MAKEFILE_LIST) | sort
	@echo ""
	@echo "Typical usage:"
	@printf "  $(cyan)%s$(term-reset)\n    %s\n\n" \
		"make build" "Run a clean build and update all the GO deps." \
		"make pristine" "Delete all cached builds." \
