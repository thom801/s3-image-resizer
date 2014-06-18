###S3 Image Resizer
=====================

###Getting Started

Download the repo and create config.json in the root directory.

```javascript
{
	"s3": {
		"key": "",
		"secret": "",
		"bucket": ""
	},
	"resize": {
		"tempPath": "",
		"destPath": "",
		"width": "200",
		"height": "200^",
		"gravity": "Center",
		"extent": [ "200", "200" ]
	}
}
```

Only supported options are listed above. Documentation about Imagemagick size flags [here](http://www.imagemagick.org/Usage/resize/#resize).

From the root directory, run 
```
npm start
```

You should see output similar to this

```bash
$ npm start

> s3-bucket-resize@0.0.0 start /Users/thom/develop/opensource/s3-image-resizer
> node index.js

Resizing 20 images...
....................
Resizing complete.

```