all : library typecheck_demo demo
library : clean typecheck lib
.PHONY: lib library demo clean typecheck typecheck_demo
lib :
	node node_modules/rollup/dist/bin/rollup --c rollup.config.js
demo :
	node node_modules/webpack/bin/webpack.js --mode development --config webpack.dev.js
clean :
	rm -rf ./dist/* ./dist-es6/* ./dist-umd/*
typecheck:
	node_modules/typescript/bin/tsc --project ./src/kombo/tsconfig.json --noEmit --skipLibCheck
typecheck_demo:
	node_modules/typescript/bin/tsc --project ./demo/tsconfig.json --noEmit --skipLibCheck
