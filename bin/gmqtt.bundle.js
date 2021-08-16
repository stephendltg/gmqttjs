const osType = (()=>{
    const { Deno  } = globalThis;
    if (typeof Deno?.build?.os === "string") {
        return Deno.build.os;
    }
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win") ?? false) {
        return "windows";
    }
    return "linux";
})();
const isWindows = osType === "windows";
const CHAR_FORWARD_SLASH = 47;
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
function isPosixPathSeparator(code) {
    return code === 47;
}
function isPathSeparator(code) {
    return isPosixPathSeparator(code) || code === 92;
}
function isWindowsDeviceRoot(code) {
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator1) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code = path.charCodeAt(i);
        else if (isPathSeparator1(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator1(code)) {
            if (lastSlash === i - 1 || dots === 1) {
            } else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
const WHITESPACE_ENCODINGS = {
    "\u0009": "%09",
    "\u000A": "%0A",
    "\u000B": "%0B",
    "\u000C": "%0C",
    "\u000D": "%0D",
    "\u0020": "%20"
};
function encodeWhitespace(string) {
    return string.replaceAll(/[\s]/g, (c)=>{
        return WHITESPACE_ENCODINGS[c] ?? c;
    });
}
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
const sep = "\\";
const delimiter = ";";
function resolve3(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        const { Deno  } = globalThis;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno.cwd();
        } else {
            if (typeof Deno?.env?.get !== "function" || typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.env.get(`=${resolvedDevice}`) || Deno.cwd();
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        if (len > 1) {
            if (isPathSeparator(code)) {
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    let j = 2;
                    let last = j;
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        last = j;
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            last = j;
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code)) {
                if (path.charCodeAt(1) === 58) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code)) {
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
function normalize(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code = path.charCodeAt(0);
    if (isPathSeparator(code)) {
        return true;
    } else if (isWindowsDeviceRoot(code)) {
        if (len > 2 && path.charCodeAt(1) === 58) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize(joined);
}
function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve3(from);
    const toOrig = resolve3(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 92) break;
    }
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== 92) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 92) break;
    }
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== 92) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 92) {
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 92) {
                    lastCommonSep = i;
                } else if (i === 2) {
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 92) lastCommonSep = i;
    }
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 92) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === 92) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
function toNamespacedPath(path) {
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve3(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === 92) {
            if (resolvedPath.charCodeAt(1) === 92) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== 63 && code !== 46) {
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            if (resolvedPath.charCodeAt(1) === 58 && resolvedPath.charCodeAt(2) === 92) {
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return path.slice(0, end);
}
function basename(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === 58) start = 2;
        }
    }
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= start; --i){
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= start; --i){
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname(path) {
    assertPath(path);
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === 58 && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
function parse(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    const len = path.length;
    if (len === 0) return ret;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            rootEnd = j;
                        } else if (j !== last) {
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            ret.root = ret.dir = path;
                            return ret;
                        }
                        rootEnd = 3;
                    }
                } else {
                    ret.root = ret.dir = path;
                    return ret;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
    }
    if (rootEnd > 0) ret.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= rootEnd; --i){
        code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            ret.base = ret.name = path.slice(startPart, end);
        }
    } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
    } else ret.dir = ret.root;
    return ret;
}
function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
    if (url.hostname != "") {
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const [, hostname, pathname] = path.match(/^(?:[/\\]{2}([^/\\]+)(?=[/\\](?:[^/\\]|$)))?(.*)/);
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(pathname.replace(/%/g, "%25"));
    if (hostname != null && hostname != "localhost") {
        url.hostname = hostname;
        if (!url.hostname) {
            throw new TypeError("Invalid hostname.");
        }
    }
    return url;
}
const mod = function() {
    return {
        sep: sep,
        delimiter: delimiter,
        resolve: resolve3,
        normalize: normalize,
        isAbsolute: isAbsolute,
        join: join,
        relative: relative,
        toNamespacedPath: toNamespacedPath,
        dirname: dirname,
        basename: basename,
        extname: extname,
        format: format,
        parse: parse,
        fromFileUrl: fromFileUrl,
        toFileUrl: toFileUrl
    };
}();
const sep1 = "/";
const delimiter1 = ":";
function resolve1(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            const { Deno  } = globalThis;
            if (typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.cwd();
        }
        assertPath(path);
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
function normalize1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute1 = path.charCodeAt(0) === 47;
    const trailingSeparator = path.charCodeAt(path.length - 1) === 47;
    path = normalizeString(path, !isAbsolute1, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute1) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute1) return `/${path}`;
    return path;
}
function isAbsolute1(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47;
}
function join1(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize1(joined);
}
function relative1(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve1(from);
    to = resolve1(to);
    if (from === to) return "";
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 47) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 47) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 47) {
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 47) {
                    lastCommonSep = i;
                } else if (i === 0) {
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 47) lastCommonSep = i;
    }
    let out = "";
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47) ++toStart;
        return to.slice(toStart);
    }
}
function toNamespacedPath1(path) {
    return path;
}
function dirname1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const hasRoot = path.charCodeAt(0) === 47;
    let end = -1;
    let matchedSlash = true;
    for(let i = path.length - 1; i >= 1; --i){
        if (path.charCodeAt(i) === 47) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) return hasRoot ? "/" : ".";
    if (hasRoot && end === 1) return "//";
    return path.slice(0, end);
}
function basename1(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= 0; --i){
            const code = path.charCodeAt(i);
            if (code === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= 0; --i){
            if (path.charCodeAt(i) === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname1(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format1(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
function parse1(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret;
    const isAbsolute2 = path.charCodeAt(0) === 47;
    let start;
    if (isAbsolute2) {
        ret.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= start; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute2) {
                ret.base = ret.name = path.slice(1, end);
            } else {
                ret.base = ret.name = path.slice(startPart, end);
            }
        }
    } else {
        if (startPart === 0 && isAbsolute2) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
        } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute2) ret.dir = "/";
    return ret;
}
function fromFileUrl1(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function toFileUrl1(path) {
    if (!isAbsolute1(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(path.replace(/%/g, "%25").replace(/\\/g, "%5C"));
    return url;
}
const mod1 = function() {
    return {
        sep: sep1,
        delimiter: delimiter1,
        resolve: resolve1,
        normalize: normalize1,
        isAbsolute: isAbsolute1,
        join: join1,
        relative: relative1,
        toNamespacedPath: toNamespacedPath1,
        dirname: dirname1,
        basename: basename1,
        extname: extname1,
        format: format1,
        parse: parse1,
        fromFileUrl: fromFileUrl1,
        toFileUrl: toFileUrl1
    };
}();
const path = isWindows ? mod : mod1;
const { basename: basename2 , delimiter: delimiter2 , dirname: dirname2 , extname: extname2 , format: format2 , fromFileUrl: fromFileUrl2 , isAbsolute: isAbsolute2 , join: join2 , normalize: normalize2 , parse: parse2 , relative: relative2 , resolve: resolve2 , sep: sep2 , toFileUrl: toFileUrl2 , toNamespacedPath: toNamespacedPath2 ,  } = path;
var LogLevels;
(function(LogLevels1) {
    LogLevels1[LogLevels1["NOTSET"] = 0] = "NOTSET";
    LogLevels1[LogLevels1["DEBUG"] = 10] = "DEBUG";
    LogLevels1[LogLevels1["INFO"] = 20] = "INFO";
    LogLevels1[LogLevels1["WARNING"] = 30] = "WARNING";
    LogLevels1[LogLevels1["ERROR"] = 40] = "ERROR";
    LogLevels1[LogLevels1["CRITICAL"] = 50] = "CRITICAL";
})(LogLevels || (LogLevels = {
}));
const byLevel = {
    [String(LogLevels.NOTSET)]: "NOTSET",
    [String(LogLevels.DEBUG)]: "DEBUG",
    [String(LogLevels.INFO)]: "INFO",
    [String(LogLevels.WARNING)]: "WARNING",
    [String(LogLevels.ERROR)]: "ERROR",
    [String(LogLevels.CRITICAL)]: "CRITICAL"
};
function getLevelByName(name) {
    switch(name){
        case "NOTSET":
            return LogLevels.NOTSET;
        case "DEBUG":
            return LogLevels.DEBUG;
        case "INFO":
            return LogLevels.INFO;
        case "WARNING":
            return LogLevels.WARNING;
        case "ERROR":
            return LogLevels.ERROR;
        case "CRITICAL":
            return LogLevels.CRITICAL;
        default:
            throw new Error(`no log level found for "${name}"`);
    }
}
function getLevelName(level) {
    const levelName = byLevel[level];
    if (levelName) {
        return levelName;
    }
    throw new Error(`no level name found for level: ${level}`);
}
class LogRecord {
    msg;
    #args;
    #datetime;
    level;
    levelName;
    loggerName;
    constructor(options2){
        this.msg = options2.msg;
        this.#args = [
            ...options2.args
        ];
        this.level = options2.level;
        this.loggerName = options2.loggerName;
        this.#datetime = new Date();
        this.levelName = getLevelName(options2.level);
    }
    get args() {
        return [
            ...this.#args
        ];
    }
    get datetime() {
        return new Date(this.#datetime.getTime());
    }
}
class Logger {
    #level;
    #handlers;
    #loggerName;
    constructor(loggerName, levelName1, options1 = {
    }){
        this.#loggerName = loggerName;
        this.#level = getLevelByName(levelName1);
        this.#handlers = options1.handlers || [];
    }
    get level() {
        return this.#level;
    }
    set level(level) {
        this.#level = level;
    }
    get levelName() {
        return getLevelName(this.#level);
    }
    set levelName(levelName) {
        this.#level = getLevelByName(levelName);
    }
    get loggerName() {
        return this.#loggerName;
    }
    set handlers(hndls) {
        this.#handlers = hndls;
    }
    get handlers() {
        return this.#handlers;
    }
    _log(level, msg, ...args) {
        if (this.level > level) {
            return msg instanceof Function ? undefined : msg;
        }
        let fnResult;
        let logMessage;
        if (msg instanceof Function) {
            fnResult = msg();
            logMessage = this.asString(fnResult);
        } else {
            logMessage = this.asString(msg);
        }
        const record = new LogRecord({
            msg: logMessage,
            args: args,
            level: level,
            loggerName: this.loggerName
        });
        this.#handlers.forEach((handler)=>{
            handler.handle(record);
        });
        return msg instanceof Function ? fnResult : msg;
    }
    asString(data) {
        if (typeof data === "string") {
            return data;
        } else if (data === null || typeof data === "number" || typeof data === "bigint" || typeof data === "boolean" || typeof data === "undefined" || typeof data === "symbol") {
            return String(data);
        } else if (data instanceof Error) {
            return data.stack;
        } else if (typeof data === "object") {
            return JSON.stringify(data);
        }
        return "undefined";
    }
    debug(msg, ...args) {
        return this._log(LogLevels.DEBUG, msg, ...args);
    }
    info(msg, ...args) {
        return this._log(LogLevels.INFO, msg, ...args);
    }
    warning(msg, ...args) {
        return this._log(LogLevels.WARNING, msg, ...args);
    }
    error(msg, ...args) {
        return this._log(LogLevels.ERROR, msg, ...args);
    }
    critical(msg, ...args) {
        return this._log(LogLevels.CRITICAL, msg, ...args);
    }
}
const { Deno: Deno1  } = globalThis;
const noColor = typeof Deno1?.noColor === "boolean" ? Deno1.noColor : true;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code1) {
    return enabled ? `${code1.open}${str.replace(code1.regexp, code1.open)}${code1.close}` : str;
}
function bold(str) {
    return run(str, code([
        1
    ], 22));
}
function red(str) {
    return run(str, code([
        31
    ], 39));
}
function yellow(str) {
    return run(str, code([
        33
    ], 39));
}
function blue(str) {
    return run(str, code([
        34
    ], 39));
}
const ANSI_PATTERN = new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", 
].join("|"), "g");
async function exists(filePath) {
    try {
        await Deno.lstat(filePath);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}
function existsSync(filePath) {
    try {
        Deno.lstatSync(filePath);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}
function copy(src, dst, off = 0) {
    off = Math.max(0, Math.min(off, dst.byteLength));
    const dstBytesAvailable = dst.byteLength - off;
    if (src.byteLength > dstBytesAvailable) {
        src = src.subarray(0, dstBytesAvailable);
    }
    dst.set(src, off);
    return src.byteLength;
}
const MIN_READ = 32 * 1024;
const MAX_SIZE = 2 ** 32 - 2;
class Buffer {
    #buf;
    #off = 0;
    constructor(ab){
        this.#buf = ab === undefined ? new Uint8Array(0) : new Uint8Array(ab);
    }
    bytes(options = {
        copy: true
    }) {
        if (options.copy === false) return this.#buf.subarray(this.#off);
        return this.#buf.slice(this.#off);
    }
    empty() {
        return this.#buf.byteLength <= this.#off;
    }
    get length() {
        return this.#buf.byteLength - this.#off;
    }
    get capacity() {
        return this.#buf.buffer.byteLength;
    }
    truncate(n) {
        if (n === 0) {
            this.reset();
            return;
        }
        if (n < 0 || n > this.length) {
            throw Error("bytes.Buffer: truncation out of range");
        }
        this.#reslice(this.#off + n);
    }
    reset() {
        this.#reslice(0);
        this.#off = 0;
    }
     #tryGrowByReslice(n) {
        const l = this.#buf.byteLength;
        if (n <= this.capacity - l) {
            this.#reslice(l + n);
            return l;
        }
        return -1;
    }
     #reslice(len) {
        assert(len <= this.#buf.buffer.byteLength);
        this.#buf = new Uint8Array(this.#buf.buffer, 0, len);
    }
    readSync(p) {
        if (this.empty()) {
            this.reset();
            if (p.byteLength === 0) {
                return 0;
            }
            return null;
        }
        const nread = copy(this.#buf.subarray(this.#off), p);
        this.#off += nread;
        return nread;
    }
    read(p) {
        const rr = this.readSync(p);
        return Promise.resolve(rr);
    }
    writeSync(p) {
        const m = this.#grow(p.byteLength);
        return copy(p, this.#buf, m);
    }
    write(p) {
        const n = this.writeSync(p);
        return Promise.resolve(n);
    }
     #grow(n) {
        const m = this.length;
        if (m === 0 && this.#off !== 0) {
            this.reset();
        }
        const i = this.#tryGrowByReslice(n);
        if (i >= 0) {
            return i;
        }
        const c = this.capacity;
        if (n <= Math.floor(c / 2) - m) {
            copy(this.#buf.subarray(this.#off), this.#buf);
        } else if (c + n > MAX_SIZE) {
            throw new Error("The buffer cannot be grown beyond the maximum size.");
        } else {
            const buf = new Uint8Array(Math.min(2 * c + n, MAX_SIZE));
            copy(this.#buf.subarray(this.#off), buf);
            this.#buf = buf;
        }
        this.#off = 0;
        this.#reslice(Math.min(m + n, MAX_SIZE));
        return m;
    }
    grow(n) {
        if (n < 0) {
            throw Error("Buffer.grow: negative count");
        }
        const m = this.#grow(n);
        this.#reslice(m);
    }
    async readFrom(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = await r.read(buf);
            if (nread === null) {
                return n;
            }
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
    readFromSync(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = r.readSync(buf);
            if (nread === null) {
                return n;
            }
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
}
var DiffType;
(function(DiffType1) {
    DiffType1["removed"] = "removed";
    DiffType1["common"] = "common";
    DiffType1["added"] = "added";
})(DiffType || (DiffType = {
}));
class AssertionError extends Error {
    constructor(message1){
        super(message1);
        this.name = "AssertionError";
    }
}
async function writeAll(w, arr) {
    let nwritten = 0;
    while(nwritten < arr.length){
        nwritten += await w.write(arr.subarray(nwritten));
    }
}
function writeAllSync(w, arr) {
    let nwritten = 0;
    while(nwritten < arr.length){
        nwritten += w.writeSync(arr.subarray(nwritten));
    }
}
const DEFAULT_BUF_SIZE = 4096;
const MIN_BUF_SIZE = 16;
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
class BufferFullError extends Error {
    partial;
    name = "BufferFullError";
    constructor(partial1){
        super("Buffer full");
        this.partial = partial1;
    }
}
class PartialReadError extends Error {
    name = "PartialReadError";
    partial;
    constructor(){
        super("Encountered UnexpectedEof, data only partially read");
    }
}
class BufReader {
    buf;
    rd;
    r = 0;
    w = 0;
    eof = false;
    static create(r, size = 4096) {
        return r instanceof BufReader ? r : new BufReader(r, size);
    }
    constructor(rd1, size1 = 4096){
        if (size1 < 16) {
            size1 = MIN_BUF_SIZE;
        }
        this._reset(new Uint8Array(size1), rd1);
    }
    size() {
        return this.buf.byteLength;
    }
    buffered() {
        return this.w - this.r;
    }
    async _fill() {
        if (this.r > 0) {
            this.buf.copyWithin(0, this.r, this.w);
            this.w -= this.r;
            this.r = 0;
        }
        if (this.w >= this.buf.byteLength) {
            throw Error("bufio: tried to fill full buffer");
        }
        for(let i = 100; i > 0; i--){
            const rr = await this.rd.read(this.buf.subarray(this.w));
            if (rr === null) {
                this.eof = true;
                return;
            }
            assert(rr >= 0, "negative read");
            this.w += rr;
            if (rr > 0) {
                return;
            }
        }
        throw new Error(`No progress after ${100} read() calls`);
    }
    reset(r) {
        this._reset(this.buf, r);
    }
    _reset(buf, rd) {
        this.buf = buf;
        this.rd = rd;
        this.eof = false;
    }
    async read(p) {
        let rr = p.byteLength;
        if (p.byteLength === 0) return rr;
        if (this.r === this.w) {
            if (p.byteLength >= this.buf.byteLength) {
                const rr1 = await this.rd.read(p);
                const nread = rr1 ?? 0;
                assert(nread >= 0, "negative read");
                return rr1;
            }
            this.r = 0;
            this.w = 0;
            rr = await this.rd.read(this.buf);
            if (rr === 0 || rr === null) return rr;
            assert(rr >= 0, "negative read");
            this.w += rr;
        }
        const copied = copy(this.buf.subarray(this.r, this.w), p, 0);
        this.r += copied;
        return copied;
    }
    async readFull(p) {
        let bytesRead = 0;
        while(bytesRead < p.length){
            try {
                const rr = await this.read(p.subarray(bytesRead));
                if (rr === null) {
                    if (bytesRead === 0) {
                        return null;
                    } else {
                        throw new PartialReadError();
                    }
                }
                bytesRead += rr;
            } catch (err) {
                err.partial = p.subarray(0, bytesRead);
                throw err;
            }
        }
        return p;
    }
    async readByte() {
        while(this.r === this.w){
            if (this.eof) return null;
            await this._fill();
        }
        const c = this.buf[this.r];
        this.r++;
        return c;
    }
    async readString(delim) {
        if (delim.length !== 1) {
            throw new Error("Delimiter should be a single character");
        }
        const buffer = await this.readSlice(delim.charCodeAt(0));
        if (buffer === null) return null;
        return new TextDecoder().decode(buffer);
    }
    async readLine() {
        let line;
        try {
            line = await this.readSlice(LF);
        } catch (err) {
            if (err instanceof Deno.errors.BadResource) {
                throw err;
            }
            let { partial: partial2  } = err;
            assert(partial2 instanceof Uint8Array, "bufio: caught error from `readSlice()` without `partial` property");
            if (!(err instanceof BufferFullError)) {
                throw err;
            }
            if (!this.eof && partial2.byteLength > 0 && partial2[partial2.byteLength - 1] === CR) {
                assert(this.r > 0, "bufio: tried to rewind past start of buffer");
                this.r--;
                partial2 = partial2.subarray(0, partial2.byteLength - 1);
            }
            return {
                line: partial2,
                more: !this.eof
            };
        }
        if (line === null) {
            return null;
        }
        if (line.byteLength === 0) {
            return {
                line,
                more: false
            };
        }
        if (line[line.byteLength - 1] == LF) {
            let drop = 1;
            if (line.byteLength > 1 && line[line.byteLength - 2] === CR) {
                drop = 2;
            }
            line = line.subarray(0, line.byteLength - drop);
        }
        return {
            line,
            more: false
        };
    }
    async readSlice(delim) {
        let s = 0;
        let slice;
        while(true){
            let i = this.buf.subarray(this.r + s, this.w).indexOf(delim);
            if (i >= 0) {
                i += s;
                slice = this.buf.subarray(this.r, this.r + i + 1);
                this.r += i + 1;
                break;
            }
            if (this.eof) {
                if (this.r === this.w) {
                    return null;
                }
                slice = this.buf.subarray(this.r, this.w);
                this.r = this.w;
                break;
            }
            if (this.buffered() >= this.buf.byteLength) {
                this.r = this.w;
                const oldbuf = this.buf;
                const newbuf = this.buf.slice(0);
                this.buf = newbuf;
                throw new BufferFullError(oldbuf);
            }
            s = this.w - this.r;
            try {
                await this._fill();
            } catch (err) {
                err.partial = slice;
                throw err;
            }
        }
        return slice;
    }
    async peek(n) {
        if (n < 0) {
            throw Error("negative count");
        }
        let avail = this.w - this.r;
        while(avail < n && avail < this.buf.byteLength && !this.eof){
            try {
                await this._fill();
            } catch (err) {
                err.partial = this.buf.subarray(this.r, this.w);
                throw err;
            }
            avail = this.w - this.r;
        }
        if (avail === 0 && this.eof) {
            return null;
        } else if (avail < n && this.eof) {
            return this.buf.subarray(this.r, this.r + avail);
        } else if (avail < n) {
            throw new BufferFullError(this.buf.subarray(this.r, this.w));
        }
        return this.buf.subarray(this.r, this.r + n);
    }
}
class AbstractBufBase {
    buf;
    usedBufferBytes = 0;
    err = null;
    size() {
        return this.buf.byteLength;
    }
    available() {
        return this.buf.byteLength - this.usedBufferBytes;
    }
    buffered() {
        return this.usedBufferBytes;
    }
}
class BufWriter extends AbstractBufBase {
    writer;
    static create(writer, size = 4096) {
        return writer instanceof BufWriter ? writer : new BufWriter(writer, size);
    }
    constructor(writer1, size2 = 4096){
        super();
        this.writer = writer1;
        if (size2 <= 0) {
            size2 = DEFAULT_BUF_SIZE;
        }
        this.buf = new Uint8Array(size2);
    }
    reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.writer = w;
    }
    async flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            await writeAll(this.writer, this.buf.subarray(0, this.usedBufferBytes));
        } catch (e) {
            this.err = e;
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    async write(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                try {
                    numBytesWritten = await this.writer.write(data);
                } catch (e) {
                    this.err = e;
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                await this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
}
class BufWriterSync extends AbstractBufBase {
    writer;
    static create(writer, size = 4096) {
        return writer instanceof BufWriterSync ? writer : new BufWriterSync(writer, size);
    }
    constructor(writer2, size3 = 4096){
        super();
        this.writer = writer2;
        if (size3 <= 0) {
            size3 = DEFAULT_BUF_SIZE;
        }
        this.buf = new Uint8Array(size3);
    }
    reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.writer = w;
    }
    flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            writeAllSync(this.writer, this.buf.subarray(0, this.usedBufferBytes));
        } catch (e) {
            this.err = e;
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    writeSync(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                try {
                    numBytesWritten = this.writer.writeSync(data);
                } catch (e) {
                    this.err = e;
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
}
const DEFAULT_FORMATTER = "{levelName} {msg}";
class BaseHandler {
    level;
    levelName;
    formatter;
    constructor(levelName2, options3 = {
    }){
        this.level = getLevelByName(levelName2);
        this.levelName = levelName2;
        this.formatter = options3.formatter || DEFAULT_FORMATTER;
    }
    handle(logRecord) {
        if (this.level > logRecord.level) return;
        const msg = this.format(logRecord);
        return this.log(msg);
    }
    format(logRecord) {
        if (this.formatter instanceof Function) {
            return this.formatter(logRecord);
        }
        return this.formatter.replace(/{(\S+)}/g, (match, p1)=>{
            const value = logRecord[p1];
            if (value == null) {
                return match;
            }
            return String(value);
        });
    }
    log(_msg) {
    }
    async setup() {
    }
    async destroy() {
    }
}
class ConsoleHandler extends BaseHandler {
    format(logRecord) {
        let msg = super.format(logRecord);
        switch(logRecord.level){
            case LogLevels.INFO:
                msg = blue(msg);
                break;
            case LogLevels.WARNING:
                msg = yellow(msg);
                break;
            case LogLevels.ERROR:
                msg = red(msg);
                break;
            case LogLevels.CRITICAL:
                msg = bold(red(msg));
                break;
            default: break;
        }
        return msg;
    }
    log(msg) {
        console.log(msg);
    }
}
class WriterHandler extends BaseHandler {
    _writer;
    #encoder = new TextEncoder();
}
class FileHandler extends WriterHandler {
    _file;
    _buf;
    _filename;
    _mode;
    _openOptions;
    _encoder = new TextEncoder();
     #unloadCallback() {
        this.destroy();
    }
    constructor(levelName3, options4){
        super(levelName3, options4);
        this._filename = options4.filename;
        this._mode = options4.mode ? options4.mode : "a";
        this._openOptions = {
            createNew: this._mode === "x",
            create: this._mode !== "x",
            append: this._mode === "a",
            truncate: this._mode !== "a",
            write: true
        };
    }
    async setup() {
        this._file = await Deno.open(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
        addEventListener("unload", this.#unloadCallback.bind(this));
    }
    handle(logRecord) {
        super.handle(logRecord);
        if (logRecord.level > LogLevels.ERROR) {
            this.flush();
        }
    }
    log(msg) {
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
    }
    flush() {
        if (this._buf?.buffered() > 0) {
            this._buf.flush();
        }
    }
    destroy() {
        this.flush();
        this._file?.close();
        this._file = undefined;
        removeEventListener("unload", this.#unloadCallback);
        return Promise.resolve();
    }
}
class RotatingFileHandler extends FileHandler {
    #maxBytes;
    #maxBackupCount;
    #currentFileSize = 0;
    constructor(levelName4, options5){
        super(levelName4, options5);
        this.#maxBytes = options5.maxBytes;
        this.#maxBackupCount = options5.maxBackupCount;
    }
    async setup() {
        if (this.#maxBytes < 1) {
            this.destroy();
            throw new Error("maxBytes cannot be less than 1");
        }
        if (this.#maxBackupCount < 1) {
            this.destroy();
            throw new Error("maxBackupCount cannot be less than 1");
        }
        await super.setup();
        if (this._mode === "w") {
            for(let i = 1; i <= this.#maxBackupCount; i++){
                if (await exists(this._filename + "." + i)) {
                    await Deno.remove(this._filename + "." + i);
                }
            }
        } else if (this._mode === "x") {
            for(let i = 1; i <= this.#maxBackupCount; i++){
                if (await exists(this._filename + "." + i)) {
                    this.destroy();
                    throw new Deno.errors.AlreadyExists("Backup log file " + this._filename + "." + i + " already exists");
                }
            }
        } else {
            this.#currentFileSize = (await Deno.stat(this._filename)).size;
        }
    }
    log(msg) {
        const msgByteLength = this._encoder.encode(msg).byteLength + 1;
        if (this.#currentFileSize + msgByteLength > this.#maxBytes) {
            this.rotateLogFiles();
            this.#currentFileSize = 0;
        }
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
        this.#currentFileSize += msgByteLength;
    }
    rotateLogFiles() {
        this._buf.flush();
        Deno.close(this._file.rid);
        for(let i = this.#maxBackupCount - 1; i >= 0; i--){
            const source = this._filename + (i === 0 ? "" : "." + i);
            const dest = this._filename + "." + (i + 1);
            if (existsSync(source)) {
                Deno.renameSync(source, dest);
            }
        }
        this._file = Deno.openSync(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
    }
}
const DEFAULT_LEVEL = "INFO";
const DEFAULT_CONFIG = {
    handlers: {
        default: new ConsoleHandler(DEFAULT_LEVEL)
    },
    loggers: {
        default: {
            level: DEFAULT_LEVEL,
            handlers: [
                "default"
            ]
        }
    }
};
const state1 = {
    handlers: new Map(),
    loggers: new Map(),
    config: DEFAULT_CONFIG
};
function getLogger(name) {
    if (!name) {
        const d = state1.loggers.get("default");
        assert(d != null, `"default" logger must be set for getting logger without name`);
        return d;
    }
    const result = state1.loggers.get(name);
    if (!result) {
        const logger = new Logger(name, "NOTSET", {
            handlers: []
        });
        state1.loggers.set(name, logger);
        return logger;
    }
    return result;
}
function info(msg, ...args) {
    if (msg instanceof Function) {
        return getLogger("default").info(msg, ...args);
    }
    return getLogger("default").info(msg, ...args);
}
function warning(msg, ...args) {
    if (msg instanceof Function) {
        return getLogger("default").warning(msg, ...args);
    }
    return getLogger("default").warning(msg, ...args);
}
function critical(msg, ...args) {
    if (msg instanceof Function) {
        return getLogger("default").critical(msg, ...args);
    }
    return getLogger("default").critical(msg, ...args);
}
async function setup(config) {
    state1.config = {
        handlers: {
            ...DEFAULT_CONFIG.handlers,
            ...config.handlers
        },
        loggers: {
            ...DEFAULT_CONFIG.loggers,
            ...config.loggers
        }
    };
    state1.handlers.forEach((handler)=>{
        handler.destroy();
    });
    state1.handlers.clear();
    const handlers = state1.config.handlers || {
    };
    for(const handlerName in handlers){
        const handler = handlers[handlerName];
        await handler.setup();
        state1.handlers.set(handlerName, handler);
    }
    state1.loggers.clear();
    const loggers = state1.config.loggers || {
    };
    for(const loggerName1 in loggers){
        const loggerConfig = loggers[loggerName1];
        const handlerNames = loggerConfig.handlers || [];
        const handlers1 = [];
        handlerNames.forEach((handlerName1)=>{
            const handler = state1.handlers.get(handlerName1);
            if (handler) {
                handlers1.push(handler);
            }
        });
        const levelName5 = loggerConfig.level || DEFAULT_LEVEL;
        const logger = new Logger(loggerName1, levelName5, {
            handlers: handlers1
        });
        state1.loggers.set(loggerName1, logger);
    }
}
await setup(DEFAULT_CONFIG);
function get(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
}
function getForce(obj, key) {
    const v = get(obj, key);
    assert(v != null);
    return v;
}
function isNumber(x) {
    if (typeof x === "number") return true;
    if (/^0x[0-9a-f]+$/i.test(String(x))) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(String(x));
}
function hasKey(obj, keys) {
    let o = obj;
    keys.slice(0, -1).forEach((key)=>{
        o = get(o, key) ?? {
        };
    });
    const key = keys[keys.length - 1];
    return key in o;
}
function parse3(args, { "--": doubleDash = false , alias ={
} , boolean: __boolean = false , default: defaults = {
} , stopEarly =false , string =[] , unknown =(i)=>i
  } = {
}) {
    const flags = {
        bools: {
        },
        strings: {
        },
        unknownFn: unknown,
        allBools: false
    };
    if (__boolean !== undefined) {
        if (typeof __boolean === "boolean") {
            flags.allBools = !!__boolean;
        } else {
            const booleanArgs = typeof __boolean === "string" ? [
                __boolean
            ] : __boolean;
            for (const key of booleanArgs.filter(Boolean)){
                flags.bools[key] = true;
            }
        }
    }
    const aliases = {
    };
    if (alias !== undefined) {
        for(const key in alias){
            const val = getForce(alias, key);
            if (typeof val === "string") {
                aliases[key] = [
                    val
                ];
            } else {
                aliases[key] = val;
            }
            for (const alias1 of getForce(aliases, key)){
                aliases[alias1] = [
                    key
                ].concat(aliases[key].filter((y)=>alias1 !== y
                ));
            }
        }
    }
    if (string !== undefined) {
        const stringArgs = typeof string === "string" ? [
            string
        ] : string;
        for (const key of stringArgs.filter(Boolean)){
            flags.strings[key] = true;
            const alias1 = get(aliases, key);
            if (alias1) {
                for (const al of alias1){
                    flags.strings[al] = true;
                }
            }
        }
    }
    const argv = {
        _: []
    };
    function argDefined(key, arg) {
        return flags.allBools && /^--[^=]+$/.test(arg) || get(flags.bools, key) || !!get(flags.strings, key) || !!get(aliases, key);
    }
    function setKey(obj, keys, value) {
        let o = obj;
        keys.slice(0, -1).forEach(function(key) {
            if (get(o, key) === undefined) {
                o[key] = {
                };
            }
            o = get(o, key);
        });
        const key = keys[keys.length - 1];
        if (get(o, key) === undefined || get(flags.bools, key) || typeof get(o, key) === "boolean") {
            o[key] = value;
        } else if (Array.isArray(get(o, key))) {
            o[key].push(value);
        } else {
            o[key] = [
                get(o, key),
                value
            ];
        }
    }
    function setArg(key, val, arg = undefined) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg, key, val) === false) return;
        }
        const value = !get(flags.strings, key) && isNumber(val) ? Number(val) : val;
        setKey(argv, key.split("."), value);
        const alias1 = get(aliases, key);
        if (alias1) {
            for (const x of alias1){
                setKey(argv, x.split("."), value);
            }
        }
    }
    function aliasIsBoolean(key) {
        return getForce(aliases, key).some((x)=>typeof get(flags.bools, x) === "boolean"
        );
    }
    for (const key of Object.keys(flags.bools)){
        setArg(key, defaults[key] === undefined ? false : defaults[key]);
    }
    let notFlags = [];
    if (args.includes("--")) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
    }
    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
            const m = arg.match(/^--([^=]+)=(.*)$/s);
            assert(m != null);
            const [, key1, value] = m;
            if (flags.bools[key1]) {
                const booleanValue = value !== "false";
                setArg(key1, booleanValue, arg);
            } else {
                setArg(key1, value, arg);
            }
        } else if (/^--no-.+/.test(arg)) {
            const m = arg.match(/^--no-(.+)/);
            assert(m != null);
            setArg(m[1], false, arg);
        } else if (/^--.+/.test(arg)) {
            const m = arg.match(/^--(.+)/);
            assert(m != null);
            const [, key1] = m;
            const next = args[i + 1];
            if (next !== undefined && !/^-/.test(next) && !get(flags.bools, key1) && !flags.allBools && (get(aliases, key1) ? !aliasIsBoolean(key1) : true)) {
                setArg(key1, next, arg);
                i++;
            } else if (/^(true|false)$/.test(next)) {
                setArg(key1, next === "true", arg);
                i++;
            } else {
                setArg(key1, get(flags.strings, key1) ? "" : true, arg);
            }
        } else if (/^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split("");
            let broken = false;
            for(let j = 0; j < letters.length; j++){
                const next = arg.slice(j + 2);
                if (next === "-") {
                    setArg(letters[j], next, arg);
                    continue;
                }
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
                    setArg(letters[j], next.split(/=(.+)/)[1], arg);
                    broken = true;
                    break;
                }
                if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
                    setArg(letters[j], next, arg);
                    broken = true;
                    break;
                }
                if (letters[j + 1] && letters[j + 1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);
                    broken = true;
                    break;
                } else {
                    setArg(letters[j], get(flags.strings, letters[j]) ? "" : true, arg);
                }
            }
            const [key1] = arg.slice(-1);
            if (!broken && key1 !== "-") {
                if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !get(flags.bools, key1) && (get(aliases, key1) ? !aliasIsBoolean(key1) : true)) {
                    setArg(key1, args[i + 1], arg);
                    i++;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
                    setArg(key1, args[i + 1] === "true", arg);
                    i++;
                } else {
                    setArg(key1, get(flags.strings, key1) ? "" : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(flags.strings["_"] ?? !isNumber(arg) ? arg : Number(arg));
            }
            if (stopEarly) {
                argv._.push(...args.slice(i + 1));
                break;
            }
        }
    }
    for (const key1 of Object.keys(defaults)){
        if (!hasKey(argv, key1.split("."))) {
            setKey(argv, key1.split("."), defaults[key1]);
            if (aliases[key1]) {
                for (const x of aliases[key1]){
                    setKey(argv, x.split("."), defaults[key1]);
                }
            }
        }
    }
    if (doubleDash) {
        argv["--"] = [];
        for (const key2 of notFlags){
            argv["--"].push(key2);
        }
    } else {
        for (const key2 of notFlags){
            argv._.push(key2);
        }
    }
    return argv;
}
class YAMLError extends Error {
    mark;
    constructor(message2 = "(unknown reason)", mark = ""){
        super(`${message2} ${mark}`);
        this.mark = mark;
        this.name = this.constructor.name;
    }
    toString(_compact) {
        return `${this.name}: ${this.message} ${this.mark}`;
    }
}
function isBoolean(value) {
    return typeof value === "boolean" || value instanceof Boolean;
}
function isObject(value) {
    return value !== null && typeof value === "object";
}
function repeat(str, count) {
    let result = "";
    for(let cycle = 0; cycle < count; cycle++){
        result += str;
    }
    return result;
}
function isNegativeZero(i) {
    return i === 0 && Number.NEGATIVE_INFINITY === 1 / i;
}
class Mark {
    name;
    buffer;
    position;
    line;
    column;
    constructor(name, buffer, position1, line1, column){
        this.name = name;
        this.buffer = buffer;
        this.position = position1;
        this.line = line1;
        this.column = column;
    }
    getSnippet(indent = 4, maxLength = 75) {
        if (!this.buffer) return null;
        let head = "";
        let start = this.position;
        while(start > 0 && "\x00\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1){
            start -= 1;
            if (this.position - start > maxLength / 2 - 1) {
                head = " ... ";
                start += 5;
                break;
            }
        }
        let tail = "";
        let end = this.position;
        while(end < this.buffer.length && "\x00\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1){
            end += 1;
            if (end - this.position > maxLength / 2 - 1) {
                tail = " ... ";
                end -= 5;
                break;
            }
        }
        const snippet = this.buffer.slice(start, end);
        return `${repeat(" ", indent)}${head}${snippet}${tail}\n${repeat(" ", indent + this.position - start + head.length)}^`;
    }
    toString(compact) {
        let snippet, where = "";
        if (this.name) {
            where += `in "${this.name}" `;
        }
        where += `at line ${this.line + 1}, column ${this.column + 1}`;
        if (!compact) {
            snippet = this.getSnippet();
            if (snippet) {
                where += `:\n${snippet}`;
            }
        }
        return where;
    }
}
function compileList(schema, name1, result) {
    const exclude = [];
    for (const includedSchema of schema.include){
        result = compileList(includedSchema, name1, result);
    }
    for (const currentType of schema[name1]){
        for(let previousIndex = 0; previousIndex < result.length; previousIndex++){
            const previousType = result[previousIndex];
            if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
                exclude.push(previousIndex);
            }
        }
        result.push(currentType);
    }
    return result.filter((_type, index)=>!exclude.includes(index)
    );
}
function compileMap(...typesList) {
    const result = {
        fallback: {
        },
        mapping: {
        },
        scalar: {
        },
        sequence: {
        }
    };
    for (const types of typesList){
        for (const type of types){
            if (type.kind !== null) {
                result[type.kind][type.tag] = result["fallback"][type.tag] = type;
            }
        }
    }
    return result;
}
class Schema {
    static SCHEMA_DEFAULT;
    implicit;
    explicit;
    include;
    compiledImplicit;
    compiledExplicit;
    compiledTypeMap;
    constructor(definition1){
        this.explicit = definition1.explicit || [];
        this.implicit = definition1.implicit || [];
        this.include = definition1.include || [];
        for (const type of this.implicit){
            if (type.loadKind && type.loadKind !== "scalar") {
                throw new YAMLError("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
            }
        }
        this.compiledImplicit = compileList(this, "implicit", []);
        this.compiledExplicit = compileList(this, "explicit", []);
        this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
    }
    extend(definition) {
        return new Schema({
            implicit: [
                ...new Set([
                    ...this.implicit,
                    ...definition?.implicit ?? []
                ]), 
            ],
            explicit: [
                ...new Set([
                    ...this.explicit,
                    ...definition?.explicit ?? []
                ]), 
            ],
            include: [
                ...new Set([
                    ...this.include,
                    ...definition?.include ?? []
                ])
            ]
        });
    }
    static create() {
    }
}
const DEFAULT_RESOLVE = ()=>true
;
const DEFAULT_CONSTRUCT = (data)=>data
;
function checkTagFormat(tag) {
    return tag;
}
class Type {
    tag;
    kind = null;
    instanceOf;
    predicate;
    represent;
    defaultStyle;
    styleAliases;
    loadKind;
    constructor(tag1, options6){
        this.tag = checkTagFormat(tag1);
        if (options6) {
            this.kind = options6.kind;
            this.resolve = options6.resolve || DEFAULT_RESOLVE;
            this.construct = options6.construct || DEFAULT_CONSTRUCT;
            this.instanceOf = options6.instanceOf;
            this.predicate = options6.predicate;
            this.represent = options6.represent;
            this.defaultStyle = options6.defaultStyle;
            this.styleAliases = options6.styleAliases;
        }
    }
    resolve = ()=>true
    ;
    construct = (data)=>data
    ;
}
const BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
    if (data === null) return false;
    let code1;
    let bitlen = 0;
    const max = data.length;
    const map = BASE64_MAP;
    for(let idx = 0; idx < max; idx++){
        code1 = map.indexOf(data.charAt(idx));
        if (code1 > 64) continue;
        if (code1 < 0) return false;
        bitlen += 6;
    }
    return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
    const input = data.replace(/[\r\n=]/g, "");
    const max = input.length;
    const map = BASE64_MAP;
    const result = [];
    let bits = 0;
    for(let idx = 0; idx < max; idx++){
        if (idx % 4 === 0 && idx) {
            result.push(bits >> 16 & 255);
            result.push(bits >> 8 & 255);
            result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
    }
    const tailbits = max % 4 * 6;
    if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
    } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
    }
    return new Buffer(new Uint8Array(result));
}
function representYamlBinary(object) {
    const max = object.length;
    const map = BASE64_MAP;
    let result = "";
    let bits = 0;
    for(let idx = 0; idx < max; idx++){
        if (idx % 3 === 0 && idx) {
            result += map[bits >> 18 & 63];
            result += map[bits >> 12 & 63];
            result += map[bits >> 6 & 63];
            result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
    }
    const tail = max % 3;
    if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
    } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
    } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
    }
    return result;
}
function isBinary(obj) {
    const buf = new Buffer();
    try {
        if (0 > buf.readFromSync(obj)) return true;
        return false;
    } catch  {
        return false;
    } finally{
        buf.reset();
    }
}
const binary = new Type("tag:yaml.org,2002:binary", {
    construct: constructYamlBinary,
    kind: "scalar",
    predicate: isBinary,
    represent: representYamlBinary,
    resolve: resolveYamlBinary
});
function resolveYamlBoolean(data) {
    const max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
}
const bool = new Type("tag:yaml.org,2002:bool", {
    construct: constructYamlBoolean,
    defaultStyle: "lowercase",
    kind: "scalar",
    predicate: isBoolean,
    represent: {
        lowercase (object) {
            return object ? "true" : "false";
        },
        uppercase (object) {
            return object ? "TRUE" : "FALSE";
        },
        camelcase (object) {
            return object ? "True" : "False";
        }
    },
    resolve: resolveYamlBoolean
});
const YAML_FLOAT_PATTERN = new RegExp("^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" + "|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" + "|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*" + "|[-+]?\\.(?:inf|Inf|INF)" + "|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(data) {
    if (!YAML_FLOAT_PATTERN.test(data) || data[data.length - 1] === "_") {
        return false;
    }
    return true;
}
function constructYamlFloat(data) {
    let value = data.replace(/_/g, "").toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    const digits = [];
    if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
    }
    if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
    if (value === ".nan") {
        return NaN;
    }
    if (value.indexOf(":") >= 0) {
        value.split(":").forEach((v)=>{
            digits.unshift(parseFloat(v));
        });
        let valueNb = 0;
        let base = 1;
        digits.forEach((d)=>{
            valueNb += d * base;
            base *= 60;
        });
        return sign * valueNb;
    }
    return sign * parseFloat(value);
}
const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
    if (isNaN(object)) {
        switch(style){
            case "lowercase":
                return ".nan";
            case "uppercase":
                return ".NAN";
            case "camelcase":
                return ".NaN";
        }
    } else if (Number.POSITIVE_INFINITY === object) {
        switch(style){
            case "lowercase":
                return ".inf";
            case "uppercase":
                return ".INF";
            case "camelcase":
                return ".Inf";
        }
    } else if (Number.NEGATIVE_INFINITY === object) {
        switch(style){
            case "lowercase":
                return "-.inf";
            case "uppercase":
                return "-.INF";
            case "camelcase":
                return "-.Inf";
        }
    } else if (isNegativeZero(object)) {
        return "-0.0";
    }
    const res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || isNegativeZero(object));
}
const __float = new Type("tag:yaml.org,2002:float", {
    construct: constructYamlFloat,
    defaultStyle: "lowercase",
    kind: "scalar",
    predicate: isFloat,
    represent: representYamlFloat,
    resolve: resolveYamlFloat
});
function reconstructFunction(code1) {
    const func = new Function(`return ${code1}`)();
    if (!(func instanceof Function)) {
        throw new TypeError(`Expected function but got ${typeof func}: ${code1}`);
    }
    return func;
}
const func = new Type("tag:yaml.org,2002:js/function", {
    kind: "scalar",
    resolve (data) {
        if (data === null) {
            return false;
        }
        try {
            reconstructFunction(`${data}`);
            return true;
        } catch (_err) {
            return false;
        }
    },
    construct (data) {
        return reconstructFunction(data);
    },
    predicate (object) {
        return object instanceof Function;
    },
    represent (object) {
        return object.toString();
    }
});
function isHexCode(c) {
    return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
    return 48 <= c && c <= 55;
}
function isDecCode(c) {
    return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
    const max = data.length;
    let index = 0;
    let hasDigits = false;
    if (!max) return false;
    let ch = data[index];
    if (ch === "-" || ch === "+") {
        ch = data[++index];
    }
    if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
            index++;
            for(; index < max; index++){
                ch = data[index];
                if (ch === "_") continue;
                if (ch !== "0" && ch !== "1") return false;
                hasDigits = true;
            }
            return hasDigits && ch !== "_";
        }
        if (ch === "x") {
            index++;
            for(; index < max; index++){
                ch = data[index];
                if (ch === "_") continue;
                if (!isHexCode(data.charCodeAt(index))) return false;
                hasDigits = true;
            }
            return hasDigits && ch !== "_";
        }
        for(; index < max; index++){
            ch = data[index];
            if (ch === "_") continue;
            if (!isOctCode(data.charCodeAt(index))) return false;
            hasDigits = true;
        }
        return hasDigits && ch !== "_";
    }
    if (ch === "_") return false;
    for(; index < max; index++){
        ch = data[index];
        if (ch === "_") continue;
        if (ch === ":") break;
        if (!isDecCode(data.charCodeAt(index))) {
            return false;
        }
        hasDigits = true;
    }
    if (!hasDigits || ch === "_") return false;
    if (ch !== ":") return true;
    return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}
