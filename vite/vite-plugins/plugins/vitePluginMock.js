import fs from 'fs'
import path from 'path'

export default (options) => {
    return {
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const { url } = req
                const result = getMockStat()
                const mockItem = result.find(item => item.url === url)
                if (mockItem) {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(mockItem.response()))
                    return
                }
                next()
            })
        }
    }
}

const getMockStat = () => {
    const mockStat = fs.statSync('mock')
    
    const isDir = mockStat.isDirectory()

    let result = []
    if (isDir) {
        result = require(path.resolve(process.cwd(), 'mock/index.js'))
    }

    return result.default || []
}