import AppKit
import WebKit

/*
 * BrowserController
 * -----------------
 * Owns the single WKWebView and everything the bundled V9.1.0.1 engine asks of
 * its host:
 *
 *   - start the loopback asset server and load `index.html` from it;
 *   - keep navigation confined to that origin (external links go to the default
 *     browser instead of being rendered inside the ledger app);
 *   - present real macOS save/open panels for the engine's exports and imports;
 *   - present `alert`, `confirm` and `prompt` as native sheets, because the
 *     engine uses all three for destructive and free-text operations.
 */

final class BrowserController: NSObject {

    private enum ShellError: LocalizedError {
        case missingBundleResources
        case contentProcessTerminated

        var errorDescription: String? {
            switch self {
            case .missingBundleResources:
                return "The bundled web assets are missing from the application. Run `npm run macos:sync` and rebuild."
            case .contentProcessTerminated:
                return "The web content process terminated unexpectedly. Use Reload Engine to reopen the archive."
            }
        }
    }

    private let model: BrowserModel
    private let server = LocalAssetServer.shared
    private var downloadHandlers: [ObjectIdentifier: DownloadHandler] = [:]
    private var reloadObserver: NSObjectProtocol?
    private var attemptedOrigin: String?
    private weak var webView: WKWebView?

    init(model: BrowserModel) {
        self.model = model
        super.init()
        reloadObserver = NotificationCenter.default.addObserver(
            forName: .indexEngineReloadPage,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.reloadPage()
        }
    }

    func invalidate() {
        if let reloadObserver = reloadObserver {
            NotificationCenter.default.removeObserver(reloadObserver)
        }
        reloadObserver = nil
        webView = nil
    }

    // MARK: - Setup

    func makeWebView() -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // A persistent store keeps IndexedDB and localStorage across launches,
        // which is what makes the local ledger durable.
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = true

        self.webView = webView
        return webView
    }

    func loadRootDocument(in webView: WKWebView) {
        model.reportStarting("Opening the local archive…")
        // If the shell is ever constructed twice, this makes it visible: two
        // different controller IDs in the log mean the view was recreated.
        let marker = "controller \(ObjectIdentifier(self).debugDescription) webView \(ObjectIdentifier(webView).debugDescription)"
        shellLog.notice("loadRootDocument: \(marker, privacy: .public)")
        do {
            guard let resources = Bundle.main.resourceURL else { throw ShellError.missingBundleResources }
            let root = resources.appendingPathComponent("www", isDirectory: true)
            let baseURL = try server.start(root: root)
            let document = baseURL.appendingPathComponent("index.html")
            attemptedOrigin = baseURL.absoluteString
            shellLog.notice("Listening on \(baseURL.absoluteString, privacy: .public); loading \(document.absoluteString, privacy: .public)")
            webView.load(URLRequest(
                url: document,
                cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
                timeoutInterval: 30
            ))
        } catch {
            model.reportFailure(error, context: "The local asset server could not be started.")
        }
    }

    private func reloadPage() {
        guard let webView = webView else { return }
        if webView.url == nil {
            loadRootDocument(in: webView)
            return
        }
        model.reportStarting("Reloading the local archive…")
        webView.reload()
    }

    // MARK: - Navigation policy

    private func isAllowedNavigation(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        // `blob:` is how the engine hands its CSV / JSON / script exports to the
        // download pipeline; `about:` and `data:` stay inside the page.
        if scheme == "blob" || scheme == "about" || scheme == "data" { return true }
        guard let host = url.host else { return false }
        return server.isServingHost(host)
    }
}

// MARK: - WKNavigationDelegate

extension BrowserController: WKNavigationDelegate {

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if isAllowedNavigation(url) {
            decisionHandler(.allow)
            return
        }
        // Anything outside the bundled engine leaves the app rather than being
        // rendered in a window that holds the ledger.
        if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
            NSWorkspace.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        model.reportReady()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        guard !isCancellation(error) else { return }
        model.reportFailure(error, context: loadFailureContext)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard !isCancellation(error) else { return }
        model.reportFailure(error, context: loadFailureContext)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        model.reportFailure(
            ShellError.contentProcessTerminated,
            context: loadFailureContext
        )
    }

    /// Frames a load failure with the origin that was actually attempted, so the
    /// diagnostic distinguishes a dead local server from a blocked load.
    private var loadFailureContext: String {
        if let attemptedOrigin = attemptedOrigin {
            return "The bundled engine could not be loaded from \(attemptedOrigin)."
        }
        return "The bundled engine could not be loaded; the local server never reported an origin."
    }

    private func isCancellation(_ error: Error) -> Bool {
        let nsError = error as NSError
        return nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled
    }

    // MARK: - Downloads

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        start(download)
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        start(download)
    }

    private func start(_ download: WKDownload) {
        let handler = DownloadHandler { [weak self] finished in
            self?.downloadHandlers.removeValue(forKey: ObjectIdentifier(finished))
        }
        downloadHandlers[ObjectIdentifier(handler)] = handler
        download.delegate = handler
    }
}

// MARK: - WKUIDelegate

extension BrowserController: WKUIDelegate {

    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseFiles = true
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.canCreateDirectories = false
        panel.resolvesAliases = true
        panel.message = "Choose the files to ingest. Nothing is uploaded."
        guard panel.runModal() == .OK else {
            completionHandler(nil)
            return
        }
        completionHandler(panel.urls)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        NSAlert.present(message: message)
        completionHandler()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        completionHandler(NSAlert.confirm(message))
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        completionHandler(NSAlert.textInput(prompt: prompt, defaultText: defaultText))
    }

    // The Swift name must be `webView(_:createWebViewWith:for:windowFeatures:)`.
    // A `createWebViewWithConfiguration:` label compiles but is never called.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }
}

/// Writes one `WKDownload` to a location the operator chooses, then reveals it.
final class DownloadHandler: NSObject, WKDownloadDelegate {

    private let completion: (DownloadHandler) -> Void
    private var destination: URL?

    init(completion: @escaping (DownloadHandler) -> Void) {
        self.completion = completion
        super.init()
    }

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping (URL?) -> Void
    ) {
        DispatchQueue.main.async {
            let panel = NSSavePanel()
            panel.nameFieldStringValue = suggestedFilename
            panel.canCreateDirectories = true
            panel.isExtensionHidden = false
            panel.message = "Save the export. Unencrypted exports are not protected by the vault passphrase."
            guard panel.runModal() == .OK, let url = panel.url else {
                completionHandler(nil)
                return
            }
            self.destination = url
            completionHandler(url)
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        DispatchQueue.main.async {
            if let destination = self.destination {
                NSWorkspace.shared.activateFileViewerSelecting([destination])
            }
            self.completion(self)
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        DispatchQueue.main.async {
            if let destination = self.destination {
                try? FileManager.default.removeItem(at: destination)
            }
            NSAlert.present(error: error, title: "The export could not be saved.")
            self.completion(self)
        }
    }
}
