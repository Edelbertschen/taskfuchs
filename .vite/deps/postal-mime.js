import "./chunk-G3PMV62Z.js";

// node_modules/postal-mime/src/decode-strings.js
var textEncoder = new TextEncoder();
var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64Lookup = new Uint8Array(256);
for (i = 0; i < base64Chars.length; i++) {
  base64Lookup[base64Chars.charCodeAt(i)] = i;
}
var i;
function decodeBase64(base64) {
  let bufferLength = Math.ceil(base64.length / 4) * 3;
  const len = base64.length;
  let p = 0;
  if (base64.length % 4 === 3) {
    bufferLength--;
  } else if (base64.length % 4 === 2) {
    bufferLength -= 2;
  } else if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < len; i += 4) {
    let encoded1 = base64Lookup[base64.charCodeAt(i)];
    let encoded2 = base64Lookup[base64.charCodeAt(i + 1)];
    let encoded3 = base64Lookup[base64.charCodeAt(i + 2)];
    let encoded4 = base64Lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
  }
  return arrayBuffer;
}
function getDecoder(charset) {
  charset = charset || "utf8";
  let decoder;
  try {
    decoder = new TextDecoder(charset);
  } catch (err) {
    decoder = new TextDecoder("windows-1252");
  }
  return decoder;
}
async function blobToArrayBuffer(blob) {
  if ("arrayBuffer" in blob) {
    return await blob.arrayBuffer();
  }
  const fr = new FileReader();
  return new Promise((resolve, reject) => {
    fr.onload = function(e) {
      resolve(e.target.result);
    };
    fr.onerror = function(e) {
      reject(fr.error);
    };
    fr.readAsArrayBuffer(blob);
  });
}
function getHex(c) {
  if (c >= 48 && c <= 57 || c >= 97 && c <= 102 || c >= 65 && c <= 70) {
    return String.fromCharCode(c);
  }
  return false;
}
function decodeWord(charset, encoding, str) {
  let splitPos = charset.indexOf("*");
  if (splitPos >= 0) {
    charset = charset.substr(0, splitPos);
  }
  encoding = encoding.toUpperCase();
  let byteStr;
  if (encoding === "Q") {
    str = str.replace(/=\s+([0-9a-fA-F])/g, "=$1").replace(/[_\s]/g, " ");
    let buf = textEncoder.encode(str);
    let encodedBytes = [];
    for (let i = 0, len = buf.length; i < len; i++) {
      let c = buf[i];
      if (i <= len - 2 && c === 61) {
        let c1 = getHex(buf[i + 1]);
        let c2 = getHex(buf[i + 2]);
        if (c1 && c2) {
          let c3 = parseInt(c1 + c2, 16);
          encodedBytes.push(c3);
          i += 2;
          continue;
        }
      }
      encodedBytes.push(c);
    }
    byteStr = new ArrayBuffer(encodedBytes.length);
    let dataView = new DataView(byteStr);
    for (let i = 0, len = encodedBytes.length; i < len; i++) {
      dataView.setUint8(i, encodedBytes[i]);
    }
  } else if (encoding === "B") {
    byteStr = decodeBase64(str.replace(/[^a-zA-Z0-9\+\/=]+/g, ""));
  } else {
    byteStr = textEncoder.encode(str);
  }
  return getDecoder(charset).decode(byteStr);
}
function decodeWords(str) {
  let joinString = true;
  let done = false;
  while (!done) {
    let result = (str || "").toString().replace(/(=\?([^?]+)\?[Bb]\?([^?]*)\?=)\s*(?==\?([^?]+)\?[Bb]\?[^?]*\?=)/g, (match, left, chLeft, encodedLeftStr, chRight) => {
      if (!joinString) {
        return match;
      }
      if (chLeft === chRight && encodedLeftStr.length % 4 === 0 && !/=$/.test(encodedLeftStr)) {
        return left + "__\0JOIN\0__";
      }
      return match;
    }).replace(/(=\?([^?]+)\?[Qq]\?[^?]*\?=)\s*(?==\?([^?]+)\?[Qq]\?[^?]*\?=)/g, (match, left, chLeft, chRight) => {
      if (!joinString) {
        return match;
      }
      if (chLeft === chRight) {
        return left + "__\0JOIN\0__";
      }
      return match;
    }).replace(/(\?=)?__\x00JOIN\x00__(=\?([^?]+)\?[QqBb]\?)?/g, "").replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, "$1").replace(/=\?([\w_\-*]+)\?([QqBb])\?([^?]*)\?=/g, (m, charset, encoding, text) => decodeWord(charset, encoding, text));
    if (joinString && result.indexOf("�") >= 0) {
      joinString = false;
    } else {
      return result;
    }
  }
}
function decodeURIComponentWithCharset(encodedStr, charset) {
  charset = charset || "utf-8";
  let encodedBytes = [];
  for (let i = 0; i < encodedStr.length; i++) {
    let c = encodedStr.charAt(i);
    if (c === "%" && /^[a-f0-9]{2}/i.test(encodedStr.substr(i + 1, 2))) {
      let byte = encodedStr.substr(i + 1, 2);
      i += 2;
      encodedBytes.push(parseInt(byte, 16));
    } else if (c.charCodeAt(0) > 126) {
      c = textEncoder.encode(c);
      for (let j = 0; j < c.length; j++) {
        encodedBytes.push(c[j]);
      }
    } else {
      encodedBytes.push(c.charCodeAt(0));
    }
  }
  const byteStr = new ArrayBuffer(encodedBytes.length);
  const dataView = new DataView(byteStr);
  for (let i = 0, len = encodedBytes.length; i < len; i++) {
    dataView.setUint8(i, encodedBytes[i]);
  }
  return getDecoder(charset).decode(byteStr);
}
function decodeParameterValueContinuations(header) {
  let paramKeys = /* @__PURE__ */ new Map();
  Object.keys(header.params).forEach((key) => {
    let match = key.match(/\*((\d+)\*?)?$/);
    if (!match) {
      return;
    }
    let actualKey = key.substr(0, match.index).toLowerCase();
    let nr = Number(match[2]) || 0;
    let paramVal;
    if (!paramKeys.has(actualKey)) {
      paramVal = {
        charset: false,
        values: []
      };
      paramKeys.set(actualKey, paramVal);
    } else {
      paramVal = paramKeys.get(actualKey);
    }
    let value = header.params[key];
    if (nr === 0 && match[0].charAt(match[0].length - 1) === "*" && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
      paramVal.charset = match[1] || "utf-8";
      value = match[2];
    }
    paramVal.values.push({ nr, value });
    delete header.params[key];
  });
  paramKeys.forEach((paramVal, key) => {
    header.params[key] = decodeURIComponentWithCharset(
      paramVal.values.sort((a, b) => a.nr - b.nr).map((a) => a.value).join(""),
      paramVal.charset
    );
  });
}

// node_modules/postal-mime/src/pass-through-decoder.js
var PassThroughDecoder = class {
  constructor() {
    this.chunks = [];
  }
  update(line) {
    this.chunks.push(line);
    this.chunks.push("\n");
  }
  finalize() {
    return blobToArrayBuffer(new Blob(this.chunks, { type: "application/octet-stream" }));
  }
};

// node_modules/postal-mime/src/base64-decoder.js
var Base64Decoder = class {
  constructor(opts) {
    opts = opts || {};
    this.decoder = opts.decoder || new TextDecoder();
    this.maxChunkSize = 100 * 1024;
    this.chunks = [];
    this.remainder = "";
  }
  update(buffer) {
    let str = this.decoder.decode(buffer);
    if (/[^a-zA-Z0-9+\/]/.test(str)) {
      str = str.replace(/[^a-zA-Z0-9+\/]+/g, "");
    }
    this.remainder += str;
    if (this.remainder.length >= this.maxChunkSize) {
      let allowedBytes = Math.floor(this.remainder.length / 4) * 4;
      let base64Str;
      if (allowedBytes === this.remainder.length) {
        base64Str = this.remainder;
        this.remainder = "";
      } else {
        base64Str = this.remainder.substr(0, allowedBytes);
        this.remainder = this.remainder.substr(allowedBytes);
      }
      if (base64Str.length) {
        this.chunks.push(decodeBase64(base64Str));
      }
    }
  }
  finalize() {
    if (this.remainder && !/^=+$/.test(this.remainder)) {
      this.chunks.push(decodeBase64(this.remainder));
    }
    return blobToArrayBuffer(new Blob(this.chunks, { type: "application/octet-stream" }));
  }
};

// node_modules/postal-mime/src/qp-decoder.js
var QPDecoder = class {
  constructor(opts) {
    opts = opts || {};
    this.decoder = opts.decoder || new TextDecoder();
    this.maxChunkSize = 100 * 1024;
    this.remainder = "";
    this.chunks = [];
  }
  decodeQPBytes(encodedBytes) {
    let buf = new ArrayBuffer(encodedBytes.length);
    let dataView = new DataView(buf);
    for (let i = 0, len = encodedBytes.length; i < len; i++) {
      dataView.setUint8(i, parseInt(encodedBytes[i], 16));
    }
    return buf;
  }
  decodeChunks(str) {
    str = str.replace(/=\r?\n/g, "");
    let list = str.split(/(?==)/);
    let encodedBytes = [];
    for (let part of list) {
      if (part.charAt(0) !== "=") {
        if (encodedBytes.length) {
          this.chunks.push(this.decodeQPBytes(encodedBytes));
          encodedBytes = [];
        }
        this.chunks.push(part);
        continue;
      }
      if (part.length === 3) {
        encodedBytes.push(part.substr(1));
        continue;
      }
      if (part.length > 3) {
        encodedBytes.push(part.substr(1, 2));
        this.chunks.push(this.decodeQPBytes(encodedBytes));
        encodedBytes = [];
        part = part.substr(3);
        this.chunks.push(part);
      }
    }
    if (encodedBytes.length) {
      this.chunks.push(this.decodeQPBytes(encodedBytes));
      encodedBytes = [];
    }
  }
  update(buffer) {
    let str = this.decoder.decode(buffer) + "\n";
    str = this.remainder + str;
    if (str.length < this.maxChunkSize) {
      this.remainder = str;
      return;
    }
    this.remainder = "";
    let partialEnding = str.match(/=[a-fA-F0-9]?$/);
    if (partialEnding) {
      if (partialEnding.index === 0) {
        this.remainder = str;
        return;
      }
      this.remainder = str.substr(partialEnding.index);
      str = str.substr(0, partialEnding.index);
    }
    this.decodeChunks(str);
  }
  finalize() {
    if (this.remainder.length) {
      this.decodeChunks(this.remainder);
      this.remainder = "";
    }
    return blobToArrayBuffer(new Blob(this.chunks, { type: "application/octet-stream" }));
  }
};

// node_modules/postal-mime/src/mime-node.js
var MimeNode = class {
  constructor(opts) {
    opts = opts || {};
    this.postalMime = opts.postalMime;
    this.root = !!opts.parentNode;
    this.childNodes = [];
    if (opts.parentNode) {
      opts.parentNode.childNodes.push(this);
    }
    this.state = "header";
    this.headerLines = [];
    this.contentType = {
      value: "text/plain",
      default: true
    };
    this.contentTransferEncoding = {
      value: "8bit"
    };
    this.contentDisposition = {
      value: ""
    };
    this.headers = [];
    this.contentDecoder = false;
  }
  setupContentDecoder(transferEncoding) {
    if (/base64/i.test(transferEncoding)) {
      this.contentDecoder = new Base64Decoder();
    } else if (/quoted-printable/i.test(transferEncoding)) {
      this.contentDecoder = new QPDecoder({ decoder: getDecoder(this.contentType.parsed.params.charset) });
    } else {
      this.contentDecoder = new PassThroughDecoder();
    }
  }
  async finalize() {
    if (this.state === "finished") {
      return;
    }
    if (this.state === "header") {
      this.processHeaders();
    }
    let boundaries = this.postalMime.boundaries;
    for (let i = boundaries.length - 1; i >= 0; i--) {
      let boundary = boundaries[i];
      if (boundary.node === this) {
        boundaries.splice(i, 1);
        break;
      }
    }
    await this.finalizeChildNodes();
    this.content = this.contentDecoder ? await this.contentDecoder.finalize() : null;
    this.state = "finished";
  }
  async finalizeChildNodes() {
    for (let childNode of this.childNodes) {
      await childNode.finalize();
    }
  }
  parseStructuredHeader(str) {
    let response = {
      value: false,
      params: {}
    };
    let key = false;
    let value = "";
    let stage = "value";
    let quote = false;
    let escaped = false;
    let chr;
    for (let i = 0, len = str.length; i < len; i++) {
      chr = str.charAt(i);
      switch (stage) {
        case "key":
          if (chr === "=") {
            key = value.trim().toLowerCase();
            stage = "value";
            value = "";
            break;
          }
          value += chr;
          break;
        case "value":
          if (escaped) {
            value += chr;
          } else if (chr === "\\") {
            escaped = true;
            continue;
          } else if (quote && chr === quote) {
            quote = false;
          } else if (!quote && chr === '"') {
            quote = chr;
          } else if (!quote && chr === ";") {
            if (key === false) {
              response.value = value.trim();
            } else {
              response.params[key] = value.trim();
            }
            stage = "key";
            value = "";
          } else {
            value += chr;
          }
          escaped = false;
          break;
      }
    }
    value = value.trim();
    if (stage === "value") {
      if (key === false) {
        response.value = value;
      } else {
        response.params[key] = value;
      }
    } else if (value) {
      response.params[value.toLowerCase()] = "";
    }
    if (response.value) {
      response.value = response.value.toLowerCase();
    }
    decodeParameterValueContinuations(response);
    return response;
  }
  decodeFlowedText(str, delSp) {
    return str.split(/\r?\n/).reduce((previousValue, currentValue) => {
      if (/ $/.test(previousValue) && !/(^|\n)-- $/.test(previousValue)) {
        if (delSp) {
          return previousValue.slice(0, -1) + currentValue;
        } else {
          return previousValue + currentValue;
        }
      } else {
        return previousValue + "\n" + currentValue;
      }
    }).replace(/^ /gm, "");
  }
  getTextContent() {
    if (!this.content) {
      return "";
    }
    let str = getDecoder(this.contentType.parsed.params.charset).decode(this.content);
    if (/^flowed$/i.test(this.contentType.parsed.params.format)) {
      str = this.decodeFlowedText(str, /^yes$/i.test(this.contentType.parsed.params.delsp));
    }
    return str;
  }
  processHeaders() {
    for (let i = this.headerLines.length - 1; i >= 0; i--) {
      let line = this.headerLines[i];
      if (i && /^\s/.test(line)) {
        this.headerLines[i - 1] += "\n" + line;
        this.headerLines.splice(i, 1);
      } else {
        line = line.replace(/\s+/g, " ");
        let sep = line.indexOf(":");
        let key = sep < 0 ? line.trim() : line.substr(0, sep).trim();
        let value = sep < 0 ? "" : line.substr(sep + 1).trim();
        this.headers.push({ key: key.toLowerCase(), originalKey: key, value });
        switch (key.toLowerCase()) {
          case "content-type":
            if (this.contentType.default) {
              this.contentType = { value, parsed: {} };
            }
            break;
          case "content-transfer-encoding":
            this.contentTransferEncoding = { value, parsed: {} };
            break;
          case "content-disposition":
            this.contentDisposition = { value, parsed: {} };
            break;
          case "content-id":
            this.contentId = value;
            break;
          case "content-description":
            this.contentDescription = value;
            break;
        }
      }
    }
    this.contentType.parsed = this.parseStructuredHeader(this.contentType.value);
    this.contentType.multipart = /^multipart\//i.test(this.contentType.parsed.value) ? this.contentType.parsed.value.substr(this.contentType.parsed.value.indexOf("/") + 1) : false;
    if (this.contentType.multipart && this.contentType.parsed.params.boundary) {
      this.postalMime.boundaries.push({
        value: textEncoder.encode(this.contentType.parsed.params.boundary),
        node: this
      });
    }
    this.contentDisposition.parsed = this.parseStructuredHeader(this.contentDisposition.value);
    this.contentTransferEncoding.encoding = this.contentTransferEncoding.value.toLowerCase().split(/[^\w-]/).shift();
    this.setupContentDecoder(this.contentTransferEncoding.encoding);
  }
  feed(line) {
    switch (this.state) {
      case "header":
        if (!line.length) {
          this.state = "body";
          return this.processHeaders();
        }
        this.headerLines.push(getDecoder().decode(line));
        break;
      case "body": {
        this.contentDecoder.update(line);
      }
    }
  }
};

