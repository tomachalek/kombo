all : library demo
.PHONY: library demo clean
library :
	nodejs node_modules/webpack/bin/webpack.js --mode production --config webpack.lib.js
demo :
	nodejs node_modules/webpack/bin/webpack.js --mode development --config webpack.dev.js

clean :
	rm -rf ./dist/*
