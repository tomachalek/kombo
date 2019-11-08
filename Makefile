all : library demo
library : clean lib
.PHONY: lib library demo clean
lib :
	nodejs node_modules/rollup/dist/bin/rollup --c rollup.config.js
demo :
	nodejs node_modules/webpack/bin/webpack.js --mode development --config webpack.dev.js
clean :
	rm -rf ./dist/* ./dist-es6/* ./dist-umd/*

