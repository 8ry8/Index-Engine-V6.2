import Foundation
#if canImport(Darwin)
import Darwin
#elseif canImport(Glibc)
import Glibc
#endif

/*
 * LocalAssetServer
 * ----------------
 * Serves the bundled V9.1.0.1 web assets to the app's own WKWebView over a
 * loopback-only HTTP listener on an ephemeral port.
 *
 * Why an HTTP origin instead of `file://` or a custom URL scheme:
 *
 *   - `http://127.0.0.1` is a *potentially trustworthy* origin. IndexedDB,
 *     localStorage, `window.isSecureContext` (clipboard) and the PWA manifest
 *     all behave exactly as they do in Safari. A `file://` origin has no
 *     storage at all, which would silently disable the engine's ledger.
 *   - A custom `WKURLSchemeHandler` scheme leaves IndexedDB behaviour
 *     version-dependent. A real HTTP origin removes that ambiguity.
 *
 * Hardening:
 *
 *   - The listener binds to 127.0.0.1 only. It is never reachable off-machine.
 *   - The assigned port is chosen by the kernel (`bind` to port 0), so no fixed
 *     port can be squatted by another process.
 *   - Requests whose `Host` header is not the loopback origin are refused, which
 *     defeats DNS-rebinding style access to this server.
 *   - Only `GET` and `HEAD` are served, and path traversal is rejected before
 *     any file is opened.
 */

final class LocalAssetServer {

    enum Failure: LocalizedError {
        case socket(Int32)
        case bind(Int32)
        case listen(Int32)
        case portLookup(Int32)
        case missingRoot

        var errorDescription: String? {
            switch self {
            case .socket(let code):
                return "Could not create the local listener socket (errno \(code))."
            case .bind(let code):
                return "Could not bind 127.0.0.1 for the local asset server (errno \(code))."
            case .listen(let code):
                return "Could not start listening for local asset requests (errno \(code))."
            case .portLookup(let code):
                return "Could not read the local port assigned by the system (errno \(code))."
            case .missingRoot:
                return "The bundled web assets are missing. Run `npm run macos:sync` and rebuild."
            }
        }
    }

    static let shared = LocalAssetServer()

    private static let maximumHeaderBytes = 65_536
    private static let backlog: Int32 = 32

    private let lock = NSLock()
    private let listenerQueue = DispatchQueue(label: "org.efnai.indexengine.assets.listener")
    private let connectionQueue = DispatchQueue(
        label: "org.efnai.indexengine.assets.connections",
        attributes: .concurrent
    )

    private var root: URL?
    private var activeRoot: URL?
    private var listenHandle: Int32 = -1
    private var readSource: DispatchSourceRead?
    private var assignedPort: UInt16 = 0

    private init() {}

    /// Starts the server, or returns the origin of the server already running.
    ///
    /// Restarting the listener closes every socket it owns. Doing that while a
    /// load is in flight kills that load, and WebKit reports it as
    /// `NSURLErrorNetworkConnectionLost` ("The network connection was lost").
    /// If we are already serving this exact root, reuse the running server
    /// rather than tearing it down.
    @discardableResult
    func start(root: URL) throws -> URL {
        lock.lock()
        let runningRoot = activeRoot?.standardizedFileURL
        let runningPort = assignedPort
        let isRunning = listenHandle >= 0
        lock.unlock()

        let requestedRoot = root.standardizedFileURL
        if isRunning, runningPort > 0, runningRoot == requestedRoot {
            shellLog.debug("Asset server: already serving on port \(runningPort); reusing it.")
            return URL(string: "http://127.0.0.1:\(runningPort)")!
        }

        stop()

        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: root.path, isDirectory: &isDirectory),
              isDirectory.boolValue
        else { throw Failure.missingRoot }

