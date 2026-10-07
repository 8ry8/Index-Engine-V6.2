import Foundation
import os

/// Observable bridge between the SwiftUI shell and the WebKit coordinator.
///
/// The engine is a single local document; this only reports whether that
/// document is starting, ready, or blocked, so the shell can show an honest
/// diagnostic instead of an empty window.
///
/// Failures keep their `NSError` domain, code and underlying cause. A bare
/// `localizedDescription` is not enough to tell "the loopback server never
/// bound" apart from "App Transport Security blocked the load", and those need
/// different fixes.
final class BrowserModel: ObservableObject {

    enum Phase {
        case starting
        case ready
        case failed(String)
    }

    @Published private(set) var phase: Phase = .starting
    @Published private(set) var detail = "Starting the local archive server…"

    /// Describes an error with everything needed to act on it: the domain and
    /// code, the system's description, and any underlying cause.
    static func describe(_ error: Error) -> String {
        let nsError = error as NSError
        var lines: [String] = [
            "\(nsError.domain) (\(nsError.code))",
            nsError.localizedDescription
        ]
        if let reason = nsError.localizedFailureReason, !reason.isEmpty {
            lines.append("Reason: \(reason)")
        }
        if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? NSError {
            lines.append("Caused by: \(underlying.domain) (\(underlying.code)) — \(underlying.localizedDescription)")
        }
        if let failing = nsError.userInfo["NSErrorFailingURLStringKey"] as? String, !failing.isEmpty {
            lines.append("URL: \(failing)")
        }
        return lines.joined(separator: "\n")
    }

    func reportStarting(_ message: String) {
        detail = message
        phase = .starting
    }

    func reportReady() {
        detail = "Serving the bundled V9.1.0.1 engine from a loopback-only HTTP origin."
        phase = .ready
    }

    /// Records a failure. `context` says what the shell was doing, which the
    /// error itself cannot.
    func reportFailure(_ error: Error, context: String) {
        let message = "\(context)\n\n\(Self.describe(error))"
        shellLog.error("\(message, privacy: .public)")
        detail = message
        phase = .failed(message)
    }

    func reload() {
        NotificationCenter.default.post(name: .indexEngineReloadPage, object: nil)
    }
}

/// Subsystem-scoped log so `log stream`/Console.app can filter on this app.
let shellLog = Logger(subsystem: "org.efnai.indexengine", category: "shell")

extension Notification.Name {
    static let indexEngineReloadPage = Notification.Name("org.efnai.indexengine.reloadPage")
}
