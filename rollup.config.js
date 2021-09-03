import alias from 'rollup-plugin-alias';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
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
              tsconfig: './src/kombo/tsconfig.json'
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            terser(),
            resolve({
                extensions: ['.ts', '.js']
            })
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
              tsconfig: './src/kombo/tsconfig.json'
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            resolve({
                extensions: ['.ts', '.js']
            })
		]
    }
];
