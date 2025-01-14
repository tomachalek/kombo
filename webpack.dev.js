import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mkpath = (p) => resolve(__dirname, 'demo/src/js', p);
const mkDistpath = (p) => resolve(__dirname, 'demo/dist', p);

export default {
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
            'kombo': resolve(__dirname, 'src/kombo'),
            'vendor/intl-messageformat': mkpath('../../../src/vendor/intl-messageformat')
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
                use: [
                    { loader: 'style-loader'},
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    { loader: 'style-loader'},
                    { loader: 'css-loader' },
                    {
                        loader: 'less-loader',
                        options: {
                            strictMath: true,
                            noIeCompat: true
                        }
                    }
                ]
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
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                                decorators: false,
                                dynamicImport: false
                            },
                            target: 'es2016'
                        }
                    }
                }
            },
        ]
    },
    externals: [],
    devtool: 'source-map',
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: 'common'
        }
    }
};
