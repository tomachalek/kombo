import typescript from 'rollup-plugin-typescript2';
import alias from 'rollup-plugin-alias';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

export default [
	{
		input: 'src/kombo/index.ts',
		output: {
			name: 'kombo',
			file: pkg.browser,
			format: 'umd'
        },
        external: ['react', 'react-dom', 'rxjs', 'rxjs/operators'],
		plugins: [
			typescript({
                tsconfig: './src/kombo/tsconfig.json',
                tsconfigOverride:  {
                    compilerOptions: {
                        declaration: false,
                        lib: ['es5', 'dom', 'es2015.iterable'],
                        target: 'es5',
                    }
                }
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            uglify()
		]
	},
	{
        input: 'src/kombo/index.ts',
        output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		],
        external: ['react', 'react-dom', 'rxjs', 'rxjs/operators'],
		plugins: [
			typescript({
                tsconfig: "./src/kombo/tsconfig.json",
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            })
		]
    }
];
