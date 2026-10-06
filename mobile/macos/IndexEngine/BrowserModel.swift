import Foundation

/// Observable bridge between the SwiftUI shell and the WebKit coordinator.
///
/// The engine is a single local document; this only reports whether that
/// document is starting, ready, or blocked, so the shell can show an honest
/// diagnostic instead of an empty window.
final class BrowserModel: ObservableObject {

    enum Phase {
        case starting
        case ready
        case failed(String)
    }

    @Published private(set) var phase: Phase = .starting
    @Published private(set) var detail = "Starting the local archive server…"

    func reportStarting(_ message: String) {
        detail = message
        phase = .starting
    }

    func reportReady() {
        detail = "Serving the bundled V9.1.0.1 engine from a loopback-only HTTP origin."
        phase = .ready
    }

    func reportFailure(_ message: String) {
        detail = message
        phase = .failed(message)
    }

    func reload() {
        NotificationCenter.default.post(name: .indexEngineReloadPage, object: nil)
    }
}

extension Notification.Name {
    static let indexEngineReloadPage = Notification.Name("org.efnai.indexengine.reloadPage")
}
