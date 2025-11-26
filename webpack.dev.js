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
            'kombo': resolve(__dirname, 'dist-es6/kombo.js')
        },
        modules: [
            'node_modules',
            resolve(__dirname, 'src')
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
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
                                decorators: true,
                                dynamicImport: false,
                                decoratorsBeforeExport: false
                            },
                            transform: {
                                decoratorVersion: "2022-03"
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
