all : client-dev library
production :  client-prod
.PHONY: all library client-dev client-prod devel-server
library :
	nodejs node_modules/webpack/bin/webpack.js --mode production --config webpack.lib.js
client-prod :
	nodejs node_modules/webpack/bin/webpack.js --mode production --config webpack.prod.js
client-dev :
	nodejs node_modules/webpack/bin/webpack.js --mode development --config webpack.dev.js
devel-server :
	nodejs node_modules/webpack-dev-server/bin/webpack-dev-server.js --config webpack.dev.js
