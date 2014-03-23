/*
 * L.TileLayer.Grayscale is a regular tilelayer with grayscale makeover.
 */

// filters from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/

var Filters = {};
Filters.grayscale = function(pixels, args) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};

Filters.threshold = function(pixels, threshold) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};

Filters.tmpCanvas = document.createElement('canvas');
Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

Filters.createImageData = function(w,h) {
  return this.tmpCtx.createImageData(w,h);
};

Filters.convolute = function(pixels, weights, opaque) {
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);
  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;
  // pad output by the convolution matrix
  var w = sw;
  var h = sh;
  var output = Filters.createImageData(w, h);
  var dst = output.data;
  // go through the destination image pixels
  var alphaFac = opaque ? 1 : 0;
  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      // calculate the weighed sum of the source image pixels that
      // fall under the convolution matrix
      var r=0, g=0, b=0, a=0;
      for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = sy + cy - halfSide;
          var scx = sx + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            var srcOff = (scy*sw+scx)*4;
            var wt = weights[cy*side+cx];
            r += src[srcOff] * wt;
            g += src[srcOff+1] * wt;
            b += src[srcOff+2] * wt;
            a += src[srcOff+3] * wt;
          }
        }
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};


L.TileLayer.Grayscale = L.TileLayer.extend({
	options: {
		enableCanvas: true
	},

	initialize: function (url, options) {
		var canvasEl = document.createElement('canvas');
		if( !(canvasEl.getContext && canvasEl.getContext('2d')) ) {
			options.enableCanvas = false;
		}

		L.TileLayer.prototype.initialize.call(this, url, options);
	},

	_loadTile: function (tile, tilePoint) {
		tile.setAttribute('crossorigin', 'anonymous');
		L.TileLayer.prototype._loadTile.call(this, tile, tilePoint);
	},

	_tileOnLoad: function () {
		if (this._layer.options.enableCanvas && !this.canvasContext) {
			var canvas = document.createElement("canvas");
			canvas.width = canvas.height = this._layer.options.tileSize;
			this.canvasContext = canvas.getContext("2d");
		}
		var ctx = this.canvasContext;

		if (ctx) {
			this.onload  = null; // to prevent an infinite loop
			ctx.drawImage(this, 0, 0);
			var imgd = ctx.getImageData(0, 0, this._layer.options.tileSize, this._layer.options.tileSize);

			// original
			// imgd = grayscale(imgd)
			// var pix = imgd.data;
			// for (var i = 0, n = pix.length; i < n; i += 4) {
			// 	pix[i] = pix[i + 1] = pix[i + 2] = (3 * pix[i] + 4 * pix[i + 1] + pix[i + 2]) / 8;
			// }

			//var res = Filters.grayscale(imgd);
			var res = Filters.threshold(imgd, 150);
			// var res = Filters.convolute(imgd, 
			// 	[ 	2, 2, 2,
			//     	2, 0.2, -2,
			//     	-2, -2, -2 	]);

			ctx.putImageData( res , 0, 0);
			this.removeAttribute("crossorigin");
			this.src = ctx.canvas.toDataURL();
		}

		L.TileLayer.prototype._tileOnLoad.call(this);
	}
});

L.tileLayer.grayscale = function (url, options) {
	return new L.TileLayer.Grayscale(url, options);
};
