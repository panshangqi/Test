const request = require('request')
const fs = require('fs')
const path = require('path')

var download_url = 'https://scan-hz.oss-cn-hangzhou.aliyuncs.com/scan-hz/019129/3cd582b153cd4013bd0807bf58e3c22e_0.jpg'
console.log(download_url)


// req.on('response', function (data) {
//     total_bytes = parseInt(data.headers['content-length']);
// })
// req.on('data', function(chunk) {
//     // Update the received bytes
//     if(total_bytes == 0)
//         return
//     received_bytes += chunk.length;
//     var et = new Date().getTime()
//     var times = et - st;
//     var speed = received_bytes*1000/times
//     var percent = received_bytes/total_bytes
//     console.log({speed, percent})
//     //self.event.emit('download-progress', {speed, percent})
// });
function getUrlName(url){
    let arr = url.split('/')
    return arr[arr.length - 1]
}
function downloadImage(save_path, url){
    return new Promise((resolve, reject)=>{
        let req = request({method: 'GET', uri: url})
        req.pipe(fs.createWriteStream(save_path))
        req.on('end', function() {
            resolve(true)
        });
        req.on('error', function(err) {
            resolve(false)
        });
    })
}
function delDir(path){
    let files = [];
    if(fs.existsSync(path)){
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()){
                delDir(curPath); //递归删除文件夹
            } else {
                fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}

//downloadImage(download_url)
module.exports = {
    downloadImage,
    getUrlName,
    delDir
}