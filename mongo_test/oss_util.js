
const kBucketHB = 'klximg';
const kBucketHBCrop = 'klximg-crop';
const kBucketHZ = 'scan-hz';
const kBucketHZCrop = 'scan-hzcrop';
const kBucketHN = 'scan-hn';
const kBucketHNCrop = 'scan-hncrop';

const kBucketOutsideHostMap = {
    klximg: 'oss-cn-beijing.aliyuncs.com',
    'klximg-crop': 'oss-cn-beijing.aliyuncs.com',
    'scan-hz': 'oss-cn-hangzhou.aliyuncs.com',
    'scan-hzcrop': 'oss-cn-hangzhou.aliyuncs.com',
    'scan-hn': 'oss-cn-shenzhen.aliyuncs.com',
    'scan-hncrop': 'oss-cn-shenzhen.aliyuncs.com'
};

function get_uri_of_oss_img(_key) {
    const key = Array.isArray(_key) ? _key[0] : _key;
    let bucketName = kBucketHB;
    if (key.startsWith('scanimage') || key.startsWith('scan-m7/') || key.startsWith('scan-hb/')) {
        bucketName = kBucketHB;
    } else if (key.startsWith('scan-hb-crop/') || key.startsWith('scan-m7-crop/')) {
        bucketName = kBucketHBCrop;
    } else if (key.startsWith('scan-hz/')) {
        bucketName = kBucketHZ;
    } else if (key.startsWith('scan-hz-crop/')) {
        bucketName = kBucketHZCrop;
    } else if (key.startsWith('scan-hn/')) {
        bucketName = kBucketHN;
    } else if (key.startsWith('scan-hn-crop/')) {
        bucketName = kBucketHNCrop;
    }
    return `https://${bucketName}.${kBucketOutsideHostMap[bucketName]}/${key}`;
}

module.exports = {
    get_uri_of_oss_img
}