// node_modules/postal-mime/src/html-entities.js
var htmlEntities = {
  "&AElig": "Æ",
  "&AElig;": "Æ",
  "&AMP": "&",
  "&AMP;": "&",
  "&Aacute": "Á",
  "&Aacute;": "Á",
  "&Abreve;": "Ă",
  "&Acirc": "Â",
  "&Acirc;": "Â",
  "&Acy;": "А",
  "&Afr;": "𝔄",
  "&Agrave": "À",
  "&Agrave;": "À",
  "&Alpha;": "Α",
  "&Amacr;": "Ā",
  "&And;": "⩓",
  "&Aogon;": "Ą",
  "&Aopf;": "𝔸",
  "&ApplyFunction;": "⁡",
  "&Aring": "Å",
  "&Aring;": "Å",
  "&Ascr;": "𝒜",
  "&Assign;": "≔",
  "&Atilde": "Ã",
  "&Atilde;": "Ã",
  "&Auml": "Ä",
  "&Auml;": "Ä",
  "&Backslash;": "∖",
  "&Barv;": "⫧",
  "&Barwed;": "⌆",
  "&Bcy;": "Б",
  "&Because;": "∵",
  "&Bernoullis;": "ℬ",
  "&Beta;": "Β",
  "&Bfr;": "𝔅",
  "&Bopf;": "𝔹",
  "&Breve;": "˘",
  "&Bscr;": "ℬ",
  "&Bumpeq;": "≎",
  "&CHcy;": "Ч",
  "&COPY": "©",
  "&COPY;": "©",
  "&Cacute;": "Ć",
  "&Cap;": "⋒",
  "&CapitalDifferentialD;": "ⅅ",
  "&Cayleys;": "ℭ",
  "&Ccaron;": "Č",
  "&Ccedil": "Ç",
  "&Ccedil;": "Ç",
  "&Ccirc;": "Ĉ",
  "&Cconint;": "∰",
  "&Cdot;": "Ċ",
  "&Cedilla;": "¸",
  "&CenterDot;": "·",
  "&Cfr;": "ℭ",
  "&Chi;": "Χ",
  "&CircleDot;": "⊙",
  "&CircleMinus;": "⊖",
  "&CirclePlus;": "⊕",
  "&CircleTimes;": "⊗",
  "&ClockwiseContourIntegral;": "∲",
  "&CloseCurlyDoubleQuote;": "”",
  "&CloseCurlyQuote;": "’",
  "&Colon;": "∷",
  "&Colone;": "⩴",
  "&Congruent;": "≡",
  "&Conint;": "∯",
  "&ContourIntegral;": "∮",
  "&Copf;": "ℂ",
  "&Coproduct;": "∐",
  "&CounterClockwiseContourIntegral;": "∳",
  "&Cross;": "⨯",
  "&Cscr;": "𝒞",
  "&Cup;": "⋓",
  "&CupCap;": "≍",
  "&DD;": "ⅅ",
  "&DDotrahd;": "⤑",
  "&DJcy;": "Ђ",
  "&DScy;": "Ѕ",
  "&DZcy;": "Џ",
  "&Dagger;": "‡",
  "&Darr;": "↡",
  "&Dashv;": "⫤",
  "&Dcaron;": "Ď",
  "&Dcy;": "Д",
  "&Del;": "∇",
  "&Delta;": "Δ",
  "&Dfr;": "𝔇",
  "&DiacriticalAcute;": "´",
  "&DiacriticalDot;": "˙",
  "&DiacriticalDoubleAcute;": "˝",
  "&DiacriticalGrave;": "`",
  "&DiacriticalTilde;": "˜",
  "&Diamond;": "⋄",
  "&DifferentialD;": "ⅆ",
  "&Dopf;": "𝔻",
  "&Dot;": "¨",
  "&DotDot;": "⃜",
  "&DotEqual;": "≐",
  "&DoubleContourIntegral;": "∯",
  "&DoubleDot;": "¨",
  "&DoubleDownArrow;": "⇓",
  "&DoubleLeftArrow;": "⇐",
  "&DoubleLeftRightArrow;": "⇔",
  "&DoubleLeftTee;": "⫤",
  "&DoubleLongLeftArrow;": "⟸",
  "&DoubleLongLeftRightArrow;": "⟺",
  "&DoubleLongRightArrow;": "⟹",
  "&DoubleRightArrow;": "⇒",
  "&DoubleRightTee;": "⊨",
  "&DoubleUpArrow;": "⇑",
  "&DoubleUpDownArrow;": "⇕",
  "&DoubleVerticalBar;": "∥",
  "&DownArrow;": "↓",
  "&DownArrowBar;": "⤓",
  "&DownArrowUpArrow;": "⇵",
  "&DownBreve;": "̑",
  "&DownLeftRightVector;": "⥐",
  "&DownLeftTeeVector;": "⥞",
  "&DownLeftVector;": "↽",
  "&DownLeftVectorBar;": "⥖",
  "&DownRightTeeVector;": "⥟",
  "&DownRightVector;": "⇁",
  "&DownRightVectorBar;": "⥗",
  "&DownTee;": "⊤",
  "&DownTeeArrow;": "↧",
  "&Downarrow;": "⇓",
  "&Dscr;": "𝒟",
  "&Dstrok;": "Đ",
  "&ENG;": "Ŋ",
  "&ETH": "Ð",
  "&ETH;": "Ð",
  "&Eacute": "É",
  "&Eacute;": "É",
  "&Ecaron;": "Ě",
  "&Ecirc": "Ê",
  "&Ecirc;": "Ê",
  "&Ecy;": "Э",
  "&Edot;": "Ė",
  "&Efr;": "𝔈",
  "&Egrave": "È",
  "&Egrave;": "È",
  "&Element;": "∈",
  "&Emacr;": "Ē",
  "&EmptySmallSquare;": "◻",
  "&EmptyVerySmallSquare;": "▫",
  "&Eogon;": "Ę",
  "&Eopf;": "𝔼",
  "&Epsilon;": "Ε",
  "&Equal;": "⩵",
  "&EqualTilde;": "≂",
  "&Equilibrium;": "⇌",
  "&Escr;": "ℰ",
  "&Esim;": "⩳",
  "&Eta;": "Η",
  "&Euml": "Ë",
  "&Euml;": "Ë",
  "&Exists;": "∃",
  "&ExponentialE;": "ⅇ",
  "&Fcy;": "Ф",
  "&Ffr;": "𝔉",
  "&FilledSmallSquare;": "◼",
  "&FilledVerySmallSquare;": "▪",
  "&Fopf;": "𝔽",
  "&ForAll;": "∀",
  "&Fouriertrf;": "ℱ",
  "&Fscr;": "ℱ",
  "&GJcy;": "Ѓ",
  "&GT": ">",
  "&GT;": ">",
  "&Gamma;": "Γ",
  "&Gammad;": "Ϝ",
  "&Gbreve;": "Ğ",
  "&Gcedil;": "Ģ",
  "&Gcirc;": "Ĝ",
  "&Gcy;": "Г",
  "&Gdot;": "Ġ",
  "&Gfr;": "𝔊",
  "&Gg;": "⋙",
  "&Gopf;": "𝔾",
  "&GreaterEqual;": "≥",
  "&GreaterEqualLess;": "⋛",
  "&GreaterFullEqual;": "≧",
  "&GreaterGreater;": "⪢",
  "&GreaterLess;": "≷",
  "&GreaterSlantEqual;": "⩾",
  "&GreaterTilde;": "≳",
  "&Gscr;": "𝒢",
  "&Gt;": "≫",
  "&HARDcy;": "Ъ",
  "&Hacek;": "ˇ",
  "&Hat;": "^",
  "&Hcirc;": "Ĥ",
  "&Hfr;": "ℌ",
  "&HilbertSpace;": "ℋ",
  "&Hopf;": "ℍ",
  "&HorizontalLine;": "─",
  "&Hscr;": "ℋ",
  "&Hstrok;": "Ħ",
  "&HumpDownHump;": "≎",
  "&HumpEqual;": "≏",
  "&IEcy;": "Е",
  "&IJlig;": "Ĳ",
  "&IOcy;": "Ё",
  "&Iacute": "Í",
  "&Iacute;": "Í",
  "&Icirc": "Î",
  "&Icirc;": "Î",
  "&Icy;": "И",
  "&Idot;": "İ",
  "&Ifr;": "ℑ",
  "&Igrave": "Ì",
  "&Igrave;": "Ì",
  "&Im;": "ℑ",
  "&Imacr;": "Ī",
  "&ImaginaryI;": "ⅈ",
  "&Implies;": "⇒",
  "&Int;": "∬",
  "&Integral;": "∫",
  "&Intersection;": "⋂",
  "&InvisibleComma;": "⁣",
  "&InvisibleTimes;": "⁢",
  "&Iogon;": "Į",
  "&Iopf;": "𝕀",
  "&Iota;": "Ι",
  "&Iscr;": "ℐ",
  "&Itilde;": "Ĩ",
  "&Iukcy;": "І",
  "&Iuml": "Ï",
  "&Iuml;": "Ï",
  "&Jcirc;": "Ĵ",
  "&Jcy;": "Й",
  "&Jfr;": "𝔍",
  "&Jopf;": "𝕁",
  "&Jscr;": "𝒥",
  "&Jsercy;": "Ј",
  "&Jukcy;": "Є",
  "&KHcy;": "Х",
  "&KJcy;": "Ќ",
  "&Kappa;": "Κ",
  "&Kcedil;": "Ķ",
  "&Kcy;": "К",
  "&Kfr;": "𝔎",
  "&Kopf;": "𝕂",
  "&Kscr;": "𝒦",
  "&LJcy;": "Љ",
  "&LT": "<",
  "&LT;": "<",
  "&Lacute;": "Ĺ",
  "&Lambda;": "Λ",
  "&Lang;": "⟪",
  "&Laplacetrf;": "ℒ",
  "&Larr;": "↞",
  "&Lcaron;": "Ľ",
  "&Lcedil;": "Ļ",
  "&Lcy;": "Л",
  "&LeftAngleBracket;": "⟨",
  "&LeftArrow;": "←",
  "&LeftArrowBar;": "⇤",
  "&LeftArrowRightArrow;": "⇆",
  "&LeftCeiling;": "⌈",
  "&LeftDoubleBracket;": "⟦",
  "&LeftDownTeeVector;": "⥡",
  "&LeftDownVector;": "⇃",
  "&LeftDownVectorBar;": "⥙",
  "&LeftFloor;": "⌊",
  "&LeftRightArrow;": "↔",
  "&LeftRightVector;": "⥎",
  "&LeftTee;": "⊣",
  "&LeftTeeArrow;": "↤",
  "&LeftTeeVector;": "⥚",
  "&LeftTriangle;": "⊲",
  "&LeftTriangleBar;": "⧏",
  "&LeftTriangleEqual;": "⊴",
  "&LeftUpDownVector;": "⥑",
  "&LeftUpTeeVector;": "⥠",
  "&LeftUpVector;": "↿",
  "&LeftUpVectorBar;": "⥘",
  "&LeftVector;": "↼",
  "&LeftVectorBar;": "⥒",
  "&Leftarrow;": "⇐",
  "&Leftrightarrow;": "⇔",
  "&LessEqualGreater;": "⋚",
  "&LessFullEqual;": "≦",
  "&LessGreater;": "≶",
  "&LessLess;": "⪡",
  "&LessSlantEqual;": "⩽",
  "&LessTilde;": "≲",
  "&Lfr;": "𝔏",
  "&Ll;": "⋘",
  "&Lleftarrow;": "⇚",
  "&Lmidot;": "Ŀ",
  "&LongLeftArrow;": "⟵",
  "&LongLeftRightArrow;": "⟷",
  "&LongRightArrow;": "⟶",
  "&Longleftarrow;": "⟸",
  "&Longleftrightarrow;": "⟺",
  "&Longrightarrow;": "⟹",
  "&Lopf;": "𝕃",
  "&LowerLeftArrow;": "↙",
  "&LowerRightArrow;": "↘",
  "&Lscr;": "ℒ",
  "&Lsh;": "↰",
  "&Lstrok;": "Ł",
  "&Lt;": "≪",
  "&Map;": "⤅",
  "&Mcy;": "М",
  "&MediumSpace;": " ",
  "&Mellintrf;": "ℳ",
  "&Mfr;": "𝔐",
  "&MinusPlus;": "∓",
  "&Mopf;": "𝕄",
  "&Mscr;": "ℳ",
  "&Mu;": "Μ",
  "&NJcy;": "Њ",
  "&Nacute;": "Ń",
  "&Ncaron;": "Ň",
  "&Ncedil;": "Ņ",
  "&Ncy;": "Н",
  "&NegativeMediumSpace;": "​",
  "&NegativeThickSpace;": "​",
  "&NegativeThinSpace;": "​",
  "&NegativeVeryThinSpace;": "​",
  "&NestedGreaterGreater;": "≫",
  "&NestedLessLess;": "≪",
  "&NewLine;": "\n",
  "&Nfr;": "𝔑",
  "&NoBreak;": "⁠",
  "&NonBreakingSpace;": " ",
  "&Nopf;": "ℕ",
  "&Not;": "⫬",
  "&NotCongruent;": "≢",
  "&NotCupCap;": "≭",
  "&NotDoubleVerticalBar;": "∦",
  "&NotElement;": "∉",
  "&NotEqual;": "≠",
  "&NotEqualTilde;": "≂̸",
  "&NotExists;": "∄",
  "&NotGreater;": "≯",
  "&NotGreaterEqual;": "≱",
  "&NotGreaterFullEqual;": "≧̸",
  "&NotGreaterGreater;": "≫̸",
  "&NotGreaterLess;": "≹",
  "&NotGreaterSlantEqual;": "⩾̸",
  "&NotGreaterTilde;": "≵",
  "&NotHumpDownHump;": "≎̸",
  "&NotHumpEqual;": "≏̸",
  "&NotLeftTriangle;": "⋪",
  "&NotLeftTriangleBar;": "⧏̸",
  "&NotLeftTriangleEqual;": "⋬",
  "&NotLess;": "≮",
  "&NotLessEqual;": "≰",
  "&NotLessGreater;": "≸",
  "&NotLessLess;": "≪̸",
  "&NotLessSlantEqual;": "⩽̸",
  "&NotLessTilde;": "≴",
  "&NotNestedGreaterGreater;": "⪢̸",
  "&NotNestedLessLess;": "⪡̸",
  "&NotPrecedes;": "⊀",
  "&NotPrecedesEqual;": "⪯̸",
  "&NotPrecedesSlantEqual;": "⋠",
  "&NotReverseElement;": "∌",
  "&NotRightTriangle;": "⋫",
  "&NotRightTriangleBar;": "⧐̸",
  "&NotRightTriangleEqual;": "⋭",
  "&NotSquareSubset;": "⊏̸",
  "&NotSquareSubsetEqual;": "⋢",
  "&NotSquareSuperset;": "⊐̸",
  "&NotSquareSupersetEqual;": "⋣",
  "&NotSubset;": "⊂⃒",
  "&NotSubsetEqual;": "⊈",
  "&NotSucceeds;": "⊁",
  "&NotSucceedsEqual;": "⪰̸",
  "&NotSucceedsSlantEqual;": "⋡",
  "&NotSucceedsTilde;": "≿̸",
  "&NotSuperset;": "⊃⃒",
  "&NotSupersetEqual;": "⊉",
  "&NotTilde;": "≁",
  "&NotTildeEqual;": "≄",
  "&NotTildeFullEqual;": "≇",
  "&NotTildeTilde;": "≉",
  "&NotVerticalBar;": "∤",
  "&Nscr;": "𝒩",
  "&Ntilde": "Ñ",
  "&Ntilde;": "Ñ",
  "&Nu;": "Ν",
  "&OElig;": "Œ",
  "&Oacute": "Ó",
  "&Oacute;": "Ó",
  "&Ocirc": "Ô",
  "&Ocirc;": "Ô",
  "&Ocy;": "О",
  "&Odblac;": "Ő",
  "&Ofr;": "𝔒",
  "&Ograve": "Ò",
  "&Ograve;": "Ò",
  "&Omacr;": "Ō",
  "&Omega;": "Ω",
  "&Omicron;": "Ο",
  "&Oopf;": "𝕆",
  "&OpenCurlyDoubleQuote;": "“",
  "&OpenCurlyQuote;": "‘",
  "&Or;": "⩔",
  "&Oscr;": "𝒪",
  "&Oslash": "Ø",
  "&Oslash;": "Ø",
  "&Otilde": "Õ",
  "&Otilde;": "Õ",
  "&Otimes;": "⨷",
  "&Ouml": "Ö",
  "&Ouml;": "Ö",
  "&OverBar;": "‾",
  "&OverBrace;": "⏞",
  "&OverBracket;": "⎴",
  "&OverParenthesis;": "⏜",
  "&PartialD;": "∂",
  "&Pcy;": "П",
  "&Pfr;": "𝔓",
  "&Phi;": "Φ",
  "&Pi;": "Π",
  "&PlusMinus;": "±",
  "&Poincareplane;": "ℌ",
  "&Popf;": "ℙ",
  "&Pr;": "⪻",
  "&Precedes;": "≺",
  "&PrecedesEqual;": "⪯",
  "&PrecedesSlantEqual;": "≼",
  "&PrecedesTilde;": "≾",
  "&Prime;": "″",
  "&Product;": "∏",
  "&Proportion;": "∷",
  "&Proportional;": "∝",
  "&Pscr;": "𝒫",
  "&Psi;": "Ψ",
  "&QUOT": '"',
  "&QUOT;": '"',
  "&Qfr;": "𝔔",
  "&Qopf;": "ℚ",
  "&Qscr;": "𝒬",
  "&RBarr;": "⤐",
  "&REG": "®",
  "&REG;": "®",
  "&Racute;": "Ŕ",
  "&Rang;": "⟫",
  "&Rarr;": "↠",
  "&Rarrtl;": "⤖",
  "&Rcaron;": "Ř",
  "&Rcedil;": "Ŗ",
  "&Rcy;": "Р",
  "&Re;": "ℜ",
  "&ReverseElement;": "∋",
  "&ReverseEquilibrium;": "⇋",
  "&ReverseUpEquilibrium;": "⥯",
  "&Rfr;": "ℜ",
  "&Rho;": "Ρ",
  "&RightAngleBracket;": "⟩",
  "&RightArrow;": "→",
  "&RightArrowBar;": "⇥",
  "&RightArrowLeftArrow;": "⇄",
  "&RightCeiling;": "⌉",
  "&RightDoubleBracket;": "⟧",
  "&RightDownTeeVector;": "⥝",
  "&RightDownVector;": "⇂",
  "&RightDownVectorBar;": "⥕",
  "&RightFloor;": "⌋",
  "&RightTee;": "⊢",
  "&RightTeeArrow;": "↦",
  "&RightTeeVector;": "⥛",
  "&RightTriangle;": "⊳",
  "&RightTriangleBar;": "⧐",
  "&RightTriangleEqual;": "⊵",
  "&RightUpDownVector;": "⥏",
  "&RightUpTeeVector;": "⥜",
  "&RightUpVector;": "↾",
  "&RightUpVectorBar;": "⥔",
  "&RightVector;": "⇀",
  "&RightVectorBar;": "⥓",
  "&Rightarrow;": "⇒",
  "&Ropf;": "ℝ",
  "&RoundImplies;": "⥰",
  "&Rrightarrow;": "⇛",
  "&Rscr;": "ℛ",
  "&Rsh;": "↱",
  "&RuleDelayed;": "⧴",
  "&SHCHcy;": "Щ",
  "&SHcy;": "Ш",
  "&SOFTcy;": "Ь",
  "&Sacute;": "Ś",
  "&Sc;": "⪼",
  "&Scaron;": "Š",
  "&Scedil;": "Ş",
  "&Scirc;": "Ŝ",
  "&Scy;": "С",
  "&Sfr;": "𝔖",
  "&ShortDownArrow;": "↓",
  "&ShortLeftArrow;": "←",
  "&ShortRightArrow;": "→",
  "&ShortUpArrow;": "↑",
  "&Sigma;": "Σ",
  "&SmallCircle;": "∘",
  "&Sopf;": "𝕊",
  "&Sqrt;": "√",
  "&Square;": "□",
  "&SquareIntersection;": "⊓",
  "&SquareSubset;": "⊏",
  "&SquareSubsetEqual;": "⊑",
  "&SquareSuperset;": "⊐",
  "&SquareSupersetEqual;": "⊒",
  "&SquareUnion;": "⊔",
  "&Sscr;": "𝒮",
  "&Star;": "⋆",
  "&Sub;": "⋐",
  "&Subset;": "⋐",
  "&SubsetEqual;": "⊆",
  "&Succeeds;": "≻",
  "&SucceedsEqual;": "⪰",
  "&SucceedsSlantEqual;": "≽",
  "&SucceedsTilde;": "≿",
  "&SuchThat;": "∋",
  "&Sum;": "∑",
  "&Sup;": "⋑",
  "&Superset;": "⊃",
  "&SupersetEqual;": "⊇",
  "&Supset;": "⋑",
  "&THORN": "Þ",
  "&THORN;": "Þ",
  "&TRADE;": "™",
  "&TSHcy;": "Ћ",
  "&TScy;": "Ц",
  "&Tab;": "	",
  "&Tau;": "Τ",
  "&Tcaron;": "Ť",
  "&Tcedil;": "Ţ",
  "&Tcy;": "Т",
  "&Tfr;": "𝔗",
  "&Therefore;": "∴",
  "&Theta;": "Θ",
  "&ThickSpace;": "  ",
  "&ThinSpace;": " ",
  "&Tilde;": "∼",
  "&TildeEqual;": "≃",
  "&TildeFullEqual;": "≅",
  "&TildeTilde;": "≈",
  "&Topf;": "𝕋",
  "&TripleDot;": "⃛",
  "&Tscr;": "𝒯",
  "&Tstrok;": "Ŧ",
  "&Uacute": "Ú",
  "&Uacute;": "Ú",
  "&Uarr;": "↟",
  "&Uarrocir;": "⥉",
  "&Ubrcy;": "Ў",
  "&Ubreve;": "Ŭ",
  "&Ucirc": "Û",
  "&Ucirc;": "Û",
  "&Ucy;": "У",
  "&Udblac;": "Ű",
  "&Ufr;": "𝔘",
  "&Ugrave": "Ù",
  "&Ugrave;": "Ù",
  "&Umacr;": "Ū",
  "&UnderBar;": "_",
  "&UnderBrace;": "⏟",
  "&UnderBracket;": "⎵",
  "&UnderParenthesis;": "⏝",
  "&Union;": "⋃",
  "&UnionPlus;": "⊎",
  "&Uogon;": "Ų",
  "&Uopf;": "𝕌",
  "&UpArrow;": "↑",
  "&UpArrowBar;": "⤒",
  "&UpArrowDownArrow;": "⇅",
  "&UpDownArrow;": "↕",
  "&UpEquilibrium;": "⥮",
  "&UpTee;": "⊥",
  "&UpTeeArrow;": "↥",
  "&Uparrow;": "⇑",
  "&Updownarrow;": "⇕",
  "&UpperLeftArrow;": "↖",
  "&UpperRightArrow;": "↗",
  "&Upsi;": "ϒ",
  "&Upsilon;": "Υ",
  "&Uring;": "Ů",
  "&Uscr;": "𝒰",
  "&Utilde;": "Ũ",
  "&Uuml": "Ü",
  "&Uuml;": "Ü",
  "&VDash;": "⊫",
  "&Vbar;": "⫫",
  "&Vcy;": "В",
  "&Vdash;": "⊩",
  "&Vdashl;": "⫦",
  "&Vee;": "⋁",
  "&Verbar;": "‖",
  "&Vert;": "‖",
  "&VerticalBar;": "∣",
  "&VerticalLine;": "|",
  "&VerticalSeparator;": "❘",
  "&VerticalTilde;": "≀",
  "&VeryThinSpace;": " ",
  "&Vfr;": "𝔙",
  "&Vopf;": "𝕍",
  "&Vscr;": "𝒱",
  "&Vvdash;": "⊪",
  "&Wcirc;": "Ŵ",
  "&Wedge;": "⋀",
  "&Wfr;": "𝔚",
  "&Wopf;": "𝕎",
  "&Wscr;": "𝒲",
  "&Xfr;": "𝔛",
  "&Xi;": "Ξ",
  "&Xopf;": "𝕏",
  "&Xscr;": "𝒳",
  "&YAcy;": "Я",
  "&YIcy;": "Ї",
  "&YUcy;": "Ю",
  "&Yacute": "Ý",
  "&Yacute;": "Ý",
  "&Ycirc;": "Ŷ",
  "&Ycy;": "Ы",
  "&Yfr;": "𝔜",
  "&Yopf;": "𝕐",
  "&Yscr;": "𝒴",
  "&Yuml;": "Ÿ",
  "&ZHcy;": "Ж",
  "&Zacute;": "Ź",
  "&Zcaron;": "Ž",
  "&Zcy;": "З",
  "&Zdot;": "Ż",
  "&ZeroWidthSpace;": "​",
  "&Zeta;": "Ζ",
  "&Zfr;": "ℨ",
  "&Zopf;": "ℤ",
  "&Zscr;": "𝒵",
  "&aacute": "á",
  "&aacute;": "á",
  "&abreve;": "ă",
  "&ac;": "∾",
  "&acE;": "∾̳",
  "&acd;": "∿",
  "&acirc": "â",
  "&acirc;": "â",
  "&acute": "´",
  "&acute;": "´",
  "&acy;": "а",
  "&aelig": "æ",
  "&aelig;": "æ",
  "&af;": "⁡",
  "&afr;": "𝔞",
  "&agrave": "à",
  "&agrave;": "à",
  "&alefsym;": "ℵ",
  "&aleph;": "ℵ",
  "&alpha;": "α",
  "&amacr;": "ā",
  "&amalg;": "⨿",
  "&amp": "&",
  "&amp;": "&",
  "&and;": "∧",
  "&andand;": "⩕",
  "&andd;": "⩜",
  "&andslope;": "⩘",
  "&andv;": "⩚",
  "&ang;": "∠",
  "&ange;": "⦤",
  "&angle;": "∠",
  "&angmsd;": "∡",
  "&angmsdaa;": "⦨",
  "&angmsdab;": "⦩",
  "&angmsdac;": "⦪",
  "&angmsdad;": "⦫",
  "&angmsdae;": "⦬",
  "&angmsdaf;": "⦭",
  "&angmsdag;": "⦮",
  "&angmsdah;": "⦯",
  "&angrt;": "∟",
  "&angrtvb;": "⊾",
  "&angrtvbd;": "⦝",
  "&angsph;": "∢",
  "&angst;": "Å",
  "&angzarr;": "⍼",
  "&aogon;": "ą",
  "&aopf;": "𝕒",
  "&ap;": "≈",
  "&apE;": "⩰",
  "&apacir;": "⩯",
  "&ape;": "≊",
  "&apid;": "≋",
  "&apos;": "'",
  "&approx;": "≈",
  "&approxeq;": "≊",
  "&aring": "å",
  "&aring;": "å",
  "&ascr;": "𝒶",
  "&ast;": "*",
  "&asymp;": "≈",
  "&asympeq;": "≍",
  "&atilde": "ã",
  "&atilde;": "ã",
  "&auml": "ä",
  "&auml;": "ä",
  "&awconint;": "∳",
  "&awint;": "⨑",
  "&bNot;": "⫭",
  "&backcong;": "≌",
  "&backepsilon;": "϶",
  "&backprime;": "‵",
  "&backsim;": "∽",
  "&backsimeq;": "⋍",
  "&barvee;": "⊽",
  "&barwed;": "⌅",
  "&barwedge;": "⌅",
  "&bbrk;": "⎵",
  "&bbrktbrk;": "⎶",
  "&bcong;": "≌",
  "&bcy;": "б",
  "&bdquo;": "„",
  "&becaus;": "∵",
  "&because;": "∵",
  "&bemptyv;": "⦰",
  "&bepsi;": "϶",
  "&bernou;": "ℬ",
  "&beta;": "β",
  "&beth;": "ℶ",
  "&between;": "≬",
  "&bfr;": "𝔟",
  "&bigcap;": "⋂",
  "&bigcirc;": "◯",
  "&bigcup;": "⋃",
  "&bigodot;": "⨀",
  "&bigoplus;": "⨁",
  "&bigotimes;": "⨂",
  "&bigsqcup;": "⨆",
  "&bigstar;": "★",
  "&bigtriangledown;": "▽",
  "&bigtriangleup;": "△",
  "&biguplus;": "⨄",
  "&bigvee;": "⋁",
  "&bigwedge;": "⋀",
  "&bkarow;": "⤍",
  "&blacklozenge;": "⧫",
  "&blacksquare;": "▪",
  "&blacktriangle;": "▴",
  "&blacktriangledown;": "▾",
  "&blacktriangleleft;": "◂",
  "&blacktriangleright;": "▸",
  "&blank;": "␣",
  "&blk12;": "▒",
  "&blk14;": "░",
  "&blk34;": "▓",
  "&block;": "█",
  "&bne;": "=⃥",
  "&bnequiv;": "≡⃥",
  "&bnot;": "⌐",
  "&bopf;": "𝕓",
  "&bot;": "⊥",
  "&bottom;": "⊥",
  "&bowtie;": "⋈",
  "&boxDL;": "╗",
  "&boxDR;": "╔",
  "&boxDl;": "╖",
  "&boxDr;": "╓",
  "&boxH;": "═",
  "&boxHD;": "╦",
  "&boxHU;": "╩",
  "&boxHd;": "╤",
  "&boxHu;": "╧",
  "&boxUL;": "╝",
  "&boxUR;": "╚",
  "&boxUl;": "╜",
  "&boxUr;": "╙",
  "&boxV;": "║",
  "&boxVH;": "╬",
  "&boxVL;": "╣",
  "&boxVR;": "╠",
  "&boxVh;": "╫",
  "&boxVl;": "╢",
  "&boxVr;": "╟",
  "&boxbox;": "⧉",
  "&boxdL;": "╕",
  "&boxdR;": "╒",
  "&boxdl;": "┐",
  "&boxdr;": "┌",
  "&boxh;": "─",
  "&boxhD;": "╥",
  "&boxhU;": "╨",
  "&boxhd;": "┬",
  "&boxhu;": "┴",
  "&boxminus;": "⊟",
  "&boxplus;": "⊞",
  "&boxtimes;": "⊠",
  "&boxuL;": "╛",
  "&boxuR;": "╘",
  "&boxul;": "┘",
  "&boxur;": "└",
  "&boxv;": "│",
  "&boxvH;": "╪",
  "&boxvL;": "╡",
  "&boxvR;": "╞",
  "&boxvh;": "┼",
  "&boxvl;": "┤",
  "&boxvr;": "├",
  "&bprime;": "‵",
  "&breve;": "˘",
  "&brvbar": "¦",
  "&brvbar;": "¦",
  "&bscr;": "𝒷",
  "&bsemi;": "⁏",
  "&bsim;": "∽",
  "&bsime;": "⋍",
  "&bsol;": "\\",
  "&bsolb;": "⧅",
  "&bsolhsub;": "⟈",
  "&bull;": "•",
  "&bullet;": "•",
  "&bump;": "≎",
  "&bumpE;": "⪮",
  "&bumpe;": "≏",
  "&bumpeq;": "≏",
  "&cacute;": "ć",
  "&cap;": "∩",
  "&capand;": "⩄",
  "&capbrcup;": "⩉",
  "&capcap;": "⩋",
  "&capcup;": "⩇",
  "&capdot;": "⩀",
  "&caps;": "∩︀",
  "&caret;": "⁁",
  "&caron;": "ˇ",
  "&ccaps;": "⩍",
  "&ccaron;": "č",
  "&ccedil": "ç",
  "&ccedil;": "ç",
  "&ccirc;": "ĉ",
  "&ccups;": "⩌",
  "&ccupssm;": "⩐",
  "&cdot;": "ċ",
  "&cedil": "¸",
  "&cedil;": "¸",
  "&cemptyv;": "⦲",
  "&cent": "¢",
  "&cent;": "¢",
  "&centerdot;": "·",
  "&cfr;": "𝔠",
  "&chcy;": "ч",
  "&check;": "✓",
  "&checkmark;": "✓",
  "&chi;": "χ",
  "&cir;": "○",
  "&cirE;": "⧃",
  "&circ;": "ˆ",
  "&circeq;": "≗",
  "&circlearrowleft;": "↺",
  "&circlearrowright;": "↻",
  "&circledR;": "®",
  "&circledS;": "Ⓢ",
  "&circledast;": "⊛",
  "&circledcirc;": "⊚",
  "&circleddash;": "⊝",
  "&cire;": "≗",
  "&cirfnint;": "⨐",
  "&cirmid;": "⫯",
  "&cirscir;": "⧂",
  "&clubs;": "♣",
  "&clubsuit;": "♣",
  "&colon;": ":",
  "&colone;": "≔",
  "&coloneq;": "≔",
  "&comma;": ",",
  "&commat;": "@",
  "&comp;": "∁",
  "&compfn;": "∘",
  "&complement;": "∁",
  "&complexes;": "ℂ",
  "&cong;": "≅",
  "&congdot;": "⩭",
  "&conint;": "∮",
  "&copf;": "𝕔",
  "&coprod;": "∐",
  "&copy": "©",
  "&copy;": "©",
  "&copysr;": "℗",
  "&crarr;": "↵",
  "&cross;": "✗",
  "&cscr;": "𝒸",
  "&csub;": "⫏",
  "&csube;": "⫑",
  "&csup;": "⫐",
  "&csupe;": "⫒",
  "&ctdot;": "⋯",
  "&cudarrl;": "⤸",
  "&cudarrr;": "⤵",
  "&cuepr;": "⋞",
  "&cuesc;": "⋟",
  "&cularr;": "↶",
  "&cularrp;": "⤽",
  "&cup;": "∪",
  "&cupbrcap;": "⩈",
  "&cupcap;": "⩆",
  "&cupcup;": "⩊",
  "&cupdot;": "⊍",
  "&cupor;": "⩅",
  "&cups;": "∪︀",
  "&curarr;": "↷",
  "&curarrm;": "⤼",
  "&curlyeqprec;": "⋞",
  "&curlyeqsucc;": "⋟",
  "&curlyvee;": "⋎",
  "&curlywedge;": "⋏",
  "&curren": "¤",
  "&curren;": "¤",
  "&curvearrowleft;": "↶",
  "&curvearrowright;": "↷",
  "&cuvee;": "⋎",
  "&cuwed;": "⋏",
  "&cwconint;": "∲",
  "&cwint;": "∱",
  "&cylcty;": "⌭",
  "&dArr;": "⇓",
  "&dHar;": "⥥",
  "&dagger;": "†",
  "&daleth;": "ℸ",
  "&darr;": "↓",
  "&dash;": "‐",
  "&dashv;": "⊣",
  "&dbkarow;": "⤏",
  "&dblac;": "˝",
  "&dcaron;": "ď",
  "&dcy;": "д",
  "&dd;": "ⅆ",
  "&ddagger;": "‡",
  "&ddarr;": "⇊",
  "&ddotseq;": "⩷",
  "&deg": "°",
  "&deg;": "°",
  "&delta;": "δ",
  "&demptyv;": "⦱",
  "&dfisht;": "⥿",
  "&dfr;": "𝔡",
  "&dharl;": "⇃",
  "&dharr;": "⇂",
  "&diam;": "⋄",
  "&diamond;": "⋄",
  "&diamondsuit;": "♦",
  "&diams;": "♦",
  "&die;": "¨",
  "&digamma;": "ϝ",
  "&disin;": "⋲",
  "&div;": "÷",
  "&divide": "÷",
  "&divide;": "÷",
  "&divideontimes;": "⋇",
  "&divonx;": "⋇",
  "&djcy;": "ђ",
  "&dlcorn;": "⌞",
  "&dlcrop;": "⌍",
  "&dollar;": "$",
  "&dopf;": "𝕕",
  "&dot;": "˙",
  "&doteq;": "≐",
  "&doteqdot;": "≑",
  "&dotminus;": "∸",
  "&dotplus;": "∔",
  "&dotsquare;": "⊡",
  "&doublebarwedge;": "⌆",
  "&downarrow;": "↓",
  "&downdownarrows;": "⇊",
  "&downharpoonleft;": "⇃",
  "&downharpoonright;": "⇂",
  "&drbkarow;": "⤐",
  "&drcorn;": "⌟",
  "&drcrop;": "⌌",
  "&dscr;": "𝒹",
  "&dscy;": "ѕ",
  "&dsol;": "⧶",
  "&dstrok;": "đ",
  "&dtdot;": "⋱",
  "&dtri;": "▿",
  "&dtrif;": "▾",
  "&duarr;": "⇵",
  "&duhar;": "⥯",
  "&dwangle;": "⦦",
  "&dzcy;": "џ",
  "&dzigrarr;": "⟿",
  "&eDDot;": "⩷",
  "&eDot;": "≑",
  "&eacute": "é",
  "&eacute;": "é",
  "&easter;": "⩮",
  "&ecaron;": "ě",
  "&ecir;": "≖",
  "&ecirc": "ê",
  "&ecirc;": "ê",
  "&ecolon;": "≕",
  "&ecy;": "э",
  "&edot;": "ė",
  "&ee;": "ⅇ",
  "&efDot;": "≒",
  "&efr;": "𝔢",
  "&eg;": "⪚",
  "&egrave": "è",
  "&egrave;": "è",
  "&egs;": "⪖",
  "&egsdot;": "⪘",
  "&el;": "⪙",
  "&elinters;": "⏧",
  "&ell;": "ℓ",
  "&els;": "⪕",
  "&elsdot;": "⪗",
  "&emacr;": "ē",
  "&empty;": "∅",
  "&emptyset;": "∅",
  "&emptyv;": "∅",
  "&emsp13;": " ",
  "&emsp14;": " ",
  "&emsp;": " ",
  "&eng;": "ŋ",
  "&ensp;": " ",
  "&eogon;": "ę",
  "&eopf;": "𝕖",
  "&epar;": "⋕",
  "&eparsl;": "⧣",
  "&eplus;": "⩱",
  "&epsi;": "ε",
  "&epsilon;": "ε",
  "&epsiv;": "ϵ",
  "&eqcirc;": "≖",
  "&eqcolon;": "≕",
  "&eqsim;": "≂",
  "&eqslantgtr;": "⪖",
  "&eqslantless;": "⪕",
  "&equals;": "=",
  "&equest;": "≟",
  "&equiv;": "≡",
  "&equivDD;": "⩸",
  "&eqvparsl;": "⧥",
  "&erDot;": "≓",
  "&erarr;": "⥱",
  "&escr;": "ℯ",
  "&esdot;": "≐",
  "&esim;": "≂",
  "&eta;": "η",
  "&eth": "ð",
  "&eth;": "ð",
  "&euml": "ë",
  "&euml;": "ë",
  "&euro;": "€",
  "&excl;": "!",
  "&exist;": "∃",
  "&expectation;": "ℰ",
  "&exponentiale;": "ⅇ",
  "&fallingdotseq;": "≒",
  "&fcy;": "ф",
  "&female;": "♀",
  "&ffilig;": "ﬃ",
  "&fflig;": "ﬀ",
  "&ffllig;": "ﬄ",
  "&ffr;": "𝔣",
  "&filig;": "ﬁ",
  "&fjlig;": "fj",
  "&flat;": "♭",
  "&fllig;": "ﬂ",
  "&fltns;": "▱",
  "&fnof;": "ƒ",
  "&fopf;": "𝕗",
  "&forall;": "∀",
  "&fork;": "⋔",
  "&forkv;": "⫙",
  "&fpartint;": "⨍",
  "&frac12": "½",
  "&frac12;": "½",
  "&frac13;": "⅓",
  "&frac14": "¼",
  "&frac14;": "¼",
  "&frac15;": "⅕",
  "&frac16;": "⅙",
  "&frac18;": "⅛",
  "&frac23;": "⅔",
  "&frac25;": "⅖",
  "&frac34": "¾",
  "&frac34;": "¾",
  "&frac35;": "⅗",
  "&frac38;": "⅜",
  "&frac45;": "⅘",
  "&frac56;": "⅚",
  "&frac58;": "⅝",
  "&frac78;": "⅞",
  "&frasl;": "⁄",
  "&frown;": "⌢",
  "&fscr;": "𝒻",
  "&gE;": "≧",
  "&gEl;": "⪌",
  "&gacute;": "ǵ",
  "&gamma;": "γ",
  "&gammad;": "ϝ",
  "&gap;": "⪆",
  "&gbreve;": "ğ",
  "&gcirc;": "ĝ",
  "&gcy;": "г",
  "&gdot;": "ġ",
  "&ge;": "≥",
  "&gel;": "⋛",
  "&geq;": "≥",
  "&geqq;": "≧",
  "&geqslant;": "⩾",
  "&ges;": "⩾",
  "&gescc;": "⪩",
  "&gesdot;": "⪀",
  "&gesdoto;": "⪂",
  "&gesdotol;": "⪄",
  "&gesl;": "⋛︀",
  "&gesles;": "⪔",
  "&gfr;": "𝔤",
  "&gg;": "≫",
  "&ggg;": "⋙",
  "&gimel;": "ℷ",
  "&gjcy;": "ѓ",
  "&gl;": "≷",
  "&glE;": "⪒",
  "&gla;": "⪥",
  "&glj;": "⪤",
  "&gnE;": "≩",
  "&gnap;": "⪊",
  "&gnapprox;": "⪊",
  "&gne;": "⪈",
  "&gneq;": "⪈",
  "&gneqq;": "≩",
  "&gnsim;": "⋧",
  "&gopf;": "𝕘",
  "&grave;": "`",
  "&gscr;": "ℊ",
  "&gsim;": "≳",
  "&gsime;": "⪎",
  "&gsiml;": "⪐",
  "&gt": ">",
  "&gt;": ">",
  "&gtcc;": "⪧",
  "&gtcir;": "⩺",
  "&gtdot;": "⋗",
  "&gtlPar;": "⦕",
  "&gtquest;": "⩼",
  "&gtrapprox;": "⪆",
  "&gtrarr;": "⥸",
  "&gtrdot;": "⋗",
  "&gtreqless;": "⋛",
  "&gtreqqless;": "⪌",
  "&gtrless;": "≷",
  "&gtrsim;": "≳",
  "&gvertneqq;": "≩︀",
  "&gvnE;": "≩︀",
  "&hArr;": "⇔",
  "&hairsp;": " ",
  "&half;": "½",
  "&hamilt;": "ℋ",
  "&hardcy;": "ъ",
  "&harr;": "↔",
  "&harrcir;": "⥈",
  "&harrw;": "↭",
  "&hbar;": "ℏ",
  "&hcirc;": "ĥ",
  "&hearts;": "♥",
  "&heartsuit;": "♥",
  "&hellip;": "…",
  "&hercon;": "⊹",
  "&hfr;": "𝔥",
  "&hksearow;": "⤥",
  "&hkswarow;": "⤦",
  "&hoarr;": "⇿",
  "&homtht;": "∻",
  "&hookleftarrow;": "↩",
  "&hookrightarrow;": "↪",
  "&hopf;": "𝕙",
  "&horbar;": "―",
  "&hscr;": "𝒽",
  "&hslash;": "ℏ",
  "&hstrok;": "ħ",
  "&hybull;": "⁃",
  "&hyphen;": "‐",
  "&iacute": "í",
  "&iacute;": "í",
  "&ic;": "⁣",
  "&icirc": "î",
  "&icirc;": "î",
  "&icy;": "и",
  "&iecy;": "е",
  "&iexcl": "¡",
  "&iexcl;": "¡",
  "&iff;": "⇔",
  "&ifr;": "𝔦",
  "&igrave": "ì",
  "&igrave;": "ì",
  "&ii;": "ⅈ",
  "&iiiint;": "⨌",
  "&iiint;": "∭",
  "&iinfin;": "⧜",
  "&iiota;": "℩",
  "&ijlig;": "ĳ",
  "&imacr;": "ī",
  "&image;": "ℑ",
  "&imagline;": "ℐ",
  "&imagpart;": "ℑ",
  "&imath;": "ı",
  "&imof;": "⊷",
  "&imped;": "Ƶ",
  "&in;": "∈",
  "&incare;": "℅",
  "&infin;": "∞",
  "&infintie;": "⧝",
  "&inodot;": "ı",
  "&int;": "∫",
  "&intcal;": "⊺",
  "&integers;": "ℤ",
  "&intercal;": "⊺",
  "&intlarhk;": "⨗",
  "&intprod;": "⨼",
  "&iocy;": "ё",
  "&iogon;": "į",
  "&iopf;": "𝕚",
  "&iota;": "ι",
  "&iprod;": "⨼",
  "&iquest": "¿",
  "&iquest;": "¿",
  "&iscr;": "𝒾",
  "&isin;": "∈",
  "&isinE;": "⋹",
  "&isindot;": "⋵",
  "&isins;": "⋴",
  "&isinsv;": "⋳",
  "&isinv;": "∈",
  "&it;": "⁢",
  "&itilde;": "ĩ",
  "&iukcy;": "і",
  "&iuml": "ï",
  "&iuml;": "ï",
  "&jcirc;": "ĵ",
  "&jcy;": "й",
  "&jfr;": "𝔧",
  "&jmath;": "ȷ",
  "&jopf;": "𝕛",
  "&jscr;": "𝒿",
  "&jsercy;": "ј",
  "&jukcy;": "є",
  "&kappa;": "κ",
  "&kappav;": "ϰ",
  "&kcedil;": "ķ",
  "&kcy;": "к",
  "&kfr;": "𝔨",
  "&kgreen;": "ĸ",
  "&khcy;": "х",
  "&kjcy;": "ќ",
  "&kopf;": "𝕜",
  "&kscr;": "𝓀",
  "&lAarr;": "⇚",
  "&lArr;": "⇐",
  "&lAtail;": "⤛",
  "&lBarr;": "⤎",
  "&lE;": "≦",
  "&lEg;": "⪋",
  "&lHar;": "⥢",
  "&lacute;": "ĺ",
  "&laemptyv;": "⦴",
  "&lagran;": "ℒ",
  "&lambda;": "λ",
  "&lang;": "⟨",
  "&langd;": "⦑",
  "&langle;": "⟨",
  "&lap;": "⪅",
  "&laquo": "«",
  "&laquo;": "«",
  "&larr;": "←",
  "&larrb;": "⇤",
  "&larrbfs;": "⤟",
  "&larrfs;": "⤝",
  "&larrhk;": "↩",
  "&larrlp;": "↫",
  "&larrpl;": "⤹",
  "&larrsim;": "⥳",
  "&larrtl;": "↢",
  "&lat;": "⪫",
  "&latail;": "⤙",
  "&late;": "⪭",
  "&lates;": "⪭︀",
  "&lbarr;": "⤌",
  "&lbbrk;": "❲",
  "&lbrace;": "{",
  "&lbrack;": "[",
  "&lbrke;": "⦋",
  "&lbrksld;": "⦏",
  "&lbrkslu;": "⦍",
  "&lcaron;": "ľ",
  "&lcedil;": "ļ",
  "&lceil;": "⌈",
  "&lcub;": "{",
  "&lcy;": "л",
  "&ldca;": "⤶",
  "&ldquo;": "“",
  "&ldquor;": "„",
  "&ldrdhar;": "⥧",
  "&ldrushar;": "⥋",
  "&ldsh;": "↲",
  "&le;": "≤",
  "&leftarrow;": "←",
  "&leftarrowtail;": "↢",
  "&leftharpoondown;": "↽",
  "&leftharpoonup;": "↼",
  "&leftleftarrows;": "⇇",
  "&leftrightarrow;": "↔",
  "&leftrightarrows;": "⇆",
  "&leftrightharpoons;": "⇋",
  "&leftrightsquigarrow;": "↭",
  "&leftthreetimes;": "⋋",
  "&leg;": "⋚",
  "&leq;": "≤",
  "&leqq;": "≦",
  "&leqslant;": "⩽",
  "&les;": "⩽",
  "&lescc;": "⪨",
  "&lesdot;": "⩿",
  "&lesdoto;": "⪁",
  "&lesdotor;": "⪃",
  "&lesg;": "⋚︀",
  "&lesges;": "⪓",
  "&lessapprox;": "⪅",
  "&lessdot;": "⋖",
  "&lesseqgtr;": "⋚",
  "&lesseqqgtr;": "⪋",
  "&lessgtr;": "≶",
  "&lesssim;": "≲",
  "&lfisht;": "⥼",
  "&lfloor;": "⌊",
  "&lfr;": "𝔩",
  "&lg;": "≶",
  "&lgE;": "⪑",
  "&lhard;": "↽",
  "&lharu;": "↼",
  "&lharul;": "⥪",
  "&lhblk;": "▄",
  "&ljcy;": "љ",
  "&ll;": "≪",
  "&llarr;": "⇇",
  "&llcorner;": "⌞",
  "&llhard;": "⥫",
  "&lltri;": "◺",
  "&lmidot;": "ŀ",
  "&lmoust;": "⎰",
  "&lmoustache;": "⎰",
  "&lnE;": "≨",
  "&lnap;": "⪉",
  "&lnapprox;": "⪉",
  "&lne;": "⪇",
  "&lneq;": "⪇",
  "&lneqq;": "≨",
  "&lnsim;": "⋦",
  "&loang;": "⟬",
  "&loarr;": "⇽",
  "&lobrk;": "⟦",
  "&longleftarrow;": "⟵",
  "&longleftrightarrow;": "⟷",
  "&longmapsto;": "⟼",
  "&longrightarrow;": "⟶",
  "&looparrowleft;": "↫",
  "&looparrowright;": "↬",
  "&lopar;": "⦅",
  "&lopf;": "𝕝",
  "&loplus;": "⨭",
  "&lotimes;": "⨴",
  "&lowast;": "∗",
  "&lowbar;": "_",
  "&loz;": "◊",
  "&lozenge;": "◊",
  "&lozf;": "⧫",
  "&lpar;": "(",
  "&lparlt;": "⦓",
  "&lrarr;": "⇆",
  "&lrcorner;": "⌟",
  "&lrhar;": "⇋",
  "&lrhard;": "⥭",
  "&lrm;": "‎",
  "&lrtri;": "⊿",
  "&lsaquo;": "‹",
  "&lscr;": "𝓁",
  "&lsh;": "↰",
  "&lsim;": "≲",
  "&lsime;": "⪍",
  "&lsimg;": "⪏",
  "&lsqb;": "[",
  "&lsquo;": "‘",
  "&lsquor;": "‚",
  "&lstrok;": "ł",
  "&lt": "<",
  "&lt;": "<",
  "&ltcc;": "⪦",
  "&ltcir;": "⩹",
  "&ltdot;": "⋖",
  "&lthree;": "⋋",
  "&ltimes;": "⋉",
  "&ltlarr;": "⥶",
  "&ltquest;": "⩻",
  "&ltrPar;": "⦖",
  "&ltri;": "◃",
  "&ltrie;": "⊴",
  "&ltrif;": "◂",
  "&lurdshar;": "⥊",
  "&luruhar;": "⥦",
  "&lvertneqq;": "≨︀",
  "&lvnE;": "≨︀",
  "&mDDot;": "∺",
  "&macr": "¯",
  "&macr;": "¯",
  "&male;": "♂",
  "&malt;": "✠",
  "&maltese;": "✠",
  "&map;": "↦",
  "&mapsto;": "↦",
  "&mapstodown;": "↧",
  "&mapstoleft;": "↤",
  "&mapstoup;": "↥",
  "&marker;": "▮",
  "&mcomma;": "⨩",
  "&mcy;": "м",
  "&mdash;": "—",
  "&measuredangle;": "∡",
  "&mfr;": "𝔪",
  "&mho;": "℧",
  "&micro": "µ",
  "&micro;": "µ",
  "&mid;": "∣",
  "&midast;": "*",
  "&midcir;": "⫰",
  "&middot": "·",
  "&middot;": "·",
  "&minus;": "−",
  "&minusb;": "⊟",
  "&minusd;": "∸",
  "&minusdu;": "⨪",
  "&mlcp;": "⫛",
  "&mldr;": "…",
  "&mnplus;": "∓",
  "&models;": "⊧",
  "&mopf;": "𝕞",
  "&mp;": "∓",
  "&mscr;": "𝓂",
  "&mstpos;": "∾",
  "&mu;": "μ",
  "&multimap;": "⊸",
  "&mumap;": "⊸",
  "&nGg;": "⋙̸",
  "&nGt;": "≫⃒",
  "&nGtv;": "≫̸",
  "&nLeftarrow;": "⇍",
  "&nLeftrightarrow;": "⇎",
  "&nLl;": "⋘̸",
  "&nLt;": "≪⃒",
  "&nLtv;": "≪̸",
  "&nRightarrow;": "⇏",
  "&nVDash;": "⊯",
  "&nVdash;": "⊮",
  "&nabla;": "∇",
  "&nacute;": "ń",
  "&nang;": "∠⃒",
  "&nap;": "≉",
  "&napE;": "⩰̸",
  "&napid;": "≋̸",
  "&napos;": "ŉ",
  "&napprox;": "≉",
  "&natur;": "♮",
  "&natural;": "♮",
  "&naturals;": "ℕ",
  "&nbsp": " ",
  "&nbsp;": " ",
  "&nbump;": "≎̸",
  "&nbumpe;": "≏̸",
  "&ncap;": "⩃",
  "&ncaron;": "ň",
  "&ncedil;": "ņ",
  "&ncong;": "≇",
  "&ncongdot;": "⩭̸",
  "&ncup;": "⩂",
  "&ncy;": "н",
  "&ndash;": "–",
  "&ne;": "≠",
  "&neArr;": "⇗",
  "&nearhk;": "⤤",
  "&nearr;": "↗",
  "&nearrow;": "↗",
  "&nedot;": "≐̸",
  "&nequiv;": "≢",
  "&nesear;": "⤨",
  "&nesim;": "≂̸",
  "&nexist;": "∄",
  "&nexists;": "∄",
  "&nfr;": "𝔫",
  "&ngE;": "≧̸",
  "&nge;": "≱",
  "&ngeq;": "≱",
  "&ngeqq;": "≧̸",
  "&ngeqslant;": "⩾̸",
  "&nges;": "⩾̸",
  "&ngsim;": "≵",
  "&ngt;": "≯",
  "&ngtr;": "≯",
  "&nhArr;": "⇎",
  "&nharr;": "↮",
  "&nhpar;": "⫲",
  "&ni;": "∋",
  "&nis;": "⋼",
  "&nisd;": "⋺",
  "&niv;": "∋",
  "&njcy;": "њ",
  "&nlArr;": "⇍",
  "&nlE;": "≦̸",
  "&nlarr;": "↚",
  "&nldr;": "‥",
  "&nle;": "≰",
  "&nleftarrow;": "↚",
  "&nleftrightarrow;": "↮",
  "&nleq;": "≰",
  "&nleqq;": "≦̸",
  "&nleqslant;": "⩽̸",
  "&nles;": "⩽̸",
  "&nless;": "≮",
  "&nlsim;": "≴",
  "&nlt;": "≮",
  "&nltri;": "⋪",
  "&nltrie;": "⋬",
  "&nmid;": "∤",
  "&nopf;": "𝕟",
  "&not": "¬",
  "&not;": "¬",
  "&notin;": "∉",
  "&notinE;": "⋹̸",
  "&notindot;": "⋵̸",
  "&notinva;": "∉",
  "&notinvb;": "⋷",
  "&notinvc;": "⋶",
  "&notni;": "∌",
  "&notniva;": "∌",
  "&notnivb;": "⋾",
  "&notnivc;": "⋽",
  "&npar;": "∦",
  "&nparallel;": "∦",
  "&nparsl;": "⫽⃥",
  "&npart;": "∂̸",
  "&npolint;": "⨔",
  "&npr;": "⊀",
  "&nprcue;": "⋠",
  "&npre;": "⪯̸",
  "&nprec;": "⊀",
  "&npreceq;": "⪯̸",
  "&nrArr;": "⇏",
  "&nrarr;": "↛",
  "&nrarrc;": "⤳̸",
  "&nrarrw;": "↝̸",
  "&nrightarrow;": "↛",
  "&nrtri;": "⋫",
  "&nrtrie;": "⋭",
  "&nsc;": "⊁",
  "&nsccue;": "⋡",
  "&nsce;": "⪰̸",
  "&nscr;": "𝓃",
  "&nshortmid;": "∤",
  "&nshortparallel;": "∦",
  "&nsim;": "≁",
  "&nsime;": "≄",
  "&nsimeq;": "≄",
  "&nsmid;": "∤",
  "&nspar;": "∦",
  "&nsqsube;": "⋢",
  "&nsqsupe;": "⋣",
  "&nsub;": "⊄",
  "&nsubE;": "⫅̸",
  "&nsube;": "⊈",
  "&nsubset;": "⊂⃒",
  "&nsubseteq;": "⊈",
  "&nsubseteqq;": "⫅̸",
  "&nsucc;": "⊁",
  "&nsucceq;": "⪰̸",
  "&nsup;": "⊅",
  "&nsupE;": "⫆̸",
  "&nsupe;": "⊉",
  "&nsupset;": "⊃⃒",
  "&nsupseteq;": "⊉",
  "&nsupseteqq;": "⫆̸",
  "&ntgl;": "≹",
  "&ntilde": "ñ",
  "&ntilde;": "ñ",
  "&ntlg;": "≸",
  "&ntriangleleft;": "⋪",
  "&ntrianglelefteq;": "⋬",
  "&ntriangleright;": "⋫",
  "&ntrianglerighteq;": "⋭",
  "&nu;": "ν",
  "&num;": "#",
  "&numero;": "№",
  "&numsp;": " ",
  "&nvDash;": "⊭",
  "&nvHarr;": "⤄",
  "&nvap;": "≍⃒",
  "&nvdash;": "⊬",
  "&nvge;": "≥⃒",
  "&nvgt;": ">⃒",
  "&nvinfin;": "⧞",
  "&nvlArr;": "⤂",
  "&nvle;": "≤⃒",
  "&nvlt;": "<⃒",
  "&nvltrie;": "⊴⃒",
  "&nvrArr;": "⤃",
  "&nvrtrie;": "⊵⃒",
  "&nvsim;": "∼⃒",
  "&nwArr;": "⇖",
  "&nwarhk;": "⤣",
  "&nwarr;": "↖",
  "&nwarrow;": "↖",
  "&nwnear;": "⤧",
  "&oS;": "Ⓢ",
  "&oacute": "ó",
  "&oacute;": "ó",
  "&oast;": "⊛",
  "&ocir;": "⊚",
  "&ocirc": "ô",
  "&ocirc;": "ô",
  "&ocy;": "о",
  "&odash;": "⊝",
  "&odblac;": "ő",
  "&odiv;": "⨸",
  "&odot;": "⊙",
  "&odsold;": "⦼",
  "&oelig;": "œ",
  "&ofcir;": "⦿",
  "&ofr;": "𝔬",
  "&ogon;": "˛",
  "&ograve": "ò",
  "&ograve;": "ò",
  "&ogt;": "⧁",
  "&ohbar;": "⦵",
  "&ohm;": "Ω",
  "&oint;": "∮",
  "&olarr;": "↺",
  "&olcir;": "⦾",
  "&olcross;": "⦻",
  "&oline;": "‾",
  "&olt;": "⧀",
  "&omacr;": "ō",
  "&omega;": "ω",
  "&omicron;": "ο",
  "&omid;": "⦶",
  "&ominus;": "⊖",
  "&oopf;": "𝕠",
  "&opar;": "⦷",
  "&operp;": "⦹",
  "&oplus;": "⊕",
  "&or;": "∨",
  "&orarr;": "↻",
  "&ord;": "⩝",
  "&order;": "ℴ",
  "&orderof;": "ℴ",
  "&ordf": "ª",
  "&ordf;": "ª",
  "&ordm": "º",
  "&ordm;": "º",
  "&origof;": "⊶",
  "&oror;": "⩖",
  "&orslope;": "⩗",
  "&orv;": "⩛",
  "&oscr;": "ℴ",
  "&oslash": "ø",
  "&oslash;": "ø",
  "&osol;": "⊘",
  "&otilde": "õ",
  "&otilde;": "õ",
  "&otimes;": "⊗",
  "&otimesas;": "⨶",
  "&ouml": "ö",
  "&ouml;": "ö",
  "&ovbar;": "⌽",
  "&par;": "∥",
  "&para": "¶",
  "&para;": "¶",
  "&parallel;": "∥",
  "&parsim;": "⫳",
  "&parsl;": "⫽",
  "&part;": "∂",
  "&pcy;": "п",
  "&percnt;": "%",
  "&period;": ".",
  "&permil;": "‰",
  "&perp;": "⊥",
  "&pertenk;": "‱",
  "&pfr;": "𝔭",
  "&phi;": "φ",
  "&phiv;": "ϕ",
  "&phmmat;": "ℳ",
  "&phone;": "☎",
  "&pi;": "π",
  "&pitchfork;": "⋔",
  "&piv;": "ϖ",
  "&planck;": "ℏ",
  "&planckh;": "ℎ",
  "&plankv;": "ℏ",
  "&plus;": "+",
  "&plusacir;": "⨣",
  "&plusb;": "⊞",
  "&pluscir;": "⨢",
  "&plusdo;": "∔",
  "&plusdu;": "⨥",
  "&pluse;": "⩲",
  "&plusmn": "±",
  "&plusmn;": "±",
  "&plussim;": "⨦",
  "&plustwo;": "⨧",
  "&pm;": "±",
  "&pointint;": "⨕",
  "&popf;": "𝕡",
  "&pound": "£",
  "&pound;": "£",
  "&pr;": "≺",
  "&prE;": "⪳",
  "&prap;": "⪷",
  "&prcue;": "≼",
  "&pre;": "⪯",
  "&prec;": "≺",
  "&precapprox;": "⪷",
  "&preccurlyeq;": "≼",
  "&preceq;": "⪯",
  "&precnapprox;": "⪹",
  "&precneqq;": "⪵",
  "&precnsim;": "⋨",
  "&precsim;": "≾",
  "&prime;": "′",
  "&primes;": "ℙ",
  "&prnE;": "⪵",
  "&prnap;": "⪹",
  "&prnsim;": "⋨",
  "&prod;": "∏",
  "&profalar;": "⌮",
  "&profline;": "⌒",
  "&profsurf;": "⌓",
  "&prop;": "∝",
  "&propto;": "∝",
  "&prsim;": "≾",
  "&prurel;": "⊰",
  "&pscr;": "𝓅",
  "&psi;": "ψ",
  "&puncsp;": " ",
  "&qfr;": "𝔮",
  "&qint;": "⨌",
  "&qopf;": "𝕢",
  "&qprime;": "⁗",
  "&qscr;": "𝓆",
  "&quaternions;": "ℍ",
  "&quatint;": "⨖",
  "&quest;": "?",
  "&questeq;": "≟",
  "&quot": '"',
  "&quot;": '"',
  "&rAarr;": "⇛",
  "&rArr;": "⇒",
  "&rAtail;": "⤜",
  "&rBarr;": "⤏",
  "&rHar;": "⥤",
  "&race;": "∽̱",
  "&racute;": "ŕ",
  "&radic;": "√",
  "&raemptyv;": "⦳",
  "&rang;": "⟩",
  "&rangd;": "⦒",
  "&range;": "⦥",
  "&rangle;": "⟩",
  "&raquo": "»",
  "&raquo;": "»",
  "&rarr;": "→",
  "&rarrap;": "⥵",
  "&rarrb;": "⇥",
  "&rarrbfs;": "⤠",
  "&rarrc;": "⤳",
  "&rarrfs;": "⤞",
  "&rarrhk;": "↪",
  "&rarrlp;": "↬",
  "&rarrpl;": "⥅",
  "&rarrsim;": "⥴",
  "&rarrtl;": "↣",
  "&rarrw;": "↝",
  "&ratail;": "⤚",
  "&ratio;": "∶",
  "&rationals;": "ℚ",
  "&rbarr;": "⤍",
  "&rbbrk;": "❳",
  "&rbrace;": "}",
  "&rbrack;": "]",
  "&rbrke;": "⦌",
  "&rbrksld;": "⦎",
  "&rbrkslu;": "⦐",
  "&rcaron;": "ř",
  "&rcedil;": "ŗ",
  "&rceil;": "⌉",
  "&rcub;": "}",
  "&rcy;": "р",
  "&rdca;": "⤷",
  "&rdldhar;": "⥩",
  "&rdquo;": "”",
  "&rdquor;": "”",
  "&rdsh;": "↳",
  "&real;": "ℜ",
  "&realine;": "ℛ",
  "&realpart;": "ℜ",
  "&reals;": "ℝ",
  "&rect;": "▭",
  "&reg": "®",
  "&reg;": "®",
  "&rfisht;": "⥽",
  "&rfloor;": "⌋",
  "&rfr;": "𝔯",
  "&rhard;": "⇁",
  "&rharu;": "⇀",
  "&rharul;": "⥬",
  "&rho;": "ρ",
  "&rhov;": "ϱ",
  "&rightarrow;": "→",
  "&rightarrowtail;": "↣",
  "&rightharpoondown;": "⇁",
  "&rightharpoonup;": "⇀",
  "&rightleftarrows;": "⇄",
  "&rightleftharpoons;": "⇌",
  "&rightrightarrows;": "⇉",
  "&rightsquigarrow;": "↝",
  "&rightthreetimes;": "⋌",
  "&ring;": "˚",
  "&risingdotseq;": "≓",
  "&rlarr;": "⇄",
  "&rlhar;": "⇌",
  "&rlm;": "‏",
  "&rmoust;": "⎱",
  "&rmoustache;": "⎱",
  "&rnmid;": "⫮",
  "&roang;": "⟭",
  "&roarr;": "⇾",
  "&robrk;": "⟧",
  "&ropar;": "⦆",
  "&ropf;": "𝕣",
  "&roplus;": "⨮",
  "&rotimes;": "⨵",
  "&rpar;": ")",
  "&rpargt;": "⦔",
  "&rppolint;": "⨒",
  "&rrarr;": "⇉",
  "&rsaquo;": "›",
  "&rscr;": "𝓇",
  "&rsh;": "↱",
  "&rsqb;": "]",
  "&rsquo;": "’",
  "&rsquor;": "’",
  "&rthree;": "⋌",
  "&rtimes;": "⋊",
  "&rtri;": "▹",
  "&rtrie;": "⊵",
  "&rtrif;": "▸",
  "&rtriltri;": "⧎",
  "&ruluhar;": "⥨",
  "&rx;": "℞",
  "&sacute;": "ś",
  "&sbquo;": "‚",
  "&sc;": "≻",
  "&scE;": "⪴",
  "&scap;": "⪸",
  "&scaron;": "š",
  "&sccue;": "≽",
  "&sce;": "⪰",
  "&scedil;": "ş",
  "&scirc;": "ŝ",
  "&scnE;": "⪶",
  "&scnap;": "⪺",
  "&scnsim;": "⋩",
  "&scpolint;": "⨓",
  "&scsim;": "≿",
  "&scy;": "с",
  "&sdot;": "⋅",
  "&sdotb;": "⊡",
  "&sdote;": "⩦",
  "&seArr;": "⇘",
  "&searhk;": "⤥",
  "&searr;": "↘",
  "&searrow;": "↘",
  "&sect": "§",
  "&sect;": "§",
  "&semi;": ";",
  "&seswar;": "⤩",
  "&setminus;": "∖",
  "&setmn;": "∖",
  "&sext;": "✶",
  "&sfr;": "𝔰",
  "&sfrown;": "⌢",
  "&sharp;": "♯",
  "&shchcy;": "щ",
  "&shcy;": "ш",
  "&shortmid;": "∣",
  "&shortparallel;": "∥",
  "&shy": "­",
  "&shy;": "­",
  "&sigma;": "σ",
  "&sigmaf;": "ς",
  "&sigmav;": "ς",
  "&sim;": "∼",
  "&simdot;": "⩪",
  "&sime;": "≃",
  "&simeq;": "≃",
  "&simg;": "⪞",
  "&simgE;": "⪠",
  "&siml;": "⪝",
  "&simlE;": "⪟",
  "&simne;": "≆",
  "&simplus;": "⨤",
  "&simrarr;": "⥲",
  "&slarr;": "←",
  "&smallsetminus;": "∖",
  "&smashp;": "⨳",
  "&smeparsl;": "⧤",
  "&smid;": "∣",
  "&smile;": "⌣",
  "&smt;": "⪪",
  "&smte;": "⪬",
  "&smtes;": "⪬︀",
  "&softcy;": "ь",
  "&sol;": "/",
  "&solb;": "⧄",
  "&solbar;": "⌿",
  "&sopf;": "𝕤",
  "&spades;": "♠",
  "&spadesuit;": "♠",
  "&spar;": "∥",
  "&sqcap;": "⊓",
  "&sqcaps;": "⊓︀",
  "&sqcup;": "⊔",
  "&sqcups;": "⊔︀",
  "&sqsub;": "⊏",
  "&sqsube;": "⊑",
  "&sqsubset;": "⊏",
  "&sqsubseteq;": "⊑",
  "&sqsup;": "⊐",
  "&sqsupe;": "⊒",
  "&sqsupset;": "⊐",
  "&sqsupseteq;": "⊒",
  "&squ;": "□",
  "&square;": "□",
  "&squarf;": "▪",
  "&squf;": "▪",
  "&srarr;": "→",
  "&sscr;": "𝓈",
  "&ssetmn;": "∖",
  "&ssmile;": "⌣",
  "&sstarf;": "⋆",
  "&star;": "☆",
  "&starf;": "★",
  "&straightepsilon;": "ϵ",
  "&straightphi;": "ϕ",
  "&strns;": "¯",
  "&sub;": "⊂",
  "&subE;": "⫅",
  "&subdot;": "⪽",
  "&sube;": "⊆",
  "&subedot;": "⫃",
  "&submult;": "⫁",
  "&subnE;": "⫋",
  "&subne;": "⊊",
  "&subplus;": "⪿",
  "&subrarr;": "⥹",
  "&subset;": "⊂",
  "&subseteq;": "⊆",
  "&subseteqq;": "⫅",
  "&subsetneq;": "⊊",
  "&subsetneqq;": "⫋",
  "&subsim;": "⫇",
  "&subsub;": "⫕",
  "&subsup;": "⫓",
  "&succ;": "≻",
  "&succapprox;": "⪸",
  "&succcurlyeq;": "≽",
  "&succeq;": "⪰",
  "&succnapprox;": "⪺",
  "&succneqq;": "⪶",
  "&succnsim;": "⋩",
  "&succsim;": "≿",
  "&sum;": "∑",
  "&sung;": "♪",
  "&sup1": "¹",
  "&sup1;": "¹",
  "&sup2": "²",
  "&sup2;": "²",
  "&sup3": "³",
  "&sup3;": "³",
  "&sup;": "⊃",
  "&supE;": "⫆",
  "&supdot;": "⪾",
  "&supdsub;": "⫘",
  "&supe;": "⊇",
  "&supedot;": "⫄",
  "&suphsol;": "⟉",
  "&suphsub;": "⫗",
  "&suplarr;": "⥻",
  "&supmult;": "⫂",
  "&supnE;": "⫌",
  "&supne;": "⊋",
  "&supplus;": "⫀",
  "&supset;": "⊃",
  "&supseteq;": "⊇",
  "&supseteqq;": "⫆",
  "&supsetneq;": "⊋",
  "&supsetneqq;": "⫌",
  "&supsim;": "⫈",
  "&supsub;": "⫔",
  "&supsup;": "⫖",
  "&swArr;": "⇙",
  "&swarhk;": "⤦",
  "&swarr;": "↙",
  "&swarrow;": "↙",
  "&swnwar;": "⤪",
  "&szlig": "ß",
  "&szlig;": "ß",
  "&target;": "⌖",
  "&tau;": "τ",
  "&tbrk;": "⎴",
  "&tcaron;": "ť",
  "&tcedil;": "ţ",
  "&tcy;": "т",
  "&tdot;": "⃛",
  "&telrec;": "⌕",
  "&tfr;": "𝔱",
  "&there4;": "∴",
  "&therefore;": "∴",
  "&theta;": "θ",
  "&thetasym;": "ϑ",
  "&thetav;": "ϑ",
  "&thickapprox;": "≈",
  "&thicksim;": "∼",
  "&thinsp;": " ",
  "&thkap;": "≈",
  "&thksim;": "∼",
  "&thorn": "þ",
  "&thorn;": "þ",
  "&tilde;": "˜",
  "&times": "×",
  "&times;": "×",
  "&timesb;": "⊠",
  "&timesbar;": "⨱",
  "&timesd;": "⨰",
  "&tint;": "∭",
  "&toea;": "⤨",
  "&top;": "⊤",
  "&topbot;": "⌶",
  "&topcir;": "⫱",
  "&topf;": "𝕥",
  "&topfork;": "⫚",
  "&tosa;": "⤩",
  "&tprime;": "‴",
  "&trade;": "™",
  "&triangle;": "▵",
  "&triangledown;": "▿",
  "&triangleleft;": "◃",
  "&trianglelefteq;": "⊴",
  "&triangleq;": "≜",
  "&triangleright;": "▹",
  "&trianglerighteq;": "⊵",
  "&tridot;": "◬",
  "&trie;": "≜",
  "&triminus;": "⨺",
  "&triplus;": "⨹",
  "&trisb;": "⧍",
  "&tritime;": "⨻",
  "&trpezium;": "⏢",
  "&tscr;": "𝓉",
  "&tscy;": "ц",
  "&tshcy;": "ћ",
  "&tstrok;": "ŧ",
  "&twixt;": "≬",
  "&twoheadleftarrow;": "↞",
  "&twoheadrightarrow;": "↠",
  "&uArr;": "⇑",
  "&uHar;": "⥣",
  "&uacute": "ú",
  "&uacute;": "ú",
  "&uarr;": "↑",
  "&ubrcy;": "ў",
  "&ubreve;": "ŭ",
  "&ucirc": "û",
  "&ucirc;": "û",
  "&ucy;": "у",
  "&udarr;": "⇅",
  "&udblac;": "ű",
  "&udhar;": "⥮",
  "&ufisht;": "⥾",
  "&ufr;": "𝔲",
  "&ugrave": "ù",
  "&ugrave;": "ù",
  "&uharl;": "↿",
  "&uharr;": "↾",
  "&uhblk;": "▀",
  "&ulcorn;": "⌜",
  "&ulcorner;": "⌜",
  "&ulcrop;": "⌏",
  "&ultri;": "◸",
  "&umacr;": "ū",
  "&uml": "¨",
  "&uml;": "¨",
  "&uogon;": "ų",
  "&uopf;": "𝕦",
  "&uparrow;": "↑",
  "&updownarrow;": "↕",
  "&upharpoonleft;": "↿",
  "&upharpoonright;": "↾",
  "&uplus;": "⊎",
  "&upsi;": "υ",
  "&upsih;": "ϒ",
  "&upsilon;": "υ",
  "&upuparrows;": "⇈",
  "&urcorn;": "⌝",
  "&urcorner;": "⌝",
  "&urcrop;": "⌎",
  "&uring;": "ů",
  "&urtri;": "◹",
  "&uscr;": "𝓊",
  "&utdot;": "⋰",
  "&utilde;": "ũ",
  "&utri;": "▵",
  "&utrif;": "▴",
  "&uuarr;": "⇈",
  "&uuml": "ü",
  "&uuml;": "ü",
  "&uwangle;": "⦧",
  "&vArr;": "⇕",
  "&vBar;": "⫨",
  "&vBarv;": "⫩",
  "&vDash;": "⊨",
  "&vangrt;": "⦜",
  "&varepsilon;": "ϵ",
  "&varkappa;": "ϰ",
  "&varnothing;": "∅",
  "&varphi;": "ϕ",
  "&varpi;": "ϖ",
  "&varpropto;": "∝",
  "&varr;": "↕",
  "&varrho;": "ϱ",
  "&varsigma;": "ς",
  "&varsubsetneq;": "⊊︀",
  "&varsubsetneqq;": "⫋︀",
  "&varsupsetneq;": "⊋︀",
  "&varsupsetneqq;": "⫌︀",
  "&vartheta;": "ϑ",
  "&vartriangleleft;": "⊲",
  "&vartriangleright;": "⊳",
  "&vcy;": "в",
  "&vdash;": "⊢",
  "&vee;": "∨",
  "&veebar;": "⊻",
  "&veeeq;": "≚",
  "&vellip;": "⋮",
  "&verbar;": "|",
  "&vert;": "|",
  "&vfr;": "𝔳",
  "&vltri;": "⊲",
  "&vnsub;": "⊂⃒",
  "&vnsup;": "⊃⃒",
  "&vopf;": "𝕧",
  "&vprop;": "∝",
  "&vrtri;": "⊳",
  "&vscr;": "𝓋",
  "&vsubnE;": "⫋︀",
  "&vsubne;": "⊊︀",
  "&vsupnE;": "⫌︀",
  "&vsupne;": "⊋︀",
  "&vzigzag;": "⦚",
  "&wcirc;": "ŵ",
  "&wedbar;": "⩟",
  "&wedge;": "∧",
  "&wedgeq;": "≙",
  "&weierp;": "℘",
  "&wfr;": "𝔴",
  "&wopf;": "𝕨",
  "&wp;": "℘",
  "&wr;": "≀",
  "&wreath;": "≀",
  "&wscr;": "𝓌",
  "&xcap;": "⋂",
  "&xcirc;": "◯",
  "&xcup;": "⋃",
  "&xdtri;": "▽",
  "&xfr;": "𝔵",
  "&xhArr;": "⟺",
  "&xharr;": "⟷",
  "&xi;": "ξ",
  "&xlArr;": "⟸",
  "&xlarr;": "⟵",
  "&xmap;": "⟼",
  "&xnis;": "⋻",
  "&xodot;": "⨀",
  "&xopf;": "𝕩",
  "&xoplus;": "⨁",
  "&xotime;": "⨂",
  "&xrArr;": "⟹",
  "&xrarr;": "⟶",
  "&xscr;": "𝓍",
  "&xsqcup;": "⨆",
  "&xuplus;": "⨄",
  "&xutri;": "△",
  "&xvee;": "⋁",
  "&xwedge;": "⋀",
  "&yacute": "ý",
  "&yacute;": "ý",
  "&yacy;": "я",
  "&ycirc;": "ŷ",
  "&ycy;": "ы",
  "&yen": "¥",
  "&yen;": "¥",
  "&yfr;": "𝔶",
  "&yicy;": "ї",
  "&yopf;": "𝕪",
  "&yscr;": "𝓎",
  "&yucy;": "ю",
  "&yuml": "ÿ",
  "&yuml;": "ÿ",
  "&zacute;": "ź",
  "&zcaron;": "ž",
  "&zcy;": "з",
  "&zdot;": "ż",
  "&zeetrf;": "ℨ",
  "&zeta;": "ζ",
  "&zfr;": "𝔷",
  "&zhcy;": "ж",
  "&zigrarr;": "⇝",
  "&zopf;": "𝕫",
  "&zscr;": "𝓏",
  "&zwj;": "‍",
  "&zwnj;": "‌"
};
var html_entities_default = htmlEntities;

