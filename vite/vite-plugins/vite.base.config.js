import vue from '@vitejs/plugin-vue'
import myViteAliases from './plugins/viteAliases.js'
import { defineConfig } from 'vite'
import createHtmlPlugin from './plugins/createHtmlPlugin.js'
import { viteMockServe } from 'vite-plugin-mock'
import vitePluginMock from './plugins/vitePluginMock.js'

export default defineConfig({
    plugins: [
        vue(),
        myViteAliases(),
        createHtmlPlugin(
            {
                inject: {
                    data: {
                        title: '标题'
                    }
                }
            }
        ),
        // viteMockServe(),
        vitePluginMock(),
    ],
})