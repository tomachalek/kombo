const webpack = require('webpack');
const path = require('path');

const mkpath = (p) => path.resolve(__dirname, 'src', p);
const mkDistpath = (p) => path.resolve(__dirname, 'dist', p);

module.exports = {
    entry: {
        index: './src/kombo/index.ts'
    },
    output: {
        filename: '[name].js',
        path: mkDistpath(''),
        libraryTarget: 'umd',
        library: 'kombo'
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            },
        ]
    },
    resolve: {
        modules: [
            'node_modules'
        ],
        extensions: ['.ts', '.js'],
        alias: {
            'vendor/intl-messageformat': mkpath('vendor/intl-messageformat')
        }
    },
    externals: [
        '@reactivex/rxjs',
        'react'
    ],
    optimization: {
        minimize: false
      }
};
