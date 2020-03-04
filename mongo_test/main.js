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
        if(item.uid && typeof item.uid == 'number' && item.uid > 0 && item.scanJson){
            if(!maps[item.paper_id])
            {
                maps[item.paper_id] = true

            }
            papers.push({
                paper_id: item.paper_id,
                uid: item.uid,
                _id: item._id
            })
        }
    }
    //console.log(papers)
    //paper_id: 5c554120e3682d3386d4e803 //有小题
    //paper_id: 5c4fbf72e3682d6528c3c7ab

    let count = 0
    let root = './images_dir'
    DownloadFile.delDir(root)
    if(!fs.existsSync(root)){
        fs.mkdirSync(root)
    }
    for(let item of papers){
        let paper_id = item.paper_id
        let uid = item.uid
        let curDir = `${root}/${paper_id}`

        let result = []
        //console.log(paper_id, typeof paper_id) //5d11c76fe3682d2eef4e7ddc
        if(paper_id.toString() != "5c554120e3682d3386d4e803"){
            //continue
        }
        let scandatas = await dbase.collection('ScanData').find({
            "HumanIntervention.sPaperId": paper_id.toString(),
            "ImageProcess.v2_card_num_id": uid
        }).toArray()
        let anscard = await dbase.collection('Anscard_v2').find({
            "_id": item._id
        }).toArray()
        if(scandatas.length == 0 || anscard.length == 0){
            continue;
        }
        let pages = anscard[0].scanJson.pages
        //console.log(pages)
        //console.log(scandatas)1
        let filename_map = {}
        for(let scandata of scandatas){
            let originImage = scandata.ImageProcess.sSourceImage
            let page_index = scandata.ImageProcess.page_index
            if(!(typeof page_index == 'number' && page_index >=0 && page_index < pages.length)){
                continue
            }
            if(!originImage)
                continue
            if(originImage && originImage.length > 0){
                let image_url = OSSUtil.get_uri_of_oss_img(originImage)
                let imageInfo = await DownloadFile.getImageInfo(image_url+'?x-oss-process=image/info')
                if(!imageInfo)
                    continue
                imageInfo = JSON.parse(imageInfo)
                let imageWH = {
                    width: parseInt(imageInfo.ImageWidth.value),
                    height: parseInt(imageInfo.ImageHeight.value)
                }
                //console.log(imageWH)
                if(isNaN(imageWH.width) || isNaN(imageWH.height)){
                    continue
                }

                // 每道小题
                let HumanIntervention = scandata.HumanIntervention
                let ItemResultDict = HumanIntervention.ItemResultDict

                let subject_items = pages[page_index].subjective_items
                let model_size = pages[page_index].model_size
                let rate = imageWH.width / model_size.w
                let hand_items_id = []
                //console.log(rate)
                if( !((imageWH.width > imageWH.height && model_size.w > model_size.h)
                    || (imageWH.width < imageWH.height && model_size.w < model_size.h))
                ){
                    continue
                }
                for(let item_id in ItemResultDict){
                    //console.log(item_id)
                    let iScoreArray = ItemResultDict[item_id].iScoreArray
                    if(!iScoreArray){
                        continue
                    }
                    // if(iScoreArray.length == 1){// 没有小题
                    //     //console.log(`无小题:(item_id:${item_id})`)
                    //     let score = iScoreArray[0]
                    //
                    // }
                    // else if(iScoreArray.length > 1){ //有小题
                        //console.log(`有小题:(item_id:${item_id})`)
                        for(let score of iScoreArray){
                            if(!score || score == -1 || score.toString().indexOf('.') > -1){
                                continue
                            }
                            let indx = 0
                            let handwritten_rects = []
                            for(let sit of subject_items){
                                if(sit.item_id == item_id && sit.sub_q_index == indx){
                                    if(sit.handwritten_rects){
                                        handwritten_rects = sit.handwritten_rects
                                    }
                                    break
                                }
                                indx++
                            }
                            //console.log(handwritten_rects)
                            let scoreStr = getNumber(score.toString(), handwritten_rects.length)
                            //console.log(scoreStr)
                            //方块个数
                            let cnt = 0
                            for(let rect of handwritten_rects){
                                if(scoreStr[cnt] != 'N'){
                                    let crop = {
                                        x: parseInt(rect.x * rate),
                                        y: parseInt(rect.y * rate),
                                        w: parseInt(rect.w * rate),
                                        h: parseInt(rect.h * rate),
                                    }
                                    let crop_img = `${image_url}?x-oss-process=image/crop,x_${crop.x},y_${crop.y},w_${crop.w},h_${crop.h}`;
                                    result.push({
                                        crop_img_url: crop_img,
                                        number: scoreStr[cnt]
                                    })
                                }

                                cnt++
                            }
                        }
                    //}
                }

                // let image_name = DownloadFile.getUrlName(image_url)
                // if(!filename_map[image_name]){
                //     filename_map[image_name] = true
                //
                //     //console.log(`downloaded:(${count})`, image_url)
                //     result.push(image_url)
                //     //await DownloadFile.downloadImage(image_url)
                // }
            }
        }
        console.log(result)
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
        //break
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
function getNumber(nums, max_lenfth){ //把 2,2 换成 02
    let res = ''
    if(nums.length < max_lenfth){
        let zeros = max_lenfth - nums.length
        for(let i=0;i<zeros;i++){
            res += 'N'
        }
    }
    for(let num of nums){
        if(num>='0' && num<='9'){
            res+=num
        }
    }
    return res
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