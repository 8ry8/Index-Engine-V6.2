import AppKit
import SwiftUI

struct ContentView: View {

    @ObservedObject var model: BrowserModel

    var body: some View {
        ZStack {
            WebBrowserView(model: model)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            switch model.phase {
            case .ready:
                EmptyView()
            case .starting:
                StartingView(message: model.detail)
            case .failed(let message):
                FailureView(message: message) { model.reload() }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct StartingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
            Text(message)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct FailureView: View {
    let message: String
    let retry: () -> Void

    @State private var copied = false

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34))
                .foregroundStyle(.yellow)
            Text("The local engine could not start")
                .font(.headline)
            ScrollView {
                Text(message)
                    .font(.system(.body, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
                    .textSelection(.enabled)
                    .frame(maxWidth: 560, alignment: .leading)
            }
            .frame(maxHeight: 220)
            Text("The ledger, review queue, and audit chain are unchanged. Reloading restarts the local server and reopens the bundled engine.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 560)
            HStack(spacing: 12) {
                Button(copied ? "Copied" : "Copy Diagnostic") { copyDiagnostic() }
                Button("Reload Engine", action: retry)
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(36)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    /// Copies the error plus the facts needed to reproduce it, so a bug report
    /// does not depend on someone retyping a screenshot.
    private func copyDiagnostic() {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
        let systemVersion = ProcessInfo.processInfo.operatingSystemVersion
        let report = """
        Index Engine \(version) (build \(build))
        macOS \(systemVersion.majorVersion).\(systemVersion.minorVersion).\(systemVersion.patchVersion)
        Bundle: \(Bundle.main.bundleURL.path)

        \(message)
        """
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(report, forType: .string)
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
    }
}
