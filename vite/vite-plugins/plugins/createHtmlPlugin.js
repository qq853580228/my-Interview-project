export default (options) => {
  return {
    transformIndexHtml: {
        order: 'pre',
        handler: (html) => {
            return html.replace(/<%= title %>/g, options.inject.data.title)
        }
    }
  }
}
