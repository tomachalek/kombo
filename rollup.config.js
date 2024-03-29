/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import alias from 'rollup-plugin-alias';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import pkg from './package.json';
import * as path from 'path';


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
            esbuild({
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
            esbuild({
                tsconfig: './src/kombo/tsconfig.json'
            }),
            alias({
                'vendor/intl-messageformat': './../vendor/intl-messageformat'
            }),
            resolve({
                extensions: ['.ts', '.js']
            })
		]
    },
    {
		input: 'src/kombo/index.ts',
    	output: {
      		file: path.resolve(path.dirname(pkg.module), 'kombo.d.ts'),
      		format: 'es'
    	},
		plugins: [dts()]
	}
];
