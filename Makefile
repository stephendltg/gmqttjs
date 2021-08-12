# Make
BINARY_NAME=$(shell node -p "require('./package.json').name")
VERSION := $(shell node -p "require('./package.json').version")
DESCRIPTION := $(shell node -p "require('./package.json').description")
HOMEPAGE := $(shell node -p "require('./package.json').homepage")
AUTHOR=stephendltg
NODE=v14.16.1
NVM=v0.38.0
DENO=1.13.0

install: 
	@echo "Installing project ${BINARY_NAME}..."
	. ${NVM_DIR}/nvm.sh && nvm install ${NODE} && nvm use ${NODE}
	npm install
	curl -fsSL https://deno.land/x/install/install.sh | sh
	deno upgrade --version ${DENO}

nvm:
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM}/install.sh | bash

env:
	@echo "Binary name: $(BINARY_NAME)"
	@echo "Version: $(VERSION)"
	@echo "Description: $(DESCRIPTION)"
	@echo "Homepage: $(HOMEPAGE)"
	@echo "Author: $(AUTHOR)"
	@echo "Node: $(NODE)"
	@echo "NVM: ${NVM}"
	@echo "Deno: ${DENO}"

help:

	@echo "make nvm: insall nvm"
	@echo "make install: Install nodejs"
