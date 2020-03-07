let url = 'mongodb://klx_developer:klx_developer@10.200.2.234:27017/admin'
module.exports = {
    url,
    min_cnt: 10, //至少100张图片才存储写入json文件
    page_count: 20,//分页查询长度
    save_cnt: 10 //碎片长度不超过这些，写入json文件
}