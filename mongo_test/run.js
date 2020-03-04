var MongoClient = require('mongodb').MongoClient;
//var url = "mongodb://10.200.2.234:27017";//
let url = 'mongodb://klx_developer:klx_developer@10.200.2.234:27017/admin'
let OSSUtil = require('./oss_util')
let DownloadFile = require('./download_file')
let fs = require('fs')
let path = require('path')
async function main(){
    const client = new MongoClient(url,{ useUnifiedTopology: true,useNewUrlParser : true })
    await client.connect()
    console.log('数据库连接成功')
    const dbase = client.db('scanservice')

    let res = await dbase.collection('Anscard_v2').find({"config.cardType": 2, "config.answerMarkType":2});
    //console.log(res)
    let arrs = await res.toArray()
    //console.log(arrs)
    let papers = []
    let maps = {}
    for(let item of arrs){
        if(item.uid && typeof item.uid == 'number' && item.uid > 0){
            if(!maps[item.paper_id])
            {
                maps[item.paper_id] = true
                papers.push(item.paper_id)
            }
        }
    }
    console.log(papers)
    //paper_id: 5c4b008ee3682d6528c3c277
    //paper_id: 5c4fbf72e3682d6528c3c7ab

    let count = 0
    let root = './images_dir'
    DownloadFile.delDir(root)
    if(!fs.existsSync(root)){
        fs.mkdirSync(root)
    }
    for(let paper_id of papers){
        let curDir = `${root}/${paper_id}`

        let result = []
        console.log(paper_id, typeof paper_id) //5d11c76fe3682d2eef4e7ddc
        let scandatas = await dbase.collection('ScanData').find({"HumanIntervention.sPaperId": paper_id.toString()}).toArray()
        //console.log(scandatas)1
        let filename_map = {}
        for(let scandata of scandatas){
            let originImage = scandata.ImageProcess.sOriginImage
            if(originImage && originImage.length > 0){
                let image_url = OSSUtil.get_uri_of_oss_img(originImage)

                let image_name = DownloadFile.getUrlName(image_url)
                if(!filename_map[image_name]){
                    filename_map[image_name] = true

                    //console.log(`downloaded:(${count})`, image_url)
                    result.push(image_url)
                    //await DownloadFile.downloadImage(image_url)
                }
            }
        }

        if(result.length > 1){
            if(!fs.existsSync(curDir))
            {
                fs.mkdirSync(curDir)
            }
            count += result.length
            console.log(`${paper_id}(count): ${result.length} `)
            fs.writeFileSync(curDir + '/url.json', JSON.stringify(result));
            console.log(`downloaded:(${count})`)
        }

        if(count > 30000) {
            break
        }
    }


    client.close()
}
async function download_image_run(){
    let download_root = './images' //下载根目录
    console.log('start download')
    let jsonRoot = './images_dir'
    if(!fs.existsSync(jsonRoot)){
        console.log(`${jsonRoot} is not exist`)
        return
    }

    files = fs.readdirSync(jsonRoot);
    console.log(files)
    for(let file of files){
        let curPath = jsonRoot + "/" + file;
        if(!fs.statSync(curPath).isDirectory()) {
            continue
        }
        let paper_id = file
        console.log(`start download paper_id: ${paper_id}`)
        let jsonFile = curPath + '/url.json'
        if(fs.existsSync(jsonFile)){
            let buffer = fs.readFileSync(jsonFile)
            let result = JSON.parse(buffer.toString())
            //console.log(result)

            let paper_id_download_dir = download_root +'/' + file
            if(!fs.existsSync(paper_id_download_dir)){
                fs.mkdirSync(paper_id_download_dir)
            }
            //下载
            for(let image_url of result){
                let save_path = paper_id_download_dir +'/' + DownloadFile.getUrlName(image_url)
                if(!fs.existsSync(save_path)){
                    await DownloadFile.downloadImage(save_path, image_url)
                }

            }
            console.log(`downloaded paper_id: ${paper_id}, count: ${result.length}`)
        }
    }
}
//main()
//download_image_run()
var args = process.argv.splice(2)
//console.log(args)
if(args.length > 0 && args[0] == 'json'){
    main()
}else if(args.length>0 && args[0] == 'image'){
    download_image_run()
}else{
    console.log('Error params')
}
// MongoClient.connect(url, { useNewUrlParser: true,useUnifiedTopology: true }, function(err, db) {
//     if (err) throw err;
//     console.log("数据库已连接!");
//     var dbase = db.db("scanservice");
//     dbase.collection("Anscard_v2"). find({}).toArray(function(err, result) { // 返回集合中所有数据
//         if (err) throw err;
//         console.log(result);
//         db.close();
//     });
//
// });