// node_modules/postal-mime/src/text-format.js
function decodeHTMLEntities(str) {
  return str.replace(/&(#\d+|#x[a-f0-9]+|[a-z]+\d*);?/gi, (match, entity) => {
    if (typeof html_entities_default[match] === "string") {
      return html_entities_default[match];
    }
    if (entity.charAt(0) !== "#" || match.charAt(match.length - 1) !== ";") {
      return match;
    }
    let codePoint;
    if (entity.charAt(1) === "x") {
      codePoint = parseInt(entity.substr(2), 16);
    } else {
      codePoint = parseInt(entity.substr(1), 10);
    }
    var output = "";
    if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
      return "�";
    }
    if (codePoint > 65535) {
      codePoint -= 65536;
      output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    output += String.fromCharCode(codePoint);
    return output;
  });
}
function escapeHtml(str) {
  return str.trim().replace(/[<>"'?&]/g, (c) => {
    let hex = c.charCodeAt(0).toString(16);
    if (hex.length < 2) {
      hex = "0" + hex;
    }
    return "&#x" + hex.toUpperCase() + ";";
  });
}
function textToHtml(str) {
  let html = escapeHtml(str).replace(/\n/g, "<br />");
  return "<div>" + html + "</div>";
}
function htmlToText(str) {
  str = str.replace(/\r?\n/g, "").replace(/<\!\-\-.*?\-\->/gi, " ").replace(/<br\b[^>]*>/gi, "\n").replace(/<\/?(p|div|table|tr|td|th)\b[^>]*>/gi, "\n\n").replace(/<script\b[^>]*>.*?<\/script\b[^>]*>/gi, " ").replace(/^.*<body\b[^>]*>/i, "").replace(/^.*<\/head\b[^>]*>/i, "").replace(/^.*<\!doctype\b[^>]*>/i, "").replace(/<\/body\b[^>]*>.*$/i, "").replace(/<\/html\b[^>]*>.*$/i, "").replace(/<a\b[^>]*href\s*=\s*["']?([^\s"']+)[^>]*>/gi, " ($1) ").replace(/<\/?(span|em|i|strong|b|u|a)\b[^>]*>/gi, "").replace(/<li\b[^>]*>[\n\u0001\s]*/gi, "* ").replace(/<hr\b[^>]*>/g, "\n-------------\n").replace(/<[^>]*>/g, " ").replace(/\u0001/g, "\n").replace(/[ \t]+/g, " ").replace(/^\s+$/gm, "").replace(/\n\n+/g, "\n\n").replace(/^\n+/, "\n").replace(/\n+$/, "\n");
  str = decodeHTMLEntities(str);
  return str;
}
function formatTextAddress(address) {
  return [].concat(address.name || []).concat(address.name ? `<${address.address}>` : address.address).join(" ");
}
function formatTextAddresses(addresses) {
  let parts = [];
  let processAddress = (address, partCounter) => {
    if (partCounter) {
      parts.push(", ");
    }
    if (address.group) {
      let groupStart = `${address.name}:`;
      let groupEnd = `;`;
      parts.push(groupStart);
      address.group.forEach(processAddress);
      parts.push(groupEnd);
    } else {
      parts.push(formatTextAddress(address));
    }
  };
  addresses.forEach(processAddress);
  return parts.join("");
}
function formatHtmlAddress(address) {
  return `<a href="mailto:${escapeHtml(address.address)}" class="postal-email-address">${escapeHtml(address.name || `<${address.address}>`)}</a>`;
}
function formatHtmlAddresses(addresses) {
  let parts = [];
  let processAddress = (address, partCounter) => {
    if (partCounter) {
      parts.push('<span class="postal-email-address-separator">, </span>');
    }
    if (address.group) {
      let groupStart = `<span class="postal-email-address-group">${escapeHtml(address.name)}:</span>`;
      let groupEnd = `<span class="postal-email-address-group">;</span>`;
      parts.push(groupStart);
      address.group.forEach(processAddress);
      parts.push(groupEnd);
    } else {
      parts.push(formatHtmlAddress(address));
    }
  };
  addresses.forEach(processAddress);
  return parts.join(" ");
}
function foldLines(str, lineLength, afterSpace) {
  str = (str || "").toString();
  lineLength = lineLength || 76;
  let pos = 0, len = str.length, result = "", line, match;
  while (pos < len) {
    line = str.substr(pos, lineLength);
    if (line.length < lineLength) {
      result += line;
      break;
    }
    if (match = line.match(/^[^\n\r]*(\r?\n|\r)/)) {
      line = match[0];
      result += line;
      pos += line.length;
      continue;
    } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || "").length : 0) < line.length) {
      line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || "").length : 0)));
    } else if (match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/)) {
      line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
    }
    result += line;
    pos += line.length;
    if (pos < len) {
      result += "\r\n";
    }
  }
  return result;
}
function formatTextHeader(message) {
  let rows = [];
  if (message.from) {
    rows.push({ key: "From", val: formatTextAddress(message.from) });
  }
  if (message.subject) {
    rows.push({ key: "Subject", val: message.subject });
  }
  if (message.date) {
    let dateOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    };
    let dateStr = typeof Intl === "undefined" ? message.date : new Intl.DateTimeFormat("default", dateOptions).format(new Date(message.date));
    rows.push({ key: "Date", val: dateStr });
  }
  if (message.to && message.to.length) {
    rows.push({ key: "To", val: formatTextAddresses(message.to) });
  }
  if (message.cc && message.cc.length) {
    rows.push({ key: "Cc", val: formatTextAddresses(message.cc) });
  }
  if (message.bcc && message.bcc.length) {
    rows.push({ key: "Bcc", val: formatTextAddresses(message.bcc) });
  }
  let maxKeyLength = rows.map((r) => r.key.length).reduce((acc, cur) => {
    return cur > acc ? cur : acc;
  }, 0);
  rows = rows.flatMap((row) => {
    let sepLen = maxKeyLength - row.key.length;
    let prefix = `${row.key}: ${" ".repeat(sepLen)}`;
    let emptyPrefix = `${" ".repeat(row.key.length + 1)} ${" ".repeat(sepLen)}`;
    let foldedLines = foldLines(row.val, 80, true).split(/\r?\n/).map((line) => line.trim());
    return foldedLines.map((line, i) => `${i ? emptyPrefix : prefix}${line}`);
  });
  let maxLineLength = rows.map((r) => r.length).reduce((acc, cur) => {
    return cur > acc ? cur : acc;
  }, 0);
  let lineMarker = "-".repeat(maxLineLength);
  let template = `
${lineMarker}
${rows.join("\n")}
${lineMarker}
`;
  return template;
}
function formatHtmlHeader(message) {
  let rows = [];
  if (message.from) {
    rows.push(`<div class="postal-email-header-key">From</div><div class="postal-email-header-value">${formatHtmlAddress(message.from)}</div>`);
  }
  if (message.subject) {
    rows.push(
      `<div class="postal-email-header-key">Subject</div><div class="postal-email-header-value postal-email-header-subject">${escapeHtml(
        message.subject
      )}</div>`
    );
  }
  if (message.date) {
    let dateOptions = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    };
    let dateStr = typeof Intl === "undefined" ? message.date : new Intl.DateTimeFormat("default", dateOptions).format(new Date(message.date));
    rows.push(
      `<div class="postal-email-header-key">Date</div><div class="postal-email-header-value postal-email-header-date" data-date="${escapeHtml(
        message.date
      )}">${escapeHtml(dateStr)}</div>`
    );
  }
  if (message.to && message.to.length) {
    rows.push(`<div class="postal-email-header-key">To</div><div class="postal-email-header-value">${formatHtmlAddresses(message.to)}</div>`);
  }
  if (message.cc && message.cc.length) {
    rows.push(`<div class="postal-email-header-key">Cc</div><div class="postal-email-header-value">${formatHtmlAddresses(message.cc)}</div>`);
  }
  if (message.bcc && message.bcc.length) {
    rows.push(`<div class="postal-email-header-key">Bcc</div><div class="postal-email-header-value">${formatHtmlAddresses(message.bcc)}</div>`);
  }
  let template = `<div class="postal-email-header">${rows.length ? '<div class="postal-email-header-row">' : ""}${rows.join(
    '</div>\n<div class="postal-email-header-row">'
  )}${rows.length ? "</div>" : ""}</div>`;
  return template;
}

