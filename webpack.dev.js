const common = require('./webpack.common');
const merge = require('webpack-merge');
const path = require('path');


module.exports = merge(common, {
    devServer: {
        contentBase: path.resolve(__dirname, "./dist"),
        compress: true,
        port: 8080,
        host: 'localhost',
        inline: false
    },
    devtool: 'source-map'
});