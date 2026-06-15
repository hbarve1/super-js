import { dts } from 'rollup-plugin-dts'
export default {
  input: 'libs/compiler/dist/index.d.ts',
  output: { file: 'libs/compiler/publish/index.d.ts', format: 'es' },
  plugins: [dts({ respectExternal: true })],
}