// node_modules/postal-mime/src/address-parser.js
function _handleAddress(tokens) {
  let token;
  let isGroup = false;
  let state = "text";
  let address;
  let addresses = [];
  let data = {
    address: [],
    comment: [],
    group: [],
    text: []
  };
  let i;
  let len;
  for (i = 0, len = tokens.length; i < len; i++) {
    token = tokens[i];
    if (token.type === "operator") {
      switch (token.value) {
        case "<":
          state = "address";
          break;
        case "(":
          state = "comment";
          break;
        case ":":
          state = "group";
          isGroup = true;
          break;
        default:
          state = "text";
      }
    } else if (token.value) {
      if (state === "address") {
        token.value = token.value.replace(/^[^<]*<\s*/, "");
      }
      data[state].push(token.value);
    }
  }
  if (!data.text.length && data.comment.length) {
    data.text = data.comment;
    data.comment = [];
  }
  if (isGroup) {
    data.text = data.text.join(" ");
    addresses.push({
      name: decodeWords(data.text || address && address.name),
      group: data.group.length ? addressParser(data.group.join(",")) : []
    });
  } else {
    if (!data.address.length && data.text.length) {
      for (i = data.text.length - 1; i >= 0; i--) {
        if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
          data.address = data.text.splice(i, 1);
          break;
        }
      }
      let _regexHandler = function(address2) {
        if (!data.address.length) {
          data.address = [address2.trim()];
          return " ";
        } else {
          return address2;
        }
      };
      if (!data.address.length) {
        for (i = data.text.length - 1; i >= 0; i--) {
          data.text[i] = data.text[i].replace(/\s*\b[^@\s]+@[^\s]+\b\s*/, _regexHandler).trim();
          if (data.address.length) {
            break;
          }
        }
      }
    }
    if (!data.text.length && data.comment.length) {
      data.text = data.comment;
      data.comment = [];
    }
    if (data.address.length > 1) {
      data.text = data.text.concat(data.address.splice(1));
    }
    data.text = data.text.join(" ");
    data.address = data.address.join(" ");
    if (!data.address && /^=\?[^=]+?=$/.test(data.text.trim())) {
      const parsedSubAddresses = addressParser(decodeWords(data.text));
      if (parsedSubAddresses && parsedSubAddresses.length) {
        return parsedSubAddresses;
      }
    }
    if (!data.address && isGroup) {
      return [];
    } else {
      address = {
        address: data.address || data.text || "",
        name: decodeWords(data.text || data.address || "")
      };
      if (address.address === address.name) {
        if ((address.address || "").match(/@/)) {
          address.name = "";
        } else {
          address.address = "";
        }
      }
      addresses.push(address);
    }
  }
  return addresses;
}
var Tokenizer = class {
  constructor(str) {
    this.str = (str || "").toString();
    this.operatorCurrent = "";
    this.operatorExpecting = "";
    this.node = null;
    this.escaped = false;
    this.list = [];
    this.operators = {
      '"': '"',
      "(": ")",
      "<": ">",
      ",": "",
      ":": ";",
      // Semicolons are not a legal delimiter per the RFC2822 grammar other
      // than for terminating a group, but they are also not valid for any
      // other use in this context.  Given that some mail clients have
      // historically allowed the semicolon as a delimiter equivalent to the
      // comma in their UI, it makes sense to treat them the same as a comma
      // when used outside of a group.
      ";": ""
    };
  }
  /**
   * Tokenizes the original input string
   *
   * @return {Array} An array of operator|text tokens
   */
  tokenize() {
    let chr, list = [];
    for (let i = 0, len = this.str.length; i < len; i++) {
      chr = this.str.charAt(i);
      this.checkChar(chr);
    }
    this.list.forEach((node) => {
      node.value = (node.value || "").toString().trim();
      if (node.value) {
        list.push(node);
      }
    });
    return list;
  }
  /**
   * Checks if a character is an operator or text and acts accordingly
   *
   * @param {String} chr Character from the address field
   */
  checkChar(chr) {
    if (this.escaped) {
    } else if (chr === this.operatorExpecting) {
      this.node = {
        type: "operator",
        value: chr
      };
      this.list.push(this.node);
      this.node = null;
      this.operatorExpecting = "";
      this.escaped = false;
      return;
    } else if (!this.operatorExpecting && chr in this.operators) {
      this.node = {
        type: "operator",
        value: chr
      };
      this.list.push(this.node);
      this.node = null;
      this.operatorExpecting = this.operators[chr];
      this.escaped = false;
      return;
    } else if (['"', "'"].includes(this.operatorExpecting) && chr === "\\") {
      this.escaped = true;
      return;
    }
    if (!this.node) {
      this.node = {
        type: "text",
        value: ""
      };
      this.list.push(this.node);
    }
    if (chr === "\n") {
      chr = " ";
    }
    if (chr.charCodeAt(0) >= 33 || [" ", "	"].includes(chr)) {
      this.node.value += chr;
    }
    this.escaped = false;
  }
};
function addressParser(str, options) {
  options = options || {};
  let tokenizer = new Tokenizer(str);
  let tokens = tokenizer.tokenize();
  let addresses = [];
  let address = [];
  let parsedAddresses = [];
  tokens.forEach((token) => {
    if (token.type === "operator" && (token.value === "," || token.value === ";")) {
      if (address.length) {
        addresses.push(address);
      }
      address = [];
    } else {
      address.push(token);
    }
  });
  if (address.length) {
    addresses.push(address);
  }
  addresses.forEach((address2) => {
    address2 = _handleAddress(address2);
    if (address2.length) {
      parsedAddresses = parsedAddresses.concat(address2);
    }
  });
  if (options.flatten) {
    let addresses2 = [];
    let walkAddressList = (list) => {
      list.forEach((address2) => {
        if (address2.group) {
          return walkAddressList(address2.group);
        } else {
          addresses2.push(address2);
        }
      });
    };
    walkAddressList(parsedAddresses);
    return addresses2;
  }
  return parsedAddresses;
}
var address_parser_default = addressParser;

