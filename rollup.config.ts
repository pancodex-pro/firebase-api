import commonjs from '@rollup/plugin-commonjs';
import externals from 'rollup-plugin-node-externals';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
// @ts-ignore
import pkg from './package.json';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: pkg.main,
            format: 'cjs',
        },
    ],
    external: Object.keys(pkg.dependencies || {}),
    plugins: [
        externals(),
        resolve(),
        commonjs(),
        typescript({
            useTsconfigDeclarationDir: true,
        }),
    ],
};