function constructYamlInteger(data) {
    let value = data;
    const digits = [];
    if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
    }
    let sign = 1;
    let ch = value[0];
    if (ch === "-" || ch === "+") {
        if (ch === "-") sign = -1;
        value = value.slice(1);
        ch = value[0];
    }
    if (value === "0") return 0;
    if (ch === "0") {
        if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign * parseInt(value, 16);
        return sign * parseInt(value, 8);
    }
    if (value.indexOf(":") !== -1) {
        value.split(":").forEach((v)=>{
            digits.unshift(parseInt(v, 10));
        });
        let valueInt = 0;
        let base = 1;
        digits.forEach((d)=>{
            valueInt += d * base;
            base *= 60;
        });
        return sign * valueInt;
    }
    return sign * parseInt(value, 10);
}
function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !isNegativeZero(object);
}
const __int = new Type("tag:yaml.org,2002:int", {
    construct: constructYamlInteger,
    defaultStyle: "decimal",
    kind: "scalar",
    predicate: isInteger,
    represent: {
        binary (obj) {
            return obj >= 0 ? `0b${obj.toString(2)}` : `-0b${obj.toString(2).slice(1)}`;
        },
        octal (obj) {
            return obj >= 0 ? `0${obj.toString(8)}` : `-0${obj.toString(8).slice(1)}`;
        },
        decimal (obj) {
            return obj.toString(10);
        },
        hexadecimal (obj) {
            return obj >= 0 ? `0x${obj.toString(16).toUpperCase()}` : `-0x${obj.toString(16).toUpperCase().slice(1)}`;
        }
    },
    resolve: resolveYamlInteger,
    styleAliases: {
        binary: [
            2,
            "bin"
        ],
        decimal: [
            10,
            "dec"
        ],
        hexadecimal: [
            16,
            "hex"
        ],
        octal: [
            8,
            "oct"
        ]
    }
});
const map = new Type("tag:yaml.org,2002:map", {
    construct (data) {
        return data !== null ? data : {
        };
    },
    kind: "mapping"
});
function resolveYamlMerge(data) {
    return data === "<<" || data === null;
}
const merge = new Type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
});
function resolveYamlNull(data) {
    const max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
    return null;
}
function isNull(object) {
    return object === null;
}
const nil = new Type("tag:yaml.org,2002:null", {
    construct: constructYamlNull,
    defaultStyle: "lowercase",
    kind: "scalar",
    predicate: isNull,
    represent: {
        canonical () {
            return "~";
        },
        lowercase () {
            return "null";
        },
        uppercase () {
            return "NULL";
        },
        camelcase () {
            return "Null";
        }
    },
    resolve: resolveYamlNull
});
const _hasOwnProperty = Object.prototype.hasOwnProperty;
const _toString = Object.prototype.toString;
function resolveYamlOmap(data) {
    const objectKeys = [];
    let pairKey = "";
    let pairHasKey = false;
    for (const pair of data){
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        for(pairKey in pair){
            if (_hasOwnProperty.call(pair, pairKey)) {
                if (!pairHasKey) pairHasKey = true;
                else return false;
            }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
        else return false;
    }
    return true;
}
function constructYamlOmap(data) {
    return data !== null ? data : [];
}
const omap = new Type("tag:yaml.org,2002:omap", {
    construct: constructYamlOmap,
    kind: "sequence",
    resolve: resolveYamlOmap
});
const _toString1 = Object.prototype.toString;
function resolveYamlPairs(data) {
    const result = new Array(data.length);
    for(let index = 0; index < data.length; index++){
        const pair = data[index];
        if (_toString1.call(pair) !== "[object Object]") return false;
        const keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [
            keys[0],
            pair[keys[0]]
        ];
    }
    return true;
}
function constructYamlPairs(data) {
    if (data === null) return [];
    const result = new Array(data.length);
    for(let index = 0; index < data.length; index += 1){
        const pair = data[index];
        const keys = Object.keys(pair);
        result[index] = [
            keys[0],
            pair[keys[0]]
        ];
    }
    return result;
}
const pairs = new Type("tag:yaml.org,2002:pairs", {
    construct: constructYamlPairs,
    kind: "sequence",
    resolve: resolveYamlPairs
});
const REGEXP = /^\/(?<regexp>[\s\S]+)\/(?<modifiers>[gismuy]*)$/;
const regexp = new Type("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve (data) {
        if (data === null || !data.length) {
            return false;
        }
        const regexp1 = `${data}`;
        if (regexp1.charAt(0) === "/") {
            if (!REGEXP.test(data)) {
                return false;
            }
            const modifiers = [
                ...regexp1.match(REGEXP)?.groups?.modifiers ?? ""
            ];
            if (new Set(modifiers).size < modifiers.length) {
                return false;
            }
        }
        return true;
    },
    construct (data) {
        const { regexp: regexp1 = `${data}` , modifiers =""  } = `${data}`.match(REGEXP)?.groups ?? {
        };
        return new RegExp(regexp1, modifiers);
    },
    predicate (object) {
        return object instanceof RegExp;
    },
    represent (object) {
        return object.toString();
    }
});
const seq = new Type("tag:yaml.org,2002:seq", {
    construct (data) {
        return data !== null ? data : [];
    },
    kind: "sequence"
});
const _hasOwnProperty1 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
    if (data === null) return true;
    for(const key in data){
        if (_hasOwnProperty1.call(data, key)) {
            if (data[key] !== null) return false;
        }
    }
    return true;
}
function constructYamlSet(data) {
    return data !== null ? data : {
    };
}
const set = new Type("tag:yaml.org,2002:set", {
    construct: constructYamlSet,
    kind: "mapping",
    resolve: resolveYamlSet
});
const str = new Type("tag:yaml.org,2002:str", {
    construct (data) {
        return data !== null ? data : "";
    },
    kind: "scalar"
});
const YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" + "-([0-9][0-9])" + "-([0-9][0-9])$");
const YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" + "-([0-9][0-9]?)" + "-([0-9][0-9]?)" + "(?:[Tt]|[ \\t]+)" + "([0-9][0-9]?)" + ":([0-9][0-9])" + ":([0-9][0-9])" + "(?:\\.([0-9]*))?" + "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" + "(?::([0-9][0-9]))?))?$");
function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
}
function constructYamlTimestamp(data) {
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null) throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    let fraction = 0;
    if (match[7]) {
        let partFraction = match[7].slice(0, 3);
        while(partFraction.length < 3){
            partFraction += "0";
        }
        fraction = +partFraction;
    }
    let delta = null;
    if (match[9]) {
        const tzHour = +match[10];
        const tzMinute = +(match[11] || 0);
        delta = (tzHour * 60 + tzMinute) * 60000;
        if (match[9] === "-") delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
}
function representYamlTimestamp(date) {
    return date.toISOString();
}
const timestamp = new Type("tag:yaml.org,2002:timestamp", {
    construct: constructYamlTimestamp,
    instanceOf: Date,
    kind: "scalar",
    represent: representYamlTimestamp,
    resolve: resolveYamlTimestamp
});
const undefinedType = new Type("tag:yaml.org,2002:js/undefined", {
    kind: "scalar",
    resolve () {
        return true;
    },
    construct () {
        return undefined;
    },
    predicate (object) {
        return typeof object === "undefined";
    },
    represent () {
        return "";
    }
});
const failsafe = new Schema({
    explicit: [
        str,
        seq,
        map
    ]
});
const json1 = new Schema({
    implicit: [
        nil,
        bool,
        __int,
        __float
    ],
    include: [
        failsafe
    ]
});
const core = new Schema({
    include: [
        json1
    ]
});
const def = new Schema({
    explicit: [
        binary,
        omap,
        pairs,
        set
    ],
    implicit: [
        timestamp,
        merge
    ],
    include: [
        core
    ]
});
const extended = new Schema({
    explicit: [
        func,
        regexp,
        undefinedType
    ],
    include: [
        def
    ]
});
class State {
    schema;
    constructor(schema = def){
        this.schema = schema;
    }
}
class LoaderState extends State {
    input;
    documents = [];
    length;
    lineIndent = 0;
    lineStart = 0;
    position = 0;
    line = 0;
    filename;
    onWarning;
    legacy;
    json;
    listener;
    implicitTypes;
    typeMap;
    version;
    checkLineBreaks;
    tagMap;
    anchorMap;
    tag;
    anchor;
    kind;
    result = "";
    constructor(input, { filename , schema: schema1 , onWarning , legacy =false , json: json2 = false , listener =null  }){
        super(schema1);
        this.input = input;
        this.filename = filename;
        this.onWarning = onWarning;
        this.legacy = legacy;
        this.json = json2;
        this.listener = listener;
        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap = this.schema.compiledTypeMap;
        this.length = input.length;
    }
}
const _hasOwnProperty2 = Object.prototype.hasOwnProperty;
const CONTEXT_BLOCK_IN = 3;
const CONTEXT_BLOCK_OUT = 4;
const CHOMPING_STRIP = 2;
const CHOMPING_KEEP = 3;
const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
const PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
const PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
const PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
    return Object.prototype.toString.call(obj);
}
function isEOL(c) {
    return c === 10 || c === 13;
}
function isWhiteSpace(c) {
    return c === 9 || c === 32;
}
function isWsOrEol(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
}
function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
    if (48 <= c && c <= 57) {
        return c - 48;
    }
    const lc = c | 32;
    if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
    }
    return -1;
}
function escapedHexLen(c) {
    if (c === 120) {
        return 2;
    }
    if (c === 117) {
        return 4;
    }
    if (c === 85) {
        return 8;
    }
    return 0;
}
function fromDecimalCode(c) {
    if (48 <= c && c <= 57) {
        return c - 48;
    }
    return -1;
}
function simpleEscapeSequence(c) {
    return c === 48 ? "\x00" : c === 97 ? "\x07" : c === 98 ? "\x08" : c === 116 ? "\x09" : c === 9 ? "\x09" : c === 110 ? "\x0A" : c === 118 ? "\x0B" : c === 102 ? "\x0C" : c === 114 ? "\x0D" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? "\x22" : c === 47 ? "/" : c === 92 ? "\x5C" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
    if (c <= 65535) {
        return String.fromCharCode(c);
    }
    return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
const simpleEscapeCheck = new Array(256);
const simpleEscapeMap = new Array(256);
for(let i = 0; i < 256; i++){
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function generateError(state1, message3) {
    return new YAMLError(message3, new Mark(state1.filename, state1.input, state1.position, state1.line, state1.position - state1.lineStart));
}
function throwError(state1, message3) {
    throw generateError(state1, message3);
}
function throwWarning(state1, message3) {
    if (state1.onWarning) {
        state1.onWarning.call(null, generateError(state1, message3));
    }
}
const directiveHandlers = {
    YAML (state, _name, ...args) {
        if (state.version !== null) {
            return throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
            return throwError(state, "YAML directive accepts exactly one argument");
        }
        const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
            return throwError(state, "ill-formed argument of the YAML directive");
        }
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        if (major !== 1) {
            return throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
            return throwWarning(state, "unsupported YAML version of the document");
        }
    },
    TAG (state, _name, ...args) {
        if (args.length !== 2) {
            return throwError(state, "TAG directive accepts exactly two arguments");
        }
        const handle = args[0];
        const prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
            return throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty2.call(state.tagMap, handle)) {
            return throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
            return throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        if (typeof state.tagMap === "undefined") {
            state.tagMap = {
            };
        }
        state.tagMap[handle] = prefix;
    }
};
function captureSegment(state2, start, end, checkJson) {
    let result;
    if (start < end) {
        result = state2.input.slice(start, end);
        if (checkJson) {
            for(let position2 = 0, length = result.length; position2 < length; position2++){
                const character = result.charCodeAt(position2);
                if (!(character === 9 || 32 <= character && character <= 1114111)) {
                    return throwError(state2, "expected valid JSON character");
                }
            }
        } else if (PATTERN_NON_PRINTABLE.test(result)) {
            return throwError(state2, "the stream contains non-printable characters");
        }
        state2.result += result;
    }
}
function mergeMappings(state2, destination, source, overridableKeys) {
    if (!isObject(source)) {
        return throwError(state2, "cannot merge mappings; the provided source object is unacceptable");
    }
    const keys = Object.keys(source);
    for(let i1 = 0, len = keys.length; i1 < len; i1++){
        const key = keys[i1];
        if (!_hasOwnProperty2.call(destination, key)) {
            destination[key] = source[key];
            overridableKeys[key] = true;
        }
    }
}
function storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
    if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for(let index = 0, quantity = keyNode.length; index < quantity; index++){
            if (Array.isArray(keyNode[index])) {
                return throwError(state2, "nested arrays are not supported inside keys");
            }
            if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
                keyNode[index] = "[object Object]";
            }
        }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (result === null) {
        result = {
        };
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
            for(let index = 0, quantity = valueNode.length; index < quantity; index++){
                mergeMappings(state2, result, valueNode[index], overridableKeys);
            }
        } else {
            mergeMappings(state2, result, valueNode, overridableKeys);
        }
    } else {
        if (!state2.json && !_hasOwnProperty2.call(overridableKeys, keyNode) && _hasOwnProperty2.call(result, keyNode)) {
            state2.line = startLine || state2.line;
            state2.position = startPos || state2.position;
            return throwError(state2, "duplicated mapping key");
        }
        result[keyNode] = valueNode;
        delete overridableKeys[keyNode];
    }
    return result;
}
function readLineBreak(state2) {
    const ch = state2.input.charCodeAt(state2.position);
    if (ch === 10) {
        state2.position++;
    } else if (ch === 13) {
        state2.position++;
        if (state2.input.charCodeAt(state2.position) === 10) {
            state2.position++;
        }
    } else {
        return throwError(state2, "a line break is expected");
    }
    state2.line += 1;
    state2.lineStart = state2.position;
}
function skipSeparationSpace(state2, allowComments, checkIndent) {
    let lineBreaks = 0, ch = state2.input.charCodeAt(state2.position);
    while(ch !== 0){
        while(isWhiteSpace(ch)){
            ch = state2.input.charCodeAt(++state2.position);
        }
        if (allowComments && ch === 35) {
            do {
                ch = state2.input.charCodeAt(++state2.position);
            }while (ch !== 10 && ch !== 13 && ch !== 0)
        }
        if (isEOL(ch)) {
            readLineBreak(state2);
            ch = state2.input.charCodeAt(state2.position);
            lineBreaks++;
            state2.lineIndent = 0;
            while(ch === 32){
                state2.lineIndent++;
                ch = state2.input.charCodeAt(++state2.position);
            }
        } else {
            break;
        }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state2.lineIndent < checkIndent) {
        throwWarning(state2, "deficient indentation");
    }
    return lineBreaks;
}
function testDocumentSeparator(state2) {
    let _position = state2.position;
    let ch = state2.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state2.input.charCodeAt(_position + 1) && ch === state2.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state2.input.charCodeAt(_position);
        if (ch === 0 || isWsOrEol(ch)) {
            return true;
        }
    }
    return false;
}
function writeFoldedLines(state2, count) {
    if (count === 1) {
        state2.result += " ";
    } else if (count > 1) {
        state2.result += repeat("\n", count - 1);
    }
}
function readPlainScalar(state2, nodeIndent, withinFlowCollection) {
    const kind = state2.kind;
    const result = state2.result;
    let ch = state2.input.charCodeAt(state2.position);
    if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
    }
    let following;
    if (ch === 63 || ch === 45) {
        following = state2.input.charCodeAt(state2.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
            return false;
        }
    }
    state2.kind = "scalar";
    state2.result = "";
    let captureEnd, captureStart = captureEnd = state2.position;
    let hasPendingContent = false;
    let line2 = 0;
    while(ch !== 0){
        if (ch === 58) {
            following = state2.input.charCodeAt(state2.position + 1);
            if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
                break;
            }
        } else if (ch === 35) {
            const preceding = state2.input.charCodeAt(state2.position - 1);
            if (isWsOrEol(preceding)) {
                break;
            }
        } else if (state2.position === state2.lineStart && testDocumentSeparator(state2) || withinFlowCollection && isFlowIndicator(ch)) {
            break;
        } else if (isEOL(ch)) {
            line2 = state2.line;
            const lineStart = state2.lineStart;
            const lineIndent = state2.lineIndent;
            skipSeparationSpace(state2, false, -1);
            if (state2.lineIndent >= nodeIndent) {
                hasPendingContent = true;
                ch = state2.input.charCodeAt(state2.position);
                continue;
            } else {
                state2.position = captureEnd;
                state2.line = line2;
                state2.lineStart = lineStart;
                state2.lineIndent = lineIndent;
                break;
            }
        }
        if (hasPendingContent) {
            captureSegment(state2, captureStart, captureEnd, false);
            writeFoldedLines(state2, state2.line - line2);
            captureStart = captureEnd = state2.position;
            hasPendingContent = false;
        }
        if (!isWhiteSpace(ch)) {
            captureEnd = state2.position + 1;
        }
        ch = state2.input.charCodeAt(++state2.position);
    }
    captureSegment(state2, captureStart, captureEnd, false);
    if (state2.result) {
        return true;
    }
    state2.kind = kind;
    state2.result = result;
    return false;
}
function readSingleQuotedScalar(state2, nodeIndent) {
    let ch, captureStart, captureEnd;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 39) {
        return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    state2.position++;
    captureStart = captureEnd = state2.position;
    while((ch = state2.input.charCodeAt(state2.position)) !== 0){
        if (ch === 39) {
            captureSegment(state2, captureStart, state2.position, true);
            ch = state2.input.charCodeAt(++state2.position);
            if (ch === 39) {
                captureStart = state2.position;
                state2.position++;
                captureEnd = state2.position;
            } else {
                return true;
            }
        } else if (isEOL(ch)) {
            captureSegment(state2, captureStart, captureEnd, true);
            writeFoldedLines(state2, skipSeparationSpace(state2, false, nodeIndent));
            captureStart = captureEnd = state2.position;
        } else if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
            return throwError(state2, "unexpected end of the document within a single quoted scalar");
        } else {
            state2.position++;
            captureEnd = state2.position;
        }
    }
    return throwError(state2, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state2, nodeIndent) {
    let ch = state2.input.charCodeAt(state2.position);
    if (ch !== 34) {
        return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    state2.position++;
    let captureEnd, captureStart = captureEnd = state2.position;
    let tmp;
    while((ch = state2.input.charCodeAt(state2.position)) !== 0){
        if (ch === 34) {
            captureSegment(state2, captureStart, state2.position, true);
            state2.position++;
            return true;
        }
        if (ch === 92) {
            captureSegment(state2, captureStart, state2.position, true);
            ch = state2.input.charCodeAt(++state2.position);
            if (isEOL(ch)) {
                skipSeparationSpace(state2, false, nodeIndent);
            } else if (ch < 256 && simpleEscapeCheck[ch]) {
                state2.result += simpleEscapeMap[ch];
                state2.position++;
            } else if ((tmp = escapedHexLen(ch)) > 0) {
                let hexLength = tmp;
                let hexResult = 0;
                for(; hexLength > 0; hexLength--){
                    ch = state2.input.charCodeAt(++state2.position);
                    if ((tmp = fromHexCode(ch)) >= 0) {
                        hexResult = (hexResult << 4) + tmp;
                    } else {
                        return throwError(state2, "expected hexadecimal character");
                    }
                }
                state2.result += charFromCodepoint(hexResult);
                state2.position++;
            } else {
                return throwError(state2, "unknown escape sequence");
            }
            captureStart = captureEnd = state2.position;
        } else if (isEOL(ch)) {
            captureSegment(state2, captureStart, captureEnd, true);
            writeFoldedLines(state2, skipSeparationSpace(state2, false, nodeIndent));
            captureStart = captureEnd = state2.position;
        } else if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
            return throwError(state2, "unexpected end of the document within a double quoted scalar");
        } else {
            state2.position++;
            captureEnd = state2.position;
        }
    }
    return throwError(state2, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state2, nodeIndent) {
    let ch = state2.input.charCodeAt(state2.position);
    let terminator;
    let isMapping = true;
    let result = {
    };
    if (ch === 91) {
        terminator = 93;
        isMapping = false;
        result = [];
    } else if (ch === 123) {
        terminator = 125;
    } else {
        return false;
    }
    if (state2.anchor !== null && typeof state2.anchor != "undefined" && typeof state2.anchorMap != "undefined") {
        state2.anchorMap[state2.anchor] = result;
    }
    ch = state2.input.charCodeAt(++state2.position);
    const tag2 = state2.tag, anchor = state2.anchor;
    let readNext = true;
    let valueNode, keyNode, keyTag = keyNode = valueNode = null, isExplicitPair, isPair = isExplicitPair = false;
    let following = 0, line2 = 0;
    const overridableKeys = {
    };
    while(ch !== 0){
        skipSeparationSpace(state2, true, nodeIndent);
        ch = state2.input.charCodeAt(state2.position);
        if (ch === terminator) {
            state2.position++;
            state2.tag = tag2;
            state2.anchor = anchor;
            state2.kind = isMapping ? "mapping" : "sequence";
            state2.result = result;
            return true;
        }
        if (!readNext) {
            return throwError(state2, "missed comma between flow collection entries");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
            following = state2.input.charCodeAt(state2.position + 1);
            if (isWsOrEol(following)) {
                isPair = isExplicitPair = true;
                state2.position++;
                skipSeparationSpace(state2, true, nodeIndent);
            }
        }
        line2 = state2.line;
        composeNode(state2, nodeIndent, 1, false, true);
        keyTag = state2.tag || null;
        keyNode = state2.result;
        skipSeparationSpace(state2, true, nodeIndent);
        ch = state2.input.charCodeAt(state2.position);
        if ((isExplicitPair || state2.line === line2) && ch === 58) {
            isPair = true;
            ch = state2.input.charCodeAt(++state2.position);
            skipSeparationSpace(state2, true, nodeIndent);
            composeNode(state2, nodeIndent, 1, false, true);
            valueNode = state2.result;
        }
        if (isMapping) {
            storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, valueNode);
        } else if (isPair) {
            result.push(storeMappingPair(state2, null, overridableKeys, keyTag, keyNode, valueNode));
        } else {
            result.push(keyNode);
        }
        skipSeparationSpace(state2, true, nodeIndent);
        ch = state2.input.charCodeAt(state2.position);
        if (ch === 44) {
            readNext = true;
            ch = state2.input.charCodeAt(++state2.position);
        } else {
            readNext = false;
        }
    }
    return throwError(state2, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state2, nodeIndent) {
    let chomping = 1, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false;
    let ch = state2.input.charCodeAt(state2.position);
    let folding = false;
    if (ch === 124) {
        folding = false;
    } else if (ch === 62) {
        folding = true;
    } else {
        return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    let tmp = 0;
    while(ch !== 0){
        ch = state2.input.charCodeAt(++state2.position);
        if (ch === 43 || ch === 45) {
            if (1 === chomping) {
                chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
            } else {
                return throwError(state2, "repeat of a chomping mode identifier");
            }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
            if (tmp === 0) {
                return throwError(state2, "bad explicit indentation width of a block scalar; it cannot be less than one");
            } else if (!detectedIndent) {
                textIndent = nodeIndent + tmp - 1;
                detectedIndent = true;
            } else {
                return throwError(state2, "repeat of an indentation width identifier");
            }
        } else {
            break;
        }
    }
    if (isWhiteSpace(ch)) {
        do {
            ch = state2.input.charCodeAt(++state2.position);
        }while (isWhiteSpace(ch))
        if (ch === 35) {
            do {
                ch = state2.input.charCodeAt(++state2.position);
            }while (!isEOL(ch) && ch !== 0)
        }
    }
    while(ch !== 0){
        readLineBreak(state2);
        state2.lineIndent = 0;
        ch = state2.input.charCodeAt(state2.position);
        while((!detectedIndent || state2.lineIndent < textIndent) && ch === 32){
            state2.lineIndent++;
            ch = state2.input.charCodeAt(++state2.position);
        }
        if (!detectedIndent && state2.lineIndent > textIndent) {
            textIndent = state2.lineIndent;
        }
        if (isEOL(ch)) {
            emptyLines++;
            continue;
        }
        if (state2.lineIndent < textIndent) {
            if (chomping === 3) {
                state2.result += repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            } else if (chomping === 1) {
                if (didReadContent) {
                    state2.result += "\n";
                }
            }
            break;
        }
        if (folding) {
            if (isWhiteSpace(ch)) {
                atMoreIndented = true;
                state2.result += repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            } else if (atMoreIndented) {
                atMoreIndented = false;
                state2.result += repeat("\n", emptyLines + 1);
            } else if (emptyLines === 0) {
                if (didReadContent) {
                    state2.result += " ";
                }
            } else {
                state2.result += repeat("\n", emptyLines);
            }
        } else {
            state2.result += repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        const captureStart = state2.position;
        while(!isEOL(ch) && ch !== 0){
            ch = state2.input.charCodeAt(++state2.position);
        }
        captureSegment(state2, captureStart, state2.position, false);
    }
    return true;
}
function readBlockSequence(state2, nodeIndent) {
    let line2, following, detected = false, ch;
    const tag2 = state2.tag, anchor = state2.anchor, result = [];
    if (state2.anchor !== null && typeof state2.anchor !== "undefined" && typeof state2.anchorMap !== "undefined") {
        state2.anchorMap[state2.anchor] = result;
    }
    ch = state2.input.charCodeAt(state2.position);
    while(ch !== 0){
        if (ch !== 45) {
            break;
        }
        following = state2.input.charCodeAt(state2.position + 1);
        if (!isWsOrEol(following)) {
            break;
        }
        detected = true;
        state2.position++;
        if (skipSeparationSpace(state2, true, -1)) {
            if (state2.lineIndent <= nodeIndent) {
                result.push(null);
                ch = state2.input.charCodeAt(state2.position);
                continue;
            }
        }
        line2 = state2.line;
        composeNode(state2, nodeIndent, 3, false, true);
        result.push(state2.result);
        skipSeparationSpace(state2, true, -1);
        ch = state2.input.charCodeAt(state2.position);
        if ((state2.line === line2 || state2.lineIndent > nodeIndent) && ch !== 0) {
            return throwError(state2, "bad indentation of a sequence entry");
        } else if (state2.lineIndent < nodeIndent) {
            break;
        }
    }
    if (detected) {
        state2.tag = tag2;
        state2.anchor = anchor;
        state2.kind = "sequence";
        state2.result = result;
        return true;
    }
    return false;
}
function readBlockMapping(state2, nodeIndent, flowIndent) {
    const tag2 = state2.tag, anchor = state2.anchor, result = {
    }, overridableKeys = {
    };
    let following, allowCompact = false, line2, pos, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
    if (state2.anchor !== null && typeof state2.anchor !== "undefined" && typeof state2.anchorMap !== "undefined") {
        state2.anchorMap[state2.anchor] = result;
    }
    ch = state2.input.charCodeAt(state2.position);
    while(ch !== 0){
        following = state2.input.charCodeAt(state2.position + 1);
        line2 = state2.line;
        pos = state2.position;
        if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
            if (ch === 63) {
                if (atExplicitKey) {
                    storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, null);
                    keyTag = keyNode = valueNode = null;
                }
                detected = true;
                atExplicitKey = true;
                allowCompact = true;
            } else if (atExplicitKey) {
                atExplicitKey = false;
                allowCompact = true;
            } else {
                return throwError(state2, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
            }
            state2.position += 1;
            ch = following;
        } else if (composeNode(state2, flowIndent, 2, false, true)) {
            if (state2.line === line2) {
                ch = state2.input.charCodeAt(state2.position);
                while(isWhiteSpace(ch)){
                    ch = state2.input.charCodeAt(++state2.position);
                }
                if (ch === 58) {
                    ch = state2.input.charCodeAt(++state2.position);
                    if (!isWsOrEol(ch)) {
                        return throwError(state2, "a whitespace character is expected after the key-value separator within a block mapping");
                    }
                    if (atExplicitKey) {
                        storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, null);
                        keyTag = keyNode = valueNode = null;
                    }
                    detected = true;
                    atExplicitKey = false;
                    allowCompact = false;
                    keyTag = state2.tag;
                    keyNode = state2.result;
                } else if (detected) {
                    return throwError(state2, "can not read an implicit mapping pair; a colon is missed");
                } else {
                    state2.tag = tag2;
                    state2.anchor = anchor;
                    return true;
                }
            } else if (detected) {
                return throwError(state2, "can not read a block mapping entry; a multiline key may not be an implicit key");
            } else {
                state2.tag = tag2;
                state2.anchor = anchor;
                return true;
            }
        } else {
            break;
        }
        if (state2.line === line2 || state2.lineIndent > nodeIndent) {
            if (composeNode(state2, nodeIndent, 4, true, allowCompact)) {
                if (atExplicitKey) {
                    keyNode = state2.result;
                } else {
                    valueNode = state2.result;
                }
            }
            if (!atExplicitKey) {
                storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, valueNode, line2, pos);
                keyTag = keyNode = valueNode = null;
            }
            skipSeparationSpace(state2, true, -1);
            ch = state2.input.charCodeAt(state2.position);
        }
        if (state2.lineIndent > nodeIndent && ch !== 0) {
            return throwError(state2, "bad indentation of a mapping entry");
        } else if (state2.lineIndent < nodeIndent) {
            break;
        }
    }
    if (atExplicitKey) {
        storeMappingPair(state2, result, overridableKeys, keyTag, keyNode, null);
    }
    if (detected) {
        state2.tag = tag2;
        state2.anchor = anchor;
        state2.kind = "mapping";
        state2.result = result;
    }
    return detected;
}
function readTagProperty(state2) {
    let position2, isVerbatim = false, isNamed = false, tagHandle = "", tagName, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 33) return false;
    if (state2.tag !== null) {
        return throwError(state2, "duplication of a tag property");
    }
    ch = state2.input.charCodeAt(++state2.position);
    if (ch === 60) {
        isVerbatim = true;
        ch = state2.input.charCodeAt(++state2.position);
    } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state2.input.charCodeAt(++state2.position);
    } else {
        tagHandle = "!";
    }
    position2 = state2.position;
    if (isVerbatim) {
        do {
            ch = state2.input.charCodeAt(++state2.position);
        }while (ch !== 0 && ch !== 62)
        if (state2.position < state2.length) {
            tagName = state2.input.slice(position2, state2.position);
            ch = state2.input.charCodeAt(++state2.position);
        } else {
            return throwError(state2, "unexpected end of the stream within a verbatim tag");
        }
    } else {
        while(ch !== 0 && !isWsOrEol(ch)){
            if (ch === 33) {
                if (!isNamed) {
                    tagHandle = state2.input.slice(position2 - 1, state2.position + 1);
                    if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                        return throwError(state2, "named tag handle cannot contain such characters");
                    }
                    isNamed = true;
                    position2 = state2.position + 1;
                } else {
                    return throwError(state2, "tag suffix cannot contain exclamation marks");
                }
            }
            ch = state2.input.charCodeAt(++state2.position);
        }
        tagName = state2.input.slice(position2, state2.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
            return throwError(state2, "tag suffix cannot contain flow indicator characters");
        }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        return throwError(state2, `tag name cannot contain such characters: ${tagName}`);
    }
    if (isVerbatim) {
        state2.tag = tagName;
    } else if (typeof state2.tagMap !== "undefined" && _hasOwnProperty2.call(state2.tagMap, tagHandle)) {
        state2.tag = state2.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
        state2.tag = `!${tagName}`;
    } else if (tagHandle === "!!") {
        state2.tag = `tag:yaml.org,2002:${tagName}`;
    } else {
        return throwError(state2, `undeclared tag handle "${tagHandle}"`);
    }
    return true;
}
function readAnchorProperty(state2) {
    let ch = state2.input.charCodeAt(state2.position);
    if (ch !== 38) return false;
    if (state2.anchor !== null) {
        return throwError(state2, "duplication of an anchor property");
    }
    ch = state2.input.charCodeAt(++state2.position);
    const position2 = state2.position;
    while(ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)){
        ch = state2.input.charCodeAt(++state2.position);
    }
    if (state2.position === position2) {
        return throwError(state2, "name of an anchor node must contain at least one character");
    }
    state2.anchor = state2.input.slice(position2, state2.position);
    return true;
}
function readAlias(state2) {
    let ch = state2.input.charCodeAt(state2.position);
    if (ch !== 42) return false;
    ch = state2.input.charCodeAt(++state2.position);
    const _position = state2.position;
    while(ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)){
        ch = state2.input.charCodeAt(++state2.position);
    }
    if (state2.position === _position) {
        return throwError(state2, "name of an alias node must contain at least one character");
    }
    const alias = state2.input.slice(_position, state2.position);
    if (typeof state2.anchorMap !== "undefined" && !Object.prototype.hasOwnProperty.call(state2.anchorMap, alias)) {
        return throwError(state2, `unidentified alias "${alias}"`);
    }
    if (typeof state2.anchorMap !== "undefined") {
        state2.result = state2.anchorMap[alias];
    }
    skipSeparationSpace(state2, true, -1);
    return true;
}
function composeNode(state2, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, type1, flowIndent, blockIndent;
    if (state2.listener && state2.listener !== null) {
        state2.listener("open", state2);
    }
    state2.tag = null;
    state2.anchor = null;
    state2.kind = null;
    state2.result = null;
    const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
        if (skipSeparationSpace(state2, true, -1)) {
            atNewLine = true;
            if (state2.lineIndent > parentIndent) {
                indentStatus = 1;
            } else if (state2.lineIndent === parentIndent) {
                indentStatus = 0;
            } else if (state2.lineIndent < parentIndent) {
                indentStatus = -1;
            }
        }
    }
    if (indentStatus === 1) {
        while(readTagProperty(state2) || readAnchorProperty(state2)){
            if (skipSeparationSpace(state2, true, -1)) {
                atNewLine = true;
                allowBlockCollections = allowBlockStyles;
                if (state2.lineIndent > parentIndent) {
                    indentStatus = 1;
                } else if (state2.lineIndent === parentIndent) {
                    indentStatus = 0;
                } else if (state2.lineIndent < parentIndent) {
                    indentStatus = -1;
                }
            } else {
                allowBlockCollections = false;
            }
        }
    }
    if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || 4 === nodeContext) {
        const cond = 1 === nodeContext || 2 === nodeContext;
        flowIndent = cond ? parentIndent : parentIndent + 1;
        blockIndent = state2.position - state2.lineStart;
        if (indentStatus === 1) {
            if (allowBlockCollections && (readBlockSequence(state2, blockIndent) || readBlockMapping(state2, blockIndent, flowIndent)) || readFlowCollection(state2, flowIndent)) {
                hasContent = true;
            } else {
                if (allowBlockScalars && readBlockScalar(state2, flowIndent) || readSingleQuotedScalar(state2, flowIndent) || readDoubleQuotedScalar(state2, flowIndent)) {
                    hasContent = true;
                } else if (readAlias(state2)) {
                    hasContent = true;
                    if (state2.tag !== null || state2.anchor !== null) {
                        return throwError(state2, "alias node should not have Any properties");
                    }
                } else if (readPlainScalar(state2, flowIndent, 1 === nodeContext)) {
                    hasContent = true;
                    if (state2.tag === null) {
                        state2.tag = "?";
                    }
                }
                if (state2.anchor !== null && typeof state2.anchorMap !== "undefined") {
                    state2.anchorMap[state2.anchor] = state2.result;
                }
            }
        } else if (indentStatus === 0) {
            hasContent = allowBlockCollections && readBlockSequence(state2, blockIndent);
        }
    }
    if (state2.tag !== null && state2.tag !== "!") {
        if (state2.tag === "?") {
            for(let typeIndex = 0, typeQuantity = state2.implicitTypes.length; typeIndex < typeQuantity; typeIndex++){
                type1 = state2.implicitTypes[typeIndex];
                if (type1.resolve(state2.result)) {
                    state2.result = type1.construct(state2.result);
                    state2.tag = type1.tag;
                    if (state2.anchor !== null && typeof state2.anchorMap !== "undefined") {
                        state2.anchorMap[state2.anchor] = state2.result;
                    }
                    break;
                }
            }
        } else if (_hasOwnProperty2.call(state2.typeMap[state2.kind || "fallback"], state2.tag)) {
            type1 = state2.typeMap[state2.kind || "fallback"][state2.tag];
            if (state2.result !== null && type1.kind !== state2.kind) {
                return throwError(state2, `unacceptable node kind for !<${state2.tag}> tag; it should be "${type1.kind}", not "${state2.kind}"`);
            }
            if (!type1.resolve(state2.result)) {
                return throwError(state2, `cannot resolve a node with !<${state2.tag}> explicit tag`);
            } else {
                state2.result = type1.construct(state2.result);
                if (state2.anchor !== null && typeof state2.anchorMap !== "undefined") {
                    state2.anchorMap[state2.anchor] = state2.result;
                }
            }
        } else {
            return throwError(state2, `unknown tag !<${state2.tag}>`);
        }
    }
    if (state2.listener && state2.listener !== null) {
        state2.listener("close", state2);
    }
    return state2.tag !== null || state2.anchor !== null || hasContent;
}
function readDocument(state2) {
    const documentStart = state2.position;
    let position2, directiveName, directiveArgs, hasDirectives = false, ch;
    state2.version = null;
    state2.checkLineBreaks = state2.legacy;
    state2.tagMap = {
    };
    state2.anchorMap = {
    };
    while((ch = state2.input.charCodeAt(state2.position)) !== 0){
        skipSeparationSpace(state2, true, -1);
        ch = state2.input.charCodeAt(state2.position);
        if (state2.lineIndent > 0 || ch !== 37) {
            break;
        }
        hasDirectives = true;
        ch = state2.input.charCodeAt(++state2.position);
        position2 = state2.position;
        while(ch !== 0 && !isWsOrEol(ch)){
            ch = state2.input.charCodeAt(++state2.position);
        }
        directiveName = state2.input.slice(position2, state2.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
            return throwError(state2, "directive name must not be less than one character in length");
        }
        while(ch !== 0){
            while(isWhiteSpace(ch)){
                ch = state2.input.charCodeAt(++state2.position);
            }
            if (ch === 35) {
                do {
                    ch = state2.input.charCodeAt(++state2.position);
                }while (ch !== 0 && !isEOL(ch))
                break;
            }
            if (isEOL(ch)) break;
            position2 = state2.position;
            while(ch !== 0 && !isWsOrEol(ch)){
                ch = state2.input.charCodeAt(++state2.position);
            }
            directiveArgs.push(state2.input.slice(position2, state2.position));
        }
        if (ch !== 0) readLineBreak(state2);
        if (_hasOwnProperty2.call(directiveHandlers, directiveName)) {
            directiveHandlers[directiveName](state2, directiveName, ...directiveArgs);
        } else {
            throwWarning(state2, `unknown document directive "${directiveName}"`);
        }
    }
    skipSeparationSpace(state2, true, -1);
    if (state2.lineIndent === 0 && state2.input.charCodeAt(state2.position) === 45 && state2.input.charCodeAt(state2.position + 1) === 45 && state2.input.charCodeAt(state2.position + 2) === 45) {
        state2.position += 3;
        skipSeparationSpace(state2, true, -1);
    } else if (hasDirectives) {
        return throwError(state2, "directives end mark is expected");
    }
    composeNode(state2, state2.lineIndent - 1, 4, false, true);
    skipSeparationSpace(state2, true, -1);
    if (state2.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state2.input.slice(documentStart, state2.position))) {
        throwWarning(state2, "non-ASCII line breaks are interpreted as content");
    }
    state2.documents.push(state2.result);
    if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
        if (state2.input.charCodeAt(state2.position) === 46) {
            state2.position += 3;
            skipSeparationSpace(state2, true, -1);
        }
        return;
    }
    if (state2.position < state2.length - 1) {
        return throwError(state2, "end of the stream or a document separator is expected");
    } else {
        return;
    }
}
function loadDocuments(input1, options7) {
    input1 = String(input1);
    options7 = options7 || {
    };
    if (input1.length !== 0) {
        if (input1.charCodeAt(input1.length - 1) !== 10 && input1.charCodeAt(input1.length - 1) !== 13) {
            input1 += "\n";
        }
        if (input1.charCodeAt(0) === 65279) {
            input1 = input1.slice(1);
        }
    }
    const state2 = new LoaderState(input1, options7);
    state2.input += "\0";
    while(state2.input.charCodeAt(state2.position) === 32){
        state2.lineIndent += 1;
        state2.position += 1;
    }
    while(state2.position < state2.length - 1){
        readDocument(state2);
    }
    return state2.documents;
}
function load(input1, options7) {
    const documents = loadDocuments(input1, options7);
    if (documents.length === 0) {
        return;
    }
    if (documents.length === 1) {
        return documents[0];
    }
    throw new YAMLError("expected a single document in the stream, but found more");
}
function parse4(content, options7) {
    return load(content, options7);
}
const _hasOwnProperty3 = Object.prototype.hasOwnProperty;
function compileStyleMap(schema2, map1) {
    if (typeof map1 === "undefined" || map1 === null) return {
    };
    let type1;
    const result = {
    };
    const keys = Object.keys(map1);
    let tag2, style;
    for(let index = 0, length = keys.length; index < length; index += 1){
        tag2 = keys[index];
        style = String(map1[tag2]);
        if (tag2.slice(0, 2) === "!!") {
            tag2 = `tag:yaml.org,2002:${tag2.slice(2)}`;
        }
        type1 = schema2.compiledTypeMap.fallback[tag2];
        if (type1 && typeof type1.styleAliases !== "undefined" && _hasOwnProperty3.call(type1.styleAliases, style)) {
            style = type1.styleAliases[style];
        }
        result[tag2] = style;
    }
    return result;
}
class DumperState extends State {
    indent;
    noArrayIndent;
    skipInvalid;
    flowLevel;
    sortKeys;
    lineWidth;
    noRefs;
    noCompatMode;
    condenseFlow;
    implicitTypes;
    explicitTypes;
    tag = null;
    result = "";
    duplicates = [];
    usedDuplicates = [];
    styleMap;
    dump;
    constructor({ schema: schema2 , indent =2 , noArrayIndent =false , skipInvalid =false , flowLevel =-1 , styles =null , sortKeys =false , lineWidth =80 , noRefs =false , noCompatMode =false , condenseFlow =false  }){
        super(schema2);
        this.indent = Math.max(1, indent);
        this.noArrayIndent = noArrayIndent;
        this.skipInvalid = skipInvalid;
        this.flowLevel = flowLevel;
        this.styleMap = compileStyleMap(this.schema, styles);
        this.sortKeys = sortKeys;
        this.lineWidth = lineWidth;
        this.noRefs = noRefs;
        this.noCompatMode = noCompatMode;
        this.condenseFlow = condenseFlow;
        this.implicitTypes = this.schema.compiledImplicit;
        this.explicitTypes = this.schema.compiledExplicit;
    }
}
const _toString2 = Object.prototype.toString;
const _hasOwnProperty4 = Object.prototype.hasOwnProperty;
const ESCAPE_SEQUENCES = {
};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
const DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF", 
];
function encodeHex(character) {
    const string = character.toString(16).toUpperCase();
    let handle;
    let length;
    if (character <= 255) {
        handle = "x";
        length = 2;
    } else if (character <= 65535) {
        handle = "u";
        length = 4;
    } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
    } else {
        throw new YAMLError("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return `\\${handle}${repeat("0", length - string.length)}${string}`;
}
function indentString(string, spaces) {
    const ind = repeat(" ", spaces), length = string.length;
    let position2 = 0, next = -1, result = "", line2;
    while(position2 < length){
        next = string.indexOf("\n", position2);
        if (next === -1) {
            line2 = string.slice(position2);
            position2 = length;
        } else {
            line2 = string.slice(position2, next + 1);
            position2 = next + 1;
        }
        if (line2.length && line2 !== "\n") result += ind;
        result += line2;
    }
    return result;
}
function generateNextLine(state2, level) {
    return `\n${repeat(" ", state2.indent * level)}`;
}
function testImplicitResolving(state2, str1) {
    let type1;
    for(let index = 0, length = state2.implicitTypes.length; index < length; index += 1){
        type1 = state2.implicitTypes[index];
        if (type1.resolve(str1)) {
            return true;
        }
    }
    return false;
}
function isWhitespace(c) {
    return c === 32 || c === 9;
}
function isPrintable(c) {
    return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== 65279 || 65536 <= c && c <= 1114111;
}
function isPlainSafe(c) {
    return isPrintable(c) && c !== 65279 && c !== 44 && c !== 91 && c !== 93 && c !== 123 && c !== 125 && c !== 58 && c !== 35;
}
function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== 65279 && !isWhitespace(c) && c !== 45 && c !== 63 && c !== 58 && c !== 44 && c !== 91 && c !== 93 && c !== 123 && c !== 125 && c !== 35 && c !== 38 && c !== 42 && c !== 33 && c !== 124 && c !== 62 && c !== 39 && c !== 34 && c !== 37 && c !== 64 && c !== 96;
}
function needIndentIndicator(string) {
    const leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
}
const STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth1, testAmbiguousType) {
    const shouldTrackWidth = lineWidth1 !== -1;
    let hasLineBreak = false, hasFoldableLine = false, previousLineBreak = -1, plain = isPlainSafeFirst(string.charCodeAt(0)) && !isWhitespace(string.charCodeAt(string.length - 1));
    let __char, i1;
    if (singleLineOnly) {
        for(i1 = 0; i1 < string.length; i1++){
            __char = string.charCodeAt(i1);
            if (!isPrintable(__char)) {
                return 5;
            }
            plain = plain && isPlainSafe(__char);
        }
    } else {
        for(i1 = 0; i1 < string.length; i1++){
            __char = string.charCodeAt(i1);
            if (__char === 10) {
                hasLineBreak = true;
                if (shouldTrackWidth) {
                    hasFoldableLine = hasFoldableLine || i1 - previousLineBreak - 1 > lineWidth1 && string[previousLineBreak + 1] !== " ";
                    previousLineBreak = i1;
                }
            } else if (!isPrintable(__char)) {
                return 5;
            }
            plain = plain && isPlainSafe(__char);
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && i1 - previousLineBreak - 1 > lineWidth1 && string[previousLineBreak + 1] !== " ";
    }
    if (!hasLineBreak && !hasFoldableLine) {
        return plain && !testAmbiguousType(string) ? 1 : 2;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return 5;
    }
    return hasFoldableLine ? 4 : 3;
}
function foldLine(line2, width) {
    if (line2 === "" || line2[0] === " ") return line2;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0, end, curr = 0, next = 0;
    let result = "";
    while(match = breakRe.exec(line2)){
        next = match.index;
        if (next - start > width) {
            end = curr > start ? curr : next;
            result += `\n${line2.slice(start, end)}`;
            start = end + 1;
        }
        curr = next;
    }
    result += "\n";
    if (line2.length - start > width && curr > start) {
        result += `${line2.slice(start, curr)}\n${line2.slice(curr + 1)}`;
    } else {
        result += line2.slice(start);
    }
    return result.slice(1);
}
function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = (()=>{
        let nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
    })();
    let prevMoreIndented = string[0] === "\n" || string[0] === " ";
    let moreIndented;
    let match;
    while(match = lineRe.exec(string)){
        const prefix = match[1], line2 = match[2];
        moreIndented = line2[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line2 !== "" ? "\n" : "") + foldLine(line2, width);
        prevMoreIndented = moreIndented;
    }
    return result;
}
function escapeString(string) {
    let result = "";
    let __char, nextChar;
    let escapeSeq;
    for(let i1 = 0; i1 < string.length; i1++){
        __char = string.charCodeAt(i1);
        if (__char >= 55296 && __char <= 56319) {
            nextChar = string.charCodeAt(i1 + 1);
            if (nextChar >= 56320 && nextChar <= 57343) {
                result += encodeHex((__char - 55296) * 1024 + nextChar - 56320 + 65536);
                i1++;
                continue;
            }
        }
        escapeSeq = ESCAPE_SEQUENCES[__char];
        result += !escapeSeq && isPrintable(__char) ? string[i1] : escapeSeq || encodeHex(__char);
    }
    return result;
}
function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    const clip = string[string.length - 1] === "\n";
    const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    const chomp = keep ? "+" : clip ? "" : "-";
    return `${indentIndicator}${chomp}\n`;
}
function writeScalar(state2, string, level, iskey) {
    state2.dump = (()=>{
        if (string.length === 0) {
            return "''";
        }
        if (!state2.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
            return `'${string}'`;
        }
        const indent1 = state2.indent * Math.max(1, level);
        const lineWidth1 = state2.lineWidth === -1 ? -1 : Math.max(Math.min(state2.lineWidth, 40), state2.lineWidth - indent1);
        const singleLineOnly = iskey || state2.flowLevel > -1 && level >= state2.flowLevel;
        function testAmbiguity(str1) {
            return testImplicitResolving(state2, str1);
        }
        switch(chooseScalarStyle(string, singleLineOnly, state2.indent, lineWidth1, testAmbiguity)){
            case STYLE_PLAIN:
                return string;
            case STYLE_SINGLE:
                return `'${string.replace(/'/g, "''")}'`;
            case STYLE_LITERAL:
                return `|${blockHeader(string, state2.indent)}${dropEndingNewline(indentString(string, indent1))}`;
            case STYLE_FOLDED:
                return `>${blockHeader(string, state2.indent)}${dropEndingNewline(indentString(foldString(string, lineWidth1), indent1))}`;
            case STYLE_DOUBLE:
                return `"${escapeString(string)}"`;
            default:
                throw new YAMLError("impossible error: invalid scalar style");
        }
    })();
}
function writeFlowSequence(state2, level, object) {
    let _result = "";
    const _tag = state2.tag;
    for(let index = 0, length = object.length; index < length; index += 1){
        if (writeNode(state2, level, object[index], false, false)) {
            if (index !== 0) _result += `,${!state2.condenseFlow ? " " : ""}`;
            _result += state2.dump;
        }
    }
    state2.tag = _tag;
    state2.dump = `[${_result}]`;
}
function writeBlockSequence(state2, level, object, compact = false) {
    let _result = "";
    const _tag = state2.tag;
    for(let index = 0, length = object.length; index < length; index += 1){
        if (writeNode(state2, level + 1, object[index], true, true)) {
            if (!compact || index !== 0) {
                _result += generateNextLine(state2, level);
            }
            if (state2.dump && 10 === state2.dump.charCodeAt(0)) {
                _result += "-";
            } else {
                _result += "- ";
            }
            _result += state2.dump;
        }
    }
    state2.tag = _tag;
    state2.dump = _result || "[]";
}
function writeFlowMapping(state2, level, object) {
    let _result = "";
    const _tag = state2.tag, objectKeyList = Object.keys(object);
    let pairBuffer, objectKey, objectValue;
    for(let index = 0, length = objectKeyList.length; index < length; index += 1){
        pairBuffer = state2.condenseFlow ? '"' : "";
        if (index !== 0) pairBuffer += ", ";
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state2, level, objectKey, false, false)) {
            continue;
        }
        if (state2.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += `${state2.dump}${state2.condenseFlow ? '"' : ""}:${state2.condenseFlow ? "" : " "}`;
        if (!writeNode(state2, level, objectValue, false, false)) {
            continue;
        }
        pairBuffer += state2.dump;
        _result += pairBuffer;
    }
    state2.tag = _tag;
    state2.dump = `{${_result}}`;
}
function writeBlockMapping(state2, level, object, compact = false) {
    const _tag = state2.tag, objectKeyList = Object.keys(object);
    let _result = "";
    if (state2.sortKeys === true) {
        objectKeyList.sort();
    } else if (typeof state2.sortKeys === "function") {
        objectKeyList.sort(state2.sortKeys);
    } else if (state2.sortKeys) {
        throw new YAMLError("sortKeys must be a boolean or a function");
    }
    let pairBuffer = "", objectKey, objectValue, explicitPair;
    for(let index = 0, length = objectKeyList.length; index < length; index += 1){
        pairBuffer = "";
        if (!compact || index !== 0) {
            pairBuffer += generateNextLine(state2, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state2, level + 1, objectKey, true, true, true)) {
            continue;
        }
        explicitPair = state2.tag !== null && state2.tag !== "?" || state2.dump && state2.dump.length > 1024;
        if (explicitPair) {
            if (state2.dump && 10 === state2.dump.charCodeAt(0)) {
                pairBuffer += "?";
            } else {
                pairBuffer += "? ";
            }
        }
        pairBuffer += state2.dump;
        if (explicitPair) {
            pairBuffer += generateNextLine(state2, level);
        }
        if (!writeNode(state2, level + 1, objectValue, true, explicitPair)) {
            continue;
        }
        if (state2.dump && 10 === state2.dump.charCodeAt(0)) {
            pairBuffer += ":";
        } else {
            pairBuffer += ": ";
        }
        pairBuffer += state2.dump;
        _result += pairBuffer;
    }
    state2.tag = _tag;
    state2.dump = _result || "{}";
}
function detectType(state2, object, explicit = false) {
    const typeList = explicit ? state2.explicitTypes : state2.implicitTypes;
    let type1;
    let style;
    let _result;
    for(let index = 0, length = typeList.length; index < length; index += 1){
        type1 = typeList[index];
        if ((type1.instanceOf || type1.predicate) && (!type1.instanceOf || typeof object === "object" && object instanceof type1.instanceOf) && (!type1.predicate || type1.predicate(object))) {
            state2.tag = explicit ? type1.tag : "?";
            if (type1.represent) {
                style = state2.styleMap[type1.tag] || type1.defaultStyle;
                if (_toString2.call(type1.represent) === "[object Function]") {
                    _result = type1.represent(object, style);
                } else if (_hasOwnProperty4.call(type1.represent, style)) {
                    _result = type1.represent[style](object, style);
                } else {
                    throw new YAMLError(`!<${type1.tag}> tag resolver accepts not "${style}" style`);
                }
                state2.dump = _result;
            }
            return true;
        }
    }
    return false;
}
function writeNode(state2, level, object, block, compact, iskey = false) {
    state2.tag = null;
    state2.dump = object;
    if (!detectType(state2, object, false)) {
        detectType(state2, object, true);
    }
    const type1 = _toString2.call(state2.dump);
    if (block) {
        block = state2.flowLevel < 0 || state2.flowLevel > level;
    }
    const objectOrArray = type1 === "[object Object]" || type1 === "[object Array]";
    let duplicateIndex = -1;
    let duplicate = false;
    if (objectOrArray) {
        duplicateIndex = state2.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
    }
    if (state2.tag !== null && state2.tag !== "?" || duplicate || state2.indent !== 2 && level > 0) {
        compact = false;
    }
    if (duplicate && state2.usedDuplicates[duplicateIndex]) {
        state2.dump = `*ref_${duplicateIndex}`;
    } else {
        if (objectOrArray && duplicate && !state2.usedDuplicates[duplicateIndex]) {
            state2.usedDuplicates[duplicateIndex] = true;
        }
        if (type1 === "[object Object]") {
            if (block && Object.keys(state2.dump).length !== 0) {
                writeBlockMapping(state2, level, state2.dump, compact);
                if (duplicate) {
                    state2.dump = `&ref_${duplicateIndex}${state2.dump}`;
                }
            } else {
                writeFlowMapping(state2, level, state2.dump);
                if (duplicate) {
                    state2.dump = `&ref_${duplicateIndex} ${state2.dump}`;
                }
            }
        } else if (type1 === "[object Array]") {
            const arrayLevel = state2.noArrayIndent && level > 0 ? level - 1 : level;
            if (block && state2.dump.length !== 0) {
                writeBlockSequence(state2, arrayLevel, state2.dump, compact);
                if (duplicate) {
                    state2.dump = `&ref_${duplicateIndex}${state2.dump}`;
                }
            } else {
                writeFlowSequence(state2, arrayLevel, state2.dump);
                if (duplicate) {
                    state2.dump = `&ref_${duplicateIndex} ${state2.dump}`;
                }
            }
        } else if (type1 === "[object String]") {
            if (state2.tag !== "?") {
                writeScalar(state2, state2.dump, level, iskey);
            }
        } else {
            if (state2.skipInvalid) return false;
            throw new YAMLError(`unacceptable kind of an object to dump ${type1}`);
        }
        if (state2.tag !== null && state2.tag !== "?") {
            state2.dump = `!<${state2.tag}> ${state2.dump}`;
        }
    }
    return true;
}
class Tokenizer {
    rules;
    constructor(rules = []){
        this.rules = rules;
    }
    addRule(test, fn) {
        this.rules.push({
            test,
            fn
        });
        return this;
    }
    tokenize(string, receiver = (token)=>token
    ) {
        function* generator(rules1) {
            let index = 0;
            for (const rule of rules1){
                const result = rule.test(string);
                if (result) {
                    const { value , length  } = result;
                    index += length;
                    string = string.slice(length);
                    const token = {
                        ...rule.fn(value),
                        index
                    };
                    yield receiver(token);
                    yield* generator(rules1);
                }
            }
        }
        const tokenGenerator = generator(this.rules);
        const tokens = [];
        for (const token of tokenGenerator){
            tokens.push(token);
        }
        if (string.length) {
            throw new Error(`parser error: string not fully parsed! ${string.slice(0, 25)}`);
        }
        return tokens;
    }
}
function digits(value, count = 2) {
    return String(value).padStart(count, "0");
}
function createLiteralTestFunction(value) {
    return (string)=>{
        return string.startsWith(value) ? {
            value,
            length: value.length
        } : undefined;
    };
}
function createMatchTestFunction(match) {
    return (string)=>{
        const result = match.exec(string);
        if (result) return {
            value: result,
            length: result[0].length
        };
    };
}
const defaultRules = [
    {
        test: createLiteralTestFunction("yyyy"),
        fn: ()=>({
                type: "year",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("yy"),
        fn: ()=>({
                type: "year",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("MM"),
        fn: ()=>({
                type: "month",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("M"),
        fn: ()=>({
                type: "month",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("dd"),
        fn: ()=>({
                type: "day",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("d"),
        fn: ()=>({
                type: "day",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("HH"),
        fn: ()=>({
                type: "hour",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("H"),
        fn: ()=>({
                type: "hour",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("hh"),
        fn: ()=>({
                type: "hour",
                value: "2-digit",
                hour12: true
            })
    },
    {
        test: createLiteralTestFunction("h"),
        fn: ()=>({
                type: "hour",
                value: "numeric",
                hour12: true
            })
    },
    {
        test: createLiteralTestFunction("mm"),
        fn: ()=>({
                type: "minute",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("m"),
        fn: ()=>({
                type: "minute",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("ss"),
        fn: ()=>({
                type: "second",
                value: "2-digit"
            })
    },
    {
        test: createLiteralTestFunction("s"),
        fn: ()=>({
                type: "second",
                value: "numeric"
            })
    },
    {
        test: createLiteralTestFunction("SSS"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 3
            })
    },
    {
        test: createLiteralTestFunction("SS"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 2
            })
    },
    {
        test: createLiteralTestFunction("S"),
        fn: ()=>({
                type: "fractionalSecond",
                value: 1
            })
    },
    {
        test: createLiteralTestFunction("a"),
        fn: (value)=>({
                type: "dayPeriod",
                value: value
            })
    },
    {
        test: createMatchTestFunction(/^(')(?<value>\\.|[^\']*)\1/),
        fn: (match)=>({
                type: "literal",
                value: match.groups.value
            })
    },
    {
        test: createMatchTestFunction(/^.+?\s*/),
        fn: (match)=>({
                type: "literal",
                value: match[0]
            })
    }, 
];
class DateTimeFormatter {
    #format;
    constructor(formatString, rules1 = defaultRules){
        const tokenizer = new Tokenizer(rules1);
        this.#format = tokenizer.tokenize(formatString, ({ type: type1 , value , hour12  })=>{
            const result = {
                type: type1,
                value
            };
            if (hour12) result.hour12 = hour12;
            return result;
        });
    }
    format(date, options = {
    }) {
        let string = "";
        const utc = options.timeZone === "UTC";
        for (const token of this.#format){
            const type1 = token.type;
            switch(type1){
                case "year":
                    {
                        const value = utc ? date.getUTCFullYear() : date.getFullYear();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2).slice(-2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "month":
                    {
                        const value = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "day":
                    {
                        const value = utc ? date.getUTCDate() : date.getDate();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "hour":
                    {
                        let value = utc ? date.getUTCHours() : date.getHours();
                        value -= token.hour12 && date.getHours() > 12 ? 12 : 0;
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "minute":
                    {
                        const value = utc ? date.getUTCMinutes() : date.getMinutes();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "second":
                    {
                        const value = utc ? date.getUTCSeconds() : date.getSeconds();
                        switch(token.value){
                            case "numeric":
                                {
                                    string += value;
                                    break;
                                }
                            case "2-digit":
                                {
                                    string += digits(value, 2);
                                    break;
                                }
                            default:
                                throw Error(`FormatterError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "fractionalSecond":
                    {
                        const value = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
                        string += digits(value, Number(token.value));
                        break;
                    }
                case "timeZoneName":
                    {
                        break;
                    }
                case "dayPeriod":
                    {
                        string += token.value ? date.getHours() >= 12 ? "PM" : "AM" : "";
                        break;
                    }
                case "literal":
                    {
                        string += token.value;
                        break;
                    }
                default:
                    throw Error(`FormatterError: { ${token.type} ${token.value} }`);
            }
        }
        return string;
    }
    parseToParts(string) {
        const parts = [];
        for (const token of this.#format){
            const type1 = token.type;
            let value = "";
            switch(token.type){
                case "year":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,4}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                        }
                        break;
                    }
                case "month":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            case "narrow":
                                {
                                    value = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            case "short":
                                {
                                    value = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            case "long":
                                {
                                    value = /^[a-zA-Z]+/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "day":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "hour":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    if (token.hour12 && parseInt(value) > 12) {
                                        console.error(`Trying to parse hour greater than 12. Use 'H' instead of 'h'.`);
                                    }
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{2}/.exec(string)?.[0];
                                    if (token.hour12 && parseInt(value) > 12) {
                                        console.error(`Trying to parse hour greater than 12. Use 'HH' instead of 'hh'.`);
                                    }
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "minute":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "second":
                    {
                        switch(token.value){
                            case "numeric":
                                {
                                    value = /^\d{1,2}/.exec(string)?.[0];
                                    break;
                                }
                            case "2-digit":
                                {
                                    value = /^\d{2}/.exec(string)?.[0];
                                    break;
                                }
                            default:
                                throw Error(`ParserError: value "${token.value}" is not supported`);
                        }
                        break;
                    }
                case "fractionalSecond":
                    {
                        value = new RegExp(`^\\d{${token.value}}`).exec(string)?.[0];
                        break;
                    }
                case "timeZoneName":
                    {
                        value = token.value;
                        break;
                    }
                case "dayPeriod":
                    {
                        value = /^(A|P)M/.exec(string)?.[0];
                        break;
                    }
                case "literal":
                    {
                        if (!string.startsWith(token.value)) {
                            throw Error(`Literal "${token.value}" not found "${string.slice(0, 25)}"`);
                        }
                        value = token.value;
                        break;
                    }
                default:
                    throw Error(`${token.type} ${token.value}`);
            }
            if (!value) {
                throw Error(`value not valid for token { ${type1} ${value} } ${string.slice(0, 25)}`);
            }
            parts.push({
                type: type1,
                value
            });
            string = string.slice(value.length);
        }
        if (string.length) {
            throw Error(`datetime string was not fully parsed! ${string.slice(0, 25)}`);
        }
        return parts;
    }
    sortDateTimeFormatPart(parts) {
        let result = [];
        const typeArray = [
            "year",
            "month",
            "day",
            "hour",
            "minute",
            "second",
            "fractionalSecond", 
        ];
        for (const type1 of typeArray){
            const current = parts.findIndex((el)=>el.type === type1
            );
            if (current !== -1) {
                result = result.concat(parts.splice(current, 1));
            }
        }
        result = result.concat(parts);
        return result;
    }
    partsToDate(parts) {
        const date = new Date();
        const utc = parts.find((part)=>part.type === "timeZoneName" && part.value === "UTC"
        );
        utc ? date.setUTCHours(0, 0, 0, 0) : date.setHours(0, 0, 0, 0);
        for (const part of parts){
            switch(part.type){
                case "year":
                    {
                        const value = Number(part.value.padStart(4, "20"));
                        utc ? date.setUTCFullYear(value) : date.setFullYear(value);
                        break;
                    }
                case "month":
                    {
                        const value = Number(part.value) - 1;
                        utc ? date.setUTCMonth(value) : date.setMonth(value);
                        break;
                    }
                case "day":
                    {
                        const value = Number(part.value);
                        utc ? date.setUTCDate(value) : date.setDate(value);
                        break;
                    }
                case "hour":
                    {
                        let value = Number(part.value);
                        const dayPeriod = parts.find((part1)=>part1.type === "dayPeriod"
                        );
                        if (dayPeriod?.value === "PM") value += 12;
                        utc ? date.setUTCHours(value) : date.setHours(value);
                        break;
                    }
                case "minute":
                    {
                        const value = Number(part.value);
                        utc ? date.setUTCMinutes(value) : date.setMinutes(value);
                        break;
                    }
                case "second":
                    {
                        const value = Number(part.value);
                        utc ? date.setUTCSeconds(value) : date.setSeconds(value);
                        break;
                    }
                case "fractionalSecond":
                    {
                        const value = Number(part.value);
                        utc ? date.setUTCMilliseconds(value) : date.setMilliseconds(value);
                        break;
                    }
            }
        }
        return date;
    }
    parse(string) {
        const parts = this.parseToParts(string);
        const sortParts = this.sortDateTimeFormatPart(parts);
        return this.partsToDate(sortParts);
    }
}
var Day;
(function(Day1) {
    Day1[Day1["Sun"] = 0] = "Sun";
    Day1[Day1["Mon"] = 1] = "Mon";
    Day1[Day1["Tue"] = 2] = "Tue";
    Day1[Day1["Wed"] = 3] = "Wed";
    Day1[Day1["Thu"] = 4] = "Thu";
    Day1[Day1["Fri"] = 5] = "Fri";
    Day1[Day1["Sat"] = 6] = "Sat";
})(Day || (Day = {
}));
function format3(date, formatString1) {
    const formatter = new DateTimeFormatter(formatString1);
    return formatter.format(date);
}
const importMeta = {
    url: "file:///Users/stephendeletang/Documents/github/gmqttjs/gmqttd.ts",
    main: import.meta.main
};
const __dirname = new URL(".", importMeta.url).pathname;
var binaryPath;
var yamlPath;
if (Deno.build.os === "windows") {
    binaryPath = join2(__dirname, "bin", "gmqttd-win32-amd64.exe").slice(1);
    yamlPath = join2(__dirname, "bin", "gmqttd.yml").slice(1);
} else if (Deno.build.os === "darwin") {
    binaryPath = join2(__dirname, "bin", "gmqttd-darwin-amd64");
    yamlPath = join2(__dirname, "bin", "gmqttd.yml");
} else if (Deno.build.os === "linux") {
    binaryPath = join2(__dirname, "bin", "gmqttd-linux-amd64");
    yamlPath = join2(__dirname, "bin", "gmqttd.yml");
} else {
    critical("⚠ Unsupported platform: " + Deno.build.os);
}
if (!binaryPath) {
    Deno.exit(0);
}
let processArgs = [
    ...new Set([
        ...[
            "start"
        ],
        ...Deno.args
    ])
];
const args = parse3(processArgs);
if (!args.c) {
    args.c = yamlPath;
    processArgs = [
        "start",
        "-c",
        args.c
    ];
}
try {
    const yamlFile = Deno.readFileSync(args.c);
    const yamltext = new TextDecoder("utf-8").decode(yamlFile);
    const data = parse4(yamltext);
    data.listeners.forEach((item)=>{
        info(`${format3(new Date(), "MM-dd-yyyy HH:mm:ss.SSS")}  ${item.websocket ? "Websocket server" : "TCP server"} listen on ["${item.address}"]`);
    });
} catch (e) {
    critical(e);
}
const gmqtt = Deno.run({
    cmd: [
        binaryPath,
        ...processArgs.filter((x)=>x != "-d"
        )
    ],
    stdout: args.d ? "inherit" : "piped",
    stderr: "piped"
});
setTimeout(()=>{
    Deno.connect({
        port: 1883
    }).then((conn)=>{
        info(`${format3(new Date(), "MM-dd-yyyy HH:mm:ss.SSS")}  MQTT Server started ...`);
        conn.close();
    }).catch((e)=>warning(e)
    );
}, 1000);
const { code: code1  } = await gmqtt.status();
const rawOutput = await gmqtt.output();
const rawError = await gmqtt.stderrOutput();
if (code1 === 0) {
    await Deno.stdout.write(rawOutput);
} else {
    const errorString = new TextDecoder().decode(rawError);
    warning(errorString);
}
Deno.exit(code1);