// node_modules/postal-mime/src/base64-encoder.js
function base64ArrayBuffer(arrayBuffer) {
  var base64 = "";
  var encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;
  var a, b, c, d;
  var chunk;
  for (var i = 0; i < mainLength; i = i + 3) {
    chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }
  return base64;
}

// node_modules/postal-mime/src/postal-mime.js
var PostalMime = class _PostalMime {
  static parse(buf, options) {
    const parser = new _PostalMime(options);
    return parser.parse(buf);
  }
  constructor(options) {
    this.options = options || {};
    this.root = this.currentNode = new MimeNode({
      postalMime: this
    });
    this.boundaries = [];
    this.textContent = {};
    this.attachments = [];
    this.attachmentEncoding = (this.options.attachmentEncoding || "").toString().replace(/[-_\s]/g, "").trim().toLowerCase() || "arraybuffer";
    this.started = false;
  }
  async finalize() {
    await this.root.finalize();
  }
  async processLine(line, isFinal) {
    let boundaries = this.boundaries;
    if (boundaries.length && line.length > 2 && line[0] === 45 && line[1] === 45) {
      for (let i = boundaries.length - 1; i >= 0; i--) {
        let boundary = boundaries[i];
        if (line.length !== boundary.value.length + 2 && line.length !== boundary.value.length + 4) {
          continue;
        }
        let isTerminator = line.length === boundary.value.length + 4;
        if (isTerminator && (line[line.length - 2] !== 45 || line[line.length - 1] !== 45)) {
          continue;
        }
        let boudaryMatches = true;
        for (let i2 = 0; i2 < boundary.value.length; i2++) {
          if (line[i2 + 2] !== boundary.value[i2]) {
            boudaryMatches = false;
            break;
          }
        }
        if (!boudaryMatches) {
          continue;
        }
        if (isTerminator) {
          await boundary.node.finalize();
          this.currentNode = boundary.node.parentNode || this.root;
        } else {
          await boundary.node.finalizeChildNodes();
          this.currentNode = new MimeNode({
            postalMime: this,
            parentNode: boundary.node
          });
        }
        if (isFinal) {
          return this.finalize();
        }
        return;
      }
    }
    this.currentNode.feed(line);
    if (isFinal) {
      return this.finalize();
    }
  }
  readLine() {
    let startPos = this.readPos;
    let endPos = this.readPos;
    let res = () => {
      return {
        bytes: new Uint8Array(this.buf, startPos, endPos - startPos),
        done: this.readPos >= this.av.length
      };
    };
    while (this.readPos < this.av.length) {
      const c = this.av[this.readPos++];
      if (c !== 13 && c !== 10) {
        endPos = this.readPos;
      }
      if (c === 10) {
        return res();
      }
    }
    return res();
  }
  async processNodeTree() {
    let textContent = {};
    let textTypes = /* @__PURE__ */ new Set();
    let textMap = this.textMap = /* @__PURE__ */ new Map();
    let forceRfc822Attachments = this.forceRfc822Attachments();
    let walk = async (node, alternative, related) => {
      alternative = alternative || false;
      related = related || false;
      if (!node.contentType.multipart) {
        if (this.isInlineMessageRfc822(node) && !forceRfc822Attachments) {
          const subParser = new _PostalMime();
          node.subMessage = await subParser.parse(node.content);
          if (!textMap.has(node)) {
            textMap.set(node, {});
          }
          let textEntry = textMap.get(node);
          if (node.subMessage.text || !node.subMessage.html) {
            textEntry.plain = textEntry.plain || [];
            textEntry.plain.push({ type: "subMessage", value: node.subMessage });
            textTypes.add("plain");
          }
          if (node.subMessage.html) {
            textEntry.html = textEntry.html || [];
            textEntry.html.push({ type: "subMessage", value: node.subMessage });
            textTypes.add("html");
          }
          if (subParser.textMap) {
            subParser.textMap.forEach((subTextEntry, subTextNode) => {
              textMap.set(subTextNode, subTextEntry);
            });
          }
          for (let attachment of node.subMessage.attachments || []) {
            this.attachments.push(attachment);
          }
        } else if (this.isInlineTextNode(node)) {
          let textType = node.contentType.parsed.value.substr(node.contentType.parsed.value.indexOf("/") + 1);
          let selectorNode = alternative || node;
          if (!textMap.has(selectorNode)) {
            textMap.set(selectorNode, {});
          }
          let textEntry = textMap.get(selectorNode);
          textEntry[textType] = textEntry[textType] || [];
          textEntry[textType].push({ type: "text", value: node.getTextContent() });
          textTypes.add(textType);
        } else if (node.content) {
          const filename = node.contentDisposition.parsed.params.filename || node.contentType.parsed.params.name || null;
          const attachment = {
            filename: filename ? decodeWords(filename) : null,
            mimeType: node.contentType.parsed.value,
            disposition: node.contentDisposition.parsed.value || null
          };
          if (related && node.contentId) {
            attachment.related = true;
          }
          if (node.contentDescription) {
            attachment.description = node.contentDescription;
          }
          if (node.contentId) {
            attachment.contentId = node.contentId;
          }
          switch (node.contentType.parsed.value) {
            // Special handling for calendar events
            case "text/calendar":
            case "application/ics": {
              if (node.contentType.parsed.params.method) {
                attachment.method = node.contentType.parsed.params.method.toString().toUpperCase().trim();
              }
              const decodedText = node.getTextContent().replace(/\r?\n/g, "\n").replace(/\n*$/, "\n");
              attachment.content = textEncoder.encode(decodedText);
              break;
            }
            // Regular attachments
            default:
              attachment.content = node.content;
          }
          this.attachments.push(attachment);
        }
      } else if (node.contentType.multipart === "alternative") {
        alternative = node;
      } else if (node.contentType.multipart === "related") {
        related = node;
      }
      for (let childNode of node.childNodes) {
        await walk(childNode, alternative, related);
      }
    };
    await walk(this.root, false, []);
    textMap.forEach((mapEntry) => {
      textTypes.forEach((textType) => {
        if (!textContent[textType]) {
          textContent[textType] = [];
        }
        if (mapEntry[textType]) {
          mapEntry[textType].forEach((textEntry) => {
            switch (textEntry.type) {
              case "text":
                textContent[textType].push(textEntry.value);
                break;
              case "subMessage":
                {
                  switch (textType) {
                    case "html":
                      textContent[textType].push(formatHtmlHeader(textEntry.value));
                      break;
                    case "plain":
                      textContent[textType].push(formatTextHeader(textEntry.value));
                      break;
                  }
                }
                break;
            }
          });
        } else {
          let alternativeType;
          switch (textType) {
            case "html":
              alternativeType = "plain";
              break;
            case "plain":
              alternativeType = "html";
              break;
          }
          (mapEntry[alternativeType] || []).forEach((textEntry) => {
            switch (textEntry.type) {
              case "text":
                switch (textType) {
                  case "html":
                    textContent[textType].push(textToHtml(textEntry.value));
                    break;
                  case "plain":
                    textContent[textType].push(htmlToText(textEntry.value));
                    break;
                }
                break;
              case "subMessage":
                {
                  switch (textType) {
                    case "html":
                      textContent[textType].push(formatHtmlHeader(textEntry.value));
                      break;
                    case "plain":
                      textContent[textType].push(formatTextHeader(textEntry.value));
                      break;
                  }
                }
                break;
            }
          });
        }
      });
    });
    Object.keys(textContent).forEach((textType) => {
      textContent[textType] = textContent[textType].join("\n");
    });
    this.textContent = textContent;
  }
  isInlineTextNode(node) {
    if (node.contentDisposition.parsed.value === "attachment") {
      return false;
    }
    switch (node.contentType.parsed.value) {
      case "text/html":
      case "text/plain":
        return true;
      case "text/calendar":
      case "text/csv":
      default:
        return false;
    }
  }
  isInlineMessageRfc822(node) {
    if (node.contentType.parsed.value !== "message/rfc822") {
      return false;
    }
    let disposition = node.contentDisposition.parsed.value || (this.options.rfc822Attachments ? "attachment" : "inline");
    return disposition === "inline";
  }
  // Check if this is a specially crafted report email where message/rfc822 content should not be inlined
  forceRfc822Attachments() {
    if (this.options.forceRfc822Attachments) {
      return true;
    }
    let forceRfc822Attachments = false;
    let walk = (node) => {
      if (!node.contentType.multipart) {
        if (["message/delivery-status", "message/feedback-report"].includes(node.contentType.parsed.value)) {
          forceRfc822Attachments = true;
        }
      }
      for (let childNode of node.childNodes) {
        walk(childNode);
      }
    };
    walk(this.root);
    return forceRfc822Attachments;
  }
  async resolveStream(stream) {
    let chunkLen = 0;
    let chunks = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      chunkLen += value.length;
    }
    const result = new Uint8Array(chunkLen);
    let chunkPointer = 0;
    for (let chunk of chunks) {
      result.set(chunk, chunkPointer);
      chunkPointer += chunk.length;
    }
    return result;
  }
  async parse(buf) {
    if (this.started) {
      throw new Error("Can not reuse parser, create a new PostalMime object");
    }
    this.started = true;
    if (buf && typeof buf.getReader === "function") {
      buf = await this.resolveStream(buf);
    }
    buf = buf || new ArrayBuffer(0);
    if (typeof buf === "string") {
      buf = textEncoder.encode(buf);
    }
    if (buf instanceof Blob || Object.prototype.toString.call(buf) === "[object Blob]") {
      buf = await blobToArrayBuffer(buf);
    }
    if (buf.buffer instanceof ArrayBuffer) {
      buf = new Uint8Array(buf).buffer;
    }
    this.buf = buf;
    this.av = new Uint8Array(buf);
    this.readPos = 0;
    while (this.readPos < this.av.length) {
      const line = this.readLine();
      await this.processLine(line.bytes, line.done);
    }
    await this.processNodeTree();
    const message = {
      headers: this.root.headers.map((entry) => ({ key: entry.key, value: entry.value })).reverse()
    };
    for (const key of ["from", "sender"]) {
      const addressHeader = this.root.headers.find((line) => line.key === key);
      if (addressHeader && addressHeader.value) {
        const addresses = address_parser_default(addressHeader.value);
        if (addresses && addresses.length) {
          message[key] = addresses[0];
        }
      }
    }
    for (const key of ["delivered-to", "return-path"]) {
      const addressHeader = this.root.headers.find((line) => line.key === key);
      if (addressHeader && addressHeader.value) {
        const addresses = address_parser_default(addressHeader.value);
        if (addresses && addresses.length && addresses[0].address) {
          const camelKey = key.replace(/\-(.)/g, (o, c) => c.toUpperCase());
          message[camelKey] = addresses[0].address;
        }
      }
    }
    for (const key of ["to", "cc", "bcc", "reply-to"]) {
      const addressHeaders = this.root.headers.filter((line) => line.key === key);
      let addresses = [];
      addressHeaders.filter((entry) => entry && entry.value).map((entry) => address_parser_default(entry.value)).forEach((parsed) => addresses = addresses.concat(parsed || []));
      if (addresses && addresses.length) {
        const camelKey = key.replace(/\-(.)/g, (o, c) => c.toUpperCase());
        message[camelKey] = addresses;
      }
    }
    for (const key of ["subject", "message-id", "in-reply-to", "references"]) {
      const header = this.root.headers.find((line) => line.key === key);
      if (header && header.value) {
        const camelKey = key.replace(/\-(.)/g, (o, c) => c.toUpperCase());
        message[camelKey] = decodeWords(header.value);
      }
    }
    let dateHeader = this.root.headers.find((line) => line.key === "date");
    if (dateHeader) {
      let date = new Date(dateHeader.value);
      if (!date || date.toString() === "Invalid Date") {
        date = dateHeader.value;
      } else {
        date = date.toISOString();
      }
      message.date = date;
    }
    if (this.textContent?.html) {
      message.html = this.textContent.html;
    }
    if (this.textContent?.plain) {
      message.text = this.textContent.plain;
    }
    message.attachments = this.attachments;
    switch (this.attachmentEncoding) {
      case "arraybuffer":
        break;
      case "base64":
        for (let attachment of message.attachments || []) {
          if (attachment?.content) {
            attachment.content = base64ArrayBuffer(attachment.content);
            attachment.encoding = "base64";
          }
        }
        break;
      case "utf8":
        let attachmentDecoder = new TextDecoder("utf8");
        for (let attachment of message.attachments || []) {
          if (attachment?.content) {
            attachment.content = attachmentDecoder.decode(attachment.content);
            attachment.encoding = "utf8";
          }
        }
        break;
      default:
        throw new Error("Unknwon attachment encoding");
    }
    return message;
  }
};
export {
  address_parser_default as addressParser,
  decodeWords,
  PostalMime as default
};
//# sourceMappingURL=postal-mime.js.map
