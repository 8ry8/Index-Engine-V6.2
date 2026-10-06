import SwiftUI
import WebKit

/// Hosts the app's single `WKWebView` inside the SwiftUI window.
struct WebBrowserView: NSViewRepresentable {

    @ObservedObject var model: BrowserModel

    func makeCoordinator() -> BrowserController {
        BrowserController(model: model)
    }

    func makeNSView(context: Context) -> WKWebView {
        let webView = context.coordinator.makeWebView()
        context.coordinator.loadRootDocument(in: webView)
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        // The engine is loaded once in `makeNSView`. Nothing is re-driven from
        // SwiftUI state, so the bundled document is never reloaded or replaced
        // behind the operator's back.
    }

    static func dismantleNSView(_ nsView: WKWebView, coordinator: BrowserController) {
        coordinator.invalidate()
    }
}