        let handle = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)
        guard handle >= 0 else { throw Failure.socket(errno) }

        var reuseAddress: Int32 = 1
        setsockopt(handle, SOL_SOCKET, SO_REUSEADDR, &reuseAddress, socklen_t(MemoryLayout<Int32>.size))

        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = 0                       // let the kernel choose an ephemeral port
        address.sin_addr.s_addr = inet_addr("127.0.0.1")

        let bindResult = withUnsafePointer(to: &address) { pointer -> Int32 in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { socketAddress in
                Darwin.bind(handle, socketAddress, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindResult == 0 else {
            let code = errno
            Darwin.close(handle)
            throw Failure.bind(code)
        }

        guard Darwin.listen(handle, Self.backlog) == 0 else {
            let code = errno
            Darwin.close(handle)
            throw Failure.listen(code)
        }

        var bound = sockaddr_in()
        var boundLength = socklen_t(MemoryLayout<sockaddr_in>.size)
        let nameResult = withUnsafeMutablePointer(to: &bound) { pointer -> Int32 in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { socketAddress in
                Darwin.getsockname(handle, socketAddress, &boundLength)
            }
        }
        guard nameResult == 0 else {
            let code = errno
            Darwin.close(handle)
            throw Failure.portLookup(code)
        }

        let port = UInt16(bigEndian: bound.sin_port)
        guard port > 0 else {
            Darwin.close(handle)
            throw Failure.portLookup(0)
        }

        let currentFlags = fcntl(handle, F_GETFL, 0)
        _ = fcntl(handle, F_SETFL, currentFlags | O_NONBLOCK)

        let source = DispatchSource.makeReadSource(fileDescriptor: handle, queue: listenerQueue)
        source.setEventHandler { [weak self] in self?.acceptPendingConnections() }
        source.setCancelHandler { Darwin.close(handle) }

        lock.lock()
        self.root = root
        self.activeRoot = root
        self.listenHandle = handle
        self.assignedPort = port
        self.readSource = source
        lock.unlock()

        source.resume()
        let origin = URL(string: "http://127.0.0.1:\(port)")!
        shellLog.notice("Asset server: listening on \(origin.absoluteString, privacy: .public) for \(root.path, privacy: .public)")
        return origin
    }

    func stop() {
        lock.lock()
        let source = readSource
        readSource = nil
        listenHandle = -1
        assignedPort = 0
        root = nil
        activeRoot = nil
        lock.unlock()
        source?.cancel()          // the cancel handler closes the descriptor
    }

    var port: UInt16 {
        lock.lock()
        defer { lock.unlock() }
        return assignedPort
    }

    /// True when `host` names this server's loopback origin, with or without its port.
    func isServingHost(_ host: String) -> Bool {
        let currentPort = port
        guard currentPort > 0 else { return false }
        let candidate = host.lowercased()
        for name in ["127.0.0.1", "localhost", "[::1]"] {
            if candidate == name || candidate == "\(name):\(currentPort)" { return true }
        }
        return false
    }

    deinit { stop() }

    // MARK: - Accept loop

    private func acceptPendingConnections() {
        lock.lock()
        let handle = listenHandle
        let base = root
        lock.unlock()

        guard handle >= 0, let base else { return }

        while true {
            let client = Darwin.accept(handle, nil, nil)
            if client >= 0 {
                let root = base
                connectionQueue.async { [weak self] in
                    self?.respond(to: client, root: root)
                }
                continue
            }
            let code = errno
            if code == EINTR { continue }
            return   // EAGAIN / EWOULDBLOCK: drain finished.
        }
    }

    // MARK: - Request handling

    private func respond(to client: Int32, root: URL) {
        defer { finish(client) }
        #if canImport(Darwin)
        var noPipeSignal: Int32 = 1
        setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &noPipeSignal, socklen_t(MemoryLayout<Int32>.size))
        #endif
        makeBlocking(client)

        guard let head = readRequestHead(client) else {
            let code = errno
            shellLog.notice("Asset server: the peer connected but sent no request (errno \(code)).")
            return
        }
        let response = makeResponse(for: head, root: root)
        let written = write(response, to: client)
        let requestLine = String(head.prefix { $0 != "\r" && $0 != "\n" })
        if written == response.count {
            shellLog.debug("Asset server: \(requestLine, privacy: .public) -> \(response.count) bytes")
        } else {
            shellLog.notice("Asset server: \(requestLine, privacy: .public) wrote \(written) of \(response.count) bytes (errno \(errno)).")
        }
    }

    /// Puts an accepted connection into blocking mode with bounded timeouts.
    ///
    /// On Darwin, `accept(2)` gives the new socket the listener's `O_NONBLOCK`
    /// flag. Left alone, the first `read` races the browser's request: it returns
    /// `EAGAIN` before any bytes arrive, the server closes without answering, and
    /// WebKit reports `NSURLErrorNetworkConnectionLost` (-1005). Large writes can
    /// be truncated the same way. Blocking mode plus `SO_RCVTIMEO`/`SO_SNDTIMEO`
    /// makes each read and write wait for the peer, up to a bound.
    private func makeBlocking(_ client: Int32) {
        let flags = fcntl(client, F_GETFL, 0)
        if flags >= 0, flags & O_NONBLOCK != 0 {
            _ = fcntl(client, F_SETFL, flags & ~O_NONBLOCK)
        }
        var timeout = timeval(tv_sec: 10, tv_usec: 0)
        setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
        setsockopt(client, SOL_SOCKET, SO_SNDTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    }

    /// Closes a connection gracefully: half-close, drain, then close.
    ///
    /// The drain is the point. `close()` on a socket that still holds unread
    /// received bytes makes the kernel emit **RST** instead of FIN, and WebKit
    /// surfaces that as `NSURLErrorNetworkConnectionLost` even though every byte
    /// of the response was written. Draining first guarantees a clean FIN.
    /// `SO_RCVTIMEO` bounds the drain so a peer that never closes cannot pin a
    /// worker thread.
    private func finish(_ client: Int32) {
        Darwin.shutdown(client, SHUT_WR)

        var timeout = timeval()
        timeout.tv_sec = 2
        setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))

        var scratch = [UInt8](repeating: 0, count: 1024)
        while true {
            let count = scratch.withUnsafeMutableBytes { raw -> Int in
                guard let base = raw.baseAddress else { return -1 }
                return Darwin.read(client, base, 1024)
            }
            if count > 0 { continue }
            if count == 0 { break }
            if errno == EINTR { continue }
            break   // EAGAIN from SO_RCVTIMEO, or a terminal error
        }
        Darwin.close(client)
    }

    private func readRequestHead(_ client: Int32) -> String? {
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: 4096)
        defer { buffer.deallocate() }
        let terminator = Data("\r\n\r\n".utf8)
        var accumulated = Data()

        while accumulated.count < Self.maximumHeaderBytes {
            let count = Darwin.read(client, buffer, 4096)
            if count > 0 {
                accumulated.append(buffer, count: count)
                if accumulated.range(of: terminator) != nil { break }
                continue
            }
            if count == 0 { break }
            let code = errno
            if code == EINTR { continue }
            break
        }
        guard !accumulated.isEmpty else { return nil }
        return String(decoding: accumulated, as: UTF8.self)
    }

    private func makeResponse(for head: String, root: URL) -> Data {
        let lines = head.components(separatedBy: "\r\n")
        guard let requestLine = lines.first, !requestLine.isEmpty else {
            return Self.response(status: 400, reason: "Bad Request", contentType: nil, body: Data("Bad Request\r\n".utf8))
        }
        let fields = requestLine.split(separator: " ", omittingEmptySubsequences: true)
        guard fields.count >= 2 else {
            return Self.response(status: 400, reason: "Bad Request", contentType: nil, body: Data("Bad Request\r\n".utf8))
        }
        let method = fields[0].uppercased()
        let target = String(fields[1])

        guard let host = hostHeader(in: lines), isServingHost(host) else {
            return Self.textResponse(status: 403, reason: "Forbidden", message: "Forbidden\r\n")
        }
        guard method == "GET" || method == "HEAD" else {
            return Self.textResponse(status: 405, reason: "Method Not Allowed", message: "Method Not Allowed\r\n")
        }
        guard let file = Self.resolve(target, in: root) else {
            return Self.textResponse(status: 404, reason: "Not Found", message: "Not Found\r\n")
        }
        guard var payload = try? Data(contentsOf: file) else {
            return Self.textResponse(status: 404, reason: "Not Found", message: "Not Found\r\n")
        }
        if method == "HEAD" { payload = Data() }

        return Self.response(
            status: 200,
            reason: "OK",
            contentType: Self.contentType(for: file),
            body: payload
        )
    }

    private func hostHeader(in lines: [String]) -> String? {
        for line in lines.dropFirst() {
            let lowered = line.lowercased()
            if lowered.hasPrefix("host:") {
                return String(line.dropFirst("host:".count)).trimmingCharacters(in: .whitespaces)
            }
        }
        return nil
    }

    /// Writes the whole payload. Returns the number of bytes actually written.
    @discardableResult
    private func write(_ data: Data, to client: Int32) -> Int {
        data.withUnsafeBytes { raw -> Int in
            guard let base = raw.baseAddress else { return 0 }
            var sent = 0
            while sent < data.count {
                let count = Darwin.write(client, base.advanced(by: sent), data.count - sent)
                if count > 0 { sent += count; continue }
                let code = errno
                if code == EINTR { continue }
                return sent
            }
            return sent
        }
    }

    // MARK: - Response construction

    private static func textResponse(status: Int, reason: String, message: String) -> Data {
        response(status: status, reason: reason, contentType: "text/plain; charset=utf-8", body: Data(message.utf8))
    }

    private static func response(status: Int, reason: String, contentType: String?, body: Data) -> Data {
        var head = "HTTP/1.1 \(status) \(reason)\r\n"
        head += "Connection: close\r\n"
        head += "Cache-Control: no-store, no-cache, must-revalidate\r\n"
        head += "X-Content-Type-Options: nosniff\r\n"
        head += "Content-Length: \(body.count)\r\n"
        if let contentType = contentType { head += "Content-Type: \(contentType)\r\n" }
        head += "\r\n"
        var payload = Data(head.utf8)
        payload.append(body)
        return payload
    }

    /// Maps a request target onto a file underneath `root`, or `nil` if it escapes the root.
    private static func resolve(_ target: String, in root: URL) -> URL? {
        var path = target
        if let index = path.firstIndex(of: "?") { path = String(path[..<index]) }
        if let index = path.firstIndex(of: "#") { path = String(path[..<index]) }
        guard !path.isEmpty else { return root.appendingPathComponent("index.html") }

        let decoded = path.removingPercentEncoding ?? path
        guard !decoded.isEmpty, !decoded.contains("\0") else { return nil }
        guard !decoded.contains("..") else { return nil }   // strict: reject any traversal attempt

        let relative = decoded.hasPrefix("/") ? String(decoded.dropFirst()) : decoded
        let base = root.standardizedFileURL
        let candidate = base.appendingPathComponent(relative).standardizedFileURL
        let basePath = base.path.hasSuffix("/") ? base.path : base.path + "/"
        guard candidate.path == base.path || candidate.path.hasPrefix(basePath) else { return nil }

        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory) else { return nil }
        return isDirectory.boolValue ? candidate.appendingPathComponent("index.html") : candidate
    }

    private static func contentType(for file: URL) -> String {
        switch file.pathExtension.lowercased() {
        case "html", "htm":   return "text/html; charset=utf-8"
        case "js", "mjs":     return "text/javascript; charset=utf-8"
        case "css":           return "text/css; charset=utf-8"
        case "json":          return "application/json; charset=utf-8"
        case "webmanifest":   return "application/manifest+json; charset=utf-8"
        case "svg":           return "image/svg+xml"
        case "png":           return "image/png"
        case "jpg", "jpeg":   return "image/jpeg"
        case "gif":           return "image/gif"
        case "webp":          return "image/webp"
        case "ico":           return "image/x-icon"
        case "csv":           return "text/csv; charset=utf-8"
        case "txt", "log":    return "text/plain; charset=utf-8"
        case "woff2":         return "font/woff2"
        case "woff":          return "font/woff"
        case "ttf":           return "font/ttf"
        default:              return "application/octet-stream"
        }
    }
}
