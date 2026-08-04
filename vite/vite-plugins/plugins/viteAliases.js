const fs = require('fs')
const path = require('path')

function diffDirAndFile(dirPathArr = [], basePath = '') {
    const result = {
        dirAll: [],
        fileAll: []
    }
    dirPathArr.forEach(item => {
        const currentStat = fs.statSync(path.resolve(__dirname, basePath + '/' + item))
        const isDir = currentStat.isDirectory()
        if(isDir) {
            result.dirAll.push(item)
        }
        else {
            result.fileAll.push(item)
        }
    })
    return result
}

function handleDirAllForSrc(prefix, dirPath) {
    const dirPathArr = getDirAllForSrc(dirPath)
    const result = diffDirAndFile(dirPathArr, dirPath)
    const resolveAlias = {}
    result.dirAll.forEach(item => {
        resolveAlias[prefix + item] = path.resolve(__dirname, dirPath + '/' + item)
    })
    return resolveAlias
}

function getDirAllForSrc(dirPath) {
    return fs.readdirSync(path.resolve(__dirname, dirPath))
}

export default (options = {
    prefix: '@',
    dirPath: '../src',
}) => {
    return {
        config() {
            // config 是当前的配置对象
            const { prefix, dirPath } = options
            const result = handleDirAllForSrc(prefix, dirPath)

            return {
                resolve: {
                    alias: result
                }
            }
        }
    }
}