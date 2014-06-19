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
  MaxKeys: config.resize.maxKeys || 1000,
  Delimiter: '/'
};

function getObjects (callback) {

	s3.ListObjects(options, function(err, data) {
	  if (err) {
	  	return console.log(err);
	  }

	  var results = data.Body.ListBucketResult;
	  var isTruncated = results.Contents.length >= 1000;

	  // Add objects to queue that are NOT folders.
	  _.each(results.Contents, function (object) {
	  	console.log(object.Key);
	  	if (object.Key.indexOf('/') == -1 ) {

	  		images.push(object);
	  	}
	  });

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
	console.log(uri);
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function processImage (image, done) {

	var imageURL = 'http://'+ config.s3.bucket +'.s3.amazonaws.com/' + image.Key;
	var tempPath = config.resize.tempPath + image.Key;
	var resizedPath = config.resize.destPath + image.Key;

	async.waterfall([
    
    // Download the image from s3
    function(callback){
      download(imageURL, tempPath, callback);
    },

    // Resize the image and save it locally
    function(callback){
      gm(tempPath)
        .resize(config.resize.width, config.resize.height)
        .gravity(config.resize.gravity)
        .extent(config.resize.extent[0], config.resize.extent[1])
        .write(resizedPath, function(err) {
      		if(err) {
      			console.log(err);
      			callback(err);
      		}
      		else {
      			callback(null);
      		}
      	});
    },

    // Upload the image to s3, overwriting the original.
    function(callback, err){
    	if (err) {
    		process.stdout.write('.'.red);
    		console.log(err);
    		return done(err);
    	}

    	fs.stat(resizedPath, function(err, file_info) {
        var bodyStream = fs.createReadStream( resizedPath );
        var filename = config.s3.destFolder + '/' + image.Key;
        var options = {
          BucketName    : config.s3.bucket,
          ObjectName    : filename,
          ContentLength : file_info.size,
          Body          : bodyStream,
          ContentType   : 'image/png'
        };

        // Upload to s3
        s3.PutObject(options, function(err, data) {
          if (err) {
          	process.stdout.write('.'.red);
          	return done(err);
          }
          process.stdout.write('.'.green);
          done();
        });
    	});
    }

	], done);
}

function processImages (images, callback) {
	console.log('Resizing '+ images.length +' images...');
	async.eachLimit(images, 10, processImage, callback);
}

async.waterfall([getObjects, processImages], function (err, result) {
   console.log('\nResizing complete.\n\n');
});

