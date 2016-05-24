var express = require('express');
var parse = require('xml-parser');
var _ = require('lodash');
var request = require('request')
var router = express.Router();
var Iconv = require('iconv').Iconv;

function getXmlUrlByPageUrl(pageUrl) {
  // http://open.163.com/movie/2006/1/1/9/M6HV755O6_M6HV8DF19.html
  // http://live.ws.126.net/movie/1/9/2_M6HV755O6_M6HV8DF19.xml
  var reg = /([^\/]+)\/([^\/]+)\/([^\/]+).html$/;
  var matches = pageUrl.match(reg);
  var key1 = matches[1];
  var key2 = matches[2];
  var hash = matches[3];
  return ['http://live.ws.126.net/movie/', key1,'/', key2,'/2_', hash,'.xml'].join('');
}

function getCourseTitle(obj) {
  var srtPath = 'root.children[0].content';
  return _.get(obj, srtPath);
}

function getSrtUrl(obj) {
  var srtPath = 'root.children[9].children[0].children[1].content';
  return _.get(obj, srtPath);
}

function processStr(srt) {
  var list = srt.replace(/[\d:]+,\d+ --> [\d:]+,\d+/g, '').split(/[\n\r]*\d*[\n\r]+/);
  var content = [''];
  list.forEach(function(curr) {
    var prev = content[content.length - 1];
    if (prev && prev.length > 200) {
      content.push(curr);
    } else if(curr.trim().length) {
      content[content.length - 1] = [prev, (!/[?？。！]+/.test(prev) && prev.trim().length) ? '，' : '' , curr].join('');
    }
  });
  return content.reduce(function(prev, curr) {
    return [prev, /[?？。！]+$/.test(prev) ? '' : '。', '</p><p>', curr].join('');
  });
  // return list.reduce(function(prev, prev) {
  //   if (prev.length > 300) {
  //     return prev + '。\n';
  //   }
  //   return [prev, prev].join('，');
  // });
};

function showSrt(pageUrl, srtUrl, title, res) {
  request(srtUrl, function(err, _res, body) {
    if (err) throw err;
    res.render('index', {
      title: title,
      pageUrl: pageUrl,
      content: processStr(body.toString()),
    });
  });
};

function showNoSrt(pageUrl, title, res) {
  res.render('index', {
    title: title,
    pageUrl: pageUrl,
    content: '没有字幕',
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  if (!req.query.pageUrl) {
    res.render('index', { title: '网易公开课字幕助手' });
    return;
  }

  var pageUrl = req.query.pageUrl;
  var xmlUrl = getXmlUrlByPageUrl(pageUrl);

  var iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');

  request({
    url: xmlUrl,
    encoding: null,
  }, function(err, _res, body) {
    if (err) throw err;
    var xml = iconv.convert(body).toString();
    var obj = parse(xml);
    var courseTitle = getCourseTitle(obj);
    var srtUrl = getSrtUrl(obj);

    if (srtUrl) showSrt(pageUrl, srtUrl, courseTitle, res);
    else showNoSrt(pageUrl, courseTitle, res);
  });
});

module.exports = router;
