var fs = require('fs'),
    http = require('http')

http.createServer(function(req, res) {
    let requestFile = req.url == '' || req.url == '/' ? '/index.html' : req.url

    fs.readFile(__dirname + '/bundle' + requestFile, function(err, data) {
        if (err) {
            res.writeHead(404)
            res.end(JSON.stringify(err))
            return
        }
        if (requestFile.endsWith('svg')) {
            res.setHeader('Content-Type', 'image/svg+xml')
        }
        res.writeHead(200)
        res.end(data)
    })
}).listen(3000)
