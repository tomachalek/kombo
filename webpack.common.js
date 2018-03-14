const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractLess = new ExtractTextPlugin({
    filename: '[name].css'
});

const mkpath = (p) => path.resolve(__dirname, 'demo/src/js', p);
const mkDistpath = (p) => path.resolve(__dirname, 'demo/dist', p);

module.exports = {
    entry: {
        index: mkpath('pages/index.ts')
    },
    output: {
        filename: '[name].js',
        path: mkDistpath(''),
        libraryTarget: 'var',
        library: '[name]Page'
    },
    resolve: {
        alias: {
            'kombo': path.resolve(__dirname, 'src/kombo')
        },
        modules: [
            'node_modules'
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less']
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: extractLess.extract(['css-loader'])
            },
            {
                test: /\.less$/,
                use: extractLess.extract(['css-loader', 'less-loader']),
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            emitFile: false,
                            name: '../img/[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            },
        ]
    },
    externals: [],
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: 'common'
        }
    },
    plugins: [
        extractLess
    ]
};
