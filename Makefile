all : client-dev
production :  client-prod
.PHONY: all client-dev client-prod devel-server
client-prod :
	nodejs node_modules/webpack/bin/webpack.js --mode production --config webpack.prod.js
client-dev :
	nodejs node_modules/webpack/bin/webpack.js --mode development --config webpack.dev.js
devel-server :
	nodejs node_modules/webpack-dev-server/bin/webpack-dev-server.js --config webpack.dev.js
