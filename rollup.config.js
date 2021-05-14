import typescript from 'rollup-plugin-typescript2';
import alias from 'rollup-plugin-alias';
import { terser } from "rollup-plugin-terser";
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

export default [
	{
		input: 'src/kombo/index.ts',
		output: {
			name: 'kombo',
			file: pkg.browser,
			format: 'umd'
        },
        external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
		plugins: [
			typescript({
                typescript: require('typescript'),
                tsconfig: './src/kombo/tsconfig.json',
                tsconfigOverride:  {
                    compilerOptions: {
                        declaration: false,
                        target: 'es2015',
                    }
                }
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            terser(),
            resolve()
		]
    },
	{
        input: 'src/kombo/index.ts',
        output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		],
        external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
		plugins: [
			typescript({
                typescript: require('typescript'),
                tsconfig: "./src/kombo/tsconfig.json",
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            resolve()
		]
    }
];
