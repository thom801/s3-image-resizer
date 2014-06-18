var _ = require('underscore'),
		fmt = require('fmt'),
		amazonS3 = require('awssum-amazon-s3'),
		config = require('./config'),
		async = require('async'),
		images = [],
		gm = require('gm').subClass({ imageMagick: true }),
		fs = require('fs'),
		colors = require('colors'),
		request = require('request');

var s3 = new amazonS3.S3({
  'accessKeyId'     : config.s3.key,
  'secretAccessKey' : config.s3.secret,
  'region'          : amazonS3.US_EAST_1
});

var options = {
  BucketName: config.s3.bucket,
  MaxKeys: 10
};

function getObjects (callback) {

	s3.ListObjects(options, function(err, data) {
	  if (err) {
	  	return console.log(err);
	  }

	  var results = data.Body.ListBucketResult;
	  var isTruncated = results.Contents.length >= 1000;

	  images = _.union(images, results.Contents);

	  var lastKey = images[images.length - 1].Key;

	  if (isTruncated) {
	  	options.Marker = lastKey;
	  	getObjects(callback);
	  } else {
	  	callback(null, images);
	  }
	});
}

 function download (uri, filename, callback) {
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function processImage (image, callback) {

	var imageURL = 'http://'+ config.s3.bucket +'.s3.amazonaws.com/' + image.Key;
	var tempPath = config.resize.tempPath + image.Key;
	var resizedPath = config.resize.destPath + image.Key;

	download(imageURL, tempPath, function(){
		
		gm(tempPath)
		  .resize(config.resize.width, config.resize.height)
		  .gravity(config.resize.gravity)
		  .extent(config.resize.extent[0], config.resize.extent[1])
		  .write(resizedPath, function(err) {
				if(err) {
					process.stdout.write('.'.red);
					callback(err);
				}
				else {
					process.stdout.write('.'.green);
					callback();
				}
			}
		);

	});
}

function processImages (images, callback) {
	console.log('Resizing '+ images.length +' images...');
	async.eachLimit(images, 20, processImage, callback);
}

async.waterfall([getObjects, processImages], function (err, result) {
   console.log('\nResizing complete.');
});

