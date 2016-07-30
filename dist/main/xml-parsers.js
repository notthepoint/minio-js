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

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.parseError = parseError;
exports.parseListMultipart = parseListMultipart;
exports.parseListBucket = parseListBucket;
exports.parseBucketRegion = parseBucketRegion;
exports.parseListParts = parseListParts;
exports.parseInitiateMultipart = parseInitiateMultipart;
exports.parseCompleteMultipart = parseCompleteMultipart;
exports.parseListObjects = parseListObjects;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _concatStream = require('concat-stream');

var _concatStream2 = _interopRequireDefault(_concatStream);

var _xml2js = require('xml2js');

var _xml2js2 = _interopRequireDefault(_xml2js);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errorsJs = require('./errors.js');

var errors = _interopRequireWildcard(_errorsJs);

var options = { // options passed to xml2js parser
  explicitRoot: false, // return the root node in the resulting object?
  ignoreAttrs: true };

// ignore attributes, only create text nodes
var parseXml = function parseXml(xml) {
  var result = null;
  var error = null;

  var parser = new _xml2js2['default'].Parser(options);
  parser.parseString(xml, function (e, r) {
    error = e;
    result = r;
  });

  if (error) {
    throw new Error('XML parse error');
  }
  return result;
};

// Parse XML and return information as Javascript types

// parse error XML response

function parseError(xml, headerInfo) {
  var xmlError = {};
  var xmlobj = parseXml(xml);
  var message;
  _lodash2['default'].each(xmlobj, function (n, key) {
    if (key === 'Message') {
      message = xmlobj[key][0];
      return;
    }
    xmlError[key.toLowerCase()] = xmlobj[key][0];
  });
  var e = new errors.S3Error(message);
  _lodash2['default'].each(xmlError, function (value, key) {
    e[key] = value;
  });
  _lodash2['default'].each(headerInfo, function (value, key) {
    e[key] = value;
  });
  return e;
}

// parse XML response for listing in-progress multipart uploads

function parseListMultipart(xml) {
  var result = {
    uploads: [],
    prefixes: [],
    isTruncated: false
  };
  var xmlobj = parseXml(xml);
  if (xmlobj.IsTruncated && xmlobj.IsTruncated[0] === 'true') result.isTruncated = true;
  if (xmlobj.NextKeyMarker) result.nextKeyMarker = xmlobj.NextKeyMarker[0];
  if (xmlobj.NextUploadIdMarker) result.nextUploadIdMarker = xmlobj.NextUploadIdMarker[0];
  if (xmlobj.CommonPrefixes) xmlobj.CommonPrefixes.forEach(function (prefix) {
    result.prefixes.push({ prefix: prefix[0] });
  });
  if (xmlobj.Upload) xmlobj.Upload.forEach(function (upload) {
    result.uploads.push({
      key: upload.Key[0],
      uploadId: upload.UploadId[0],
      initiated: new Date(upload.Initiated[0])
    });
  });
  return result;
}

// parse XML response to list all the owned buckets

function parseListBucket(xml) {
  var result = [];
  var xmlobj = parseXml(xml);
  if (xmlobj.Buckets) {
    if (xmlobj.Buckets[0].Bucket) {
      xmlobj.Buckets[0].Bucket.forEach(function (bucket) {
        var name = bucket.Name[0];
        var creationDate = new Date(bucket.CreationDate[0]);
        result.push({ name: name, creationDate: creationDate });
      });
    }
  }
  return result;
}

// parse XML response for bucket region

function parseBucketRegion(xml) {
  return parseXml(xml);
}

// parse XML response for list parts of an in progress multipart upload

function parseListParts(xml) {
  var xmlobj = parseXml(xml);
  var result = {
    isTruncated: false,
    parts: [],
    marker: undefined
  };
  if (xmlobj.IsTruncated && xmlobj.IsTruncated[0] === 'true') result.isTruncated = true;
  if (xmlobj.NextPartNumberMarker) result.marker = +xmlobj.NextPartNumberMarker[0];
  if (xmlobj.Part) {
    xmlobj.Part.forEach(function (p) {
      var part = +p.PartNumber[0];
      var lastModified = new Date(p.LastModified[0]);
      var etag = p.ETag[0].replace(/^\"/g, '').replace(/\"$/g, '').replace(/^&quot;/g, '').replace(/&quot;$/g, '').replace(/^&#34;/g, '').replace(/^&#34;$/g, '');
      result.parts.push({ part: part, lastModified: lastModified, etag: etag });
    });
  }
  return result;
}

// parse XML response when a new multipart upload is initiated

function parseInitiateMultipart(xml) {
  var xmlobj = parseXml(xml);
  if (xmlobj.UploadId) return xmlobj.UploadId[0];
  throw new errors.InvalidXMLError('UploadId missing in XML');
}

// parse XML response when a multipart upload is completed

function parseCompleteMultipart(xml) {
  var xmlobj = parseXml(xml);
  var location = xmlobj.Location[0];
  var bucket = xmlobj.Bucket[0];
  var key = xmlobj.Key[0];
  var etag = xmlobj.ETag[0].replace(/^\"/g, '').replace(/\"$/g, '').replace(/^&quot;/g, '').replace(/&quot;$/g, '').replace(/^&#34;/g, '').replace(/^&#34;$/g, '');

  return { location: location, bucket: bucket, key: key, etag: etag };
}

// parse XML response for list objects in a bucket

function parseListObjects(xml) {
  var result = {
    objects: [],
    isTruncated: false
  };
  var nextMarker;
  var xmlobj = parseXml(xml);
  if (xmlobj.IsTruncated && xmlobj.IsTruncated[0] === 'true') result.isTruncated = true;
  if (xmlobj.Contents) {
    xmlobj.Contents.forEach(function (content) {
      var name = content.Key[0];
      var lastModified = new Date(content.LastModified[0]);
      var etag = content.ETag[0].replace(/^\"/g, '').replace(/\"$/g, '').replace(/^&quot;/g, '').replace(/&quot;$/g, '').replace(/^&#34;/g, '').replace(/^&#34;$/g, '');
      var size = +content.Size[0];
      result.objects.push({ name: name, lastModified: lastModified, etag: etag, size: size });
      nextMarker = name;
    });
  }
  if (xmlobj.CommonPrefixes) {
    xmlobj.CommonPrefixes.forEach(function (commonPrefix) {
      var prefix = commonPrefix.Prefix[0];
      var size = 0;
      result.objects.push({ prefix: prefix, size: size });
    });
  }
  if (result.isTruncated) {
    result.nextMarker = xmlobj.NextMarker ? xmlobj.NextMarker[0] : nextMarker;
  }
  return result;
}
//# sourceMappingURL=xml-parsers.js.map