'use strict';

var _ = require('lodash');
var DOMParser = require('xmldom').DOMParser;

// supports multibyte characters
function getUnicode(character) {
  if (character.length === 1) {
    // 2 bytes
    return character.charCodeAt(0);
  } else if (character.length === 2) {
    // 4 bytes
    var surrogate1 = character.charCodeAt(0);
    var surrogate2 = character.charCodeAt(1);
    /*jshint bitwise: false*/
    return ((surrogate1 & 0x3FF) << 10) + (surrogate2 & 0x3FF) + 0x10000;
  }
}

function getGlyph(elem, font, num, isMissed) {

  if (!isMissed) {
    // Ignore empty glyphs (with empty code or path)
    if (!elem.hasAttribute('d')) {
      return null;
    }
  }

  var glyph = {};

  glyph.isMissed = isMissed;
  glyph.d = elem.getAttribute('d') || 'M0 0';
  glyph.character = elem.getAttribute('unicode') || String.fromCharCode(0);
  glyph.unicode = getUnicode(glyph.character) || num;
  glyph.name = elem.getAttribute('glyph-name') || ('item' + glyph.unicode);

  //
  // Rescale & Transform from scg fomt to svg image coordinates
  // !!! Transforms go in back order !!!
  //

  glyph.width = _.parseInt(+elem.getAttribute('horiz-adv-x') || font.fontHorizAdvX);
  glyph.height = _.parseInt(font.ascent + font.descent);
  glyph.scale = font.glyphSize / glyph.height;
  glyph.size = 1000; // TODO: check if it is correct value

  // Vertical mirror
  glyph.transform = 'translate(0 ' + (glyph.size / 2) + ') scale(1 -1) translate(0 ' + (-glyph.size / 2) + ')';

  if (glyph.scale !== 1) {
    // Scale size, only when needed
    glyph.transform += ' scale(' + glyph.scale + ')';
    // Recalculate width & height
    glyph.width = _.parseInt(glyph.width * glyph.scale);
    glyph.height = _.parseInt(glyph.height * glyph.scale);
  }
  // Descent shift
  glyph.transform += ' translate(0 ' + font.descent + ')';

  return glyph;
}

function svgFont(str) {
  var doc = (new DOMParser()).parseFromString(str, "application/xml");

  var metadata = doc.getElementsByTagName('metadata')[0];
  var fontElem = doc.getElementsByTagName('font')[0];
  var fontFaceElem = fontElem.getElementsByTagName('font-face')[0];

  var font = {
    copyright: metadata.firstChild.data,
    id: fontElem.getAttribute('id') || 'fontello',
    familyName: fontFaceElem.getAttribute('font-family') || 'fontello',
    glyphs: [],
    segments: [],
    missedGlyph: [],
    fontHorizAdvX: _.parseInt(+fontElem.getAttribute('horiz-adv-x')),
    ascent: _.parseInt(+fontFaceElem.getAttribute('ascent')),
    descent: _.parseInt(-fontFaceElem.getAttribute('descent')),
    glyphSize: 1000
  };

  _.forEach(fontElem.getElementsByTagName('missing-glyph'), function (glyphElem) {
    font.glyphs.push(getGlyph(glyphElem, font, 0, true));
  });

  var i = 1;
  _.forEach(fontElem.getElementsByTagName('glyph'), function (glyphElem) {
    var glyph = getGlyph(glyphElem, font, i, false);
    if (glyph) {
      font.glyphs.push(glyph);
      i++;
    }
  });

  font.glyphs.sort(function (a, b) {
    return a.unicode < b.unicode ? -1 : 1;
  });

  // Add IDs, they are equal to glyph index in array
  var id = 1;
  _.forEach(font.glyphs, function (glyph) {
    glyph.id = id++;
  });

  return font;
}

module.exports = svgFont;