/*
 * Minio Javascript Library for Amazon S3 Compatible Cloud Storage, (C) 2015 Minio, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _mainMinioJs = require('../main/minio.js');

var _mainMinioJs2 = _interopRequireDefault(_mainMinioJs);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

require('source-map-support').install();

describe('functional tests', function () {
  this.timeout(30 * 60 * 1000);
  var client = new _mainMinioJs2['default']({
    endPoint: 's3.amazonaws.com',
    accessKey: process.env['ACCESS_KEY'],
    secretKey: process.env['SECRET_KEY']
  });
  var bucketName = 'miniojs-bucket2';
  var objectName = 'miniojsobject';

  var _1byte = new Buffer(1);
  _1byte.fill('a');
  var _1byteObjectName = 'miniojsobject_1byte';

  var _100kb = new Buffer(100 * 1024);
  _100kb.fill('a');
  var _100kbObjectName = 'miniojsobject_100kb';
  var _100kbObjectBufferName = _100kbObjectName + '.buffer';
  var _100kbObjectStringName = _100kbObjectName + '.string';
  var _100kbmd5 = _crypto2['default'].createHash('md5').update(_100kb).digest('hex');

  var _11mb = new Buffer(11 * 1024 * 1024);
  _11mb.fill('a');
  var _11mbObjectName = 'miniojsobject_11mb';
  var _11mbmd5 = _crypto2['default'].createHash('md5').update(_11mb).digest('hex');

  var _10mb = new Buffer(10 * 1024 * 1024);
  _10mb.fill('a');
  var _10mbObjectName = 'miniojsobject_10mb';
  var _10mbmd5 = _crypto2['default'].createHash('md5').update(_10mb).digest('hex');

  var _5mb = new Buffer(5 * 1024 * 1024);
  _5mb.fill('a');
  var _5mbObjectName = 'miniojsobject_5mb';
  var _5mbmd5 = _crypto2['default'].createHash('md5').update(_5mb).digest('hex');

  var tmpDir = _os2['default'].tmpdir();

  var traceStream;

  // FUNCTIONAL_TEST_TRACE env variable contains the path to which trace
  // will be logged. Set it to /dev/stdout log to the stdout.
  if (process.env['FUNCTIONAL_TEST_TRACE']) {
    var filePath = process.env['FUNCTIONAL_TEST_TRACE'];
    // This is necessary for windows.
    if (filePath === 'process.stdout') {
      traceStream = process.stdout;
    } else {
      traceStream = _fs2['default'].createWriteStream(filePath, { flags: 'a' });
    }
    traceStream.write('====================================\n');
    client.traceOn(traceStream);
  }

  before(function (done) {
    return client.makeBucket(bucketName, '', done);
  });
  after(function (done) {
    return client.removeBucket(bucketName, done);
  });

  if (traceStream) {
    after(function () {
      client.traceOff();
      if (filePath !== 'process.stdout') {
        traceStream.end();
      }
    });
  }

  describe('makeBucket with period', function () {
    it('should create bucket in eu-central-1 with period', function (done) {
      return client.makeBucket(bucketName + '.sec.period', 'eu-central-1', done);
    });
    it('should delete bucket', function (done) {
      return client.removeBucket(bucketName + '.sec.period', done);
    });
  });

  describe('listBuckets', function () {
    it('should list bucket', function (done) {
      client.listBuckets(function (e, buckets) {
        if (e) return done(e);
        if (_lodash2['default'].find(buckets, { name: bucketName })) return done();
        done(new Error('bucket not found'));
      });
    });
  });

  describe('bucketExists', function () {
    it('should check if bucket exists', function (done) {
      return client.bucketExists(bucketName, done);
    });
    it('should check if bucket does not exist', function (done) {
      client.bucketExists(bucketName + 'random', function (e) {
        if (e.code === 'NoSuchBucket') return done();
        done(new Error());
      });
    });
  });

  describe('tests for putObject getObject getPartialObject statObject removeObject', function () {
    it('should upload 100KB stream', function (done) {
      var stream = readableStream(_100kb);
      client.putObject(bucketName, _100kbObjectName, stream, _100kb.length, '', done);
    });

    it('should download 100KB and match content', function (done) {
      var hash = _crypto2['default'].createHash('md5');
      client.getObject(bucketName, _100kbObjectName, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _100kbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });

    it('should upload 100KB Buffer', function (done) {
      client.putObject(bucketName, _100kbObjectBufferName, _100kb, '', done);
    });

    it('should download 100KB Buffer upload and match content', function (done) {
      var hash = _crypto2['default'].createHash('md5');
      client.getObject(bucketName, _100kbObjectBufferName, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _100kbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });

    it('should upload 100KB string', function (done) {
      client.putObject(bucketName, _100kbObjectStringName, _100kb.toString(), '', done);
    });

    it('should download 100KB string upload and match content', function (done) {
      var hash = _crypto2['default'].createHash('md5');
      client.getObject(bucketName, _100kbObjectStringName, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _100kbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });

    it('should upload 11mb', function (done) {
      var stream = readableStream(_11mb);
      client.putObject(bucketName, _11mbObjectName, stream, _11mb.length, '', done);
    });

    it('should download 11mb and match content', function (done) {
      var hash = _crypto2['default'].createHash('md5');
      client.getObject(bucketName, _11mbObjectName, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _11mbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });

    it('should download partial data (100kb of the 11mb file) and match content', function (done) {
      var hash = _crypto2['default'].createHash('md5');
      client.getPartialObject(bucketName, _11mbObjectName, 0, 100 * 1024, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _100kbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });

    it('should stat object', function (done) {
      client.statObject(bucketName, _11mbObjectName, function (e, stat) {
        if (e) return done(e);
        if (stat.size !== _11mb.length) return done(new Error('sise mismatch'));
        done();
      });
    });

    it('should remove objects created for test', function (done) {
      _async2['default'].map([_100kbObjectName, _100kbObjectBufferName, _100kbObjectStringName, _11mbObjectName], function (objectName, cb) {
        return client.removeObject(bucketName, objectName, cb);
      }, done);
    });
  });

  describe('listIncompleteUploads removeIncompleteUpload', function () {
    it('should create multipart request', function (done) {
      var stream = readableStream('');
      client.putObject(bucketName, _11mbObjectName, stream, _11mb.length, '', function (e) {
        if (!e) return done(new Error('Expecing error'));
        done();
      });
    });
    it('should list incomplete upload', function (done) {
      var found = false;
      client.listIncompleteUploads(bucketName, _11mbObjectName, true).on('error', function (e) {
        return done(e);
      }).on('data', function (data) {
        if (data.key === _11mbObjectName) found = true;
      }).on('end', function () {
        if (found) return done();
        done(new Error(_11mbObjectName + ' not found during listIncompleteUploads'));
      });
    });
    it('should delete incomplete upload', function (done) {
      client.removeIncompleteUpload(bucketName, _11mbObjectName, done);
    });
  });

  describe('fPutObject fGetObject', function () {
    var tmpFileUpload = tmpDir + '/' + _11mbObjectName;
    var tmpFileDownload = tmpDir + '/' + _11mbObjectName + '.download';

    it('should create ' + tmpFileUpload, function () {
      return _fs2['default'].writeFileSync(tmpFileUpload, _11mb);
    });

    it('should upload object using fPutObject', function (done) {
      return client.fPutObject(bucketName, _11mbObjectName, tmpFileUpload, '', done);
    });

    it('should download object using fGetObject', function (done) {
      return client.fGetObject(bucketName, _11mbObjectName, tmpFileDownload, done);
    });

    it('should verify checksum', function (done) {
      var md5sum = _crypto2['default'].createHash('md5').update(_fs2['default'].readFileSync(tmpFileDownload)).digest('hex');
      if (md5sum === _11mbmd5) return done();
      return done(new Error('md5sum mismatch'));
    });

    it('should remove files and objects created', function (done) {
      _fs2['default'].unlinkSync(tmpFileUpload);
      _fs2['default'].unlinkSync(tmpFileDownload);
      client.removeObject(bucketName, _11mbObjectName, done);
    });
  });

  describe('putObject (resume)', function () {
    it('should create an incomplete upload', function (done) {
      var stream = readableStream(_10mb);
      // write just 10mb, so that it errors out and incomplete upload is created
      client.putObject(bucketName, _11mbObjectName, stream, _11mb.length, '', function (e, etag) {
        if (!e) done(new Error('Expecting Error'));
        done();
      });
    });
    it('should confirm the presence of incomplete upload', function (done) {
      var stream = client.listIncompleteUploads(bucketName, _11mbObjectName, true);
      var result;
      stream.on('error', done);
      stream.on('data', function (data) {
        if (data.key === _11mbObjectName) result = data;
      });
      stream.on('end', function () {
        if (result) {
          return done();
        }
        done(new Error('Uploaded part not found'));
      });
    });
    it('should resume upload', function (done) {
      var stream = readableStream(_11mb);
      client.putObject(bucketName, _11mbObjectName, stream, _11mb.length, '', function (e, etag) {
        if (e) return done(e);
        done();
      });
    });
    it('should remove the uploaded object', function (done) {
      return client.removeObject(bucketName, _11mbObjectName, done);
    });
  });

  describe('fPutObject-resume', function () {
    var _11mbTmpFile = tmpDir + '/' + _11mbObjectName;
    it('should create tmp file', function () {
      return _fs2['default'].writeFileSync(_11mbTmpFile, _11mb);
    });
    it('should create an incomplete upload', function (done) {
      var stream = readableStream(_10mb);
      // write just 10mb, so that it errors out and incomplete upload is created
      client.putObject(bucketName, _11mbObjectName, stream, _11mb.length, '', function (e, etag) {
        if (!e) done(new Error('Expecting Error'));
        done();
      });
    });
    it('should confirm the presence of incomplete upload', function (done) {
      var stream = client.listIncompleteUploads(bucketName, _11mbObjectName, true);
      var result;
      stream.on('error', done);
      stream.on('data', function (data) {
        if (data.key === _11mbObjectName) result = data;
      });
      stream.on('end', function () {
        if (result) {
          return done();
        }
        done(new Error('Uploaded part not found'));
      });
    });
    it('should resume upload', function (done) {
      return client.fPutObject(bucketName, _11mbObjectName, _11mbTmpFile, '', done);
    });
    it('should remove the uploaded object', function (done) {
      return client.removeObject(bucketName, _11mbObjectName, done);
    });
  });

  describe('fGetObject-resume', function () {
    var localFile = tmpDir + '/' + _5mbObjectName;
    it('should upload object', function (done) {
      var stream = readableStream(_5mb);
      client.putObject(bucketName, _5mbObjectName, stream, _5mb.length, '', done);
    });
    it('should simulate a partially downloaded file', function () {
      var tmpFile = tmpDir + '/' + _5mbObjectName + '.' + _5mbmd5 + '.part.minio-js';
      // create a partial file
      _fs2['default'].writeFileSync(tmpFile, _100kb);
    });
    it('should resume the download', function (done) {
      return client.fGetObject(bucketName, _5mbObjectName, localFile, done);
    });
    it('should verify md5sum of the downloaded file', function (done) {
      var data = _fs2['default'].readFileSync(localFile);
      var hash = _crypto2['default'].createHash('md5').update(data).digest('hex');
      if (hash === _5mbmd5) return done();
      done(new Error('md5 of downloaded file does not match'));
    });
    it('should remove tmp files', function (done) {
      _fs2['default'].unlinkSync(localFile);
      client.removeObject(bucketName, _5mbObjectName, done);
    });
  });

  describe('presigned operatons', function () {
    it('should upload using presignedUrl', function (done) {
      client.presignedPutObject(bucketName, _1byteObjectName, 1000, function (e, presignedUrl) {
        if (e) return done(e);
        var transport = _http2['default'];
        var options = _lodash2['default'].pick(_url2['default'].parse(presignedUrl), ['host', 'path', 'protocol']);
        options.method = 'PUT';
        options.headers = {
          'content-length': _1byte.length
        };
        if (options.protocol === 'https:') transport = _https2['default'];
        var request = transport.request(options, function (response) {
          if (response.statusCode !== 200) return done(new Error('error on put : ' + response.statusCode));
          response.on('error', function (e) {
            return done(e);
          });
          response.on('end', function () {
            return done();
          });
          response.on('data', function () {});
        });
        request.on('error', function (e) {
          return done(e);
        });
        request.write(_1byte);
        request.end();
      });
    });

    it('should download using presignedUrl', function (done) {
      client.presignedGetObject(bucketName, _1byteObjectName, 1000, function (e, presignedUrl) {
        if (e) return done(e);
        var transport = _http2['default'];
        var options = _lodash2['default'].pick(_url2['default'].parse(presignedUrl), ['host', 'path', 'protocol']);
        options.method = 'GET';
        if (options.protocol === 'https:') transport = _https2['default'];
        var request = transport.request(options, function (response) {
          if (response.statusCode !== 200) return done(new Error('error on put : ' + response.statusCode));
          var error = null;
          response.on('error', function (e) {
            return done(e);
          });
          response.on('end', function () {
            return done(error);
          });
          response.on('data', function (data) {
            if (data.toString() !== _1byte.toString()) {
              error = new Error('content mismatch');
            }
          });
        });
        request.on('error', function (e) {
          return done(e);
        });
        request.end();
      });
    });

    it('should response headers set to expected values during download for presignedUrl', function (done) {
      var respHeaders = {
        'response-content-type': 'text/html',
        'response-content-language': 'en',
        'response-expires': 'Sun, 07 Jun 2020 16:07:58 GMT',
        'response-cache-control': 'No-cache',
        'response-content-disposition': 'attachment; filename=testing.txt',
        'response-content-encoding': 'gzip'
      };
      client.presignedGetObject(bucketName, _1byteObjectName, 1000, respHeaders, function (e, presignedUrl) {
        if (e) return done(e);
        var transport = _http2['default'];
        var options = _lodash2['default'].pick(_url2['default'].parse(presignedUrl), ['host', 'path', 'protocol']);
        options.method = 'GET';
        if (options.protocol === 'https:') transport = _https2['default'];
        var request = transport.request(options, function (response) {
          if (response.statusCode !== 200) return done(new Error('error on get : ' + response.statusCode));
          if (respHeaders['response-content-type'] != response.headers['content-type']) {
            return done(new Error('content-type header mismatch'));
          }
          if (respHeaders['response-content-language'] != response.headers['content-language']) {
            return done(new Error('content-language header mismatch'));
          }
          if (respHeaders['response-expires'] != response.headers['expires']) {
            return done(new Error('expires header mismatch'));
          }
          if (respHeaders['response-cache-control'] != response.headers['cache-control']) {
            return done(new Error('cache-control header mismatch'));
          }
          if (respHeaders['response-content-disposition'] != response.headers['content-disposition']) {
            return done(new Error('content-disposition header mismatch'));
          }
          if (respHeaders['response-content-encoding'] != response.headers['content-encoding']) {
            return done(new Error('content-encoding header mismatch'));
          }
          response.on('data', function (data) {});
          done();
        });
        request.on('error', function (e) {
          return done(e);
        });
        request.end();
      });
    });

    it('should upload using presinged POST', function (done) {
      var policy = client.newPostPolicy();
      policy.setKey(_1byteObjectName);
      policy.setBucket(bucketName);
      var expires = new Date();
      expires.setSeconds(24 * 60 * 60 * 10);
      policy.setExpires(expires);

      client.presignedPostPolicy(policy, function (e, urlStr, formData) {
        if (e) return done(e);
        var req = _superagent2['default'].post('' + urlStr);
        _lodash2['default'].each(formData, function (value, key) {
          return req.field(key, value);
        });
        req.field('file', _1byte);
        req.end(function (e, response) {
          if (e) return done(e);
          done();
        });
        req.on('error', function (e) {
          return done(e);
        });
      });
    });

    it('should delete uploaded objects', function (done) {
      client.removeObject(bucketName, _1byteObjectName, done);
    });
  });

  describe('listObjects', function () {
    var listObjectPrefix = 'miniojsPrefix';
    var listObjectsNum = 10;
    var objArray = [];
    var listArray = [];

    it('should create ' + listObjectsNum + ' objects', function (done) {
      _lodash2['default'].times(listObjectsNum, function (i) {
        return objArray.push(listObjectPrefix + '.' + i);
      });
      objArray = objArray.sort();
      _async2['default'].mapLimit(objArray, 20, function (objectName, cb) {
        return client.putObject(bucketName, objectName, readableStream(_1byte), _1byte.length, '', cb);
      }, done);
    });

    it('should list objects', function (done) {
      client.listObjects(bucketName, '', true).on('error', done).on('end', function () {
        if (_lodash2['default'].isEqual(objArray, listArray)) return done();
        return done(new Error('listObjects lists ' + listArray.length + ' objects, expected ' + listObjectsNum));
      }).on('data', function (data) {
        listArray.push(data.name);
      });
    });

    it('should delete objects', function (done) {
      _async2['default'].mapLimit(listArray, 20, function (objectName, cb) {
        return client.removeObject(bucketName, objectName, cb);
      }, done);
    });
  });
});

function readableStream(data) {
  var s = new _stream2['default'].Readable();
  s._read = function () {};
  s.push(data);
  s.push(null);
  return s;
}
//# sourceMappingURL=functional-tests.js.map
